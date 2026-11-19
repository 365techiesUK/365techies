"""365 Pinball Hero - the phone check's server (16 Oct 2026, NG0). Never deployed.

Serves the game files to phones on the home Wi-Fi (only /games/ and /tools/pinball/ and /fonts/ - nothing else in the
repository) and takes the phone check's results: POST /bench-result with JSON, saved one file per post in
D:/claude/retro-rebooted/pinball-ng0/results/. Run from the repository root:

    python tools/pinball/bench_server.py [port]          (default 8466, listening on every network card)

Then open http://<this PC's address>:8466/tools/pinball/phonecheck.html on the phone.
"""
import json
import os
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join("D:" + os.sep, "claude", "retro-rebooted", "pinball-ng0", "results")
ALLOWED = ("/games/", "/tools/pinball/", "/fonts/", "/favicon")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/tools/pinball/phonecheck.html")
            self.end_headers()
            return
        if not path.startswith(ALLOWED) or ".." in path:
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/bench-result":
            self.send_error(404)
            return
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > 512 * 1024:
            self.send_error(413)
            return
        try:
            data = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            self.send_error(400)
            return
        os.makedirs(OUT, exist_ok=True)
        name = time.strftime("%Y%m%d-%H%M%S") + "-" + str(data.get("run", "run"))[:24].replace(os.sep, "_") + "-" + str(data.get("phase", "x"))[:24] + ".json"
        name = "".join(c if c.isalnum() or c in "-_." else "_" for c in name)
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            json.dump(data, f, indent=1)
        body = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stdout.write("%s %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8466
    print("phone check on port %d, serving %s, results to %s" % (port, ROOT, OUT), flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
