#!/usr/bin/env python3
"""Render design/icon.svg to the app's PNG icons with headless Chrome.

    tools/make-icons.py

icon-512.png and icon-192.png keep the rounded tile (see-through corners); apple-touch-icon.png
(180) and icon-maskable-512.png fill the whole square, with the drawing inside the safe zone.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cdp import Browser, serve  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SVG = (ROOT / "design" / "icon.svg").read_text()


def full_bleed(svg):
    # square tile, drawing shrunk to 80% around the middle
    svg = svg.replace('<rect width="512" height="512" rx="112"/>', '<rect width="512" height="512"/>')
    return svg.replace('<g id="art">', '<g id="art" transform="translate(51.2 51.2) scale(0.8)">')


def main():
    tmp = ROOT / "design" / ".icon-render"
    tmp.mkdir(exist_ok=True)
    jobs = [("icon-512.png", 512, SVG), ("icon-192.png", 192, SVG),
            ("apple-touch-icon.png", 180, full_bleed(SVG)), ("icon-maskable-512.png", 512, full_bleed(SVG))]
    base = serve(tmp)
    b = Browser()
    try:
        b.call("Emulation.setDefaultBackgroundColorOverride", color={"r": 0, "g": 0, "b": 0, "a": 0})
        for name, size, svg in jobs:
            page = tmp / f"{name}.html"
            page.write_text(f'<!doctype html><style>html,body{{margin:0;background:transparent}}svg{{display:block;width:{size}px;height:{size}px}}</style>{svg}')
            b.size(size, size, scale=1)
            b.go(f"{base}/{page.name}", wait=0.4)
            b.shot(ROOT / "app" / name)
            print("wrote app/" + name)
    finally:
        b.close()
        for f in tmp.iterdir():
            f.unlink()
        tmp.rmdir()


if __name__ == "__main__":
    main()
