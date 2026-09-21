#!/usr/bin/env python3
"""serve.py — preview the site locally, with caching switched off.

    python tools/serve.py            # from the site root, then open :8000
    python tools/serve.py 8080       # a different port

WHY NOT JUST `python -m http.server`
------------------------------------
Because it sends no `Cache-Control` header. With no header a browser applies
"heuristic freshness" and is entitled to keep serving a file it already has
without asking — and it does, for ES modules especially. The symptom is
maddening and does not look like caching: you edit a module, reload, and the
page runs the OLD code. It cost an afternoon during the work on the 3D icons,
where a fixed bug kept reappearing on reload and vanishing the moment the same
module was imported by hand from the console (a console import gets a fresh
module graph; the page's did not).

One header fixes it. Everything else here is `http.server` unchanged.

WHY IT THREADS
--------------
`socketserver.TCPServer` handles one connection at a time. A browser loading
this site opens six and holds them open, and the page is an ES module graph of
about forty files — so the first connection to go idle-but-open stalls every
other request behind it and the page hangs half-loaded. `ThreadingTCPServer`
with daemon threads is the one-line fix.

This is a development convenience only. The real server is a plain static host
and SHOULD cache — see §11.
"""

import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


os.chdir(ROOT)

with Server(('127.0.0.1', PORT), Handler) as httpd:
    print(f'Serving {ROOT}')
    print(f'  http://localhost:{PORT}/                       the site')
    print(f'  http://localhost:{PORT}/tools/preview-icons3d.html   every 3D icon (§20.6)')
    print('Ctrl-C to stop.')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
