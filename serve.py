#!/usr/bin/env python3
"""
Tiny threaded static server for local preview of the KotaLabs folder.

python3 -m http.server is SINGLE-threaded: the page asks for ~10 files at once
(CSS, 2 JS files, 3 fonts, 2 images, a 671 KB Three.js module) and they queue
one behind the other, so the preview hangs or paints a half-styled page.
ThreadingHTTPServer fixes that.

Lives outside the website folder on purpose — it is not part of the deploy.
Usage:  python3 serve.py [port] [root]
"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = sys.argv[2] if len(sys.argv) > 2 else "kotelabs"


class Handler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 + Content-Length keeps the connection alive, so the browser stops
    # opening a new TCP connection for every one of the ~10 assets.
    protocol_version = "HTTP/1.1"

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".woff2": "font/woff2",
        ".jpg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
        ".xml": "application/xml",
        ".txt": "text/plain; charset=utf-8",
    }

    def end_headers(self):
        # always serve fresh files while editing
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(ROOT)
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        print(f"serving {os.getcwd()} on http://0.0.0.0:{PORT}", flush=True)
        httpd.serve_forever()
