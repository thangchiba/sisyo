#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""numwords.py - numbers as spoken words for the 10 voice languages (stdlib only, Python 3.8+).

Why: a TTS model that is handed digits guesses the reading ("1234" came out as "một, hai trăm ba mươi bốn"; "1 234"
and "1.234" are worse). So the text sent to the voice never holds a digit: this tool writes every number out, and the
same tables check what a recogniser heard afterwards.

  python numwords.py spell 1234 --lang vi          một nghìn hai trăm ba mươi bốn
  python numwords.py spell 105 --all               the reading in every voice language
  python numwords.py speak --lang vi "Bạn có 1234 sao"      JSON: speak text, the numbers found, the open issues
  python numwords.py heard --lang vi --numbers 1234 "bạn có một nghìn hai trăm ba mươi bốn sao"
  python numwords.py selftest

Languages: en ja es pt-BR ko zh-Hans de fr vi id. Range: 0 <= n < 10**12. Rules and pitfalls: references/numbers.md.
"""
import argparse
import json
import re
import sys
import unicodedata

LANGS = ('en', 'ja', 'es', 'pt-BR', 'ko', 'zh-Hans', 'de', 'fr', 'vi', 'id')
MAX = 10 ** 12


def _groups3(n):
    """1234567 -> [567, 234, 1] (low group first)."""
    g = []
    while n:
        g.append(n % 1000)
        n //= 1000
    return g


# ---------------------------------------------------------------- vi
_VI = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']


def _vi3(n, pad, linh, four):
    """0 < n < 1000. pad: a bigger group stands before this one, so the hundreds are always said (không trăm)."""
    h, t, u = n // 100, n // 10 % 10, n % 10
    w = []
    if h or pad:
        w += [_VI[h], 'trăm']
    if t == 0:
        if u:
            if w:
                w.append(linh)
            w.append(_VI[u])
    elif t == 1:
        w.append('mười')
        if u:
            w.append('lăm' if u == 5 else _VI[u])
    else:
        w += [_VI[t], 'mươi']
        if u == 1:
            w.append('mốt')
        elif u == 4:
            w.append(four)
        elif u == 5:
            w.append('lăm')
        elif u:
            w.append(_VI[u])
    return w


def vi(n, linh='linh', four='bốn', thousand='nghìn'):
    """105 một trăm linh năm (linh='lẻ' for the Southern word); 1234 một nghìn hai trăm ba mươi bốn (four='tư': ba mươi tư)."""
    if n == 0:
        return 'không'
    unit = ['', thousand, 'triệu', 'tỷ']
    g = _groups3(n)
    w = []
    for i in range(len(g) - 1, -1, -1):
        if g[i]:
            w += _vi3(g[i], bool(w), linh, four)
            if unit[i]:
                w.append(unit[i])
    return ' '.join(w)


# ---------------------------------------------------------------- en
_EN1 = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
        'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
_EN10 = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def _en3(n, and_):
    h, r = divmod(n, 100)
    w = []
    if h:
        w += [_EN1[h], 'hundred']
    if r:
        if h and and_:
            w.append('and')
        w.append(_EN1[r] if r < 20 else _EN10[r // 10] + ('-' + _EN1[r % 10] if r % 10 else ''))
    return w


def en(n, and_=False):
    """US reading by default (one hundred five); and_=True: one hundred and five, one thousand and five."""
    if n == 0:
        return 'zero'
    unit = ['', 'thousand', 'million', 'billion']
    g = _groups3(n)
    w = []
    for i in range(len(g) - 1, -1, -1):
        if g[i]:
            if and_ and i == 0 and w and g[i] < 100:
                w.append('and')
            w += _en3(g[i], and_)
            if unit[i]:
                w.append(unit[i])
    return ' '.join(w)


# ---------------------------------------------------------------- ja (hiragana; kanji as a second form)
_JA1 = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう']
_JA100 = ['', 'ひゃく', 'にひゃく', 'さんびゃく', 'よんひゃく', 'ごひゃく', 'ろっぴゃく', 'ななひゃく', 'はっぴゃく', 'きゅうひゃく']
_JA1000 = ['', 'せん', 'にせん', 'さんぜん', 'よんせん', 'ごせん', 'ろくせん', 'ななせん', 'はっせん', 'きゅうせん']
_KANJI = '〇一二三四五六七八九'


def _ja4(n):
    th, h, t, u = n // 1000, n // 100 % 10, n // 10 % 10, n % 10
    s = _JA1000[th] + _JA100[h]
    if t:
        s += ('' if t == 1 else _JA1[t]) + 'じゅう'
    return s + _JA1[u]


def _kanji4(n):
    s = ''
    for d, unit in ((n // 1000, '千'), (n // 100 % 10, '百'), (n // 10 % 10, '十')):
        if d:
            s += ('' if d == 1 else _KANJI[d]) + unit
    u = n % 10
    return s + (_KANJI[u] if u else '')


def ja(n, zero='ゼロ', script='kana'):
    """せんにひゃくさんじゅうよん; よん / なな / きゅう; さんびゃく ろっぴゃく はっぴゃく さんぜん はっせん; いっせんまん."""
    if script == 'kanji':
        if n == 0:
            return '零'
        oku, man, rest = n // 10 ** 8, n // 10 ** 4 % 10 ** 4, n % 10 ** 4
        s = ''
        if oku:
            s += ('一千' if oku == 1000 else _kanji4(oku)) + '億'
        if man:
            s += ('一千' if man == 1000 else _kanji4(man)) + '万'
        return s + _kanji4(rest)
    if n == 0:
        return zero
    oku, man, rest = n // 10 ** 8, n // 10 ** 4 % 10 ** 4, n % 10 ** 4
    s = ''
    if oku:
        s += ('いっせん' if oku == 1000 else _ja4(oku)) + 'おく'
    if man:
        s += ('いっせん' if man == 1000 else _ja4(man)) + 'まん'
    return s + _ja4(rest)


# ---------------------------------------------------------------- ko (Sino-Korean)
_KO1 = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']


def _ko4(n):
    s = ''
    for d, unit in ((n // 1000, '천'), (n // 100 % 10, '백'), (n // 10 % 10, '십')):
        if d:
            s += ('' if d == 1 else _KO1[d]) + unit
    return s + _KO1[n % 10]


def ko(n):
    """천이백삼십사; 만 (not 일만), 일억; a space between the 만 groups. Counting things (세 개, 다섯 명) is NOT this."""
    if n == 0:
        return '영'
    eok, man, rest = n // 10 ** 8, n // 10 ** 4 % 10 ** 4, n % 10 ** 4
    parts = []
    if eok:
        parts.append(_ko4(eok) + '억')
    if man:
        parts.append(('' if man == 1 else _ko4(man)) + '만')
    if rest:
        parts.append(_ko4(rest))
    return ' '.join(parts)


# ---------------------------------------------------------------- zh-Hans
_ZH = '零一二三四五六七八九'


def _zh4(n, lead):
    """0 < n < 10000. lead: nothing was said before, so 10..19 is 十X (not 一十X)."""
    s = ''
    zero = False
    for i, (d, unit) in enumerate(((n // 1000, '千'), (n // 100 % 10, '百'), (n // 10 % 10, '十'), (n % 10, ''))):
        if d == 0:
            zero = bool(s)
            continue
        if zero:
            s += '零'
            zero = False
        if i == 2 and d == 1 and not s and lead:
            s += '十'
        elif i == 0 and d == 2:
            s += '两千'
        else:
            s += _ZH[d] + unit
    return s


def zh(n, liang=True):
    """一千二百三十四; 一百零五; 一百一十; 两千 / 两万 (liang=False keeps 二 everywhere)."""
    if n == 0:
        return '零'
    yi, wan, rest = n // 10 ** 8, n // 10 ** 4 % 10 ** 4, n % 10 ** 4
    s = ''
    if yi:
        s += ('两' if yi == 2 else _zh4(yi, True)) + '亿'
    if wan:
        if s and wan < 1000:
            s += '零'
        s += ('两' if wan == 2 and not s else _zh4(wan, not s)) + '万'
    if rest:
        if s and (rest < 1000 or wan == 0):
            s += '零'
        s += _zh4(rest, not s)
    return s if liang else s.replace('两', '二')


# ---------------------------------------------------------------- es
_ES1 = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce',
        'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno',
        'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho',
        'veintinueve']
_ES10 = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
_ES100 = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos',
          'ochocientos', 'novecientos']


def _es3(n, apocope):
    """0 < n < 1000. apocope: before mil / millones (veintiún mil, ciento un mil)."""
    if n == 100:
        return ['cien']
    h, r = divmod(n, 100)
    w = []
    if h:
        w.append(_ES100[h])
    if r:
        if r < 30:
            w.append('un' if apocope and r == 1 else 'veintiún' if apocope and r == 21 else _ES1[r])
        else:
            t, u = divmod(r, 10)
            w.append(_ES10[t])
            if u:
                w += ['y', 'un' if apocope and u == 1 else _ES1[u]]
    return w


def _es6(n, apocope):
    th, r = divmod(n, 1000)
    w = []
    if th:
        if th > 1:
            w += _es3(th, True)
        w.append('mil')
    if r:
        w += _es3(r, apocope)
    return w


def es(n):
    """mil doscientos treinta y cuatro; ciento cinco; cien; veintiún mil; un millón; mil millones (10**9)."""
    if n == 0:
        return 'cero'
    m, r = divmod(n, 10 ** 6)
    w = []
    if m:
        w += ['un', 'millón'] if m == 1 else _es6(m, True) + ['millones']
    if r:
        w += _es6(r, False)
    return ' '.join(w)


# ---------------------------------------------------------------- pt-BR
_PT1 = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
        'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
_PT10 = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
_PT100 = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos',
          'oitocentos', 'novecentos']


def _pt3(n):
    if n == 100:
        return 'cem'
    h, r = divmod(n, 100)
    parts = []
    if h:
        parts.append(_PT100[h])
    if r:
        if r < 20:
            parts.append(_PT1[r])
        else:
            parts.append(_PT10[r // 10])
            if r % 10:
                parts.append(_PT1[r % 10])
    return ' e '.join(parts)


def pt(n):
    """mil duzentos e trinta e quatro; cento e cinco; mil e cem; um milhão e duzentos mil; um bilhão (10**9)."""
    if n == 0:
        return 'zero'
    g = _groups3(n) + [0, 0, 0]
    chunks = []
    if g[3]:
        chunks.append((g[3], 'um bilhão' if g[3] == 1 else _pt3(g[3]) + ' bilhões'))
    if g[2]:
        chunks.append((g[2], 'um milhão' if g[2] == 1 else _pt3(g[2]) + ' milhões'))
    if g[1]:
        chunks.append((g[1], 'mil' if g[1] == 1 else _pt3(g[1]) + ' mil'))
    if g[0]:
        chunks.append((g[0], _pt3(g[0])))
    s = chunks[0][1]
    for i, (value, text) in enumerate(chunks[1:], 1):
        last = i == len(chunks) - 1
        s += (' e ' if last and (value < 100 or value % 100 == 0) else ' ') + text
    return s


# ---------------------------------------------------------------- de
_DE1 = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf',
        'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn']
_DE10 = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig']


def _de3(n, final):
    """0 < n < 1000. final: the number ends here, so a last 1 is "eins"."""
    h, r = divmod(n, 100)
    s = _DE1[h] + 'hundert' if h else ''
    if r == 1:
        s += 'eins' if final else 'ein'
    elif r < 20:
        s += _DE1[r] if r else ''
    else:
        s += (_DE1[r % 10] + 'und' if r % 10 else '') + _DE10[r // 10]
    return s


def de(n):
    """eintausendzweihundertvierunddreißig; einhundertfünf; eine Million; eine Milliarde (10**9)."""
    if n == 0:
        return 'null'
    g = _groups3(n) + [0, 0, 0]
    parts = []
    if g[3]:
        parts.append('eine Milliarde' if g[3] == 1 else _de3(g[3], True) + ' Milliarden')
    if g[2]:
        parts.append('eine Million' if g[2] == 1 else _de3(g[2], True) + ' Millionen')
    low = (_de3(g[1], False) + 'tausend' if g[1] else '') + (_de3(g[0], True) if g[0] else '')
    if low:
        parts.append(low)
    return ' '.join(parts)


# ---------------------------------------------------------------- fr (France)
_FR1 = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
        'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
_FR10 = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']


def _fr2(n, final):
    if n < 20:
        return _FR1[n]
    if n < 70:
        t, u = divmod(n, 10)
        return _FR10[t] + ('' if u == 0 else ' et un' if u == 1 else '-' + _FR1[u])
    if n < 80:
        return 'soixante et onze' if n == 71 else 'soixante-' + _FR1[n - 60]
    if n == 80:
        return 'quatre-vingts' if final else 'quatre-vingt'
    return 'quatre-vingt-' + _FR1[n - 80]


def _fr3(n, final):
    """0 < n < 1000. final: nothing but million(s) / milliard(s) follows, so vingts and cents keep their s."""
    h, r = divmod(n, 100)
    w = []
    if h:
        w.append('cent' if h == 1 else _FR1[h] + (' cents' if r == 0 and final else ' cent'))
    if r:
        w.append(_fr2(r, final))
    return ' '.join(w)


def fr(n):
    """mille deux cent trente-quatre; cent cinq; quatre-vingts; quatre-vingt-onze; deux cents; un milliard (10**9)."""
    if n == 0:
        return 'zéro'
    g = _groups3(n) + [0, 0, 0]
    w = []
    if g[3]:
        w.append(_fr3(g[3], True) + (' milliard' if g[3] == 1 else ' milliards'))
    if g[2]:
        w.append(_fr3(g[2], True) + (' million' if g[2] == 1 else ' millions'))
    if g[1]:
        w.append('mille' if g[1] == 1 else _fr3(g[1], False) + ' mille')
    if g[0]:
        w.append(_fr3(g[0], True))
    return ' '.join(w)


# ---------------------------------------------------------------- id
_ID1 = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan']


def _id3(n):
    h, t, u = n // 100, n // 10 % 10, n % 10
    w = []
    if h:
        w.append('seratus' if h == 1 else _ID1[h] + ' ratus')
    if t == 1:
        w.append('sepuluh' if u == 0 else 'sebelas' if u == 1 else _ID1[u] + ' belas')
    else:
        if t:
            w.append(_ID1[t] + ' puluh')
        if u:
            w.append(_ID1[u])
    return ' '.join(w)


def id_(n):
    """seribu dua ratus tiga puluh empat; seratus lima; sebelas; satu juta; satu miliar (10**9)."""
    if n == 0:
        return 'nol'
    g = _groups3(n) + [0, 0, 0]
    w = []
    if g[3]:
        w.append(_id3(g[3]) + ' miliar')
    if g[2]:
        w.append(_id3(g[2]) + ' juta')
    if g[1]:
        w.append('seribu' if g[1] == 1 else _id3(g[1]) + ' ribu')
    if g[0]:
        w.append(_id3(g[0]))
    return ' '.join(w)


# ---------------------------------------------------------------- common API
_SPELL = {'vi': vi, 'en': en, 'ja': ja, 'ko': ko, 'zh-Hans': zh, 'es': es, 'pt-BR': pt, 'de': de, 'fr': fr, 'id': id_}
# style options a project may set (i18n.config.json -> voice.numberStyle.<lang>)
STYLE_KEYS = {'vi': ('linh', 'four', 'thousand'), 'en': ('and_',), 'ja': ('zero',), 'zh-Hans': ('liang',)}
_POINT = {'vi': 'phẩy', 'en': 'point', 'ja': 'てん', 'ko': '점', 'zh-Hans': '点', 'es': 'coma', 'pt-BR': 'vírgula',
          'de': 'Komma', 'fr': 'virgule', 'id': 'koma'}
_MINUS = {'vi': 'âm', 'en': 'minus', 'ja': 'マイナス', 'ko': '마이너스', 'zh-Hans': '负', 'es': 'menos', 'pt-BR': 'menos',
          'de': 'minus', 'fr': 'moins', 'id': 'minus'}
_DIGIT0 = {'ja': 'ゼロ', 'ko': '공'}                      # the word for 0 when digits are read one by one
_NOSPACE = ('ja', 'zh-Hans')                              # words are written without spaces
_DECIMAL_MARK = {'en': '.', 'ja': '.', 'ko': '.', 'zh-Hans': '.', 'vi': ',', 'de': ',', 'fr': ',', 'es': ',',
                 'pt-BR': ',', 'id': ','}
_GROUP_MARK = {'en': ',', 'ja': ',', 'ko': ',', 'zh-Hans': ',', 'vi': '.', 'de': '.', 'es': '.', 'pt-BR': '.',
               'id': '.', 'fr': ' '}


def _check_lang(lang):
    if lang not in _SPELL:
        raise ValueError('no number rules for %r (voice languages: %s)' % (lang, ' '.join(LANGS)))


def spell(n, lang, **style):
    """The cardinal number n in words. style: see STYLE_KEYS (unknown keys for the language are ignored)."""
    _check_lang(lang)
    if not 0 <= n < MAX:
        raise ValueError('%d is outside 0..10^12-1: write the reading by hand' % n)
    style = {k: v for k, v in style.items() if k in STYLE_KEYS.get(lang, ())}
    return _SPELL[lang](n, **style)


def spell_digits(digits, lang, **style):
    """Digits read one by one (codes, phone numbers, "007"): không không bảy."""
    _check_lang(lang)
    words = [_DIGIT0.get(lang) or spell(0, lang, **style) if d == '0' else spell(int(d), lang, **style) for d in digits]
    return ''.join(words) if lang == 'zh-Hans' else ' '.join(words)


def spell_decimal(whole, frac, lang, **style):
    """3.14 -> three point one four (the digits after the mark are read one by one)."""
    _check_lang(lang)
    a = spell(int(whole), lang, **style)
    b = spell_digits(frac, lang, **style)
    if lang == 'ja':
        zero = style.get('zero', 'ゼロ')
        if a == zero:
            a = 'れい'                                    # 0.5 れいてんご
        for end, new in (('いち', 'いっ'), ('はち', 'はっ'), ('じゅう', 'じゅっ')):
            if a.endswith(end):
                a = a[:-len(end)] + new                   # いってん, はってん, じゅってん
                break
        return a + 'てん' + b.replace(' ', '').replace('ゼロ', 'れい')
    if lang == 'zh-Hans':
        return a + _POINT[lang] + b
    return '%s %s %s' % (a, _POINT[lang], b)


_JA_GEMINATE = (('いち', 'いっ'), ('ろく', 'ろっ'), ('はち', 'はっ'), ('じゅう', 'じゅっ'), ('じゅう', 'じっ'), ('ひゃく', 'ひゃっ'))
_JA_NATIVE = {1: ['ひと'], 2: ['ふた'], 3: ['みっ'], 4: ['よっ'], 5: ['いつ'], 6: ['むっ'], 7: ['しち'], 8: ['やっ'],
              9: ['ここの'], 10: ['とお']}
_KO_NATIVE1 = ['', '한 하나', '두 둘', '세 셋', '네 넷', '다섯', '여섯', '일곱', '여덟', '아홉']
_KO_NATIVE10 = ['', '열', '스물 스무', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔']


def _ko_native(n):
    """Native Korean numbers 1..99, as said before a counter (세 개, 스무 살, 열두 명)."""
    if not 1 <= n <= 99:
        return []
    t, u = divmod(n, 10)
    return [a + b for a in (_KO_NATIVE10[t].split() if t else ['']) for b in (_KO_NATIVE1[u].split() if u else [''])]


def forms(n, lang):
    """Every accepted way to hear the cardinal n (for the check after synthesis), most usual first, plus the digits.
    Includes the readings a number takes before a counter or a feminine noun (ja ひゃっこ / みっつ, ko 세 개, es una,
    pt duas, fr une), so a correct clip is not refused."""
    _check_lang(lang)
    out = []
    if lang == 'vi':
        for thousand in ('nghìn', 'ngàn'):
            for linh in ('linh', 'lẻ'):
                for four in ('bốn', 'tư'):
                    s = vi(n, linh=linh, four=four, thousand=thousand)
                    out += [s, s.replace('mốt', 'một'), s.replace('tỷ', 'tỉ')]
    elif lang == 'en':
        out = [en(n), en(n, and_=True)]
    elif lang == 'ja':
        kana = ja(n)
        out = [kana, ja(n, script='kanji')]
        for end, new in _JA_GEMINATE:
            if kana.endswith(end):
                out.append(kana[:-len(end)] + new)        # ひゃっこ, いっぽん, じゅっぷん
        if kana.endswith('なな'):
            out.append(kana[:-2] + 'しち')
        if n > 10 and kana.endswith('よん'):
            out.append(kana[:-1])                          # じゅうよにん
        if n > 10 and kana.endswith('きゅう'):
            out.append(kana[:-3] + 'く')                   # じゅうくじ
        out += _JA_NATIVE.get(n, [])
        if n == 0:
            out += ['れい', '零', '〇']
    elif lang == 'ko':
        out = [ko(n)] + _ko_native(n)
    elif lang == 'zh-Hans':
        out = [zh(n), zh(n, liang=False)]
    elif lang == 'de':
        s = de(n)
        out = [s, re.sub(r'^ein(hundert|tausend)', r'\1', s)]      # hundertfünf, tausendzwei
    elif lang == 'es':
        s = es(n)
        out = [s, s.replace('ientos', 'ientas')]
        for t in list(out):
            if t.endswith('veintiuno'):
                out += [t[:-9] + 'veintiún', t[:-9] + 'veintiuna']
            elif t.endswith('uno'):
                out += [t[:-1], t[:-1] + 'a']              # un, una
    elif lang == 'pt-BR':
        s = pt(n)
        out = [s, s.replace('quatorze', 'catorze'), s.replace('entos', 'entas')]
        for t in list(out):
            if t.endswith('um'):
                out.append(t + 'a')                        # uma
            elif t.endswith('dois'):
                out.append(t[:-4] + 'duas')
    elif lang == 'fr':
        s = fr(n)
        out = [s] + ([s + 'e'] if s.endswith('un') else [])        # une, vingt et une
    else:
        out = [spell(n, lang)]
    out.append(str(n))
    seen = []
    for s in out:
        if s not in seen:
            seen.append(s)
    return seen


# ---------------------------------------------------------------- speak: digits in a text -> words, with the open issues
_SPACES = '   '                             # no-break, narrow no-break, thin: grouping spaces
_NUMBER = re.compile(
    r'(?P<sign>(?<![\w.,])[-−](?=\d))?'
    r'(?P<int>\d{1,3}(?:[' + _SPACES + r']\d{3})+(?!\d)'    # 1 234 567 with a no-break space
    r'|\d{1,3}(?:\.\d{3}){2,}(?!\d)|\d{1,3}(?:,\d{3}){2,}(?!\d)'   # 1.234.567 / 1,234,567
    r'|\d+)'
    r'(?:(?P<mark>[.,])(?P<frac>\d+))?(?![.,]?\d)')
_PLAIN_GROUP = re.compile(r'(?<![\d.,])\d{1,3}(?: \d{3})+(?![\d.,])')
_SYMBOLS = '%‰:/+=×÷*^°#$€£¥₫₩~<>'
_CJK = re.compile(r'[぀-ヿ㐀-鿿가-힯々〆ヵヶ]')
_CJK_RUN = re.compile(r'[぀-ヿ㐀-鿿가-힯々〆ヵヶ]{1,3}')


def _letter(ch):
    return bool(ch) and ch.isalpha()


def speak(text, lang, style=None, lenient=False):
    """Returns (speak_text, numbers, issues).

    speak_text: the text with every number written in words. numbers: the numbers the text holds, in order (int for
    a cardinal, str for a decimal "3.5" or a digit string "007"). issues: what a person or an agent must settle by
    writing the spoken text by hand (the `speak` override of the line): a number whose meaning is unclear ("1.234"),
    a number glued to letters or to a counter, a symbol next to a number. lenient=True reads grouped numbers by the
    language's convention instead of reporting them; it never invents a reading for symbols or counters.
    """
    _check_lang(lang)
    style = style or {}
    text = unicodedata.normalize('NFC', text)
    numbers, issues = [], []
    join = '' if lang in _NOSPACE else ' '

    def issue(kind, m_text, why):
        issues.append({'kind': kind, 'at': m_text, 'why': why})

    if not lenient:
        for m in _PLAIN_GROUP.finditer(text):
            issue('ambiguous', m.group(), 'digit groups split by a plain space: one number or several?')

    def repl(m):
        whole, mark, frac = m.group('int'), m.group('mark'), m.group('frac')
        before = text[m.start() - 1] if m.start() else ''
        after = text[m.end()] if m.end() < len(text) else ''
        token = m.group()
        cjk_before, cjk_after = bool(_CJK.match(before)), bool(_CJK.match(after))
        if (_letter(before) and not cjk_before) or (_letter(after) and not cjk_after):
            issue('glued', (before if _letter(before) else '') + token + (after if _letter(after) else ''),
                  'a number glued to letters (A4, 3D, 5kg, 1st): write how it is said')
            return token
        grouped = re.search(r'[.,' + _SPACES + r']', whole) is not None
        digits = re.sub(r'\D', '', whole)
        if frac is not None and not grouped and len(frac) == 3 and len(whole) <= 3 and not whole.startswith('0'):
            if not lenient:
                issue('ambiguous', token, '%s could be %s%s or the decimal %s.%s: write it without the mark (%s%s) or write the spoken text'
                      % (token, whole, frac, whole, frac, whole, frac))
                return token
            if mark == _GROUP_MARK[lang]:
                digits, frac, mark = whole + frac, None, None
        elif frac is not None and mark != _DECIMAL_MARK[lang] and not lenient:
            issue('ambiguous', token, 'the decimal mark of %s is %r, not %r' % (lang, _DECIMAL_MARK[lang], mark))
            return token
        if int(digits) >= MAX:
            issue('large', token, 'too large: write the reading by hand')
            return token
        negative = bool(m.group('sign'))
        sign = (_MINUS[lang] + join) if negative else ''
        if frac is not None:
            value = ('-' if negative else '') + digits + '.' + frac
        elif len(digits) > 1 and digits.startswith('0') and not grouped:
            value = digits
        else:
            value = -int(digits) if negative else int(digits)
        if (cjk_before or cjk_after) and not (lang == 'zh-Hans' and frac is None) and (lang in ('ja', 'ko') or not lenient):
            numbers.append(value)
            run = _CJK_RUN.match(text, m.end())
            issue('counter', token + (run.group() if run else ''),
                  'a number with a counter changes its reading (3つ みっつ, 1本 いっぽん, 3개 세 개): write the spoken text')
            return token
        for ch, shown in ((before, before + token), (after, token + after)):
            if ch and ch in _SYMBOLS:
                issue('symbol', shown, 'the symbol %r is left for the voice to guess: write the words' % ch)
        numbers.append(value)
        tail = '' if frac is not None or not mark else mark   # "3." at a sentence end: the mark is punctuation
        if frac is not None:
            return sign + spell_decimal(digits, frac, lang, **style)
        if isinstance(value, str):
            return sign + spell_digits(digits, lang, **style) + tail
        if lang == 'zh-Hans' and int(digits) == 2 and cjk_after and after not in '十百千万亿月日号点分秒年级楼层':
            return sign + '两' + tail                      # 2个 两个
        return sign + spell(int(digits), lang, **style) + tail

    return _NUMBER.sub(repl, text), numbers, issues


def numbers_in(text, lang, style=None):
    """The numbers a shown text holds, read by the language's own conventions ("1.500" in Vietnamese is 1500).
    For a line whose spoken text is written by hand: these are the numbers that spoken text must say."""
    return speak(text, lang, style, lenient=True)[1]


# ---------------------------------------------------------------- heard: were the numbers said?
_CONNECT = {'and', 'y', 'e', 'et'}                         # words that join number parts but also join ordinary phrases


def canon(text, lang):
    """A text reduced to what can be compared: case, punctuation and (for scripts without word spaces) spaces dropped."""
    t = unicodedata.normalize('NFKC', text).lower()
    if lang in ('ja', 'zh-Hans', 'ko', 'de'):
        return re.sub(r'[\W_]+', '', t)
    return ' '.join(re.sub(r"[^\w]+", ' ', t).split())


def _number_words(lang):
    """(structure words, unit words). Structure words only occur inside a number (trăm, nghìn, hundred, mil, vingt);
    unit words are the readings of 0..9. Found by spelling a sample of numbers."""
    sample = list(range(0, 130)) + [200, 300, 500, 700, 900, 1000, 2000, 10 ** 4, 10 ** 5, 10 ** 6, 2 * 10 ** 6, 10 ** 9]
    units = set()
    for n in range(0, 10):
        for f in forms(n, lang):
            units.update(canon(f, lang).split())
    words = set()
    for n in sample:
        for f in forms(n, lang):
            words.update(canon(f, lang).split())
    return ({w for w in words - units - _CONNECT if not w.isdigit()}, {u for u in units if not u.isdigit()})


_WORDS = {}


def heard(numbers, transcript, lang):
    """Checks that each expected number was said whole and in order in a text (a recogniser's transcript, or a
    hand-written spoken text).

    numbers: the list from speak() or numbers_in(). Returns (ok, details). A number counts when one of its accepted
    forms (words or digits) stands in the text and, in the languages written with spaces, is not part of a longer
    number ("hai trăm ba mươi bốn" inside "một nghìn hai trăm ba mươi bốn", "one hundred" inside "one hundred
    five"). This is the floor every project applies after synthesis; a project may add stricter gates on top.
    """
    _check_lang(lang)
    spaced = lang not in ('ja', 'zh-Hans', 'ko', 'de')
    if spaced and lang not in _WORDS:
        _WORDS[lang] = _number_words(lang)
    struct, units = _WORDS.get(lang, (set(), set()))
    # a unit right after a structure word continues the number (twenty five), except vi "năm" (also "year": 25 is
    # "hai mươi lăm") and "không"
    follow = units - {'năm', 'không'} if lang == 'vi' else units

    def part_of_longer(text, start, end, form):
        left, right = text[:start].split(), text[end:].split()
        last = form.split()[-1]
        if left:
            if left[-1] in struct or left[-1].isdigit():
                return True
            if left[-1] in _CONNECT and len(left) > 1 and left[-2] in struct:
                return True                                # two hundred and | thirty-four
        if right:
            if right[0] in struct or right[0].isdigit():
                return True
            if last in struct:
                if right[0] in follow:
                    return True                            # one hundred | five
                if right[0] in _CONNECT and len(right) > 1 and (right[1] in struct or right[1] in units or right[1].isdigit()):
                    return True                            # one hundred | and five
        return False

    raw = unicodedata.normalize('NFKC', transcript)
    variants = [canon(raw, lang), canon(re.sub(r'(?<=\d)[,.' + _SPACES + r' ](?=\d{3}(?!\d))', '', raw), lang)]
    details, ok = [], True
    for text in variants:
        details, ok, pos = [], True, 0
        for num in numbers:
            if isinstance(num, int):
                cand = forms(abs(num), lang)
            elif '.' in num:
                whole, frac = num.lstrip('-').split('.')
                cand = [spell_decimal(whole, frac, lang), whole + '.' + frac, whole + ',' + frac, whole + frac]
            else:
                cand = [spell_digits(num, lang), num]
            found = None
            for f in cand:
                c = canon(f, lang)
                if not c:
                    continue
                if spaced:
                    for m in re.finditer(r'(?<![\w])' + re.escape(c) + r'(?![\w])', text[pos:]):
                        if part_of_longer(text, pos + m.start(), pos + m.end(), c):
                            continue
                        found = (pos + m.start(), pos + m.end(), f)
                        break
                else:
                    i = text.find(c, pos)
                    while i >= 0 and c.isdigit() and ((i and text[i - 1].isdigit()) or text[i + len(c):i + len(c) + 1].isdigit()):
                        i = text.find(c, i + 1)
                    if i >= 0:
                        found = (i, i + len(c), f)
                if found:
                    break
            if found:
                pos = found[1]
                details.append({'number': num, 'heard': found[2]})
            else:
                ok = False
                details.append({'number': num, 'heard': None, 'expected': cand[0]})
        if ok:
            break
    return ok, details


# ---------------------------------------------------------------- self-test
_EXPECT = {
    'vi': {0: 'không', 5: 'năm', 10: 'mười', 11: 'mười một', 14: 'mười bốn', 15: 'mười lăm', 20: 'hai mươi',
           21: 'hai mươi mốt', 24: 'hai mươi bốn', 25: 'hai mươi lăm', 55: 'năm mươi lăm', 100: 'một trăm',
           101: 'một trăm linh một', 105: 'một trăm linh năm', 110: 'một trăm mười', 115: 'một trăm mười lăm',
           121: 'một trăm hai mươi mốt', 1000: 'một nghìn', 1005: 'một nghìn không trăm linh năm',
           1050: 'một nghìn không trăm năm mươi', 1234: 'một nghìn hai trăm ba mươi bốn', 10000: 'mười nghìn',
           15000: 'mười lăm nghìn', 100000: 'một trăm nghìn', 1000000: 'một triệu',
           1000001: 'một triệu không trăm linh một', 2500000: 'hai triệu năm trăm nghìn', 10 ** 9: 'một tỷ'},
    'en': {0: 'zero', 13: 'thirteen', 21: 'twenty-one', 100: 'one hundred', 105: 'one hundred five',
           110: 'one hundred ten', 1000: 'one thousand', 1005: 'one thousand five',
           1234: 'one thousand two hundred thirty-four', 10000: 'ten thousand', 100000: 'one hundred thousand',
           1000000: 'one million',
           1234567: 'one million two hundred thirty-four thousand five hundred sixty-seven', 10 ** 9: 'one billion'},
    'ja': {0: 'ゼロ', 4: 'よん', 7: 'なな', 9: 'きゅう', 10: 'じゅう', 14: 'じゅうよん', 20: 'にじゅう', 100: 'ひゃく',
           105: 'ひゃくご', 300: 'さんびゃく', 600: 'ろっぴゃく', 800: 'はっぴゃく', 1000: 'せん',
           1234: 'せんにひゃくさんじゅうよん', 3000: 'さんぜん', 8000: 'はっせん', 10000: 'いちまん',
           12345: 'いちまんにせんさんびゃくよんじゅうご', 100000: 'じゅうまん', 1000000: 'ひゃくまん',
           10000000: 'いっせんまん', 10 ** 8: 'いちおく'},
    'es': {0: 'cero', 16: 'dieciséis', 21: 'veintiuno', 22: 'veintidós', 30: 'treinta', 31: 'treinta y uno',
           100: 'cien', 101: 'ciento uno', 105: 'ciento cinco', 500: 'quinientos', 700: 'setecientos',
           900: 'novecientos', 1000: 'mil', 1001: 'mil uno', 1234: 'mil doscientos treinta y cuatro', 2000: 'dos mil',
           21000: 'veintiún mil', 100000: 'cien mil', 101000: 'ciento un mil', 1000000: 'un millón',
           2000000: 'dos millones', 10 ** 9: 'mil millones'},
    'pt-BR': {0: 'zero', 14: 'quatorze', 16: 'dezesseis', 19: 'dezenove', 21: 'vinte e um', 100: 'cem',
              101: 'cento e um', 105: 'cento e cinco', 200: 'duzentos', 1000: 'mil', 1001: 'mil e um',
              1100: 'mil e cem', 1200: 'mil e duzentos', 1234: 'mil duzentos e trinta e quatro', 2000: 'dois mil',
              2500: 'dois mil e quinhentos', 10000: 'dez mil', 100000: 'cem mil', 1000000: 'um milhão',
              1200000: 'um milhão e duzentos mil', 1250000: 'um milhão duzentos e cinquenta mil',
              2000000: 'dois milhões', 10 ** 9: 'um bilhão'},
    'ko': {0: '영', 1: '일', 10: '십', 11: '십일', 16: '십육', 20: '이십', 100: '백', 105: '백오', 110: '백십',
           1000: '천', 1234: '천이백삼십사', 10000: '만', 12345: '만 이천삼백사십오', 100000: '십만', 110000: '십일만',
           1000000: '백만', 10 ** 8: '일억'},
    'zh-Hans': {0: '零', 2: '二', 10: '十', 11: '十一', 20: '二十', 100: '一百', 101: '一百零一', 105: '一百零五',
                110: '一百一十', 111: '一百一十一', 200: '二百', 1000: '一千', 1001: '一千零一', 1010: '一千零一十',
                1100: '一千一百', 1234: '一千二百三十四', 2000: '两千', 10000: '一万', 10005: '一万零五',
                12000: '一万两千', 20000: '两万', 100000: '十万', 1000000: '一百万', 10 ** 8: '一亿'},
    'de': {0: 'null', 1: 'eins', 11: 'elf', 16: 'sechzehn', 17: 'siebzehn', 21: 'einundzwanzig', 30: 'dreißig',
           100: 'einhundert', 101: 'einhunderteins', 105: 'einhundertfünf', 1000: 'eintausend',
           1001: 'eintausendeins', 1234: 'eintausendzweihundertvierunddreißig', 10000: 'zehntausend',
           100000: 'einhunderttausend', 1000000: 'eine Million', 2000000: 'zwei Millionen',
           1234567: 'eine Million zweihundertvierunddreißigtausendfünfhundertsiebenundsechzig',
           10 ** 9: 'eine Milliarde'},
    'fr': {0: 'zéro', 16: 'seize', 17: 'dix-sept', 21: 'vingt et un', 22: 'vingt-deux', 70: 'soixante-dix',
           71: 'soixante et onze', 80: 'quatre-vingts', 81: 'quatre-vingt-un', 90: 'quatre-vingt-dix',
           91: 'quatre-vingt-onze', 99: 'quatre-vingt-dix-neuf', 100: 'cent', 101: 'cent un', 105: 'cent cinq',
           200: 'deux cents', 201: 'deux cent un', 1000: 'mille', 1234: 'mille deux cent trente-quatre',
           2000: 'deux mille', 80000: 'quatre-vingt mille', 200000: 'deux cent mille', 1000000: 'un million',
           2000000: 'deux millions', 10 ** 9: 'un milliard'},
    'id': {0: 'nol', 10: 'sepuluh', 11: 'sebelas', 12: 'dua belas', 20: 'dua puluh', 21: 'dua puluh satu',
           100: 'seratus', 105: 'seratus lima', 110: 'seratus sepuluh', 111: 'seratus sebelas', 200: 'dua ratus',
           1000: 'seribu', 1001: 'seribu satu', 1234: 'seribu dua ratus tiga puluh empat', 2000: 'dua ribu',
           10000: 'sepuluh ribu', 11000: 'sebelas ribu', 100000: 'seratus ribu', 1000000: 'satu juta',
           10 ** 9: 'satu miliar'},
}


def selftest():
    bad = 0

    def expect(label, got, want):
        nonlocal bad
        if got != want:
            bad += 1
            print('FAIL %s\n   got  %r\n   want %r' % (label, got, want))

    for lang, table in _EXPECT.items():
        for n, want in table.items():
            expect('%s %d' % (lang, n), spell(n, lang), want)
        seen = {}
        for n in list(range(0, 2001)) + [9999, 10000, 10001, 99999, 100000, 123456, 999999, 10 ** 6, 10 ** 9 + 1]:
            s = spell(n, lang)
            if s in seen:
                bad += 1
                print('FAIL %s: %d and %d are both %r' % (lang, seen[s], n, s))
            seen[s] = n
    # the two Vietnamese styles
    expect('vi lẻ', spell(105, 'vi', linh='lẻ'), 'một trăm lẻ năm')
    expect('vi tư', spell(1234, 'vi', four='tư'), 'một nghìn hai trăm ba mươi tư')
    expect('en and', spell(1005, 'en', and_=True), 'one thousand and five')
    expect('ja kanji', ja(1234, script='kanji'), '千二百三十四')
    expect('digits', spell_digits('007', 'vi'), 'không không bảy')
    expect('decimal en', spell_decimal('3', '14', 'en'), 'three point one four')
    expect('decimal ja', spell_decimal('1', '5', 'ja'), 'いってんご')
    expect('decimal vi', spell_decimal('0', '5', 'vi'), 'không phẩy năm')
    # speak
    s, nums, iss = speak('Bạn có 1234 sao và 105 xu.', 'vi')
    expect('speak vi', (s, nums, iss),
           ('Bạn có một nghìn hai trăm ba mươi bốn sao và một trăm linh năm xu.', [1234, 105], []))
    s, nums, iss = speak('You have 1,234,567 points.', 'en')
    expect('speak en grouped', (s, nums, len(iss)),
           ('You have one million two hundred thirty-four thousand five hundred sixty-seven points.', [1234567], 0))
    for text, lang, kind in (('Bạn có 1.234 sao', 'vi', 'ambiguous'), ('Bạn có 1 234 sao', 'vi', 'ambiguous'),
                             ('Giảm 50%', 'vi', 'symbol'), ('りんごを3つ', 'ja', 'counter'), ('사과 3개', 'ko', 'counter'),
                             ('Level 5kg', 'en', 'glued'), ('12:30 に', 'ja', 'symbol')):
        _, _, iss = speak(text, lang)
        expect('issue %s %r' % (lang, text), [i['kind'] for i in iss][:1], [kind])
    expect('counter keeps its number', speak('りんごを3つ', 'ja')[1], [3])
    expect('numbers_in vi', numbers_in('Bạn đã nhận 1.500 sao và 105 xu!', 'vi'), [1500, 105])
    expect('numbers_in ja', numbers_in('ほしを 1,500こと コインを 105まい もらったよ！', 'ja'), [1500, 105])
    expect('numbers_in en', numbers_in('You got 1,500 stars and 105 coins!', 'en'), [1500, 105])
    expect('counter shown', [i['at'] for i in speak('コインを 105まい', 'ja')[2]], ['105まい'])
    expect('lenient vi', speak('Bạn có 1.234 sao', 'vi', lenient=True)[:2],
           ('Bạn có một nghìn hai trăm ba mươi bốn sao', [1234]))
    expect('zh liang', speak('我有2个苹果和12个梨', 'zh-Hans')[0], '我有两个苹果和十二个梨')
    expect('minus', speak('Nhiệt độ -5 độ', 'vi')[0], 'Nhiệt độ âm năm độ')
    expect('sentence end', speak('Chương 3.', 'vi')[:2], ('Chương ba.', [3]))
    # heard
    for lang, nums, text, want in (
            ('vi', [1234], 'Bạn có một nghìn hai trăm ba mươi bốn sao.', True),
            ('vi', [1234], 'bạn có một hai trăm ba mươi bốn sao', False),          # "nghìn" swallowed
            ('vi', [1234], 'Bạn có 1.234 sao', True),
            ('vi', [1234], 'bạn có một ngàn hai trăm ba mươi tư sao', True),
            ('vi', [105], 'một trăm lẻ năm', True),
            ('vi', [234], 'một nghìn hai trăm ba mươi bốn', False),                 # part of a longer number
            ('vi', [5], 'bạn có năm năm', True),
            ('vi', [3, 4], 'ba cộng bốn bằng mấy', True),
            ('vi', [3, 4], 'bốn cộng ba bằng mấy', False),                          # order
            ('en', [105], 'you have one hundred and five coins', True),
            ('en', [1234], 'You have 1,234 coins.', True),
            ('en', [34], 'two hundred thirty-four', False),
            ('ja', [1234], '千二百三十四です', True),
            ('ja', [1234], 'せんにひゃくさんじゅうよんです', True),
            ('ja', [1234], '二百三十四です', False),
            ('zh-Hans', [2000], '我有二千个', True),
            ('ko', [1234], '천 이백 삼십 사 입니다', True),
            ('de', [1234], 'Du hast 1.234 Punkte', True),
            ('de', [105], 'du hast hundertfünf punkte', True),
            ('fr', [80], 'quatre-vingts points', True),
            ('es', [21000], 'veintiún mil puntos', True),
            ('pt-BR', [1200], 'mil e duzentos pontos', True),
            ('id', [1234], 'seribu dua ratus tiga puluh empat', True),
            # a number after "and / y / e / et" is not part of a longer one
            ('en', [1500, 105], 'You got one thousand five hundred stars and one hundred five coins!', True),
            ('en', [3, 2], 'three apples and two pears', True),
            ('en', [100], 'one hundred five', False),
            ('en', [100], 'one hundred and five coins', False),
            ('en', [34], 'two hundred and thirty-four', False),
            ('es', [3, 2], 'tres manzanas y dos peras', True),
            ('es', [30], 'treinta y uno', False),
            ('es', [200], 'doscientas monedas', True),
            ('fr', [3, 2], 'trois pommes et deux poires', True),
            ('fr', [4], 'quatre-vingts', False),
            ('pt-BR', [3, 2], 'três maçãs e duas peras', True),
            ('pt-BR', [20], 'vinte e um', False),
            ('id', [100], 'seratus lima', False),
            ('vi', [20], 'bạn đã chơi hai mươi năm', True),
            ('vi', [105], 'một trăm năm', False),
            ('vi', [100], 'một trăm linh năm', False),
            # readings before a counter
            ('ja', [1500, 105], 'ほしを せんごひゃっこと コインを ひゃくごまい もらったよ！', True),
            ('ja', [3], 'りんごを みっつ', True),
            ('ja', [1], 'えんぴつを いっぽん', True),
            ('ko', [3], '사과 세 개', True),
            ('ko', [12], '열두 명이 왔어요', True)):
        expect('heard %s %r %r' % (lang, nums, text), heard(nums, text, lang)[0], want)
    print('selftest: %s' % ('OK' if not bad else '%d FAILED' % bad))
    return 1 if bad else 0


def _style_args(pairs):
    style = {}
    for p in pairs or []:
        k, _, v = p.partition('=')
        style[k] = {'true': True, 'false': False, '1': True, '0': False}.get(v.lower(), v) if k in ('and_', 'liang') else v
    return style


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description='Numbers as spoken words for the 10 voice languages.')
    sub = ap.add_subparsers(dest='cmd', required=True)
    p = sub.add_parser('spell', help='one number in words')
    p.add_argument('number', type=int)
    p.add_argument('--lang')
    p.add_argument('--all', action='store_true', help='every voice language')
    p.add_argument('--style', nargs='*', metavar='KEY=VALUE', help='vi: linh=lẻ four=tư thousand=ngàn; en: and_=true; ja: zero=れい')
    p = sub.add_parser('speak', help='a text with its numbers in words, as JSON {speak, numbers, issues}')
    p.add_argument('text')
    p.add_argument('--lang', required=True)
    p.add_argument('--lenient', action='store_true')
    p.add_argument('--style', nargs='*', metavar='KEY=VALUE')
    p = sub.add_parser('heard', help='were these numbers said in this transcript? exit 0 yes, 1 no')
    p.add_argument('transcript')
    p.add_argument('--lang', required=True)
    p.add_argument('--numbers', required=True, help='comma separated, as speak printed them: 1234,105')
    sub.add_parser('selftest')
    a = ap.parse_args(argv)
    if a.cmd == 'selftest':
        return selftest()
    if a.cmd == 'spell':
        style = _style_args(a.style)
        if a.all or not a.lang:
            for lang in LANGS:
                print('%-8s %s' % (lang, spell(a.number, lang, **style)))
        else:
            print(spell(a.number, a.lang, **style))
        return 0
    if a.cmd == 'speak':
        text, numbers, issues = speak(a.text, a.lang, _style_args(a.style), a.lenient)
        print(json.dumps({'speak': text, 'numbers': numbers, 'issues': issues}, ensure_ascii=False, indent=2))
        return 2 if issues else 0
    if a.cmd == 'heard':
        nums = [int(x) if re.fullmatch(r'-?\d+', x) and not (len(x) > 1 and x.startswith('0')) else x
                for x in a.numbers.split(',') if x]
        ok, details = heard(nums, a.transcript, a.lang)
        print(json.dumps({'ok': ok, 'numbers': details}, ensure_ascii=False, indent=2))
        return 0 if ok else 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
