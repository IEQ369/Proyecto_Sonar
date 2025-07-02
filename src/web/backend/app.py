import os
from flask import Flask, render_template, request, jsonify
import sys

# Obtener la ruta absoluta de la carpeta donde está app.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, '../static')
TEMPLATES_DIR = os.path.join(BASE_DIR, '../templates')

# Agregar el directorio src al path para importar el emisor
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.emisor import emitir_mensaje

app = Flask(
    __name__,
    static_folder=STATIC_DIR,
    template_folder=TEMPLATES_DIR
)

@app.route('/')
def index():
    static_folder = app.static_folder or os.path.join(BASE_DIR, '../static')
    css_path = os.path.join(static_folder, 'css', 'styles.css')
    try:
        css_version = int(os.path.getmtime(css_path))
    except Exception:
        css_version = 0
    return render_template('index.html', css_version=css_version)

@app.route('/emit', methods=['POST'])
def emit_message():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Mensaje vacío'}), 400
        message = data['message']
        # Usar el emisor de Python
        emitir_mensaje(message)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)