"""A tiny Chrome DevTools Protocol driver for the Med Math checks (test.py and walk.py).

Starts headless Chrome (Chrome for Testing by default, or $CHROME), opens one page and lets you
navigate, evaluate JavaScript, emulate a phone or dark mode, and take screenshots. Page errors and
console errors are collected in .problems. Needs the websocket-client package.
"""
import base64
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import websocket

CHROME = os.environ.get("CHROME", str(Path.home() / ".local/opt/google/chrome-linux64/chrome"))


def serve(root):
    """Serve a folder on a free localhost port in a thread. Returns the base URL."""
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

    port = free_port()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), partial(Quiet, directory=str(root)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}"


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Browser:
    def __init__(self):
        self.profile = tempfile.mkdtemp(prefix="med-math-chrome-")
        self.proc = subprocess.Popen(
            [CHROME, "--headless=new", "--no-sandbox", "--hide-scrollbars", "--mute-audio",
             "--remote-allow-origins=*", "--remote-debugging-port=0", f"--user-data-dir={self.profile}",
             "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        port_file = Path(self.profile) / "DevToolsActivePort"
        for _ in range(200):
            if port_file.exists() and port_file.read_text().strip():
                break
            time.sleep(0.05)
        port = port_file.read_text().split()[0]
        pages = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list"))
        url = next(p for p in pages if p["type"] == "page")["webSocketDebuggerUrl"]
        self.ws = websocket.create_connection(url, timeout=60)
        self.ids = iter(range(1, 10 ** 9))
        self.problems = []
        for d in ("Page", "Runtime", "Log"):
            self.call(f"{d}.enable")

    def _note(self, m):
        p = m.get("params", {})
        meth = m.get("method")
        if meth == "Runtime.exceptionThrown":
            d = p["exceptionDetails"]
            self.problems.append(d.get("exception", {}).get("description") or d.get("text"))
        elif meth == "Runtime.consoleAPICalled" and p.get("type") == "error":
            self.problems.append(" ".join(str(a.get("value", a.get("description", ""))) for a in p["args"]))
        elif meth == "Log.entryAdded" and p["entry"]["level"] == "error":
            self.problems.append(f'{p["entry"]["text"]} {p["entry"].get("url", "")}'.strip())

    def call(self, method, **params):
        i = next(self.ids)
        self.ws.send(json.dumps({"id": i, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            self._note(m)
            if m.get("id") == i:
                if "error" in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get("result", {})

    def pump(self, seconds):
        self.ws.settimeout(0.1)
        end = time.time() + seconds
        while time.time() < end:
            try:
                self._note(json.loads(self.ws.recv()))
            except websocket.WebSocketTimeoutException:
                pass
        self.ws.settimeout(60)

    def size(self, w, h, mobile=False, scale=None):
        self.call("Emulation.setDeviceMetricsOverride", width=w, height=h,
                  deviceScaleFactor=scale or (3 if mobile else 1), mobile=mobile)
        self.call("Emulation.setTouchEmulationEnabled", enabled=mobile)

    def media(self, dark=False, reduced=False):
        self.call("Emulation.setEmulatedMedia", features=[
            {"name": "prefers-color-scheme", "value": "dark" if dark else "light"},
            {"name": "prefers-reduced-motion", "value": "reduce" if reduced else "no-preference"}])

    def go(self, url, wait=1.0):
        self.call("Page.navigate", url=url)
        self.pump(wait)

    def js(self, code, wait=0.0):
        r = self.call("Runtime.evaluate", expression=code, awaitPromise=True, returnByValue=True)
        if "exceptionDetails" in r:
            raise RuntimeError(f"JS failed: {r['exceptionDetails'].get('exception', {}).get('description') or r['exceptionDetails']}")
        if wait:
            self.pump(wait)
        return r.get("result", {}).get("value")

    def shot(self, path, full=False):
        params = {"format": "png"}
        if full:
            m = self.call("Page.getLayoutMetrics")
            cs = m.get("cssContentSize") or m["contentSize"]
            params["clip"] = {"x": 0, "y": 0, "width": cs["width"], "height": cs["height"], "scale": 1}
            params["captureBeyondViewport"] = True
        data = self.call("Page.captureScreenshot", **params)["data"]
        Path(path).write_bytes(base64.b64decode(data))

    def close(self):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()
            try:
                self.proc.wait(5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
            shutil.rmtree(self.profile, ignore_errors=True)
