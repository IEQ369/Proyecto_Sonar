# Exfiltración de Datos por Ultrasonido

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Status](https://img.shields.io/badge/Status-In_Development-orange.svg)](STATUS)
[![License](https://img.shields.io/badge/License-Educational-green.svg)](LICENSE)

## Descripción

Herramienta ofensiva para exfiltración de datos usando señales ultrasónicas inaudibles (>18 kHz). Permite transmitir comandos, texto y archivos pequeños entre laptops aprovechando hardware de audio común (micrófonos y parlantes integrados).

**Estado Actual**: Proyecto en desarrollo como parte de trabajo académico universitario. El emisor está funcional, pero el receptor presenta dificultades en la detección robusta de señales ultrasónicas. Se está trabajando en mejorar la recepción mediante técnicas avanzadas de procesamiento de señal y posible integración con tecnologías web.

## Requisitos

### Hardware
- Micrófono capaz de capturar frecuencias >20 kHz
- Parlante capaz de emitir frecuencias >20 kHz
- Computadora con Python 3.8+

### Software
```bash
numpy>=1.19.0
scipy>=1.7.0
sounddevice>=0.4.3
```

## Instalación

```bash
# Clonar el repositorio
git clone [URL_del_repositorio]
cd proyecto-sonar

# Instalar dependencias
pip install -r requirements.txt

# Verificar hardware (opcional)
python test_ultrasonido_hardware.py
```

## Uso Básico

### Emisor (Funcional)
```bash
python src/core/emisor.py --mensaje "texto secreto" --volumen 0.1
```

### Receptor (En desarrollo)
```bash
python src/core/receptor.py --modo debug
```

### Parámetros Disponibles
```
Emisor:
  --mensaje TEXT     Texto a transmitir
  --volumen FLOAT   Volumen de emisión (0-1)
  --freq-min INT    Frecuencia mínima (default: 18000)
  --freq-max INT    Frecuencia máxima (default: 26000)

Receptor:
  --modo [normal|debug]   Modo de operación
  --umbral FLOAT         Umbral de detección en dB
  --ventana INT          Tamaño de ventana FFT en ms
```

## Características Principales

- Transmisión de datos usando frecuencias ultrasónicas (18-26 kHz)
- Mapeo ASCII a frecuencias únicas para cada carácter
- Filtrado y detección con FFT
- Configurable: frecuencias, duración, umbrales
- No requiere red ni cables, solo audio
- Inspirado en ataques reales (SurfingAttack, DolphinAttack)

## Tecnología Usada

### Core
- Python 3.8+
- numpy/scipy para procesamiento de señal
- sounddevice para captura/emisión de audio
- Filtros Butterworth y análisis FFT

### Visualización (Planeada)
- JavaScript/Web Audio API
- HTML5/CSS3
- Visualización espectral en tiempo real

## Limitaciones Actuales

### Hardware
- Atenuación significativa de frecuencias ultrasónicas en hardware común
- Requiere calibración específica según el equipo
- Sensibilidad variable entre diferentes micrófonos

### Software
- **Receptor**: Dificultades en la detección robusta de señales
- **Procesamiento**: Falsos positivos en ambientes ruidosos
- **Rendimiento**: Velocidad limitada (~1 min/200 bytes)
- **Interferencia**: Posibles batidos audibles en multi-frecuencia

### Ambiente
- Sensible a ruido ambiental y eco
- Rendimiento variable según condiciones acústicas
- Distancia de transmisión limitada

## Roadmap

### Fase Actual
- [x] Implementación básica del emisor
- [x] Protocolo de comunicación inicial
- [x] Filtrado pasa-banda
- [ ] Detección robusta en receptor
- [ ] Integración con visualización web

### Próximas Etapas
- Mejorar algoritmos de detección
- Implementar técnicas avanzadas (FDM/OFDM)
- Agregar corrección de errores
- Optimizar para ambientes ruidosos
- Completar interfaz de visualización

## Referencias

- [Chirp: Sound-based Data Transfer](https://github.com/solst-ice/chirp)
- [DolphinAttack Research](https://github.com/walac/dolphin-attack)
- [SurfingAttack](https://surfingattack.github.io/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## Autores

- Isai Espinoza Quiroga
- Universidad Mayor de San Simon
- Proyecto para Scesi

## Licencia

Este proyecto es exclusivamente para fines educativos y de investigación académica. No está permitido su uso en sistemas reales sin autorización explícita.

---

**Nota**: Este proyecto está activamente en desarrollo. El receptor está siendo mejorado para lograr una detección más robusta de señales ultrasónicas.
