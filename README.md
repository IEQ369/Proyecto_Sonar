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
- Computadora con Python 3.11.4 (recomendado)

### Software

```bash
numpy>=1.19.0
scipy>=1.7.0
sounddevice>=0.4.3
matplotlib>=3.7.1
pydub>=0.25.1
```

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/IEQ369/Proyecto_Sonar.git
cd proyecto-sonar

# Instalar dependencias
pip install -r requirements.txt

# Verificar
python sonar.py
```

## Uso Básico

### Emisor (Funcional)

```bash
python src/core/emisor.py -m "texto secreto"
```

### Receptor (En desarrollo)

```bash
python src/core/receptor.py --modo debug
```

### Parámetros Disponibles

```
Emisor:
  -m  "Texto a transmitir"

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

- Python 3.11.4
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

- [SurfingAttack: Interactive Hidden Attack on Voice Assistants Using Ultrasonic Guided Wave](https://surfingattack.github.io/)  
  Yan, Qiben et al. NDSS Symposium 2020.  
  [PDF](https://surfingattack.github.io/surfingattack-ndss20.pdf)

- [DolphinAttack: Inaudible Voice Commands](https://dolphinattack.com/)

- [Chirp: Sound-based Data Transfer (GitHub)](https://github.com/solst-ice/chirp)

- [BadBIOS: mito Malware (Wikipedia)](https://en.wikipedia.org/wiki/BadBIOS)

- [Web Audio API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

## Técnicas de Robustez y Visualización Implementadas

### Emisor
- Fade in/out en cada tono
- Tonos paralelos (Parallel Tones)
- Control de volumen por tono
- Duraciones precisas por símbolo y marcador
- Secuencia de protocolo clara (START, SYNC, DATOS, END)
- Mapeo de caracteres amplio y configurable (A-Z, 0-9, espacio)
- Configurabilidad de parámetros
- Logs de depuración en consola

### Receptor
- Detección de frecuencia dominante
- Tolerancia de frecuencia configurable
- Umbral de magnitud configurable
- Buffer de historia de frecuencias
- Debounce y lockout avanzados
- Detección de tonos paralelos (confianza extra)
- Reconocimiento de marcadores de protocolo
- Timeouts y reinicio automático
- Logs de depuración y visualización de estado

### FFT y Visualización
- Tamaño de FFT pequeño (fftSize bajo)
- SmoothingTimeConstant bajo
- Actualización con requestAnimationFrame
- Canvas responsivo y optimizado para móvil
- Visualización clara del pico dominante (cian brillante)
- Visualización de la frecuencia dominante y su magnitud
- Visualización de la segunda frecuencia más fuerte
- Optimización del bucle de dibujo

## Problemas, hallazgos y soluciones

### Problema: Baja detectabilidad de frecuencias altas
Durante las pruebas, se observó que ciertas frecuencias (especialmente las más altas, como J, K, P, X, Y, Z, Ñ) no eran detectadas correctamente por el receptor, incluso usando el mismo hardware (altavoz y micrófono) que sí funcionaba con apps móviles de generación de tonos.

### Hipótesis y pruebas realizadas
- Se ajustó la amplificación visual en el FFT para compensar la atenuación, pero el problema persistía.
- Se revisó el protocolo, la tolerancia y el umbral de detección, sin mejoras significativas.
- Se comparó la señal generada por la Web Audio API con la de apps móviles y se notó que "sonaban" diferente, aunque ambas usaban onda senoidal.

### Hallazgo clave
El tipo de onda generado por el emisor web era fundamental. Las ondas senoidales puras se atenúan mucho en frecuencias ultrasónicas y el micrófono no las detecta bien. Sin embargo, las ondas cuadradas (o de sierra), al tener más armónicos, son mucho más detectables por el micrófono, incluso si la frecuencia fundamental se atenúa.

### Solución aplicada
- Se cambió el tipo de onda del emisor web de 'sine' (senoidal) a 'square' (cuadrada), logrando una mejora drástica en la detectabilidad de todas las frecuencias, especialmente las altas.
- Se ajustó la amplitud para evitar distorsión.
- Se documentó la importancia de probar diferentes tipos de onda y sample rates para máxima robustez.

### Recomendaciones
- Para máxima detectabilidad, usar onda cuadrada o de sierra y amplitud alta (sin distorsión).
- Probar siempre el sistema con diferentes tipos de onda y sample rates.
- Documentar todos los problemas y hallazgos para futuras referencias y mejoras.
