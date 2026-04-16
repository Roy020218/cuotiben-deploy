#!/usr/bin/env python3
"""错题本服务器 - 支持手机上传 API"""
import json
import os
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = 8899
DIR = os.path.dirname(os.path.abspath(__file__))
PENDING_FILE = os.path.join(DIR, '.pending_uploads.json')
RECORDS_FILE = os.path.join(DIR, '.records_backup.json')

def load_pending():
    if os.path.exists(PENDING_FILE):
        try:
            with open(PENDING_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except: return []
    return []

def save_pending(data):
    with open(PENDING_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")

    def send_cors(self, code=200, content_type='application/json', body=b''):
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.send_header('Content-Length', len(body))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_cors(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API: 获取待同步数据
        if path == '/api/pending':
            data = load_pending()
            self.send_cors(200, 'application/json',
                json.dumps(data, ensure_ascii=False).encode('utf-8'))
            return

        # API: 获取错题记录（备份）
        if path == '/api/records':
            if os.path.exists(RECORDS_FILE):
                with open(RECORDS_FILE, 'r', encoding='utf-8') as f:
                    body = f.read().encode('utf-8')
                self.send_cors(200, 'application/json', body)
            else:
                self.send_cors(200, 'application/json', b'[]')
            return

        # API: 标记已同步
        if path.startswith('/api/ack/'):
            ids = path[len('/api/ack/'):].split(',')
            pending = load_pending()
            remaining = [p for p in pending if p.get('id') not in ids]
            save_pending(remaining)
            self.send_cors(200, 'application/json',
                json.dumps({'ok': True, 'synced': len(pending) - len(remaining)}).encode('utf-8'))
            return

        # 静态文件
        # 去掉前缀斜杠
        filename = path.lstrip('/')
        if not filename:
            # 找不到index.html时默认显示
            filename = '错题本.html'
        # 安全路径：限制在 DIR 内
        safe_path = os.path.normpath(os.path.join(DIR, filename))
        if not safe_path.startswith(DIR):
            self.send_error(403, 'Forbidden')
            return
        if os.path.isfile(safe_path):
            ext = os.path.splitext(filename)[1].lower()
            mime = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
            }.get(ext, 'application/octet-stream')
            with open(safe_path, 'rb') as f:
                self.send_response(200)
                self.send_header('Content-Type', mime)
                self.send_header('Content-Length', os.path.getsize(safe_path))
                for k, v in cors_headers().items():
                    self.send_header(k, v)
                self.end_headers()
                self.wfile.write(f.read())
        else:
            self.send_error(404, f'Not Found: {filename}')

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # API: 接收手机上传
        if path == '/api/upload':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                entry = json.loads(body.decode('utf-8'))
            except:
                self.send_cors(400, 'application/json',
                    json.dumps({'error': 'invalid json'}).encode('utf-8'))
                return

            # 生成唯一 ID
            if 'id' not in entry:
                import time, random
                entry['id'] = f"p{time.time():.0f}{random.randint(1000,9999)}"

            pending = load_pending()
            pending.append(entry)
            save_pending(pending)
            print(f"[+] 收到手机上传: {entry.get('question','')[:30]}... (共{len(pending)}条待同步)")
            self.send_cors(200, 'application/json',
                json.dumps({'ok': True, 'id': entry['id']}).encode('utf-8'))
            return

        self.send_error(404)

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(f"=" * 50)
    print(f"错题本服务器已启动")
    print(f"局域网访问: http://<本机IP>:{PORT}/")
    print(f"手机上传页: http://<本机IP>:{PORT}/手机上传.html")
    print(f"本地访问:   http://127.0.0.1:{PORT}/")
    print(f"按 Ctrl+C 停止服务器")
    print(f"=" * 50)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.shutdown()
