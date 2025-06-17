import http.server
import socketserver
import socket
from http.server import HTTPServer, BaseHTTPRequestHandler
import os

class CustomHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Configurar headers de seguridad
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.end_headers()
        
        # Servir archivos estáticos
        if self.path == '/':
            self.path = '/index.html'
        
        try:
            file_path = os.path.join(os.path.dirname(__file__), self.path.lstrip('/'))
            with open(file_path, 'rb') as file:
                self.wfile.write(file.read())
        except FileNotFoundError:
            self.send_error(404, "File not found")
        except Exception as e:
            self.send_error(500, f"Internal server error: {str(e)}")

    def log_message(self, format, *args):
        # Personalizar el formato del log
        print(f"[{self.address_string()}] {format%args}")

def get_local_ip():
    try:
        # Crear un socket temporal para obtener la IP local
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

PORT = 8000
IP = get_local_ip()

with HTTPServer(("0.0.0.0", PORT), CustomHandler) as httpd:
    print(f"\n{'='*50}")
    print(f"Servidor iniciado en:")
    print(f"http://{IP}:{PORT}")
    print(f"\nPara acceder desde tu celular:")
    print("1. Asegúrate de que tu celular esté en la misma red WiFi")
    print("2. Abre el navegador en tu celular")
    print(f"3. Ve a http://{IP}:{PORT}")
    print(f"\nPresiona Ctrl+C para detener el servidor")
    print(f"{'='*50}\n")
    httpd.serve_forever() 