#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""i18n.py - the text side of the i18n-multilang skill (stdlib only, Python 3.8+).

  python i18n.py init --product myapp --source vi     scaffold ./i18n
  python i18n.py status                               what every language is missing
  python i18n.py todo --lang ja --out todo.ja.json    the texts to translate (new or changed), with context
  python i18n.py apply done.ja.json                   merge translations back, stamp them, validate
  python i18n.py check                                validate every file (exit 1 on an error)
  python i18n.py pack                                 build the language packs + manifest, bump versions, copy the bundle
  python i18n.py sync --write                         drop keys the source no longer has
  python i18n.py stamp --lang en                      adopt translations that already exist as up to date
  python i18n.py versions                             text version and voice version per language, and what lags
  python i18n.py languages                            the registry, and what this project offers

It finds i18n.config.json in the current folder, in ./i18n, or in a parent folder (or pass --config).
Formats and rules: the skill's references/format.md and references/layout-and-versioning.md.
"""
import argparse
import copy
import datetime
import fnmatch
import hashlib
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
SCHEMA = 1
PLURAL_FORMS = ('zero', 'one', 'two', 'few', 'many', 'other')
_PLURAL_KEY = re.compile(r'^(.+)_(zero|one|two|few|many|other)$')
_PLACEHOLDER = re.compile(r'\{\{\s*([A-Za-z0-9_]+)\s*(,[^{}]*)?\}\}')
_LEGACY_PLACEHOLDER = re.compile(r'(?<!\{)\{([A-Za-z0-9_]+)\}(?!\})')
_PRINTF = re.compile(r'%(\d+\$)?[sdif@]')
_TAG = re.compile(r'</?[A-Za-z0-9]+[^<>]*>')
_SEGMENT = re.compile(r'^[A-Za-z0-9_-]+$')
_LANG = r'[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*'
_VI_ONLY = re.compile('[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹơư]', re.I)
_SCRIPT = {
    'Jpan': r'[぀-ヿ㐀-鿿]', 'Hans': r'[㐀-鿿]', 'Hant': r'[㐀-鿿]',
    'Kore': r'[가-힯ᄀ-ᇿ]', 'Cyrl': r'[Ѐ-ӿ]', 'Grek': r'[Ͱ-Ͽ]',
    'Thai': r'[฀-๿]', 'Deva': r'[ऀ-ॿ]', 'Beng': r'[ঀ-৿]', 'Taml': r'[஀-௿]',
    'Arab': r'[؀-ۿݐ-ݿ]', 'Hebr': r'[֐-׿]',
}
DEFAULTS = {
    'schema': SCHEMA,
    'product': '',
    'sourceLanguage': 'en',
    'referenceLanguage': 'en',
    'compat': 1,
    'localesDir': 'locales',
    'layout': '{lang}/{ns}.json',
    'languages': 'default',
    'exclude': [],
    'capabilities': [],
    'extraLanguages': [],
    'bundle': {'languages': 'all', 'copyTo': []},
    'dist': 'dist',
    'cdn': {'baseUrl': '', 'textPrefix': 'i18n', 'voicePrefix': 'voice'},
    'voice': {'languages': [], 'fallback': 'en', 'sets': {}, 'voicePattern': '{lang}', 'voices': {}, 'numberStyle': {},
              'format': 'mp3'},
}


# ---------------------------------------------------------------- small helpers
def die(message):
    print('error: ' + message, file=sys.stderr)
    sys.exit(2)


def read_json(path):
    with open(path, encoding='utf-8-sig') as f:
        return json.load(f)


def write_json(path, data, compact=False):
    """UTF-8, LF line ends on every OS (a file written on Windows is read on the Mac and by the CDN)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        text = json.dumps(data, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    else:
        text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    path.write_bytes(text.encode('utf-8'))
    return len(text.encode('utf-8'))


def short_hash(text, n=12):
    return hashlib.sha256(unicodedata.normalize('NFC', text).encode('utf-8')).hexdigest()[:n]


def merge(base, over):
    out = copy.deepcopy(base)
    for k, v in over.items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def flatten(obj, problems, where, prefix='', out=None):
    """Nested JSON -> {dotted.key: text}. Top-level keys that start with "_" are comments and are skipped."""
    out = {} if out is None else out
    for k, v in obj.items():
        if not prefix and k.startswith('_'):
            continue
        key = prefix + k
        if isinstance(v, dict):
            flatten(v, problems, where, key + '.', out)
        elif isinstance(v, str):
            if key in out:
                problems.append(('error', where, key, 'the key is written twice (nested and dotted)'))
            out[key] = v
        else:
            problems.append(('error', where, key, 'the value is %s, not a text (arrays, numbers and null are not portable)' % type(v).__name__))
    return out


def unflatten(flat):
    """{dotted.key: text} -> nested dicts, or None when a key is both a text and a parent."""
    root = {}
    for key, value in flat.items():
        parts = key.split('.')
        d = root
        for part in parts[:-1]:
            nxt = d.get(part)
            if nxt is None:
                nxt = d[part] = {}
            elif not isinstance(nxt, dict):
                return None
            d = nxt
        if isinstance(d.get(parts[-1]), dict):
            return None
        d[parts[-1]] = value
    return root


def units_of(flat, problems=None, where=''):
    """Translation units in file order: {key: {'plural': bool, 'forms': {form: text}}}.
    A plain key has the single form ''. Keys that end in _one, _other... form one plural unit named by their base."""
    units = {}
    for key, text in flat.items():
        m = _PLURAL_KEY.match(key)
        base, form = (m.group(1), m.group(2)) if m else (key, '')
        unit = units.get(base)
        if unit is None:
            unit = units[base] = {'plural': bool(m), 'forms': {}}
        elif unit['plural'] != bool(m):
            if problems is not None:
                problems.append(('error', where, base, 'is both a plain key and a plural key (%s_other)' % base))
            continue
        unit['forms'][form] = text
    return units


def unit_hash(unit):
    return short_hash(json.dumps(unit['forms'], ensure_ascii=False, sort_keys=True))


def placeholders(text):
    return set(m.group(1) for m in _PLACEHOLDER.finditer(text)) | set('{%s}' % m.group(1) for m in _LEGACY_PLACEHOLDER.finditer(text))


def plural_category(lang, n):
    """The CLDR cardinal category of the whole number n (the rules a non-web runtime must port; web uses Intl.PluralRules)."""
    base = lang.split('-')[0]
    n = abs(int(n))
    n10, n100 = n % 10, n % 100
    million = n != 0 and n % 1000000 == 0
    if base in ('ja', 'ko', 'zh', 'vi', 'id', 'th', 'ms'):
        return 'other'
    if lang == 'pt-PT' or base in ('es', 'it', 'ca'):
        return 'one' if n == 1 else 'many' if million else 'other'
    if base in ('fr', 'pt'):
        return 'one' if n in (0, 1) else 'many' if million else 'other'
    if base in ('hi', 'bn', 'fa'):
        return 'one' if n in (0, 1) else 'other'
    if base == 'fil':
        return 'one' if n in (1, 2, 3) or n10 not in (4, 6, 9) else 'other'
    if base in ('ru', 'uk'):
        return 'one' if n10 == 1 and n100 != 11 else 'few' if 2 <= n10 <= 4 and not 12 <= n100 <= 14 else 'many'
    if base == 'pl':
        return 'one' if n == 1 else 'few' if 2 <= n10 <= 4 and not 12 <= n100 <= 14 else 'many'
    if base in ('cs', 'sk'):
        return 'one' if n == 1 else 'few' if 2 <= n <= 4 else 'other'
    if base == 'ro':
        return 'one' if n == 1 else 'few' if n == 0 or 1 <= n100 <= 19 else 'other'
    if base == 'hr':
        return 'one' if n10 == 1 and n100 != 11 else 'few' if 2 <= n10 <= 4 and not 12 <= n100 <= 14 else 'other'
    if base == 'ar':
        return ('zero', 'one', 'two')[n] if n <= 2 else 'few' if 3 <= n100 <= 10 else 'many' if 11 <= n100 else 'other'
    if base == 'he':
        return 'one' if n == 1 else 'two' if n == 2 else 'other'
    return 'one' if n == 1 else 'other'


# ---------------------------------------------------------------- the project
class Project:
    def __init__(self, config_path):
        self.config_path = Path(config_path).resolve()
        self.root = self.config_path.parent
        self.cfg = merge(DEFAULTS, read_json(self.config_path))
        self.registry = {}
        for entry in read_json(SKILL / 'assets' / 'languages.json')['languages'] + self.cfg['extraLanguages']:
            self.registry[entry['code']] = entry
        self.source = self.cfg['sourceLanguage']
        if self.source not in self.registry:
            die('sourceLanguage %r is not in the language registry (add it under extraLanguages)' % self.source)
        self.locales = self.root / self.cfg['localesDir']
        layout = self.cfg['layout']
        if '{lang}' not in layout:
            die('layout must contain {lang}: %r' % layout)
        self._layout_re = re.compile('^' + re.escape(layout).replace(r'\{lang\}', '(?P<lang>%s)' % _LANG)
                                     .replace(r'\{ns\}', r'(?P<ns>[A-Za-z0-9_-]+)') + '$')
        self._cache = {}
        self.load_problems = []

    # --- languages
    def enabled(self):
        """Codes this project wants, the source first, then registry order."""
        want = self.cfg['languages']
        if want == 'default':
            codes = [c for c, e in self.registry.items() if e.get('default')]
        else:
            for c in want:
                if c not in self.registry:
                    die('language %r is not in the registry (add it under extraLanguages)' % c)
            codes = [c for c in self.registry if c in want]
        codes = [c for c in codes if c not in self.cfg['exclude'] and c != self.source]
        return [self.source] + codes

    def blocked(self, lang):
        """The rendering capabilities the platform has not declared for this language ([] = fine)."""
        return [r for r in self.registry[lang].get('requires', []) if r not in self.cfg['capabilities']]

    def plural_forms(self, lang):
        return self.registry[lang]['plurals']

    # --- files
    def path_for(self, lang, ns):
        return self.locales / self.cfg['layout'].replace('{lang}', lang).replace('{ns}', ns)

    def files(self, lang=None):
        """[(lang, ns, path)] of the locale files on disk."""
        found = []
        if not self.locales.is_dir():
            return found
        for path in sorted(self.locales.rglob('*.json')):
            m = self._layout_re.match(path.relative_to(self.locales).as_posix())
            if m and (lang is None or m.group('lang') == lang):
                found.append((m.group('lang'), m.groupdict().get('ns') or 'translation', path))
        return found

    def load(self, lang):
        """{ns: {dotted.key: text}} of a language (cached)."""
        if lang not in self._cache:
            data = {}
            for _, ns, path in self.files(lang):
                try:
                    raw = read_json(path)
                except (ValueError, OSError) as e:
                    self.load_problems.append(('error', lang, ns, 'cannot read %s: %s' % (path.name, e)))
                    continue
                if not isinstance(raw, dict):
                    self.load_problems.append(('error', lang, ns, '%s must hold a JSON object' % path.name))
                    continue
                data[ns] = flatten(raw, self.load_problems, lang + ':' + ns)
            self._cache[lang] = data
        return self._cache[lang]

    def nested(self, ns):
        """Does the source file of this namespace use nested objects? Targets are written the same way."""
        path = self.path_for(self.source, ns)
        try:
            raw = read_json(path)
        except (ValueError, OSError):
            return True
        return any(isinstance(v, dict) for k, v in raw.items() if not k.startswith('_'))

    def source_units(self):
        """{ns: {key: unit}} in source order."""
        return {ns: units_of(flat) for ns, flat in self.load(self.source).items()}

    # --- translation state
    def meta_path(self, lang):
        return self.root / 'meta' / (lang + '.json')

    def meta(self, lang):
        path = self.meta_path(lang)
        data = read_json(path) if path.is_file() else {}
        data.setdefault('schema', SCHEMA)
        data.setdefault('lang', lang)
        data.setdefault('keys', {})
        data.setdefault('locked', [])
        return data

    def save_meta(self, lang, meta):
        meta['keys'] = dict(sorted(meta['keys'].items()))
        meta['locked'] = sorted(set(meta['locked']))
        write_json(self.meta_path(lang), meta)

    def target_keys(self, lang, key, unit):
        return [key + '_' + f for f in self.plural_forms(lang)] if unit['plural'] else [key]

    def state(self, lang, ns, key, unit, target_flat, meta):
        """ok | untracked (translated, never stamped) | stale (the source changed) | incomplete (plural forms) | missing"""
        if lang == self.source:
            return 'ok'
        keys = self.target_keys(lang, key, unit)
        present = [k for k in keys if target_flat.get(k, '').strip()]
        if not present:
            return 'missing'
        if len(present) < len(keys):
            return 'incomplete'
        stamp = meta['keys'].get(ns + ':' + key)
        if stamp is None:
            return 'untracked'
        return 'ok' if stamp == unit_hash(unit) else 'stale'

    def report(self, lang):
        """{'states': {uid: state}, 'counts': {...}, 'total': n, 'usable': n, 'coverage': 0..1}"""
        meta = self.meta(lang)
        target = self.load(lang)
        states = {}
        for ns, units in self.source_units().items():
            flat = target.get(ns, {})
            for key, unit in units.items():
                states[ns + ':' + key] = self.state(lang, ns, key, unit, flat, meta)
        counts = {s: 0 for s in ('ok', 'untracked', 'stale', 'incomplete', 'missing')}
        for s in states.values():
            counts[s] += 1
        total = len(states)
        usable = counts['ok'] + counts['untracked']
        return {'states': states, 'counts': counts, 'total': total, 'usable': usable,
                'coverage': 1.0 if not total else usable / total}

    def notes(self, ns):
        path = self.root / 'notes' / (ns + '.json')
        return read_json(path) if path.is_file() else {}

    def glossary(self):
        path = self.root / 'glossary.json'
        g = read_json(path) if path.is_file() else {}
        return {'keep': g.get('keep', []), 'terms': g.get('terms', {}), 'forbidden': g.get('forbidden', {})}


def find_config(explicit=None, required=True):
    if explicit:
        p = Path(explicit)
        p = p / 'i18n.config.json' if p.is_dir() else p
        if not p.is_file():
            die('no config at %s' % p)
        return p
    here = Path.cwd()
    for folder in [here] + list(here.parents):
        for cand in (folder / 'i18n.config.json', folder / 'i18n' / 'i18n.config.json'):
            if cand.is_file():
                return cand
    if required:
        die('no i18n.config.json here, in ./i18n or in a parent folder (run "init", or pass --config)')
    return None


def voice_lines(p):
    """([(set, 'ns:key', unit)], [skipped plural ids]): the lines the project's voice sets select, in set order then
    source order. A line belongs to the first set that names it. A plural text cannot be one clip and is skipped."""
    taken, out, skipped = set(), [], []
    for name, rule in p.cfg['voice']['sets'].items():
        for ns, units in p.source_units().items():
            for key, unit in units.items():
                uid = ns + ':' + key
                if uid in taken or not any(fnmatch.fnmatchcase(uid, pat) for pat in rule.get('include', [])):
                    continue
                if any(fnmatch.fnmatchcase(uid, pat) for pat in rule.get('exclude', [])):
                    continue
                if unit['plural']:
                    skipped.append(uid)
                    continue
                taken.add(uid)
                out.append((name, uid, unit))
    return out, skipped


# ---------------------------------------------------------------- check
def check_text(p, lang, ns, key, unit, target_flat, note, glossary, out):
    """Problems of one translated unit, appended to out as (level, lang, 'ns:key', message)."""
    uid = ns + ':' + key
    entry = p.registry[lang]
    source_all = set()
    for text in unit['forms'].values():
        source_all |= placeholders(text)
    source_text = unit['forms'].get('') or unit['forms'].get('other') or next(iter(unit['forms'].values()))
    forms = {}
    if unit['plural']:
        for f in PLURAL_FORMS:
            if key + '_' + f in target_flat:
                forms[f] = target_flat[key + '_' + f]
                if f not in entry['plurals']:
                    out.append(('warning', lang, uid, 'the form _%s is never used in %s (its forms: %s)' % (f, lang, ' '.join(entry['plurals']))))
    elif key in target_flat:
        forms[''] = target_flat[key]
    limit = note.get('max') if isinstance(note, dict) else None
    for form, text in forms.items():
        label = uid + ('_' + form if form else '')
        if not text.strip():
            out.append(('error', lang, label, 'empty translation'))
            continue
        got = placeholders(text)
        for name in sorted(got - source_all):
            out.append(('error', lang, label, 'placeholder %s is not in the source' % (name if name.startswith('{') else '{{%s}}' % name)))
        missing = source_all - got
        if unit['plural']:
            missing -= {'count', '{count}'}
        for name in sorted(missing):
            out.append(('error', lang, label, 'placeholder %s of the source is missing' % (name if name.startswith('{') else '{{%s}}' % name)))
        if sorted(_TAG.findall(text)) != sorted(_TAG.findall(source_text)):
            out.append(('warning', lang, label, 'the markup tags differ from the source'))
        if text.count('\n') != source_text.count('\n'):
            out.append(('warning', lang, label, 'line breaks differ from the source (%d, source %d)' % (text.count('\n'), source_text.count('\n'))))
        if (text[:1].isspace(), text[-1:].isspace()) != (source_text[:1].isspace(), source_text[-1:].isspace()):
            out.append(('warning', lang, label, 'leading / trailing space differs from the source'))
        if limit and len(text) > limit:
            out.append(('error', lang, label, '%d characters, the note allows %d' % (len(text), limit)))
        letters = sum(1 for ch in text if ch.isalpha())
        script = _SCRIPT.get(entry.get('script'))
        plain = _PLACEHOLDER.sub('', text)
        if script and letters >= 4 and not re.search(script, plain) and not any(k in text for k in glossary['keep']):
            out.append(('warning', lang, label, 'no %s characters: is it translated?' % entry['script']))
        if p.source == 'vi' and lang != 'vi' and _VI_ONLY.search(plain) and not any(k in text for k in glossary['keep']):
            out.append(('warning', lang, label, 'Vietnamese letters are left in the text'))
        if lang != p.source and text == source_text and letters >= 12:
            out.append(('warning', lang, label, 'identical to the source text'))
        if lang == 'fr' and re.search(r' [!?;:]', text):
            out.append(('warning', lang, label, 'French: a plain space before ! ? ; : lets the mark wrap alone to the next line: use a no-break space (U+00A0)'))
        low = text.lower()
        for word in glossary['forbidden'].get('*', []) + glossary['forbidden'].get(lang, []):
            w = word.lower()
            hit = re.search(r'(?<![A-Za-z])' + re.escape(w) + r'(?![A-Za-z])', low) if re.fullmatch(r'[\x00-\x7f]+', w) else w in low
            if hit:
                out.append(('error', lang, label, 'holds the forbidden word %r (glossary.json)' % word))
        for word in glossary['keep']:
            if word in source_text and word not in text:
                out.append(('warning', lang, label, 'the name %r of the source is not kept as written' % word))
        for term, by_lang in glossary['terms'].items():
            fixed = by_lang.get(lang)
            if fixed and term.lower() in source_text.lower() and fixed.lower() not in low:
                out.append(('warning', lang, label, 'glossary: %r should be %r' % (term, fixed)))


def check(p, only_lang=None):
    """Every problem of the project as (level, lang, where, message). level: error | warning."""
    out = []
    glossary = p.glossary()
    source = p.load(p.source)
    if not source:
        out.append(('error', p.source, '-', 'no source texts under %s (layout %s)' % (p.locales, p.cfg['layout'])))
    source_units = {}
    for ns, flat in source.items():
        where = p.source
        for key in flat:
            for seg in key.split('.'):
                if not _SEGMENT.match(seg):
                    out.append(('error', where, ns + ':' + key, 'key part %r: use letters, digits, _ and - only' % seg))
        if unflatten(flat) is None:
            out.append(('error', where, ns, 'a key is both a text and the parent of other keys'))
        units = source_units[ns] = units_of(flat, out, where)
        for note_key in p.notes(ns):
            if not note_key.startswith('_') and note_key not in units:
                out.append(('warning', where, ns + ':' + note_key, 'a note for a key that does not exist (a note is keyed by the '
                            'dotted key, flat; a plural key by its base name without _other)'))
        for key, unit in units.items():
            uid = ns + ':' + key
            if unit['plural']:
                if 'other' not in unit['forms']:
                    out.append(('error', where, uid, 'a plural key needs %s_other in the source' % key))
                for f in unit['forms']:
                    if f not in p.plural_forms(p.source):
                        out.append(('warning', where, uid + '_' + f, '%s has no "%s" form (its forms: %s)' % (p.source, f, ' '.join(p.plural_forms(p.source)))))
            for form, text in unit['forms'].items():
                label = uid + ('_' + form if form else '')
                if not text.strip():
                    out.append(('warning', where, label, 'empty source text'))
                if _LEGACY_PLACEHOLDER.search(text):
                    out.append(('warning', where, label, 'single-brace placeholder: the standard is {{name}}'))
                if _PRINTF.search(text):
                    out.append(('warning', where, label, 'printf placeholder (%s): the standard is {{name}}'))
                if '$t(' in text:
                    out.append(('warning', where, label, '$t() nesting is not portable to the game runtimes'))
                if any(m.group(2) for m in _PLACEHOLDER.finditer(text)):
                    out.append(('warning', where, label, 'a {{name, format}} formatter is not portable to the game runtimes'))
                if text != text.strip():
                    out.append(('warning', where, label, 'the source text starts or ends with a space'))
    for lang in p.enabled():
        if lang == p.source or (only_lang and lang != only_lang):
            continue
        target = p.load(lang)
        for ns, units in source_units.items():
            flat = target.get(ns, {})
            notes = p.notes(ns)
            for key, unit in units.items():
                check_text(p, lang, ns, key, unit, flat, notes.get(key, {}), glossary, out)
    on_disk = set(l for l, _, _ in p.files())
    for lang in sorted(on_disk - set(p.registry)):
        out.append(('warning', lang, '-', 'a locale folder for a language that is not in the registry'))
    out = p.load_problems + out
    seen, unique = set(), []
    for item in out:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


# ---------------------------------------------------------------- writing a language
def write_language(p, lang, changes):
    """changes: {ns: {key: text}} merged into the language's files, written in the source's key order and shape."""
    target = p.load(lang)
    for ns, new in changes.items():
        flat = dict(target.get(ns, {}))
        flat.update(new)
        ordered = {}
        for key, unit in p.source_units().get(ns, {}).items():
            names = [key + '_' + f for f in PLURAL_FORMS] if unit['plural'] else [key]
            for name in names:
                if name in flat:
                    ordered[name] = flat[name]
        for name, text in flat.items():                    # keys the source no longer has stay at the end until "sync"
            ordered.setdefault(name, text)
        body = unflatten(ordered) if p.nested(ns) else None
        write_json(p.path_for(lang, ns), body if body is not None else ordered)
        target[ns] = ordered
    p._cache[lang] = target


# ---------------------------------------------------------------- commands
def cmd_init(a):
    root = Path(a.dir).resolve()
    if (root / 'i18n.config.json').exists():
        die('%s already has an i18n.config.json' % root)
    template = SKILL / 'assets' / 'project'
    for src in sorted(template.rglob('*')):
        if src.is_dir():
            continue
        rel = (src.relative_to(template).as_posix().replace('__source__', a.source)
               .replace('gitignore.txt', '.gitignore').replace('gitattributes.txt', '.gitattributes'))
        text = src.read_text(encoding='utf-8').replace('__PRODUCT__', a.product).replace('__SOURCE__', a.source)
        dest = root / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(text.replace('\r\n', '\n').encode('utf-8'))
        print('created', dest.relative_to(root.parent).as_posix())
    print('next: put the texts in %s, then run "status"' % (root / 'locales' / a.source).as_posix())


def language_row(p, lang):
    entry = p.registry[lang]
    if p.blocked(lang):
        return {'lang': lang, 'name': entry['name'], 'status': 'blocked', 'why': 'the platform has not declared: ' + ', '.join(p.blocked(lang))}
    r = p.report(lang)
    c = r['counts']
    if lang == p.source:
        status = 'source'
    elif r['usable'] == 0 and c['stale'] == 0 and c['incomplete'] == 0:
        status = 'none'
    elif r['usable'] == r['total']:
        status = 'ready'
    else:
        status = 'partial'
    return {'lang': lang, 'name': entry['name'], 'status': status, 'total': r['total'], 'ok': c['ok'],
            'untracked': c['untracked'], 'stale': c['stale'], 'incomplete': c['incomplete'], 'missing': c['missing'],
            'coverage': round(r['coverage'], 4)}


def cmd_status(p, a):
    rows = [language_row(p, lang) for lang in p.enabled()]
    if a.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0
    print('%s: source %s, %d texts, compat %d' % (p.cfg['product'] or p.root.name, p.source, rows[0].get('total', 0), p.cfg['compat']))
    print('%-8s %-24s %-8s %6s %6s %6s %6s %6s' % ('lang', 'name', 'status', 'ok', 'new', 'stale', 'plural', 'cover'))
    for r in rows:
        if r['status'] == 'blocked':
            print('%-8s %-24s %-8s %s' % (r['lang'], r['name'], 'blocked', r['why']))
            continue
        print('%-8s %-24s %-8s %6d %6d %6d %6d %5.0f%%%s' % (
            r['lang'], r['name'], r['status'], r['ok'] + r['untracked'], r['missing'], r['stale'], r['incomplete'],
            r['coverage'] * 100, '  (%d untracked: run "stamp" after a review)' % r['untracked'] if r['untracked'] else ''))
    todo = [r['lang'] for r in rows if r['status'] in ('partial', 'none')]
    if todo:
        print('to translate: ' + ' '.join(todo))
    return 0


def cmd_todo(p, a):
    lang = a.lang
    if lang not in p.enabled():
        die('%s is not one of this project\'s languages' % lang)
    if lang == p.source:
        die('%s is the source language' % lang)
    if p.blocked(lang):
        die('%s is blocked: the platform has not declared %s (i18n.config.json -> capabilities)' % (lang, ', '.join(p.blocked(lang))))
    voiced = set(uid for _, uid, _ in voice_lines(p)[0]) if lang in p.cfg['voice']['languages'] else set()
    entry = p.registry[lang]
    report = p.report(lang)
    target = p.load(lang)
    ref_lang = p.cfg['referenceLanguage']
    ref = p.load(ref_lang) if ref_lang not in (p.source, lang) and ref_lang in p.enabled() else None
    ref_report = p.report(ref_lang) if ref is not None else None
    want_ns = set(a.ns.split(',')) if a.ns else None
    locked = set(p.meta(lang)['locked'])
    items = []
    for ns, units in p.source_units().items():
        if want_ns and ns not in want_ns:
            continue
        notes = p.notes(ns)
        for key, unit in units.items():
            uid = ns + ':' + key
            state = report['states'][uid]
            if state in ('ok', 'untracked'):
                continue
            item = {'id': uid, 'state': state,
                    'source': unit['forms'] if unit['plural'] else unit['forms']['']}
            if unit['plural']:
                item['forms'] = entry['plurals']
            if ref is not None and ref_report['states'].get(uid) in ('ok', 'untracked'):
                flat = ref.get(ns, {})
                item['reference'] = ({f: flat[key + '_' + f] for f in p.plural_forms(ref_lang) if key + '_' + f in flat}
                                     if unit['plural'] else flat.get(key))
            note = notes.get(key)
            if note:
                item['note'] = note
            flat = target.get(ns, {})
            current = ({f: flat[key + '_' + f] for f in PLURAL_FORMS if key + '_' + f in flat} if unit['plural'] else flat.get(key))
            if current:
                item['current'] = current
            if uid in locked:
                item['locked'] = True
            if uid in voiced:
                item['voice'] = True                       # spoken aloud in this language: translation.md, "Voice lines"
            items.append(item)
    total = len(items)
    if a.limit:
        items = items[:a.limit]
    g = p.glossary()
    doc = {
        'lang': lang, 'name': entry['name'], 'native': entry['native'], 'dir': entry['dir'],
        'pluralForms': entry['plurals'], 'sourceLanguage': p.source,
        'referenceLanguage': ref_lang if ref is not None else None,
        'glossary': {'keep': g['keep'],
                     'terms': {t: v[lang] for t, v in g['terms'].items() if lang in v},
                     'forbidden': g['forbidden'].get('*', []) + g['forbidden'].get(lang, [])},
        'remaining': total, 'items': items,
        'answer': {'lang': lang, 'items': {'<id>': '<translation, or {form: translation} for a plural id>'}},
    }
    if a.out:
        write_json(a.out, doc)
        print('%s: %d of %d texts to translate written to %s' % (lang, len(items), total, a.out))
    else:
        print(json.dumps(doc, ensure_ascii=False, indent=2))
    return 0


def cmd_apply(p, a):
    doc = read_json(a.file)
    lang = doc.get('lang')
    if lang not in p.enabled() or lang == p.source:
        die('"lang" must be one of this project\'s target languages, got %r' % lang)
    meta = p.meta(lang)
    units = p.source_units()
    glossary = p.glossary()
    changes, applied, rejected = {}, [], []
    for uid, value in doc.get('items', {}).items():
        ns, _, key = uid.partition(':')
        unit = units.get(ns, {}).get(key)
        if unit is None:
            rejected.append((uid, 'no such source text'))
            continue
        if uid in meta['locked'] and not a.force:
            rejected.append((uid, 'locked (a person reviewed it): pass --force only if the owner asked'))
            continue
        if unit['plural']:
            if not isinstance(value, dict):
                rejected.append((uid, 'a plural text needs an object of forms: %s' % ' '.join(p.plural_forms(lang))))
                continue
            lack = [f for f in p.plural_forms(lang) if not str(value.get(f, '')).strip()]
            extra = [f for f in value if f not in PLURAL_FORMS]
            if lack or extra:
                rejected.append((uid, 'plural forms: missing %s%s' % (' '.join(lack) or '-', '; unknown ' + ' '.join(extra) if extra else '')))
                continue
            new = {key + '_' + f: value[f] for f in PLURAL_FORMS if f in value}
        else:
            if not isinstance(value, str):
                rejected.append((uid, 'expected a text'))
                continue
            new = {key: value}
        problems = []
        check_text(p, lang, ns, key, unit, new, p.notes(ns).get(key, {}), glossary, problems)
        errors = [m for level, _, _, m in problems if level == 'error']
        if errors:
            rejected.append((uid, '; '.join(errors)))
            continue
        for level, _, where, message in problems:
            print('warning %s %s: %s' % (lang, where, message))
        changes.setdefault(ns, {}).update(new)
        if unit['plural']:                                 # forms the answer no longer has are dropped
            old = p.load(lang).get(ns, {})
            for f in PLURAL_FORMS:
                if key + '_' + f in old and key + '_' + f not in new:
                    old.pop(key + '_' + f)
        meta['keys'][uid] = unit_hash(unit)
        if a.lock:
            meta['locked'].append(uid)
        applied.append(uid)
    if changes:
        write_language(p, lang, changes)
        p.save_meta(lang, meta)
    print('%s: applied %d, rejected %d' % (lang, len(applied), len(rejected)))
    for uid, why in rejected:
        print('  rejected %s: %s' % (uid, why))
    return 1 if rejected else 0


def cmd_stamp(p, a):
    langs = [l for l in p.enabled() if l != p.source] if a.all else [a.lang]
    if not a.all and not a.lang:
        die('pass --lang or --all')
    units = p.source_units()
    for lang in langs:
        if lang not in p.enabled() or lang == p.source:
            die('%s is not a target language of this project' % lang)
        report, meta, n = p.report(lang), p.meta(lang), 0
        for uid, state in report['states'].items():
            if state == 'untracked' or (a.stale and state == 'stale'):
                ns, _, key = uid.partition(':')
                meta['keys'][uid] = unit_hash(units[ns][key])
                n += 1
        if n:
            p.save_meta(lang, meta)
        print('%s: %d texts stamped as up to date' % (lang, n))
    return 0


def cmd_sync(p, a):
    units = p.source_units()
    valid = set()
    for ns, us in units.items():
        for key, unit in us.items():
            valid.add(ns + ':' + key)
    changed = False
    for lang in sorted(set(l for l, _, _ in p.files()) - {p.source}):
        if lang not in p.registry:
            continue
        target = p.load(lang)
        for ns, flat in list(target.items()):
            keep = {}
            for name, text in flat.items():
                m = _PLURAL_KEY.match(name)
                base = m.group(1) if m and ns + ':' + m.group(1) in valid and units[ns][m.group(1)]['plural'] else name
                if ns + ':' + base in valid:
                    keep[name] = text
            gone = [k for k in flat if k not in keep]
            if gone:
                changed = True
                print('%s %s: %d keys the source no longer has%s' % (lang, ns, len(gone), '' if a.write else ' (' + ', '.join(gone[:5]) + ('…' if len(gone) > 5 else '') + ')'))
                if a.write:
                    path = p.path_for(lang, ns)
                    if keep:
                        body = unflatten(keep) if p.nested(ns) else None
                        write_json(path, body if body is not None else keep)
                    elif path.is_file():
                        path.unlink()
                    target[ns] = keep
        meta = p.meta(lang)
        orphans = [uid for uid in meta['keys'] if uid not in valid]
        if orphans or any(uid not in valid for uid in meta['locked']):
            changed = True
            print('%s: %d stamps of texts that are gone' % (lang, len(orphans)))
            if a.write:
                meta['keys'] = {k: v for k, v in meta['keys'].items() if k in valid}
                meta['locked'] = [k for k in meta['locked'] if k in valid]
                p.save_meta(lang, meta)
    if not changed:
        print('in sync: no orphan keys')
    elif not a.write:
        print('nothing written: pass --write to remove them')
    return 0


def cmd_check(p, a):
    problems = check(p, a.lang)
    errors = [x for x in problems if x[0] == 'error']
    warnings = [x for x in problems if x[0] == 'warning']
    for level, lang, where, message in problems:
        print('%-7s %-8s %s: %s' % (level, lang, where, message))
    print('check: %d errors, %d warnings' % (len(errors), len(warnings)))
    return 1 if errors or (a.strict and warnings) else 0


def build_pack(p, lang):
    """The pack of a language: only texts that are translated and up to date (the runtime falls back for the rest)."""
    report = p.report(lang)
    target = p.load(lang)
    strings = {}
    for ns, units in p.source_units().items():
        flat = target.get(ns, {})
        keep = {}
        for key, unit in units.items():
            if report['states'][ns + ':' + key] not in ('ok', 'untracked'):
                continue
            names = [key + '_' + f for f in PLURAL_FORMS] if unit['plural'] else [key]
            for name in names:
                if name in flat:
                    keep[name] = flat[name]
        if keep:
            strings[ns] = keep
    return report, {'schema': SCHEMA, 'lang': lang, 'strings': strings}


def pack_body(p, lang):
    """(report, pack, bytes, sha256) of a language's pack as it would be built from the files right now."""
    report, pack = build_pack(p, lang)
    body = json.dumps(pack, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode('utf-8')
    return report, pack, body, hashlib.sha256(body).hexdigest()


def cmd_versions(p, a):
    """Text version and voice version of every language side by side: what is packed, what changed since, what lags."""
    text_path, voice_path = p.root / 'manifest.json', p.root / 'voice' / 'manifest.json'
    text = read_json(text_path) if text_path.is_file() else {}
    voice = read_json(voice_path) if voice_path.is_file() else {}
    rows = []
    for lang in p.enabled():
        if p.blocked(lang):
            continue
        entry = text.get('languages', {}).get(lang)
        _, pack, _, sha = pack_body(p, lang)
        if not entry and not pack['strings']:
            continue
        v = voice.get('languages', {}).get(lang)
        rows.append({
            'lang': lang,
            'text': {'version': entry['version'] if entry else None, 'status': entry['status'] if entry else 'not packed',
                     'editedSincePack': not entry or entry['hash'] != sha},
            'voice': None if not v else {
                'madeForTextVersion': v.get('textVersion'),
                'sets': {name: {k: s.get(k) for k in ('version', 'clips', 'lines', 'behind', 'silent')} for name, s in v['sets'].items()}},
        })
    if a.json:
        print(json.dumps({'product': p.cfg['product'], 'compat': p.cfg['compat'], 'textRevision': text.get('revision'),
                          'voiceRevision': voice.get('revision'), 'languages': rows}, ensure_ascii=False, indent=2))
        return 0
    print('%s: compat %d, text revision %s (%s)%s' % (
        p.cfg['product'] or p.root.name, p.cfg['compat'], text.get('revision', '-'), text.get('updatedAt', 'never packed'),
        ', voice revision %s (%s)' % (voice['revision'], voice.get('updatedAt')) if voice else ', no voice'))
    print('%-8s %-7s %-9s  %-16s %-6s %-9s %-7s %-7s %s' % ('lang', 'text', 'state', 'voice set', 'voice', 'for text', 'clips', 'behind', 'silent'))
    notes = set()
    for r in rows:
        t = r['text']
        mark = ''
        if t['editedSincePack']:
            mark = ' *'
            notes.add('* text edited since the last pack: run "i18n.py pack"')
        head = '%-8s %-7s %-9s ' % (r['lang'], ('v%d' % t['version'] if t['version'] else '-') + mark, t['status'])
        if not r['voice']:
            print(head + ' -')
            continue
        for i, (name, s) in enumerate(r['voice']['sets'].items()):
            made = r['voice']['madeForTextVersion']
            lag = ''
            if made is not None and t['version'] and made < t['version']:
                lag = ' !'
                notes.add('! the voice sets were packed for an older text version: run "voice.py pack" and read its report')
            print('%s %-16s %-6s %-9s %-7s %-7s %s' % (
                head if i == 0 else ' ' * len(head), name, 'v%d' % s['version'], ('v%s' % made if made is not None else '?') + lag,
                '%s/%s' % (s['clips'], s['lines']), s.get('behind') or 0, s.get('silent') or 0))
    for n in sorted(notes):
        print(n)
    if voice:
        print('behind = the text changed, the old clip is kept and still plays; silent = no usable clip for the current text')
    return 0


def cmd_pack(p, a):
    errors = [x for x in check(p) if x[0] == 'error']
    if errors:
        for level, lang, where, message in errors[:20]:
            print('%-7s %-8s %s: %s' % (level, lang, where, message))
        die('%d check errors: fix them before packing' % len(errors))
    manifest_path = p.root / 'manifest.json'
    prev = read_json(manifest_path) if manifest_path.is_file() else {}
    prev_langs = prev.get('languages', {}) if prev.get('compat') == p.cfg['compat'] else {}
    packs, entries, regress = {}, {}, []
    enabled = p.enabled()
    for lang in enabled:
        if p.blocked(lang):
            continue
        report, pack, body, sha = pack_body(p, lang)
        if not pack['strings']:
            continue
        old = prev_langs.get(lang)
        status = 'ready' if report['usable'] == report['total'] else 'partial'
        if old and old.get('status') == 'ready' and status != 'ready':
            regress.append('%s (%d of %d)' % (lang, report['usable'], report['total']))
        entry = p.registry[lang]
        entries[lang] = {
            'name': entry['name'], 'native': entry['native'], 'dir': entry['dir'], 'script': entry['script'],
            'version': (old['version'] + (0 if old.get('hash') == sha else 1)) if old else 1,
            'hash': sha, 'file': '%s/%s.%s.json' % (lang, lang, sha[:12]), 'bytes': len(body),
            'texts': report['usable'], 'coverage': round(report['coverage'], 4), 'status': status,
        }
        if entry.get('aliases'):
            entries[lang]['aliases'] = entry['aliases']
        packs[lang] = body
    for lang in prev_langs:
        if prev_langs[lang].get('status') == 'ready' and lang not in entries:
            regress.append('%s (gone)' % lang)
    if regress and not a.allow_regress:
        die('these languages were ready in the last pack and are not any more: %s.\n'
            'Translate first (status, todo, apply). Pass --allow-regress only if the owner accepts shipping without them.'
            % ', '.join(regress))
    fallback_all = [l for l in ('en', p.source) if l in entries]
    for lang, e in entries.items():
        chain = [l for l in p.registry[lang].get('fallback', []) + fallback_all if l in entries and l != lang]
        e['fallback'] = list(dict.fromkeys(chain))
    changed = (set(entries) != set(prev_langs)
               or any(entries[l]['hash'] != prev_langs[l].get('hash') or entries[l]['status'] != prev_langs[l].get('status') for l in entries))
    manifest = {
        'schema': SCHEMA, 'product': p.cfg['product'], 'compat': p.cfg['compat'],
        'revision': prev.get('revision', 0) + 1 if changed or not prev else prev['revision'],
        'updatedAt': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ') if changed or not prev else prev.get('updatedAt'),
        'sourceLanguage': p.source, 'fallbackLanguage': fallback_all[0] if fallback_all else p.source,
        'texts': p.report(p.source)['total'], 'languages': entries,
    }
    write_json(manifest_path, manifest)
    prefix = '%s/c%d' % (p.cfg['cdn']['textPrefix'].strip('/'), p.cfg['compat'])
    out = p.root / p.cfg['dist'] / prefix
    if out.is_dir():
        shutil.rmtree(out)
    plan = []
    for lang, body in packs.items():
        dest = out / entries[lang]['file']
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        plan.append({'file': (Path(prefix) / entries[lang]['file']).as_posix(), 'key': prefix + '/' + entries[lang]['file'],
                     'contentType': 'application/json; charset=utf-8', 'cacheControl': 'public, max-age=31536000, immutable'})
    write_json(out / 'manifest.json', manifest)
    plan.append({'file': prefix + '/manifest.json', 'key': prefix + '/manifest.json',
                 'contentType': 'application/json; charset=utf-8', 'cacheControl': 'public, max-age=60', 'last': True})
    plan_path = p.root / p.cfg['dist'] / 'upload-plan.text.json'
    write_json(plan_path, {'base': p.cfg['cdn']['baseUrl'], 'order': 'every file first, the manifest last', 'files': plan})
    bundle = p.cfg['bundle']
    if not a.no_bundle:
        want = list(entries) if bundle['languages'] == 'all' else [l for l in entries if l in bundle['languages']]
        for folder in bundle['copyTo']:
            dest = (p.root / folder).resolve()
            dest.mkdir(parents=True, exist_ok=True)
            for old_file in dest.glob('*.json'):
                if old_file.stem in p.registry and old_file.stem not in want:
                    old_file.unlink()
            for lang in want:
                (dest / (lang + '.json')).write_bytes(packs[lang])
            local = copy.deepcopy(manifest)
            local['languages'] = {l: dict(e, file=l + '.json') for l, e in manifest['languages'].items() if l in want}
            write_json(dest / 'manifest.json', local)
            print('bundle: %d languages -> %s' % (len(want), dest.as_posix()))
    ready = [l for l, e in entries.items() if e['status'] == 'ready']
    bumped = [l for l in entries if not prev_langs.get(l) or prev_langs[l].get('hash') != entries[l]['hash']]
    print('pack: revision %d, %d languages (%d ready), %d changed%s' % (
        manifest['revision'], len(entries), len(ready), len(bumped), ': ' + ' '.join(bumped) if bumped else ''))
    print('dist: %s   upload plan: %s' % (out.as_posix(), plan_path.as_posix()))
    return 0


def cmd_languages(p, a):
    reg = p.registry if p else {e['code']: e for e in read_json(SKILL / 'assets' / 'languages.json')['languages']}
    enabled = p.enabled() if p else []
    print('%-8s %-26s %-22s %-5s %-4s %-6s %-28s %s' % ('code', 'name', 'native', 'voice', 'dir', 'script', 'plural forms', 'project'))
    for code, e in reg.items():
        mark = ''
        if p:
            mark = 'source' if code == p.source else 'blocked: ' + ','.join(p.blocked(code)) if code in enabled and p.blocked(code) else 'on' if code in enabled else '-'
        print('%-8s %-26s %-22s %-5s %-4s %-6s %-28s %s' % (code, e['name'], e['native'], 'yes' if e.get('voice') else '', e['dir'], e['script'], ' '.join(e['plurals']), mark))
    return 0


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description='Text packs of the i18n-multilang skill.')
    ap.add_argument('--config', help='i18n.config.json or its folder (default: found from the current folder)')
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('init', help='scaffold an i18n folder')
    s.add_argument('--dir', default='i18n')
    s.add_argument('--product', required=True)
    s.add_argument('--source', default='en', help='the language the texts are written in first')
    s = sub.add_parser('status', help='coverage of every language')
    s.add_argument('--json', action='store_true')
    s = sub.add_parser('todo', help='the texts a language still needs, as JSON')
    s.add_argument('--lang', required=True)
    s.add_argument('--ns', help='only these namespaces (comma separated)')
    s.add_argument('--limit', type=int, help='at most this many texts (translate in batches)')
    s.add_argument('--out', help='write to this file instead of the screen')
    s = sub.add_parser('apply', help='merge a file of translations: {"lang": "ja", "items": {"ns:key": "…"}}')
    s.add_argument('file')
    s.add_argument('--force', action='store_true', help='also overwrite locked texts')
    s.add_argument('--lock', action='store_true', help='lock the applied texts (a person reviewed them)')
    s = sub.add_parser('stamp', help='mark translations that already exist as up to date with the source')
    s.add_argument('--lang')
    s.add_argument('--all', action='store_true')
    s.add_argument('--stale', action='store_true', help='also re-stamp stale texts (only after checking each one)')
    s = sub.add_parser('sync', help='find (and with --write remove) keys the source no longer has')
    s.add_argument('--write', action='store_true')
    s = sub.add_parser('check', help='validate the files; exit 1 on an error')
    s.add_argument('--lang')
    s.add_argument('--strict', action='store_true', help='warnings fail too')
    s = sub.add_parser('pack', help='build dist/, manifest.json and the bundle copies')
    s.add_argument('--allow-regress', action='store_true')
    s.add_argument('--no-bundle', action='store_true')
    sub.add_parser('languages', help='the language registry')
    s = sub.add_parser('versions', help='text version and voice version of every language, and what lags')
    s.add_argument('--json', action='store_true')
    s = sub.add_parser('plural', help='the plural form of a number in a language')
    s.add_argument('number', type=int)
    s.add_argument('--lang', required=True)
    a = ap.parse_args(argv)
    if a.cmd == 'init':
        return cmd_init(a)
    if a.cmd == 'plural':
        print(plural_category(a.lang, a.number))
        return 0
    if a.cmd == 'languages':
        cfg = find_config(a.config, required=False)
        return cmd_languages(Project(cfg) if cfg else None, a)
    p = Project(find_config(a.config))
    return {'status': cmd_status, 'todo': cmd_todo, 'apply': cmd_apply, 'stamp': cmd_stamp, 'sync': cmd_sync,
            'check': cmd_check, 'pack': cmd_pack, 'versions': cmd_versions}[a.cmd](p, a)


if __name__ == '__main__':
    sys.exit(main() or 0)
