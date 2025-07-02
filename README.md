# Proyecto Sonar - Sistema de Comunicación Ultrasónica

Este proyecto implementa un sistema de comunicación ultrasónica que permite la transmisión de datos utilizando frecuencias inaudibles (>18 kHz). El sistema incluye un emisor basado en Python y un receptor web que utiliza la Web Audio API para una mejor detección en tiempo real.

## Estructura del Proyecto

```
├── src/
│   ├── core/           # Componentes principales
│   │   ├── emisor.py       # Emisor ultrasónico
│   │   ├── frecuencias.py  # Definiciones de frecuencias
│   │   └── receptor.py     # Receptor Python (legacy)
│   │
│   └── web/            # Interfaz web del receptor
│       ├── frontend/       # Cliente web
│       │   ├── css/           # Estilos
│       │   ├── js/            # JavaScript
│       │   └── index.html     # Página principal
│       └── backend/        # Servidor Flask
│           └── app.py         # Aplicación Flask
│
├── requirements.txt    # Dependencias Python
└── README.md          # Este archivo
```

## Características

- Transmisión de datos mediante frecuencias ultrasónicas (18-22 kHz)
- Receptor web con visualización en tiempo real del espectro
- Interfaz moderna y responsiva
- Procesamiento de señal optimizado para MEMS
- Detección robusta con análisis SNR y persistencia temporal

## Requisitos

### Hardware
- Micrófono compatible con frecuencias ultrasónicas (MEMS recomendado)
- Altavoces capaces de reproducir frecuencias >18 kHz
- Tarjeta de sonido con soporte para 48 kHz o superior

### Software
- Python 3.8 o superior
- Navegador web moderno con soporte para Web Audio API

## Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd Proyecto_Sonar
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

## Uso

### Iniciar el Receptor Web

1. Navegar al directorio del proyecto:
```bash
cd src/web/backend
```

2. Iniciar el servidor Flask:
```bash
python app.py
```

3. Abrir el navegador y acceder a:
```
http://localhost:5000
```

### Enviar Datos (Emisor)

Desde otro terminal, ejecutar el emisor:
```bash
python src/core/emisor.py "mensaje de prueba"
```

## Protocolo de Comunicación

- Frecuencia de inicio: 18500 Hz
- Frecuencia de sincronización: 18600 Hz
- Frecuencia de fin: 22000 Hz
- Rango de datos: 18700-21900 Hz (incrementos de 100 Hz)

## Recomendaciones de Uso

1. Utilizar en un ambiente con poco ruido ambiental
2. Mantener una distancia óptima entre emisor y receptor (1-2 metros)
3. Evitar obstáculos entre dispositivos
4. Ajustar el volumen del emisor según sea necesario

## Limitaciones Conocidas

- El rendimiento puede variar según el hardware de audio
- Algunas frecuencias pueden no ser reproducibles en ciertos dispositivos
- La calidad de la transmisión depende del ruido ambiental

## Contribuir

Las contribuciones son bienvenidas. Por favor, crear un issue o pull request para sugerencias y mejoras.

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.
