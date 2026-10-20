<p align="center">
  <img src="app/icon-512.png" width="120" alt="">
</p>
<h1 align="center">Med Math</h1>
<p align="center"><b>Dosage calculation practice for nursing students, with every answer worked out step by step.</b><br>Each answer is drawn as a little train of fractions, and you watch the units cancel.</p>
<p align="center">
  <img src="https://img.shields.io/badge/web-app-2F7D8C?style=flat-square" alt="Web app">
  <img src="https://img.shields.io/badge/works%20on-phone%20%C2%B7%20tablet%20%C2%B7%20computer-2F7D8C?style=flat-square" alt="Works on phone, tablet and computer">
  <img src="https://img.shields.io/badge/account-none-2F7D8C?style=flat-square" alt="Account: none">
  <img src="https://img.shields.io/badge/answer%20keys-checked%20two%20ways-2F7D8C?style=flat-square" alt="Answer keys checked two ways">
  <img src="https://img.shields.io/badge/license-MIT-2F7D8C?style=flat-square" alt="MIT license">
</p>
<p align="center">
  <a href="docs/README.md"><b>Docs</b></a> ·
  <a href="#use-it">Use it</a> ·
  <a href="#what-it-does">What it does</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="docs/the-train.md">How the train works</a>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/practice-dark.png">
  <img src="docs/images/practice-light.png" alt="Med Math on a computer: an order for amoxicillin 500 mg with 250 mg/5 mL on hand, answered 10 mL, and the train that works it out with mg struck through">
</picture>

Med Math is free, endless practice for the dosage calculations nursing students get tested on: tablets, liquids,
injections, drip rates, heparin, titrations and the rest. Every problem reads like a real order, and every answer
comes with a "Show me" that works it out the way nursing courses teach it, as a chain of fractions where the units
cancel. I draw that chain as a train on graph paper, which means you can actually SEE why the answer comes out in
mL/h and not in mg.

## Why I made it

Dosage calculation exams are one of those things nursing students worry about a lot, and for good reason: the pass
mark is often 90% or even 100%, because a wrong decimal point on the job is a wrong dose. The free practice I found
was either a page of answers with no working, or a handful of problems and then a paywall, and not much of it
showed the dimensional analysis that the courses actually use.

So I made one that never runs out of problems and always shows its work. Since a wrong answer key in a study tool is
worse than no tool at all, every answer in Med Math is worked out twice, two different ways, and a test checks that
both ways agree on thousands of problems before anything goes live. Basically, it's the practice book I'd want if I
had that exam coming up.

## What it does

### Practice
- **14 topics.** Metric conversions, household and weight conversions, tablets and capsules, oral liquids,
  injections, reconstitution, weight-based doses, safe-dose checks, BSA dosing, IV pump rates, gravity drip rates,
  infusion and finish times, heparin, and titrations.
- **Endless problems** that read like real orders ("Order: amoxicillin 500 mg PO every 8 hours. Available: 250 mg/5 mL.
  How many mL per dose?"), with numbers picked to be realistic and clean.
- **Check, Show me, Next.** The answer box shows its unit, Enter checks, and Enter again goes on. A wrong answer
  tells you the right one and offers "Show me".
- **Fair about rounding.** It accepts 0.5, .5, 1/2 and ½, an answer written with a few more decimals than needed, and
  the answer you get when you don't round the weight first.

### Show me
- **The fraction train.** The engine carries the unit you want, each fraction is a car, the units that cancel get
  struck through in pencil, and the caboose carries the answer under a highlighter.
- **Step by step,** with the rounding said in words ("31.25 gtt/min, rounded to whole drops: 31 gtt/min") and the
  same answer worked "the formula way" underneath (D/H × Q, mL × drop factor ÷ minutes, and so on).
- **Animated,** car by car, and drawn all at once if your device asks for less motion.

### Quiz, formulas, settings
- **Mixed quiz:** 10 problems from the topics you choose, a score at the end, the train for each one, and "Retry the
  misses" with the same numbers.
- **Formula sheet:** one printable card with every formula, the conversions and your rounding rules.
- **Settings:** liquid, pump-rate and weight rounding, 2.2 or 2.2046 lb in a kg, a 24-hour or 12-hour clock, and
  which topics go into the quiz.
- **Progress:** right out of total for each topic, as a ring on the home screen, plus your last 50 answers.

## Screenshots

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/home-dark.png">
  <img src="docs/images/home-light.png" alt="The home screen: an example train, the Mixed quiz and Formula sheet buttons, and the 14 topics as four train lines with an accuracy ring each">
</picture>

*The home screen, with the topics as four lines and a ring for how you're doing on each.*

<details>
<summary>More screenshots</summary>

![A weight-based dose: the weight turned into kg on one train, then the dose per day split into doses on another](docs/images/weight-train.png)
*A weight-based dose. First the pounds become kg, then the dose train.*

![A safe-dose check with the low end, the high end and the ordered amount each worked out as a train](docs/images/safe-train.png)
*A safe-dose check. The safe range is part of the problem.*

![A titration from mcg/kg/min to mL/h, on a train that wraps onto a second track](docs/images/titration-train.png)
*A titration. Long trains go on to a second track.*

![The square root running over a Mosteller BSA train, then the dose train](docs/images/bsa-train.png)
*BSA by Mosteller, where the train runs under the square root.*

![The quiz results: 8 out of 10, with Retry the misses and the list of all ten](docs/images/quiz-results.png)
*The end of a quiz.*

![The formula sheet with the train, desired over have, pump, drip, weight, heparin, titration and BSA formulas](docs/images/formula-sheet.png)
*The formula sheet, ready to print.*

<p>
  <img src="docs/images/phone-practice-light.png" width="260" alt="Med Math on a phone, light">
  <img src="docs/images/phone-showme-dark.png" width="260" alt="Show me on a phone, dark">
</p>

*On a phone, in light and dark.*

</details>

## Use it

Open **https://stuffs.tiresia.xyz/med-math/** in any up-to-date browser, on a phone, a tablet or a computer. It's
free, there's no account and no sign-in, and nothing you do leaves your browser: your progress and settings are kept
in the browser itself. On an iPhone or iPad you can tap **Share** and then **Add to Home Screen** to give it its own
icon.

One thing to keep in mind: these are PRACTICE numbers. The drug names are real generics to make the problems feel
real, but the doses and safe ranges are made up for practice. Follow your own program's rounding rules, and never
use Med Math for real patient care.

## Documentation

The docs explain everything Med Math does, in order:

- **Getting started:** [What is Med Math?](docs/what-is-med-math.md)
- **Using it:** [Practicing a topic](docs/practice.md), [How the train works](docs/the-train.md) and
  [The quiz and the formula sheet](docs/quiz-and-formulas.md)
- **Reference:** [The 14 topics](docs/topics.md) and [Settings](docs/settings.md)
- **Under the hood:** [Developing](docs/DEVELOPING.md)

Start with [What is Med Math?](docs/what-is-med-math.md)

## How it's built

Plain HTML, CSS and JavaScript modules, with no framework and no build step. The page is in `app/`.

| File | What |
|---|---|
| `app/js/topics.js` | The 14 problem makers. Each picks the numbers, writes the order and builds the train. |
| `app/js/frac.js`, `train.js`, `rules.js` | Exact fractions, multiplying the train out and cancelling units, and the rounding rules. |
| `app/js/formulas.js` | The second, independent way of working every answer, with plain formulas. |
| `app/js/answer.js` | Reading what you typed (0.5, .5, 1/2, 7:30 PM) and deciding if it's right. |
| `app/js/trainview.js` | Drawing the train as SVG, and animating it. |
| `app/js/main.js`, `app/style.css` | The screens, and the notebook look in light and dark. |
| `tools/test.py`, `tools/test.html` | The answer-key tests, run in headless Chrome. |
| `tools/walk.py` | A walk through every screen with real key presses, plus screenshots. |

Every answer key is worked out with exact fractions, so there's no rounding drift until the rounding rule is applied
at the end. `tools/test.py` checks the eleven worked examples on my checklist exactly, then makes 1,000 random problems
per topic (and 400 more per topic under two other sets of settings) and checks that the train and the plain formulas
agree on every one, that the units cancel to the answer's unit, and that every number used is printed in the problem.
It needs Python with `websocket-client` and Chrome. [Developing](docs/DEVELOPING.md) has the details.

## Credits

- **[Atkinson Hyperlegible](https://brailleinstitute.org/freefont)** by the Braille Institute, for its very clear
  numbers, and **[Caveat](https://github.com/googlefonts/caveat)** by the Caveat Project Authors, for the pencil
  notes. Both are under the SIL Open Font License 1.1, with the licence files in `app/fonts/`.
- The BSA formula is Mosteller's: R. D. Mosteller, "Simplified calculation of body-surface area",
  *New England Journal of Medicine* 317 (1987), p. 1098.

The same list is in [NOTICE](NOTICE).

## License

Med Math is MIT licensed, see [LICENSE](LICENSE).
