#!/data/data/com.termux/files/usr/bin/bash

# ==================================================
# INSTALADOR PROYECTO SONAR PARA TERMUX
# Sistema de Exfiltración Ultrasónica
# ==================================================

echo "=================================================="
echo "  INSTALADOR PROYECTO SONAR PARA TERMUX"
echo "  Sistema de Exfiltración Ultrasónica"
echo "=================================================="
echo

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[ÉXITO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ADVERTENCIA]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si estamos en Termux
if [ ! -d "/data/data/com.termux" ]; then
    print_error "Este script es solo para Termux"
    exit 1
fi

print_status "Iniciando instalación para Termux..."

# Actualizar repositorios
print_status "Actualizando repositorios..."
pkg update -y

# Instalar dependencias del sistema
print_status "Instalando dependencias del sistema..."
pkg install -y python git wget curl

# Instalar dependencias de audio
print_status "Instalando dependencias de audio..."
pkg install -y pulseaudio

# Verificar si Python está instalado
if ! command -v python &> /dev/null; then
    print_error "Python no se pudo instalar"
    exit 1
fi

print_success "Python instalado: $(python --version)"

# Crear directorio del proyecto
PROJECT_DIR="$HOME/proyecto_sonar"
print_status "Creando directorio del proyecto: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Clonar el repositorio (asumiendo que ya tienes el código)
print_status "Preparando archivos del proyecto..."

# Crear estructura de directorios
mkdir -p src/core src/web src/docs

# Crear archivo requirements.txt
cat > requirements.txt << 'EOF'
numpy>=1.24.0
scipy>=1.10.0
sounddevice>=0.4.6
matplotlib>=3.10.0
pydub>=0.25.0
EOF

# Crear entorno virtual
print_status "Creando entorno virtual Python..."
python -m venv venv

# Activar entorno virtual
print_status "Activando entorno virtual..."
source venv/bin/activate

# Actualizar pip
print_status "Actualizando pip..."
pip install --upgrade pip

# Instalar dependencias
print_status "Instalando dependencias Python..."
pip install -r requirements.txt

# Verificar instalación de sounddevice
print_status "Verificando instalación de audio..."
python -c "import sounddevice; print('SoundDevice instalado correctamente')" 2>/dev/null || {
    print_warning "SoundDevice puede requerir configuración adicional"
    print_warning "Si hay problemas de audio, ejecuta: pkg install pulseaudio"
}

# Crear script de ejecución
cat > run_sonar.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# Script para ejecutar Proyecto Sonar en Termux
cd "$HOME/proyecto_sonar"

# Activar entorno virtual
source venv/bin/activate

# Verificar permisos de audio
echo "=================================================="
echo "  PROYECTO SONAR - TERMUX"
echo "=================================================="
echo
echo "IMPORTANTE: Este proyecto requiere permisos de audio"
echo "1. Microphone (RECORD_AUDIO)"
echo "2. Speaker (MODIFY_AUDIO_SETTINGS)"
echo
echo "Si no tienes estos permisos, la aplicación puede fallar"
echo

# Verificar si tenemos los módulos necesarios
if [ ! -f "src/core/protocolo.py" ]; then
    echo "ERROR: No se encontraron los archivos del proyecto"
    echo "Asegúrate de que todos los archivos estén en el directorio"
    exit 1
fi

# Ejecutar el programa principal
echo "Iniciando Sistema Sonar..."
python sonar.py
EOF

# Hacer ejecutable el script
chmod +x run_sonar.sh

# Crear script de permisos
cat > setup_permissions.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash

# Script para configurar permisos en Termux
echo "=================================================="
echo "  CONFIGURACIÓN DE PERMISOS - TERMUX"
echo "=================================================="
echo
echo "Para que Proyecto Sonar funcione correctamente, necesitas:"
echo
echo "1. PERMISOS DE AUDIO:"
echo "   - Ve a Configuración > Apps > Termux"
echo "   - Activa 'Microphone' y 'Storage'"
echo
echo "2. PERMISOS DE ALMACENAMIENTO:"
echo "   - Permite acceso a archivos y multimedia"
echo
echo "3. VERIFICACIÓN:"
echo "   - Ejecuta: termux-microphone-record"
echo "   - Si funciona, los permisos están correctos"
echo
echo "4. ALTERNATIVA:"
echo "   - Si hay problemas, instala Termux:API"
echo "   - pkg install termux-api"
echo
echo "Presiona Enter cuando hayas configurado los permisos..."
read
EOF

chmod +x setup_permissions.sh

# Crear README específico para Termux
cat > README_TERMUX.md << 'EOF'
# PROYECTO SONAR - GUÍA TERMUX

## Instalación Completada ✅

El proyecto ha sido instalado en: `~/proyecto_sonar`

## Cómo usar:

### 1. Ejecutar el programa:
```bash
cd ~/proyecto_sonar
./run_sonar.sh
```

### 2. Configurar permisos (IMPORTANTE):
```bash
./setup_permissions.sh
```

### 3. Ejecutar directamente:
```bash
cd ~/proyecto_sonar
source venv/bin/activate
python sonar.py
```

## Permisos Requeridos:

- **Microphone**: Para recibir audio ultrasónico
- **Storage**: Para leer/escribir archivos
- **Audio Output**: Para transmitir audio

## Solución de Problemas:

### Error de audio:
```bash
pkg install pulseaudio
pkg install termux-api
```

### Error de permisos:
1. Ve a Configuración > Apps > Termux
2. Activa todos los permisos de audio
3. Reinicia Termux

### Error de módulos:
```bash
cd ~/proyecto_sonar
source venv/bin/activate
pip install -r requirements.txt
```

## Características Especiales:

- ✅ Barra de progreso giratoria en modo receptor
- ✅ Contador de tiempo de escucha
- ✅ Resumen de mensajes recibidos
- ✅ Interfaz optimizada para terminal móvil

## Notas Importantes:

- Las frecuencias ultrasónicas (18.7-22.4 kHz) son inaudibles
- Usa Spectroid en Android para verificar las transmisiones
- El micrófono del teléfono puede no captar bien frecuencias muy altas
- Prueba primero con frecuencias audibles para verificar funcionamiento

## Comandos Útiles:

```bash
# Verificar audio
termux-microphone-record

# Verificar Python
python --version

# Verificar módulos
python -c "import sounddevice, numpy, scipy; print('OK')"

# Limpiar cache
rm -rf __pycache__
```
EOF

# Mostrar resumen de instalación
echo
echo "=================================================="
echo "  INSTALACIÓN COMPLETADA"
echo "=================================================="
echo
print_success "Proyecto Sonar instalado en: $PROJECT_DIR"
echo
echo "ARCHIVOS CREADOS:"
echo "  ✅ run_sonar.sh - Script de ejecución"
echo "  ✅ setup_permissions.sh - Configuración de permisos"
echo "  ✅ README_TERMUX.md - Guía específica para Termux"
echo "  ✅ requirements.txt - Dependencias Python"
echo "  ✅ venv/ - Entorno virtual"
echo
echo "PRÓXIMOS PASOS:"
echo "1. Copia todos los archivos del proyecto a: $PROJECT_DIR"
echo "2. Ejecuta: ./setup_permissions.sh"
echo "3. Ejecuta: ./run_sonar.sh"
echo
echo "IMPORTANTE:"
print_warning "Necesitas permisos de micrófono y audio en Termux"
print_warning "Las frecuencias ultrasónicas pueden no funcionar bien en móviles"
echo
print_success "¡Instalación completada! 🎉" 