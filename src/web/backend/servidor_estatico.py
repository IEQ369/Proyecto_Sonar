# Servidor estático para desarrollo local
# Ejecuta: python servidor_estatico.py
# Accede en el navegador a: http://localhost:8000/

import http.server
import socketserver
import os

PORT = 8000
WEB_DIR = os.path.join(os.path.dirname(__file__), '..')
os.chdir(WEB_DIR)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ['/', '/index.html']:
            self.path = '/templates/index.html'
        elif self.path == '/archivos':
            self.path = '/templates/archivos.html'
        return super().do_GET()

Handler = CustomHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servidor estático corriendo en http://localhost:{PORT}/")
    print(f"Raíz de archivos: {os.path.abspath(WEB_DIR)}")
    httpd.serve_forever()