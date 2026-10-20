#!/usr/bin/env python3
"""Walk through Med Math in headless Chrome: every screen, real key presses, and screenshots.

    tools/walk.py [URL] [OUTDIR] [--mobile] [--dark] [--quick]

URL defaults to the local stuffs copy (http://127.0.0.1:8450/med-math/), OUTDIR to ./walk-shots.
It practices a few topics (a wrong answer, Show me, a right answer, Enter to go on), takes a whole
quiz, retries the misses, changes a setting, opens the formula sheet, and checks that the app still
works when the browser blocks storage. Prints one line per check and any page errors; exits 1 if
anything failed.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Browser  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith("--")]
URL = (args[0] if args else "http://127.0.0.1:8450/med-math/").rstrip("/") + "/"
OUT = Path(args[1] if len(args) > 1 else "walk-shots")
MOBILE = "--mobile" in sys.argv
DARK = "--dark" in sys.argv
QUICK = "--quick" in sys.argv
TAG = ("m" if MOBILE else "d") + ("-dark" if DARK else "")
OUT.mkdir(parents=True, exist_ok=True)

failed = []


def check(cond, what):
    print(("ok   " if cond else "FAIL ") + what)
    if not cond:
        failed.append(what)


b = Browser()
if MOBILE:
    b.size(390, 844, mobile=True)
else:
    b.size(1440, 900)
b.media(dark=DARK)


def shot(name, full=False):
    b.pump(0.3)
    sw = b.js("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
    check(sw[0] <= sw[1] + 1, f"{name}: no sideways scrolling ({sw[0]} in {sw[1]})")
    b.shot(OUT / f"{name}-{TAG}.png", full=full)


def open_(path="", seed=None, wait=1.2):
    q = f"?seed={seed}" if seed else ""
    b.go(f"{URL}{q}#/{path}", wait=wait)
    b.js("document.fonts.ready.then(() => true)")


def type_(text):
    b.js("document.activeElement && document.activeElement.blur(); (document.querySelector('#ans')).focus(); document.querySelector('#ans').value = ''")
    b.call("Input.insertText", text=text)


def enter():
    for t in ("keyDown", "keyUp"):
        b.call("Input.dispatchKeyEvent", type=t, key="Enter", code="Enter", windowsVirtualKeyCode=13, nativeVirtualKeyCode=13, **({"text": "\r"} if t == "keyDown" else {}))
    b.pump(0.3)


def problem():
    return b.js("""(() => { const p = window.__medmath.state.practice.problem; const a = p.answer;
      const fmt = (q) => q.toFixedString(6).replace(/\\.?0+$/, '');
      return { sig: p.sig, type: a.type, key: a.type === 'number' ? fmt(a.key) : a.key, steps: p.steps.length,
               trains: p.steps.filter(s => s.train).length, unit: a.unit || '' }; })()""")


def wait_showme(timeout=40):
    end = time.time() + timeout
    while time.time() < end:
        if b.js("(() => { const f = document.querySelector('#showme-body .formula-way'); return !!f && !f.hidden; })()"):
            return True
        b.pump(0.3)
    return False


def right_answer(p):
    if p["type"] == "number":
        return p["key"]
    if p["type"] == "clock":
        return b.js("(() => { const m = window.__medmath.state.practice.problem.answer.key; return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); })()")
    return None


try:
    # ---------- home ----------
    open_("", wait=3.5)
    check(b.js("document.querySelectorAll('.line-grid .station').length") == 14, "home lists the 14 dosage topics")
    check(b.js("!!document.querySelector('#hero-fig svg.train')"), "home draws the example train")
    shot("home", full=MOBILE)

    # ---------- practice: oral liquids ----------
    open_("practice/liquids", seed=41)
    p = problem()
    shot("practice")
    wrong = str(float(p["key"]) * 2 + 1)
    type_(wrong)
    enter()
    fb = b.js("(() => { const f = document.querySelector('#feedback'); return { cls: f.className, text: f.textContent }; })()")
    check("wrong" in fb["cls"] and "Not quite" in fb["text"], f"Enter checks, and a wrong answer says so ({fb['text'].strip()})")
    check(p["key"] in fb["text"].replace(",", ""), "the wrong-answer message gives the right answer")
    b.js("document.querySelector('#showme').click()")
    check(wait_showme(), "Show me finishes building the train")
    n = b.js("({ steps: document.querySelectorAll('#showme-body .step').length, trains: document.querySelectorAll('#showme-body svg.train').length })")
    check(n["steps"] == p["steps"] and n["trains"] == p["trains"], f"Show me shows {p['steps']} steps and {p['trains']} trains")
    check(b.js("document.querySelectorAll('#showme-body .strike').length") >= 2, "units are struck through")
    shot("practice-showme", full=MOBILE)
    enter()  # Enter again goes on to the next problem
    p2 = problem()
    check(p2["sig"] != p["sig"], "Enter after checking moves on to a new problem")
    type_(right_answer(p2))
    enter()
    fb = b.js("document.querySelector('#feedback').className")
    check("right" in fb, "the right answer counts as right")
    shot("practice-right")
    prog = b.js("JSON.parse(localStorage.getItem('med-math:progress:v1'))")
    check(prog and prog["topics"].get("liquids", {}).get("total") == 2 and len(prog["recent"]) == 2, "progress is saved (2 answers)")

    # ---------- more topics, with their trains ----------
    for topic, seed in ([("drip", 12), ("weight", 3), ("bsa", 21), ("titration", 8), ("recon", 5)] if not QUICK else [("drip", 12)]):
        open_(f"practice/{topic}", seed=seed)
        p = problem()
        b.js("document.querySelector('#showme').click()")
        check(wait_showme(), f"{topic}: Show me finishes")
        check(b.js("document.querySelector('#feedback').textContent.trim() === ''"), f"{topic}: peeking doesn't mark an answer")
        type_(right_answer(p) or "1")
        enter()
        check("right" in b.js("document.querySelector('#feedback').className") and "Not counted" in b.js("document.querySelector('#feedback').textContent"), f"{topic}: after peeking, a right answer isn't counted")
        shot(f"{topic}-showme", full=MOBILE)

    # safe-dose: three choices, arrow keys and Enter
    open_("practice/safe", seed=4)
    p = problem()
    shot("safe")
    b.js("document.querySelector('.choice').focus()")
    b.call("Input.dispatchKeyEvent", type="keyDown", key="ArrowRight", code="ArrowRight", windowsVirtualKeyCode=39)
    b.call("Input.dispatchKeyEvent", type="keyUp", key="ArrowRight", code="ArrowRight", windowsVirtualKeyCode=39)
    picked = b.js("document.querySelector('.choice[aria-checked=true]')?.dataset.id")
    check(picked == "low", "arrow keys move between the choices")
    b.js(f"document.querySelector('.choice[data-id={p['key']}]').click()")
    b.js("document.querySelector('#check').click()")
    b.pump(0.3)
    check("right" in b.js("document.querySelector('#feedback').className"), "safe-dose: picking the right verdict counts")
    b.js("document.querySelector('#showme').click()")
    wait_showme()
    shot("safe-showme", full=MOBILE)

    # infusion time: a clock answer
    for seed in range(1, 40):
        open_("practice/time", seed=seed, wait=0.8)
        p = problem()
        if p["type"] == "clock":
            break
    type_(right_answer(p))
    enter()
    check("right" in b.js("document.querySelector('#feedback').className"), f"time: the clock answer {right_answer(p)} counts")
    shot("time")

    # ---------- blood gases ----------
    def answer_abg(key):
        d, c = key["d"], key["c"]
        if d == "normal":
            picks = [("s", "normal")]
        else:
            kind, tail = d.split("-")
            picks = [("s", tail), ("k", kind)]
            if c != "none":
                picks.append(("c", c))
        for g, v in picks:
            b.js(f"document.querySelector('[data-group=\"{g}\"] .choice[data-id=\"{v}\"]').click()")

    open_("", wait=1.5)
    check(b.js("document.querySelectorAll('.abg-stations .station').length") == 6, "home lists the 6 blood gas topics")
    open_("practice/abg", seed=3)
    check(b.js("!!document.querySelector('.ranges')"), "an ABG problem shows the normal ranges")
    key = b.js("window.__medmath.state.practice.problem.answer.key")
    b.js("document.querySelector('[data-group=\"s\"] .choice[data-id=\"normal\"]').click()")
    check(b.js("document.querySelector('[data-group=\"c\"] .choice').disabled"), "picking Normal turns off cause and compensation")
    answer_abg(key)
    b.js("document.querySelector('#check').click()")
    b.pump(0.3)
    check("right" in b.js("document.querySelector('#feedback').className"), f"reading the ABG as {key['d']} / {key['c']} counts")
    b.js("document.querySelector('#showme').click()")
    check(wait_showme(), "ABG: Show me finishes")
    check(b.js("!!document.querySelector('#showme-body svg.ttt')"), "ABG: Show me draws the tic-tac-toe grid")
    shot("abg-showme", full=MOBILE)

    open_("practice/talk", seed=2)
    check(b.js("document.querySelectorAll('.glossary dt').length") == 7, "Talk it through shows the plain-words glossary")
    best = b.js("window.__medmath.state.practice.problem.answer.key")
    other = b.js(f"[...document.querySelectorAll('.choice')].map(c => c.dataset.id).find(id => id !== '{best}')")
    b.js(f"document.querySelector('.choice[data-id=\"{other}\"]').click(); document.querySelector('#check').click()")
    b.pump(0.3)
    fb = b.js("document.querySelector('#feedback').textContent")
    check("Not the best one" in fb and len(fb) > 40, "a weaker answer says why it's weaker")
    b.js("document.querySelector('#showme').click()")
    check(wait_showme(), "talk: Show me finishes")
    check(b.js("document.querySelectorAll('.talk-review li').length") >= 3 and b.js("document.querySelectorAll('.talk-review li.best').length") == 1, "talk: every option is explained, one marked best")
    shot("talk-showme", full=MOBILE)

    for topic, seed in (("gap", 4), ("hh", 5), ("comp", 6), ("oxygen", 7)):
        open_(f"practice/{topic}", seed=seed)
        b.js("document.querySelector('#showme').click()")
        check(wait_showme(), f"{topic}: Show me finishes")
        shot(f"{topic}-showme", full=MOBILE)

    open_("quiz/abg", seed=77)
    check(b.js("document.querySelector('h1').textContent") == "Blood gas quiz", "the blood gas quiz opens")
    for i in range(10):
        a = b.js("""(() => { const q = window.__medmath.state.quiz; const p = q.problems[q.i]; const a = p.answer;
          return { topic: p.topic, type: a.type, key: a.type === 'number' ? a.key.toFixedString(6).replace(/\\.?0+$/, '') : a.key }; })()""")
        check(a["topic"] in ("abg", "oxygen", "hh", "comp", "gap", "talk"), f"blood gas quiz problem {i + 1} is a blood gas topic ({a['topic']})")
        if i == 4:
            b.js("document.querySelector('#skip').click()")
        elif a["type"] == "abg":
            answer_abg(a["key"])
            b.js("document.querySelector('#qnext').click()")
        elif a["type"] == "choice":
            b.js(f"document.querySelector('.choice[data-id=\"{a['key']}\"]').click(); document.querySelector('#qnext').click()")
        else:
            type_(a["key"])
            enter()
        b.pump(0.3)
    score = b.js("document.querySelector('.score-num')?.textContent")
    check(score == "9/10", f"blood gas quiz score shows 9/10 ({score})")
    shot("abg-quiz-results", full=True)

    # ---------- quiz ----------
    open_("quiz", seed=99)
    shot("quiz")
    misses = 0
    for i in range(10):
        a = b.js("""(() => { const q = window.__medmath.state.quiz; const p = q.problems[q.i]; const a = p.answer;
          return { type: a.type, key: a.type === 'number' ? a.key.toFixedString(6).replace(/\\.?0+$/, '') : a.key }; })()""")
        if i in (2, 6):  # get two wrong on purpose
            b.js("document.querySelector('#skip').click()")
            misses += 1
            b.pump(0.3)
            continue
        if a["type"] == "choice":
            b.js(f"document.querySelector('.choice[data-id={a['key']}]').click(); document.querySelector('#qnext').click()")
        elif a["type"] == "duration":
            b.js(f"document.querySelector('#ans').value = '{a['key'] // 60}'; document.querySelector('#ans-m').value = '{a['key'] % 60}'; document.querySelector('#qnext').click()")
        elif a["type"] == "clock":
            m = a["key"]
            b.js(f"document.querySelector('#ans').value = '{m // 60:02d}:{m % 60:02d}'; document.querySelector('#qnext').click()")
        else:
            type_(a["key"])
            enter()
        b.pump(0.3)
    score = b.js("document.querySelector('.score-num')?.textContent")
    check(score == "8/10", f"quiz score shows 8/10 ({score})")
    check(b.js("document.querySelectorAll('.review-item').length") == 10, "the quiz lists all 10 to review")
    b.js("document.querySelector('.review-item.miss .review-show').click()")
    b.pump(9)
    check(b.js("document.querySelectorAll('.review-item.miss .review-steps svg.train').length") >= 1, "a missed problem opens with its train")
    shot("quiz-results", full=True)
    b.js("document.querySelector('#retry').click()")
    b.pump(0.4)
    check(b.js("window.__medmath.state.quiz.problems.length") == misses and b.js("window.__medmath.state.quiz.retry") is True, f"Retry the misses makes a quiz of the {misses} misses")

    # ---------- formula sheet and settings ----------
    open_("formulas", wait=1.5)
    check(b.js("!!document.querySelector('#sheet-fig svg.train')"), "the formula sheet draws its train")
    shot("formulas", full=True)
    open_("settings")
    shot("settings", full=True)
    b.js("document.querySelector('input[name=pump][value=whole]').click()")
    b.pump(0.2)
    saved = b.js("JSON.parse(localStorage.getItem('med-math:settings:v1'))")
    check(saved and saved.get("pump") == "whole", "settings are saved")
    open_("formulas")
    check("whole mL/h" in b.js("document.querySelector('.sheet').textContent"), "the formula sheet shows the rounding settings")
    b.js("localStorage.clear()")

    # ---------- no storage at all ----------
    b.call("Page.addScriptToEvaluateOnNewDocument", source="Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });")
    open_("practice/tablets", seed=2)
    p = problem()
    type_(right_answer(p))
    enter()
    check("right" in b.js("document.querySelector('#feedback').className"), "without storage, practice still works")
    open_("settings")
    check("isn’t saving" in b.js("document.querySelector('.screen-head').textContent"), "without storage, Settings says so")
finally:
    probs = list(b.problems)
    b.close()

check(not probs, "no page errors" + ("" if not probs else ":\n  " + "\n  ".join(map(str, probs))))
print(f"\n{len(failed)} failed" if failed else "\nall good")
sys.exit(1 if failed else 0)
