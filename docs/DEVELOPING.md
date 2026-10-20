<sub>[Med Math docs](README.md) › Under the hood</sub>

# Developing

These are the working notes for changing Med Math itself: what each file does, how a problem is made and checked,
the tests, the walk and deploying. Everything a user needs is in the other pages.

## How it runs

Plain ES modules in `app/`, no framework, no build step and no network calls apart from loading its own files.

| File | What |
|---|---|
| `app/index.html`, `app/style.css` | The page: header, footer, the notebook look, light and dark, phone to wide screen, print styles for the formula sheet. |
| `app/js/main.js` | Routing (`#/`, `#/practice/<topic>`, `#/quiz`, `#/formulas`, `#/settings`), the screens, the answer flow, the quiz and the step-by-step Show me. `window.__medmath` is there for checks. |
| `app/js/topics.js` | The 14 topics. Each has `generate(rng, settings)`, which picks the numbers (the "given"), and `build(given, settings)`, which writes the order lines, the question, the trains, the steps and the answer key. Also the drug lists, `GROUPS` for the home screen and a seeded random number generator. |
| `app/js/frac.js` | Exact fractions on BigInt, with half-up rounding to any step and an exact rounded square root (for BSA). |
| `app/js/train.js` | A train is a list of cars (fractions with units). `solve()` multiplies them out exactly and pairs up the units that cancel. |
| `app/js/rules.js` | The rounding rules and the default settings. |
| `app/js/formulas.js` | The second, independent way to work every answer out (see below). |
| `app/js/answer.js` | Reading answers (0.5, .5, 1/2, ½, 1,000, "10 mL", 7:30 PM) and judging them. |
| `app/js/trainview.js` | Draws a train as SVG: the engine, cars, couplers and signs, pencil strikes, underlines, the caboose with its highlighter, wrapping onto more tracks, the BSA square root, and the animation timings. |
| `app/js/fmt.js` | Writing numbers (leading zero, no trailing zero, commas), clock times and durations. |
| `app/js/store.js` | Settings and progress in localStorage, every access wrapped, with an in-memory fallback. |

## How a problem is made and checked

A topic's `generate()` picks realistic numbers and keeps trying until the problem is clean and sensible (an injection
under 3 mL IM, a drip rate you could count, a safe-dose order well clear of the edges of its range, and so on). Then
`build()` turns those numbers into the order text and one or more trains. Every train is multiplied out with exact
fractions, and `T()` in `topics.js` refuses to build a train whose leftover units aren't the ones it wants, so a
wrongly set-up train can't slip through. The rounding rule is applied to the exact value at the end.

`formulas.js` is the check. It takes the same "given" numbers and works the answer out the way a textbook does, with
ordinary floating-point numbers, its own unit tables and its own rounding (it shifts the decimal point through a
string, so 1.005 really becomes 1.01). It doesn't import anything from the main path. It also returns the list of
numbers it used, and the test checks each of those is printed in the problem, which catches an order line that shows
a different number from the one the train used.

Some answers have accepted alternatives (`answer.alts`): the same sum without rounding the weight first, a dose
rounded before it's turned into mL, the unrounded BSA. The key is always the one with the usual rounding.

## Tests

```
tools/test.py            # the answer-key tests, prints a summary, exits 1 on any failure
tools/test.py --table    # with the per-topic table
```

It serves the repo on a free localhost port, opens `tools/test.html` in headless Chrome and reads the report. The
tests are in `tools/tests.js`:

1. The eleven worked examples on my checklist, exactly, including the in-between values (20 kg and 400 mg/day,
   100 units/mL, 1,600 mcg/mL and 400 mcg/min, 31.25 and 66.7 in the steps), both ways, and which typed answers count.
2. 1,000 random problems per topic with the default settings, and 400 more per topic with two other settings
   profiles (tenths, whole pump rates, kg in hundredths, 2.2046, 12-hour clock; and hundredths with 2.2046). For each:
   both ways agree, the units cancel, every number used is printed, nothing says "undefined" or "NaN", the key is
   written properly and accepted by the checker, a wrong answer isn't, and the answer is in a realistic range.
3. Small checks of rounding, writing numbers, the cancelling and the answer reader.

I also tried breaking it on purpose (rounding down instead of half up, a formula off by a little, an order line
showing the wrong number), and each of those fails hundreds of checks.

## The walk

```
tools/walk.py [URL] [OUTDIR] [--mobile] [--dark] [--quick]
```

It goes through the app with real key presses: a wrong answer and Enter, Show me, Enter to move on, a right answer,
progress being saved, five more topics with Show me (and that peeking isn't counted), the safe-dose choices with the
arrow keys, a clock answer, a whole quiz with two misses and Retry the misses, the formula sheet, a setting, and the
app with storage blocked. It screenshots every screen, checks there's no sideways scrolling and no page errors, and
exits 1 if anything failed. URL defaults to the local copy on my server.

`?seed=123` in the address makes the problems repeatable, which the walk and the screenshots use.

## Screenshots and the icon

`tools/docshots.py` takes every picture in `docs/images/` (with made-up progress so the rings have something to
show). `tools/make-icons.py` renders `design/icon.svg` into the PNG icons in `app/`. Both use headless Chrome through
`tools/cdp.py`, which needs the Python `websocket-client` package and Chrome (or `CHROME` pointing at one).

## Adding a topic

Write `generate()` and `build()` in `topics.js` and add it to `TOPICS` and `GROUPS`, add its formula to
`formulas.js`, and add a realistic-range check to `BOUNDS` in `tools/tests.js`. If `tools/test.py` passes with 1,000
problems and you've read a few dozen of them yourself, it's ready.

## Deploying

```
tools/deploy.sh
```

It copies `app/` with rsync to the folder my web server serves Med Math from. For your own server, change the
destination in the script. It's a folder of static files, so any web server works.
