import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# GitHub Pages 처럼 Access-Control-Allow-Origin: * 를 주는 정적 서버 (giscus 커스텀 테마 로컬 검증용)
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

port, root = int(sys.argv[1]), sys.argv[2]
ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, directory=root)).serve_forever()
