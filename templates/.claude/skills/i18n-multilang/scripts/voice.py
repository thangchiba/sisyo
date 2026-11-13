#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""voice.py - the optional voice side of the i18n-multilang skill (stdlib only, Python 3.8+).

Most products have text only and never run this tool. Voice exists only for the languages and the sets of lines
named in i18n.config.json -> "voice".

  python voice.py plan                              per language and set: ready, behind, new, stale, blocked
  python voice.py plan --lang vi --out todo.vi.json the lines to synthesise: id, text, speak (numbers in words), numbers
  python voice.py say --lang ja --id game:say.reward "ほしを せんごひゃっこ もらったよ！"
                                                    write the spoken text of a line by hand (tied to its shown text)
  python voice.py keep --lang vi --id game:say.hello --why "same greeting, one word added"
                                                    the text changed a little: keep playing the old clip until it is remade
  python voice.py add --lang vi --map clips.json    register finished clips: {"ns:key": {"file": "a.mp3", "speakHash": "…"}}
  python voice.py pack                              build the CDN sets + voice manifest, bump voice versions

Text and voice have their own versions ("i18n.py versions" shows both). This tool never talks to the voice server:
making the audio with the project's voice backend and checking it is the project's own voice tool, under the rules
of references/voice.md. Number reading: numwords.py, references/numbers.md.
"""
import argparse
import datetime
import hashlib
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import i18n as core          # noqa: E402
import numwords              # noqa: E402

CONTENT_TYPE = {'mp3': 'audio/mpeg', 'ogg': 'audio/ogg', 'wav': 'audio/wav', 'm4a': 'audio/mp4', 'flac': 'audio/flac'}
STATES = ('ok', 'behind', 'missing', 'stale', 'blocked', 'untranslated')


def nfc(text):
    return unicodedata.normalize('NFC', text)


class Voice:
    def __init__(self, project):
        self.p = project
        self.cfg = project.cfg['voice']
        self.dir = project.root / 'voice'
        for lang in self.cfg['languages']:
            entry = project.registry.get(lang)
            if not entry or not entry.get('voice'):
                core.die('%s is not a voice language ("voice": true in the language registry: %s)'
                         % (lang, ' '.join(c for c, e in project.registry.items() if e.get('voice'))))
            if lang not in project.enabled():
                core.die('voice language %s is not one of the project\'s text languages' % lang)

    def on(self):
        return bool(self.cfg['languages'] and self.cfg['sets'])

    def need_lang(self, lang):
        if lang not in self.cfg['languages']:
            core.die('%s is not in voice.languages of this project' % lang)

    def voice_name(self, lang):
        """The backend's voice name for a language: voice.voices[lang], else voice.voicePattern with {lang} filled in."""
        return self.cfg['voices'].get(lang) or self.cfg['voicePattern'].replace('{lang}', lang)

    def overrides_path(self, lang):
        return self.dir / 'speak' / (lang + '.json')

    def overrides(self, lang):
        path = self.overrides_path(lang)
        return core.read_json(path) if path.is_file() else {}

    def manifest_path(self, lang):
        return self.dir / lang / 'manifest.json'

    def manifest(self, lang):
        path = self.manifest_path(lang)
        data = core.read_json(path) if path.is_file() else {}
        data.setdefault('schema', core.SCHEMA)
        data.setdefault('lang', lang)
        data.setdefault('lines', {})
        return data

    def save_manifest(self, lang, manifest):
        manifest['voice'] = self.voice_name(lang)
        manifest['lines'] = dict(sorted(manifest['lines'].items()))
        core.write_json(self.manifest_path(lang), manifest)

    def cache(self, lang):
        return self.dir / '_audio' / lang

    def spoken(self, lang, uid, text, override, style):
        """(speak, numbers, issues) of one line: from its override when it has one, else from the shown text."""
        if override is None:
            speak, numbers, issues = numwords.speak(text, lang, style)
            if '{{' in text:
                issues.append({'kind': 'placeholder', 'at': text, 'why': 'a text with a placeholder cannot be one fixed clip: '
                               'write its spoken text with "voice.py say", or leave the line out of the set'})
            return speak, numbers, issues
        if not isinstance(override, dict) or not isinstance(override.get('speak'), str) or not isinstance(override.get('text'), str):
            return '', [], [{'kind': 'override', 'at': uid, 'why': 'a spoken-text override is {"text": <the shown text it was '
                             'written for>, "speak": <what is said>}: write it with "voice.py say"'}]
        speak, issues = override['speak'], []
        numbers = override['numbers'] if 'numbers' in override else numwords.numbers_in(text, lang, style)
        if nfc(override['text']) != nfc(text):
            issues.append({'kind': 'override-outdated', 'at': override['text'],
                           'why': 'the shown text changed since this spoken text was written: write it again for the new text'})
        if any(ch.isdigit() for ch in speak):
            issues.append({'kind': 'digits', 'at': speak, 'why': 'the spoken text still holds digits: write every number in words'})
        elif numbers:
            ok, detail = numwords.heard(numbers, speak, lang)
            if not ok:
                lost = ', '.join(str(d['number']) for d in detail if d['heard'] is None)
                issues.append({'kind': 'override-numbers', 'at': speak, 'why': 'the spoken text does not say %s, which the shown text '
                               'holds. Fix the words; or, if the reading is right and unusual, list the numbers in "numbers"' % lost})
        return speak, numbers, issues

    def plan(self, lang):
        """One row per selected line. state:
        ok           a clip matches the current spoken text (or says the same words: only punctuation or case changed)
        behind       the text changed, someone decided the old clip may keep playing ("keep"); to be made again
        stale        the text changed and nobody decided: the line is left out (silent) until "keep" or a new clip
        missing      no clip yet            blocked  the spoken text is unsettled            untranslated  no current text
        """
        lines, skipped = core.voice_lines(self.p)
        report = self.p.report(lang)
        target = self.p.load(lang)
        overrides = self.overrides(lang)
        manifest = self.manifest(lang)
        style = self.cfg['numberStyle'].get(lang, {})
        voice = self.voice_name(lang)
        rows = []
        for set_name, uid, unit in lines:
            ns, _, key = uid.partition(':')
            row = {'id': uid, 'set': set_name}
            if report['states'][uid] not in ('ok', 'untracked'):
                row.update(state='untranslated', why='the %s text is %s' % (lang, report['states'][uid]))
                rows.append(row)
                continue
            text = unit['forms'][''] if lang == self.p.source else target[ns][key]
            speak, numbers, issues = self.spoken(lang, uid, text, overrides.get(uid), style)
            row.update(text=text, speak=speak, numbers=numbers)
            if issues:
                row.update(state='blocked', issues=issues)
                rows.append(row)
                continue
            row['speakHash'] = core.short_hash(voice + '\n' + speak, 16)
            row['textHash'] = core.short_hash(text)
            row['voice'] = voice
            have = manifest['lines'].get(uid)
            if not have:
                row['state'] = 'missing'
            elif have.get('speakHash') == row['speakHash']:
                row['state'] = 'ok'
            elif have.get('voice') == voice and numwords.canon(have.get('speak', ''), lang) == numwords.canon(speak, lang):
                row['state'] = 'ok'                        # the same words: only punctuation, case or spacing changed
            elif have.get('keptFor', {}).get('speakHash') == row['speakHash']:
                row.update(state='behind', recorded=have.get('speak'))
            else:
                row.update(state='stale', recorded=have.get('speak'))
            rows.append(row)
        return rows, skipped


def cmd_plan(v, a):
    langs = [a.lang] if a.lang else v.cfg['languages']
    if not langs:
        print('no voice languages in i18n.config.json -> voice.languages: voice is off for this project')
        return 0
    if not v.cfg['sets']:
        print('no voice sets in i18n.config.json -> voice.sets: no line is selected for voice')
        return 0
    for lang in langs:
        v.need_lang(lang)
        rows, skipped = v.plan(lang)
        if a.out and a.lang:
            todo = [r for r in rows if a.all or r['state'] in ('missing', 'stale', 'behind')]
            if a.set:
                todo = [r for r in todo if r['set'] == a.set]
            if a.limit:
                todo = todo[:a.limit]
            core.write_json(a.out, {'lang': lang, 'voice': v.voice_name(lang), 'format': v.cfg['format'], 'lines': todo,
                                    'answer': {'<id>': {'file': '<path of the finished clip>', 'speakHash': '<as given here>',
                                                        'checked': '<what the clip passed>'}}})
            print('%s: %d lines written to %s' % (lang, len(todo), a.out))
        by_set = {}
        for r in rows:
            c = by_set.setdefault(r['set'], {s: 0 for s in STATES})
            c[r['state']] += 1
        print('%s (%s)' % (lang, v.voice_name(lang)))
        print('  %-18s %6s %6s %6s %6s %6s %8s %12s' % ('set', 'lines', 'ready', 'behind', 'new', 'stale', 'blocked', 'untranslated'))
        for name, c in by_set.items():
            print('  %-18s %6d %6d %6d %6d %6d %8d %12d' % (name, sum(c.values()), c['ok'], c['behind'], c['missing'], c['stale'],
                                                           c['blocked'], c['untranslated']))
        for r in rows:
            if r['state'] == 'blocked':
                for i in r['issues']:
                    print('  blocked %s: %s (%s)' % (r['id'], i['why'], i['at']))
            elif r['state'] in ('stale', 'behind'):
                print('  %s %s\n      clip says: %s\n      text now : %s' % (r['state'], r['id'], r.get('recorded'), r['speak']))
        if any(r['state'] == 'stale' for r in rows):
            print('  stale = the text changed and the old clip no longer plays. Remake it, or if the old words still fit: voice.py keep')
        if skipped:
            print('  skipped %d plural keys (a plural text cannot be one clip): %s' % (len(skipped), ', '.join(skipped[:4])))
    return 0


def cmd_say(v, a):
    lang = a.lang
    v.need_lang(lang)
    rows = {r['id']: r for r in v.plan(lang)[0]}
    row = rows.get(a.id)
    if row is None:
        core.die('%s is not a line of a voice set (i18n.config.json -> voice.sets)' % a.id)
    if row['state'] == 'untranslated':
        core.die('%s: %s. Translate it first' % (a.id, row['why']))
    entry = {'text': row['text'], 'speak': nfc(a.speak.strip())}
    if a.numbers is not None:
        entry['numbers'] = [int(x) if re.fullmatch(r'-?\d+', x) and not (len(x) > 1 and x.startswith('0')) else x
                            for x in a.numbers.split(',') if x]
    overrides = v.overrides(lang)
    overrides[a.id] = entry
    core.write_json(v.overrides_path(lang), dict(sorted(overrides.items())))
    speak, numbers, issues = v.spoken(lang, a.id, row['text'], entry, v.cfg['numberStyle'].get(lang, {}))
    print('%s %s' % (lang, a.id))
    print('  shown : %s' % row['text'])
    print('  spoken: %s' % speak)
    print('  numbers to hear: %s' % (numbers or 'none'))
    for i in issues:
        print('  still blocked: %s (%s)' % (i['why'], i['at']))
    return 1 if issues else 0


def cmd_keep(v, a):
    """The text of a voiced line changed a little and its clip is not remade yet: let the old clip keep playing."""
    lang = a.lang
    v.need_lang(lang)
    rows = {r['id']: r for r in v.plan(lang)[0]}
    manifest = v.manifest(lang)
    done, refused = 0, []
    for uid in a.id:
        row, have = rows.get(uid), manifest['lines'].get(uid)
        if row is None or have is None:
            refused.append((uid, 'no clip is registered for this line'))
            continue
        if a.undo:
            if have.pop('keptFor', None) is not None:
                done += 1
            continue
        if row['state'] in ('ok', 'behind'):
            refused.append((uid, 'nothing to decide: the line is %s' % row['state']))
            continue
        if row['state'] != 'stale':
            refused.append((uid, 'the line is %s' % row['state']))
            continue
        if have.get('numbers', []) != row['numbers']:
            refused.append((uid, 'the numbers changed (clip says %s, text now holds %s): a clip that says another number is never kept'
                            % (have.get('numbers', []) or 'none', row['numbers'] or 'none')))
            continue
        have['keptFor'] = {'speakHash': row['speakHash'], 'textHash': row['textHash'], 'speak': row['speak'],
                           'at': datetime.date.today().isoformat()}
        if a.why:
            have['keptFor']['why'] = a.why
        done += 1
        print('%s %s: the old clip keeps playing (behind)\n    clip says: %s\n    text now : %s' % (lang, uid, have.get('speak'), row['speak']))
    if done:
        v.save_manifest(lang, manifest)
    print('%s: %d lines %s, %d refused' % (lang, done, 'released' if a.undo else 'kept', len(refused)))
    for uid, why in refused:
        print('  refused %s: %s' % (uid, why))
    return 1 if refused else 0


def cmd_add(v, a):
    lang = a.lang
    v.need_lang(lang)
    if a.map:
        base = Path(a.map).resolve().parent
        entries = core.read_json(a.map)
        entries = entries.get('lines', entries) if isinstance(entries, dict) and isinstance(entries.get('lines'), dict) else entries
    elif a.id and a.file:
        base, entries = Path.cwd(), {a.id: {'file': a.file, 'speakHash': a.speak_hash}}
    else:
        core.die('pass --map FILE, or --id and --file')
    rows = {r['id']: r for r in v.plan(lang)[0]}
    manifest = v.manifest(lang)
    cache = v.cache(lang)
    text_manifest = v.p.root / 'manifest.json'
    text_version = (core.read_json(text_manifest).get('languages', {}).get(lang, {}).get('version')
                    if text_manifest.is_file() else None)
    added, rejected = 0, []
    for uid, value in entries.items():
        value = {'file': value} if isinstance(value, str) else value
        row = rows.get(uid)
        if row is None:
            rejected.append((uid, 'not a line of a voice set'))
            continue
        if row['state'] in ('blocked', 'untranslated'):
            rejected.append((uid, 'the line is %s' % row['state']))
            continue
        if value.get('speakHash') and value['speakHash'] != row['speakHash']:
            rejected.append((uid, 'the spoken text changed since the plan (speakHash %s, now %s): make the clip again' % (value['speakHash'], row['speakHash'])))
            continue
        src = Path(value['file'])
        src = src if src.is_absolute() else base / src
        if not src.is_file() or src.stat().st_size == 0:
            rejected.append((uid, 'no audio at %s' % src))
            continue
        ext = src.suffix.lstrip('.').lower()
        if ext != v.cfg['format']:
            rejected.append((uid, 'the project\'s voice format is %s, the file is .%s' % (v.cfg['format'], ext)))
            continue
        data = src.read_bytes()
        sha = hashlib.sha256(data).hexdigest()
        cache.mkdir(parents=True, exist_ok=True)
        (cache / ('%s.%s' % (sha[:16], ext))).write_bytes(data)
        line = {'speak': row['speak'], 'speakHash': row['speakHash'], 'textHash': row['textHash'], 'voice': row['voice'],
                'sha256': sha, 'file': '%s.%s' % (sha[:16], ext), 'bytes': len(data), 'at': datetime.date.today().isoformat()}
        if text_version is not None:
            line['textVersion'] = text_version             # the language's text version when the clip was made
        if row['numbers']:
            line['numbers'] = row['numbers']
        if value.get('checked'):
            line['checked'] = value['checked']
        manifest['lines'][uid] = line                      # a new clip replaces the old one and any "keep" decision
        added += 1
    if added:
        v.save_manifest(lang, manifest)
    print('%s: %d clips registered, %d rejected' % (lang, added, len(rejected)))
    for uid, why in rejected:
        print('  rejected %s: %s' % (uid, why))
    return 1 if rejected else 0


def cmd_pack(v, a):
    p = v.p
    if not v.on():
        print('voice is off for this project (voice.languages / voice.sets are empty): nothing to pack')
        return 0
    text_manifest_path = p.root / 'manifest.json'
    text_manifest = core.read_json(text_manifest_path) if text_manifest_path.is_file() else {}
    manifest_path = v.dir / 'manifest.json'
    prev = core.read_json(manifest_path) if manifest_path.is_file() else {}
    prev_langs = prev.get('languages', {}) if prev.get('compat') == p.cfg['compat'] else {}
    prefix = p.cfg['cdn']['voicePrefix'].strip('/')
    sets_prefix = '%s/c%d' % (prefix, p.cfg['compat'])
    dist = p.root / p.cfg['dist']
    for lang in v.cfg['languages']:                        # the voice sets are built against one known text version
        entry = text_manifest.get('languages', {}).get(lang)
        if not entry or entry['hash'] != core.pack_body(p, lang)[3]:
            core.die('the %s text changed since the last text pack: run "i18n.py pack" first, then "voice.py pack"' % lang)
    out = dist / sets_prefix
    if out.is_dir():
        shutil.rmtree(out)
    plan, languages, changed, absent, behind_all, silent_all = [], {}, False, 0, [], []
    for lang in v.cfg['languages']:
        rows, _ = v.plan(lang)
        manifest = v.manifest(lang)
        cache = v.cache(lang)
        sets = {}
        for name in v.cfg['sets']:
            mine = [r for r in rows if r['set'] == name]
            clips, total, behind = {}, 0, 0
            for r in mine:
                if r['state'] not in ('ok', 'behind'):
                    silent_all.append('%s %s (%s)' % (lang, r['id'], r['state']))
                    continue
                line = manifest['lines'][r['id']]
                # the texts this clip may be played with: the one shown now, and the one it was recorded for
                texts = list(dict.fromkeys([r['textHash']] + ([line['textHash']] if line.get('textHash') else [])))
                clips[r['id']] = {'file': line['file'], 'bytes': line['bytes'], 'text': texts}
                total += line['bytes']
                if r['state'] == 'behind':
                    behind += 1
                    behind_all.append('%s %s' % (lang, r['id']))
                src = cache / line['file']
                if src.is_file():
                    dest = dist / prefix / 'clips' / lang / line['file']
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    if not dest.is_file():
                        shutil.copyfile(src, dest)
                    key = '%s/clips/%s/%s' % (prefix, lang, line['file'])
                    plan.append({'file': key, 'key': key, 'contentType': CONTENT_TYPE.get(v.cfg['format'], 'application/octet-stream'),
                                 'cacheControl': 'public, max-age=31536000, immutable'})
                else:
                    absent += 1
            if not clips:
                continue
            body = json.dumps({'schema': core.SCHEMA, 'lang': lang, 'set': name, 'voice': v.voice_name(lang), 'clips': clips},
                              ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode('utf-8')
            sha = hashlib.sha256(body).hexdigest()
            old = prev_langs.get(lang, {}).get('sets', {}).get(name)
            rel = '%s/%s.%s.json' % (lang, name, sha[:12])
            (out / rel).parent.mkdir(parents=True, exist_ok=True)
            (out / rel).write_bytes(body)
            sets[name] = {'version': (old['version'] + (0 if old.get('hash') == sha else 1)) if old else 1,
                          'hash': sha, 'file': rel, 'lines': len(mine), 'clips': len(clips), 'behind': behind,
                          'silent': len(mine) - len(clips), 'bytes': total, 'complete': len(clips) == len(mine)}
            if not old or old.get('hash') != sha:
                changed = True
            key = sets_prefix + '/' + rel
            plan.append({'file': key, 'key': key, 'contentType': 'application/json; charset=utf-8',
                         'cacheControl': 'public, max-age=31536000, immutable'})
        if sets:
            languages[lang] = {'voice': v.voice_name(lang), 'textVersion': text_manifest['languages'][lang]['version'], 'sets': sets}
    if set(languages) != set(prev_langs) or any(set(languages[l]['sets']) != set(prev_langs[l].get('sets', {})) for l in languages):
        changed = True
    manifest = {
        'schema': core.SCHEMA, 'product': p.cfg['product'], 'compat': p.cfg['compat'],
        'revision': prev.get('revision', 0) + 1 if changed or not prev else prev['revision'],
        'updatedAt': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ') if changed or not prev else prev.get('updatedAt'),
        'format': v.cfg['format'], 'fallback': v.cfg['fallback'], 'clipsBase': prefix + '/clips',
        'languages': languages,
    }
    core.write_json(manifest_path, manifest)
    core.write_json(out / 'manifest.json', manifest)
    seen, unique = set(), []
    for item in plan:
        if item['key'] not in seen:
            seen.add(item['key'])
            unique.append(item)
    unique.append({'file': sets_prefix + '/manifest.json', 'key': sets_prefix + '/manifest.json',
                   'contentType': 'application/json; charset=utf-8', 'cacheControl': 'public, max-age=60', 'last': True})
    plan_path = dist / 'upload-plan.voice.json'
    core.write_json(plan_path, {'base': p.cfg['cdn']['baseUrl'], 'order': 'clips, then set indexes, the manifest last', 'files': unique})
    for lang, e in languages.items():
        for name, s in e['sets'].items():
            print('%s %-16s voice v%d for text v%d: %d of %d clips (%d behind, %d silent), %.1f MB' % (
                lang, name, s['version'], e['textVersion'], s['clips'], s['lines'], s['behind'], s['silent'], s['bytes'] / 1048576))
    if behind_all:
        print('%d lines play a clip made for an earlier wording (behind), to be remade: %s%s'
              % (len(behind_all), ', '.join(behind_all[:6]), ' …' if len(behind_all) > 6 else ''))
    if silent_all:
        print('%d lines have no usable clip and are silent: %s%s' % (len(silent_all), ', '.join(silent_all[:6]), ' …' if len(silent_all) > 6 else ''))
    if absent:
        print('%d clips are not in the local cache (voice/_audio): fine if they are already on the CDN, else fetch them first' % absent)
    print('voice pack: revision %d   dist: %s   upload plan: %s' % (manifest['revision'], out.as_posix(), plan_path.as_posix()))
    return 0


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description='Voice sets of the i18n-multilang skill (optional: most products are text only).')
    ap.add_argument('--config', help='i18n.config.json or its folder')
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('plan', help='which lines need audio')
    s.add_argument('--lang')
    s.add_argument('--set')
    s.add_argument('--out', help='with --lang: write the lines to synthesise (new, stale, behind) to this file')
    s.add_argument('--all', action='store_true', help='with --out: every line')
    s.add_argument('--limit', type=int)
    s = sub.add_parser('say', help='write the spoken text of a line by hand, tied to the text it is shown with')
    s.add_argument('speak', help='what the voice says: every number in words')
    s.add_argument('--lang', required=True)
    s.add_argument('--id', required=True, help='ns:key')
    s.add_argument('--numbers', help='only when the reading is right but unusual: the numbers it says, comma separated ("" for none)')
    s = sub.add_parser('keep', help='the text changed a little: let the old clip keep playing until it is remade')
    s.add_argument('--lang', required=True)
    s.add_argument('--id', required=True, nargs='+', help='one or more ns:key')
    s.add_argument('--why', help='one line: why the old words still fit')
    s.add_argument('--undo', action='store_true', help='take the decision back: the line is stale (silent) again')
    s = sub.add_parser('add', help='register finished clips')
    s.add_argument('--lang', required=True)
    s.add_argument('--map', help='JSON {"ns:key": {"file": "…", "speakHash": "…"}} (paths relative to the map file)')
    s.add_argument('--id')
    s.add_argument('--file')
    s.add_argument('--speak-hash')
    sub.add_parser('pack', help='build the CDN sets and the voice manifest')
    a = ap.parse_args(argv)
    v = Voice(core.Project(core.find_config(a.config)))
    return {'plan': cmd_plan, 'say': cmd_say, 'keep': cmd_keep, 'add': cmd_add, 'pack': cmd_pack}[a.cmd](v, a)


if __name__ == '__main__':
    sys.exit(main() or 0)
