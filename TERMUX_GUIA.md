# 🐧 PROYECTO SONAR - GUÍA COMPLETA PARA TERMUX

## 📱 ¿Qué es Termux?

Termux es una terminal de Linux para Android que te permite ejecutar comandos y programas de Linux directamente en tu teléfono. Es perfecto para proyectos como este.

## 🚀 Instalación en Termux

### Paso 1: Instalar Termux
1. Descarga Termux desde F-Droid (recomendado) o Google Play
2. Abre Termux y actualiza los repositorios:
```bash
pkg update
```

### Paso 2: Clonar el proyecto
```bash
# Instalar git
pkg install git

# Clonar tu repositorio
git clone https://github.com/TU_USUARIO/TU_REPO.git proyecto_sonar
cd proyecto_sonar
```

### Paso 3: Ejecutar el instalador
```bash
# Hacer ejecutable el script
chmod +x install_termux.sh

# Ejecutar instalación
./install_termux.sh
```

## 🔐 Permisos Requeridos

### Permisos de Audio (CRÍTICOS)
Para que el proyecto funcione, necesitas estos permisos:

1. **Ve a Configuración > Apps > Termux**
2. **Activa estos permisos:**
   - ✅ **Microphone** (RECORD_AUDIO)
   - ✅ **Storage** (READ_EXTERNAL_STORAGE)
   - ✅ **Audio Output** (MODIFY_AUDIO_SETTINGS)

### Verificar permisos
```bash
# Probar micrófono
termux-microphone-record

# Si funciona, verás un mensaje de grabación
# Presiona Ctrl+C para detener
```

## 🎵 Consideraciones de Audio en Móviles

### ⚠️ Limitaciones Importantes:

1. **Frecuencias Ultrasónicas**: Los móviles pueden tener dificultades para:
   - **Transmitir** frecuencias por encima de 20 kHz
   - **Recibir** frecuencias ultrasónicas claramente
   - **Procesar** audio de alta frecuencia sin distorsión

2. **Hardware del Móvil**:
   - Los altavoces están optimizados para frecuencias audibles (20 Hz - 20 kHz)
   - Los micrófonos pueden tener filtros que bloquean ultrasonidos
   - La calidad de audio puede ser limitada

### 🧪 Pruebas Recomendadas:

1. **Primero prueba con frecuencias audibles**:
   ```bash
   # Usar test_audio.py para frecuencias audibles
   python test_audio.py
   ```

2. **Verificar con Spectroid**:
   - Instala Spectroid desde Google Play
   - Abre la app mientras transmites
   - Deberías ver las frecuencias en el espectrograma

3. **Probar con otro dispositivo**:
   - Usa tu PC como emisor y el móvil como receptor
   - O viceversa

## 🛠️ Solución de Problemas

### Error: "No module named 'sounddevice'"
```bash
# Activar entorno virtual
source venv/bin/activate

# Reinstalar dependencias
pip install -r requirements.txt
```

### Error: "PortAudio not found"
```bash
# Instalar dependencias de audio
pkg install pulseaudio
pkg install termux-api

# Reinstalar sounddevice
pip uninstall sounddevice
pip install sounddevice
```

### Error: "Permission denied" para audio
```bash
# Verificar permisos
termux-microphone-record

# Si no funciona, ve a Configuración > Apps > Termux
# Activa todos los permisos de audio
```

### Error: "No audio devices found"
```bash
# Instalar termux-api para mejor soporte de audio
pkg install termux-api

# Reiniciar Termux
exit
# Abrir Termux nuevamente
```

## 📊 Características Especiales en Termux

### ✅ Barra de Progreso Giratoria
El modo receptor ahora muestra:
```
⠋ Escuchando... [00:15]
⠙ Escuchando... [00:16]
⠹ Escuchando... [00:17]
```

### ✅ Contador de Tiempo
Muestra cuánto tiempo lleva escuchando

### ✅ Resumen de Mensajes
Al terminar muestra todos los mensajes recibidos

### ✅ Interfaz Optimizada
Adaptada para pantallas pequeñas de móviles

## 🎯 Casos de Uso Recomendados

### 1. **Pruebas Educativas**:
- Aprender sobre transmisión de datos por audio
- Entender frecuencias y espectros
- Experimentar con diferentes protocolos

### 2. **Demostraciones**:
- Mostrar el concepto de exfiltración ultrasónica
- Explicar ataques como DolphinAttack
- Educar sobre seguridad de audio

### 3. **Desarrollo**:
- Probar nuevos protocolos
- Experimentar con diferentes frecuencias
- Desarrollar contramedidas

## ⚠️ Limitaciones y Advertencias

### No usar para:
- ❌ Ataques reales
- ❌ Espionaje
- ❌ Actividades ilegales
- ❌ Dañar sistemas ajenos

### Solo para:
- ✅ Educación
- ✅ Investigación
- ✅ Desarrollo de defensas
- ✅ Aprendizaje de seguridad

## 🔧 Comandos Útiles

### Verificar instalación:
```bash
# Verificar Python
python --version

# Verificar módulos
python -c "import sounddevice, numpy, scipy; print('✅ Módulos OK')"

# Verificar audio
termux-microphone-record
```

### Limpiar y mantener:
```bash
# Limpiar cache
rm -rf __pycache__
find . -name "*.pyc" -delete

# Actualizar dependencias
pip install --upgrade -r requirements.txt
```

### Debugging:
```bash
# Ver dispositivos de audio
python -c "import sounddevice as sd; print(sd.query_devices())"

# Verificar frecuencias de muestreo
python -c "import sounddevice as sd; print(sd.default.samplerate)"
```

## 📱 Optimización para Móviles

### Configuración recomendada:
```python
# En sonar.py, ajustar para móviles:
sample_rate = 44100  # Estándar para móviles
volume = 0.5         # Volumen moderado
blocksize = 2048     # Buffer más grande para estabilidad
```

### Ahorro de batería:
- Usar frecuencias más bajas cuando sea posible
- Limitar tiempo de transmisión
- Cerrar la app cuando no se use

## 🎉 ¡Listo para usar!

Una vez configurado, puedes:

1. **Ejecutar el programa principal**:
   ```bash
   ./run_sonar.sh
   ```

2. **Probar transmisión**:
   - Selecciona opción 1 (Transmisión)
   - Escribe un mensaje corto
   - Confirma la transmisión

3. **Probar recepción**:
   - Selecciona opción 2 (Recepción)
   - Verás la barra giratoria
   - Presiona Ctrl+C para detener

4. **Verificar funcionamiento**:
   - Usa Spectroid para ver las frecuencias
   - Prueba entre dos dispositivos
   - Comienza con frecuencias audibles

## 📞 Soporte

Si tienes problemas:
1. Verifica los permisos de audio
2. Prueba con frecuencias audibles primero
3. Usa Spectroid para verificar transmisiones
4. Revisa los logs de error

¡Disfruta experimentando con tu sistema de exfiltración ultrasónica! 🚀 