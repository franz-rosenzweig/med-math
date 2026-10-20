#!/usr/bin/env python3
"""Take the screenshots the README and docs use, into docs/images/.

    tools/docshots.py [URL]

URL defaults to the local stuffs copy. Problems are made repeatable with ?seed=, so the same
screenshots come out every time (as long as the generators don't change).
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Browser  # noqa: E402

URL = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8450/med-math/").rstrip("/") + "/"
OUT = Path(__file__).resolve().parent.parent / "docs" / "images"
OUT.mkdir(parents=True, exist_ok=True)

DEMO_PROGRESS = """(() => {
  const t = { metric: [9, 10], household: [7, 8], tablets: [12, 12], liquids: [10, 12], injections: [8, 10], recon: [4, 6],
    weight: [7, 10], safe: [5, 6], bsa: [2, 4], pump: [9, 10], drip: [6, 9], time: [3, 5], heparin: [4, 6], titration: [2, 5],
    abg: [11, 14], oxygen: [5, 6], hh: [3, 4], comp: [4, 7], gap: [6, 7], talk: [8, 9] };
  const ids = Object.keys(t), recent = [];
  for (let i = 0; i < 43; i++) recent.push({ topic: ids[(i * 5) % ids.length], ok: ![3, 11, 17, 26, 31, 38].includes(i), at: Date.now() - (43 - i) * 60000 });
  const topics = Object.fromEntries(ids.map((k) => [k, { right: t[k][0], total: t[k][1] }]));
  localStorage.setItem('med-math:progress:v1', JSON.stringify({ topics, recent }));
  localStorage.removeItem('med-math:settings:v1');
})()"""

ABG_SEEDS = {"abg": 33, "hh": 22, "comp": 8, "gap": 20, "oxygen": 48, "talk": 1}
SEEDS = {"liquids": 2931, "drip": 60, "weight": 18, "titration": 23, "safe": 8, "recon": 7, "heparin": 30, "time": 5, "bsa": 6}


def run(b, mobile=False, dark=False):
    if mobile:
        b.size(390, 844, mobile=True)
    else:
        b.size(1440, 900)
    b.media(dark=dark)

    def go(path, seed=None, wait=1.3):
        b.go(f"{URL}{'?seed=%d' % seed if seed else ''}#/{path}", wait=wait)
        b.js("document.fonts.ready.then(() => true)")

    def key(text=None):
        if text is not None:
            b.js("document.querySelector('#ans').focus(); document.querySelector('#ans').value = ''")
            b.call("Input.insertText", text=text)
        for t in ("keyDown", "keyUp"):
            b.call("Input.dispatchKeyEvent", type=t, key="Enter", code="Enter", windowsVirtualKeyCode=13, **({"text": "\r"} if t == "keyDown" else {}))
        b.pump(0.3)

    def showme():
        b.js("document.querySelector('#showme').click()")
        end = time.time() + 40
        while time.time() < end and not b.js("(() => { const f = document.querySelector('#showme-body .formula-way'); return !!f && !f.hidden; })()"):
            b.pump(0.3)
        b.pump(0.3)

    def clip(selector, name, pad=12):
        r = b.js(f"(() => {{ const e = document.querySelector('{selector}'); e.scrollIntoView({{block: 'start'}}); const r = e.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height]; }})()")
        x, y, w, h = r
        b.pump(0.2)
        data = b.call("Page.captureScreenshot", format="png", captureBeyondViewport=True,
                      clip={"x": max(0, x - pad), "y": max(0, y - pad), "width": w + 2 * pad, "height": h + 2 * pad, "scale": 1 if not mobile else 2})["data"]
        import base64
        (OUT / name).write_bytes(base64.b64decode(data))
        print("wrote", name)

    def save(name, full=False):
        b.pump(0.3)
        b.shot(OUT / name, full=full)
        print("wrote", name)

    t = "dark" if dark else "light"
    # some made-up progress, so the rings and the tally have something to show
    go("", wait=0.8)
    b.js(DEMO_PROGRESS)
    b.call("Page.reload", ignoreCache=True)
    b.pump(3.5)
    if mobile:
        save(f"phone-home-{t}.png")
        go("practice/liquids", seed=SEEDS["liquids"])
        key("10")
        save(f"phone-practice-{t}.png")
        if not dark:
            go("practice/abg", seed=ABG_SEEDS["abg"])
            for g, v in (("s", "acid"), ("k", "met"), ("c", "partial")):
                b.js(f"document.querySelector('[data-group=\"{g}\"] .choice[data-id=\"{v}\"]').click()")
            b.js("document.querySelector('#check').click()")
            save("phone-abg-light.png")
            go("practice/liquids", seed=SEEDS["liquids"])
            key("10")
        showme()
        b.js("document.querySelector('#showme-panel').scrollIntoView({block: 'start'}); window.scrollBy(0, -8)")
        save(f"phone-showme-{t}.png")
        return

    save(f"home-{t}.png")
    go("practice/liquids", seed=SEEDS["liquids"])
    key("10")
    showme()
    save(f"practice-{t}.png")
    if dark:
        return
    # one wrong answer, for the feedback
    go("practice/drip", seed=SEEDS["drip"])
    key("31.25")
    clip(".slip", "wrong-answer.png")
    showme()
    clip("#showme-panel", "drip-train.png")
    for topic, ans in (("weight", None), ("titration", None), ("recon", None), ("heparin", None), ("bsa", None)):
        go(f"practice/{topic}", seed=SEEDS[topic])
        showme()
        clip(".practice", f"{topic}-train.png")
    go("practice/safe", seed=SEEDS["safe"])
    b.js("document.querySelector('.choice[data-id=high]').click(); document.querySelector('#check').click()")
    b.pump(0.3)
    showme()
    clip(".practice", "safe-train.png")
    go("practice/time", seed=SEEDS["time"])
    clip(".slip", "time-question.png")
    # a quiz, with two misses
    go("quiz", seed=99)
    clip(".quiz-card", "quiz-question.png")
    for i in range(10):
        a = b.js("""(() => { const q = window.__medmath.state.quiz; const p = q.problems[q.i]; const a = p.answer;
          return { type: a.type, key: a.type === 'number' ? a.key.toFixedString(6).replace(/\\.?0+$/, '') : a.key }; })()""")
        if i in (2, 6):
            b.js("document.querySelector('#skip').click()")
        elif a["type"] == "choice":
            b.js(f"document.querySelector('.choice[data-id={a['key']}]').click(); document.querySelector('#qnext').click()")
        elif a["type"] == "duration":
            b.js(f"document.querySelector('#ans').value = '{a['key'] // 60}'; document.querySelector('#ans-m').value = '{a['key'] % 60}'; document.querySelector('#qnext').click()")
        elif a["type"] == "clock":
            m = a["key"]
            b.js(f"document.querySelector('#ans').value = '{m // 60:02d}:{m % 60:02d}'; document.querySelector('#qnext').click()")
        else:
            key(a["key"])
        b.pump(0.3)
    b.js("window.scrollTo(0, 0)")
    save("quiz-results.png")
    b.js("document.querySelector('.review-item.miss .review-show').click()")
    b.pump(10)
    clip(".review-item.miss", "quiz-review.png")
    # ---------- blood gases ----------
    go("practice/abg", seed=ABG_SEEDS["abg"])
    for g, v in (("s", "acid"), ("k", "met"), ("c", "partial")):
        b.js(f"document.querySelector('[data-group=\"{g}\"] .choice[data-id=\"{v}\"]').click()")
    b.js("document.querySelector('#check').click()")
    showme()
    clip(".practice", "abg-read.png")
    for topic, name in (("hh", "hh-train.png"), ("comp", "comp-range.png"), ("gap", "gap-figure.png"), ("oxygen", "pf-train.png")):
        go(f"practice/{topic}", seed=ABG_SEEDS[topic])
        showme()
        clip(".practice" if topic == "comp" else "#showme-panel", name)
    go("practice/talk", seed=ABG_SEEDS["talk"])
    clip(".slip", "talk-question.png")
    b.js("document.querySelector('.choice[data-id=\"b\"]').click(); document.querySelector('#check').click()")
    b.pump(0.3)
    clip(".slip", "talk-feedback.png")
    showme()
    clip("#showme-panel", "talk-review.png")
    go("formulas", wait=1.5)
    clip(".abg-card", "formula-abg-ranges.png")
    save("formula-sheet.png", full=True)
    go("settings")
    save("settings.png", full=True)


b = Browser()
try:
    run(b)
    run(b, dark=True)
    run(b, mobile=True)
    run(b, mobile=True, dark=True)
finally:
    if b.problems:
        print("page errors:", *b.problems, sep="\n  ")
    b.close()
