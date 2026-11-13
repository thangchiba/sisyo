# Numbers in voice

> A typical report: "1234" is read "một, hai trăm ba mươi bốn" when it must be "một nghìn hai trăm ba mươi bốn";
> "105" must be "một trăm linh năm" or "một trăm lẻ năm", never "một trăm năm". Every language has its own version
> of this.

## Why it goes wrong

A TTS model reads characters, not quantities. Given `1234`, `1 234` or `1.234` it guesses, and the guess depends on
the language, the separator and the words around it. Even with the right words it can swallow the small ones when it
speaks fast (one cloned voice was measured saying 1234 at 9.2 syllables/s and dropping "nghìn", "trăm", "mươi").

So there are two rules, one before the voice and one after:

1. **The text sent to the voice never contains a digit.** Every number is written out in words by a deterministic
   tool, in the reading the language really uses.
2. **Every clip with a number is checked by a recogniser**: the exact number must be heard, whole and in order. A
   clip that fails is made again; it is never shipped on trust.

## The tool: `scripts/numwords.py`

```bash
python numwords.py spell 1234 --lang vi            # một nghìn hai trăm ba mươi bốn
python numwords.py spell 105 --all                 # the 10 voice languages
python numwords.py speak --lang vi "Bạn có 1234 sao và 105 xu."
#  {"speak": "Bạn có một nghìn hai trăm ba mươi bốn sao và một trăm linh năm xu.", "numbers": [1234, 105], "issues": []}
python numwords.py heard --lang vi --numbers 1234 "bạn có một hai trăm ba mươi bốn sao"     # exit 1: 1234 not heard
python numwords.py selftest
```

`voice.py plan` calls `speak` for every line, so the `speak` text and the `numbers` list arrive with each line to
synthesise. From Python: `numwords.speak(text, lang, style)`, `numwords.spell(n, lang)`, `numwords.heard(numbers,
transcript, lang)`.

Range: whole numbers 0 … 999,999,999,999. Also decimals written with the language's own mark (vi `3,5` → "ba phẩy
năm", en `3.5` → "three point five": the digits after the mark one by one), a leading minus, and digit strings with a
leading zero (`007` → "không không bảy").

## Readings (what the tool writes)

| | 105 | 1234 | 1005 | 21 |
|---|---|---|---|---|
| vi | một trăm linh năm | một nghìn hai trăm ba mươi bốn | một nghìn không trăm linh năm | hai mươi mốt |
| en | one hundred five | one thousand two hundred thirty-four | one thousand five | twenty-one |
| ja | ひゃくご | せんにひゃくさんじゅうよん | せんご | にじゅういち |
| ko | 백오 | 천이백삼십사 | 천오 | 이십일 |
| zh-Hans | 一百零五 | 一千二百三十四 | 一千零五 | 二十一 |
| es | ciento cinco | mil doscientos treinta y cuatro | mil cinco | veintiuno |
| pt-BR | cento e cinco | mil duzentos e trinta e quatro | mil e cinco | vinte e um |
| de | einhundertfünf | eintausendzweihundertvierunddreißig | eintausendfünf | einundzwanzig |
| fr | cent cinq | mille deux cent trente-quatre | mille cinq | vingt et un |
| id | seratus lima | seribu dua ratus tiga puluh empat | seribu lima | dua puluh satu |

## What each language gets wrong without the rules

| Language | The traps the tool handles |
|---|---|
| **vi** | the zero tens: 105 "một trăm **linh** năm" (or "**lẻ**"), never "một trăm năm" (= 150); the zero hundreds after a thousand: 1005 "một nghìn **không trăm** linh năm"; 15 "mười **lăm**", 25 "hai mươi **lăm**"; 21 "hai mươi **mốt**"; 10 "mười" but 20 "hai **mươi**" |
| **en** | no "and" by default (US: "one hundred five"); hyphen in 21–99 |
| **ja** | sound changes: 300 さん**び**ゃく, 600 ろ**っぴ**ゃく, 800 は**っぴ**ゃく, 3000 さん**ぜ**ん, 8000 は**っ**せん; 4 よん, 7 なな, 9 きゅう; 10,000 **いち**まん; 10,000,000 いっせんまん. Written in kana so nothing is left to read |
| **ko** | Sino-Korean for plain numbers; 10,000 is 만 (not 일만), 100,000,000 is 일억 |
| **zh-Hans** | 零 for a skipped place: 105 一百**零**五, 1005 一千**零**五; 110 一百**一**十; 10 is 十 but 一十 after a hundred; 2 is 两 before 千 / 万 / 亿 and before a measure word (2个 → 两个) |
| **es** | 100 "cien" but 101 "ciento uno"; 21 "veintiuno" but 21,000 "veinti**ún** mil"; 1,000 "mil" (not "un mil"); 10⁹ "mil millones" |
| **pt-BR** | "e" between hundreds, tens and units, and before the last group when it is under 100 or a round hundred: 1,200 "mil **e** duzentos", 1,234 "mil duzentos e trinta e quatro"; 100 "cem", 105 "cento e cinco"; 10⁹ "um bilhão" |
| **de** | units before tens: 21 "**ein**und**zwanzig**"; "eins" only at the very end (101 "einhunderteins", 1,001 "eintausendeins"); 16 "sechzehn", 17 "siebzehn", 30 "dreißig"; "eine Million" |
| **fr** | 70–99: "soixante-dix", "quatre-vingts", "quatre-vingt-onze"; "et" only in 21, 31 … 61 and 71; "quatre-vingts" and "deux cents" lose the s before another number or "mille" |
| **id** | the se- forms: 10 "sepuluh", 11 "sebelas", 100 "seratus", 1,000 "seribu" (never "satu ribu"); 12–19 "… belas" |

## What the tool will not guess: issues

`speak` returns `issues` when a number's reading depends on something only a person or the author knows. A line with
an issue is `blocked` in `voice.py plan` until it is settled, in this order of preference:

1. **Change the shown text** so nothing is left to guess: `1500` instead of `1.500` (the rule for whole numbers below
   10,000 anyway, [format.md](format.md)), words instead of a symbol where the screen allows it.
2. Otherwise **write the spoken text** with `voice.py say` (next section).

| Issue | Example | Why it is not guessed |
|---|---|---|
| `ambiguous` | `1.234`, `1,234`, `12.000`, `1 234` | one thousand two hundred thirty-four, or one point two three four, or two numbers? Vietnamese and German group with a dot, English with a comma, French with a space. (Two or more groups, `1.234.567`, and groups split by a no-break space are read as one number.) |
| `symbol` | `50%`, `12:30`, `3/4`, `2+3`, `5°`, `$10` | percent, time, fraction, date, score and sum are read differently in every language |
| `glued` | `A4`, `3D`, `5kg`, `1st`, `x2` | letters and digits together are a name, a unit or an ordinal |
| `counter` | ja `3つ`, `1本`, `2人`; ko `3개`, `5명` | Japanese counters change the reading (みっつ, いっぽん, ふたり); Korean counts things with native numbers (세 개, 다섯 명) but minutes and money with Sino-Korean ones |
| `large` | 10¹² and above | write it |

Things the tool cannot see at all, to settle when writing a line: years ("2026" as a year is "twenty twenty-six" in
English, "zweitausendsechsundzwanzig" in German), ordinals ("thứ 2", "le 1er", German "3." before a noun), phone
numbers and codes (write them with a leading zero or as words so they are read digit by digit), Spanish and
Portuguese gender agreement (doscient**as** monedas, du**as** estrelas), Roman numerals, and a product's own symbols.
A maths game's operators ("+", "×", "=") are the product's vocabulary: the product's voice tool maps them to words
before `speak` sees the text.

## Writing the spoken text by hand: `voice.py say`

```bash
python voice.py say --lang ja --id game:say.reward "ほしを せんごひゃっこと コインを ひゃくごまい もらったよ！"
python voice.py say --lang vi --id shop:say.sale "Giảm năm mươi phần trăm hôm nay"
```

It writes the override into `i18n/voice/speak/<lang>.json`:

```json
{ "game:say.reward": { "text": "ほしを 1500こと コインを 105まい もらったよ！", "speak": "ほしを せんごひゃっこと コインを ひゃくごまい もらったよ！" } }
```

and from then on the tool holds the override to three rules, so a hand-written reading cannot drift:

- **It says the numbers the shown text shows.** The numbers are read from the shown text (`1500`, `105`) and each
  must be found in the spoken text in one of its accepted readings, counter readings included (ひゃっこ, みっつ,
  세 개). "Giảm năm phần trăm" for a text that shows `50%` is refused. The same list goes with the line to the check
  after synthesis.
- **It contains no digit.**
- **It belongs to one shown text.** `text` records the sentence it was written for. When that sentence changes (the
  reward becomes 2000), the line is `blocked` again until the spoken text is rewritten: an old reading never
  survives a changed number.

For a draft, `numwords.py speak --lenient --lang vi "…1.500…"` prints the text with grouped numbers read by the
language's own convention. It never invents a reading for symbols or counters. If a correct reading is one the tool
does not know (a year said as "twenty twenty-six", a product name with a number), pass `--numbers` with the numbers
the spoken text really says (`--numbers ""` for none) and note why in the commit.

## Style choices (per project, in `i18n.config.json` → `voice.numberStyle`)

| Language | Option | Default | Other |
|---|---|---|---|
| vi | `linh` | `linh` (một trăm linh năm) | `lẻ` (một trăm lẻ năm) |
| vi | `four` | `bốn` (ba mươi bốn) | `tư` (ba mươi tư) |
| vi | `thousand` | `nghìn` | `ngàn` |
| en | `and_` | `false` (one hundred five) | `true` (one hundred and five) |
| ja | `zero` | `ゼロ` | `れい` |
| zh-Hans | `liang` | `true` (两千) | `false` (二千) |

Both readings in each pair are correct, and the check after synthesis accepts both. What matters is one style per
product per language: a child must not hear "linh" in one question and "lẻ" in the next.

## After synthesis: was the number said?

`numwords.heard(numbers, transcript, lang)` takes the `numbers` list that came with the line and what a recogniser
wrote, and answers whether each number stands in the transcript whole and in order. It accepts the usual spoken
variants (linh / lẻ, bốn / tư, nghìn / ngàn, with or without "and", kana or kanji, 两 or 二, the readings before a
counter or a feminine noun: ひゃっこ, みっつ, 세 개, una, duas, une) and digits ("1.234", "1,234"). In the languages
written with spaces it rejects a match that is part of a longer number: 234 inside "một nghìn hai trăm ba mươi
bốn", "one hundred" inside "one hundred five" or "one hundred and five". A number after an ordinary "and / y / e /
et" ("stars and one hundred five coins") is its own number.

This is the floor for every product. It catches a swallowed "nghìn", swapped or missing numbers
and wrong order. It does not judge pronunciation, accent or pace, and in Japanese, Korean, Chinese and German (no
spaces between number words) it only checks that the reading is present, so small numbers are weakly checked there.
A product with many numbers adds its own gates. Gates that have proved their worth: two recognisers for Vietnamese,
exact kana comparison for Japanese, a pace limit for numbers (6.5 syllables/s for vi and en, 10 morae/s for ja),
pause and voice-quality checks.

A number that keeps failing after three takes at a slower speed is a line to rewrite (split the sentence, move the
number to the end), not a clip to accept.

## Building numbers from pieces

A game that speaks arbitrary numbers at runtime (a maths game's questions) cannot record every number. Compose them from
recorded pieces **with the same reading rules** as this tool (the game's number composer and `numwords` must agree: a
test spells 0–9999 with both and compares), cut the pieces from carrier sentences so they sound connected, and run the
`heard` check on assembled samples, not only on the pieces.
