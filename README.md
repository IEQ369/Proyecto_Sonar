# SONAR - transmision de datos por ultrasonido

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-Supported-green.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Status](https://img.shields.io/badge/Status-Functional-brightgreen.svg)](STATUS)
[![License](https://img.shields.io/badge/License-Educational-green.svg)](LICENSE)

herramienta para enviar y recibir mensajes y archivos usando ultrasonido, funciona en navegadores modernos usando web audio api, multiplataforma, sin cables ni red

**estado actual:** funcional, sistema robusto con transmision de mensajes y archivos, optimizado para hardware de consumo

## overview

sonar permite transmitir mensajes de texto y archivos entre dispositivos usando solo audio, sin red ni cables, usando javascript puro y web audio api, soporta laptops y moviles, interfaz web responsive, protocolos robustos y documentacion completa de problemas y soluciones

## instalacion y uso

clona el repositorio:
```
git clone https://github.com/IEQ369/Proyecto_Sonar.git
cd Proyecto_Sonar
```

opcion 1, servidor python recomendado:
```
python src/web/backend/servidor_estatico.py
```

opcion 2, servidor http simple:
```
cd src/web
python -m http.server 8000
```

accede desde el navegador:
```
http://localhost:8000/          # mensajes
http://localhost:8000/archivos  # transmision de archivos
```

**importante para moviles:**
- los navegadores moviles requieren https para permisos de microfono
- para pruebas en moviles, usa ngrok o similar:
```
ngrok http 8000
```
- o configura un servidor con ssl:
```
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
python -m http.server 8000 --bind 0.0.0.0
```
- accede via https://tu-dominio.com o https://ngrok-url.ngrok.io

opcion 3, servidor con https (produccion):
- usa nginx, apache, o cualquier servidor web con ssl
- el archivo nginx.conf incluye configuracion de ejemplo
- certificados ssl: letsencrypt (gratis) o autofirmados
- cloudflare, heroku, vercel, o cualquier hosting con https

## sobre los protocolos y configuracion

- protocolo de mensajes: 18500-22300 hz, start, sync, datos, end, tolerancia 60 hz, simbolos 0.06s, marcadores 0.09s
- protocolo de archivos: 17000-18000 hz, start, sync, end, bit_0, bit_1, ack, nack
- mapeo ascii completo: a-z, 0-9, ñ, espacio
- control de volumen por caracter: numeros y letras problematicas con mayor amplitud
- generador de ondas: senoidal, cuadrada, sierra, triangular
- deteccion automatica de conflictos de frecuencias

## opciones y parametros principales

- hardware: microfono y parlante que soporten mas de 18 khz
- navegador moderno con soporte web audio api
- python 3 para el servidor opcional
- parametros de transmision ajustables en js (duracion, amplitud, tipo de onda)

## ejemplos de uso

- envia mensajes desde la interfaz web, escribe y presiona enter
- recibe mensajes en otro dispositivo con la web abierta y microfono activo
- para archivos, usa la seccion archivos y arrastra el archivo
- debug en tiempo real con logs especificos

## caracteristicas principales

- transmision de mensajes y archivos por ultrasonido
- protocolo robusto con deteccion estable y control de volumen por caracter
- generador de ondas personalizado, soporta senoidal, cuadrada, sierra, triangular
- deteccion automatica de conflictos de frecuencias
- interfaz web responsive con visualizacion fft en tiempo real
- barra de progreso y descarga automática de archivos recibidos
- documentacion de problemas y soluciones

## tips y recomendaciones

- usa parlantes y microfonos de buena calidad para mejor alcance
- en moviles, la emision es mas debil, prueba laptop a movil para mejores resultados
- mantente cerca (1-3 metros) para mayor fiabilidad
- revisa la consola para logs de debug y problemas de deteccion

## estructura del proyecto

```
src/web/
├── templates/
│   ├── index.html          # interfaz de mensajes
│   ├── emisor.html         # emisor de mensajes
│   └── receptor.html       # receptor de mensajes
├── static/
│   ├── css/
│   │   └── styles.css      # estilos cyberpunk
│   └── js/
│       ├── app.js          # receptor de mensajes
│       ├── emisor_ultrasonico.js
│       ├── protocolo_ultrasonico.js
│       ├── generador_onda.js
│       ├── fft_visualizer.js
│       └── ui_archivo.js   # utilidades ui
├── archivos/
│   ├── templates/
│   │   └── index.html      # interfaz de archivos
│   └── static/
│       └── js/
│           ├── app_archivos.js      # receptor de archivos
│           ├── emisor_archivos.js   # emisor de archivos
│           ├── receptor_archivos.js # receptor robusto
│           └── protocolo_archivos.js # protocolo de archivos
└── backend/
    └── servidor_estatico.py
```

## limitaciones y consideraciones

- parlantes moviles: distorsion en frecuencias altas, emision debil
- microfonos: sensibilidad variable, atenuacion en ultrasonidos
- distancia: limitada por atenuacion del aire (1-3 metros maximo)
- **https obligatorio**: navegadores moviles requieren https para permisos de microfono
- web audio api no disponible en navegadores antiguos
- fft en tiempo real puede ser intensivo en dispositivos debiles
- sensible a interferencias y eco
- algunos antivirus pueden bloquear la generacion de audio

## problemas y soluciones recientes

- antes, los archivos recibidos solo se podían descargar manualmente, ahora la descarga es automática al finalizar la recepción
- problemas de hardware: algunos parlantes/micrófonos no detectan bien ciertas frecuencias, se recomienda ajustar tolerancia y frecuencias según el dispositivo
- si la transmisión de archivos falla, prueba aumentar la duración de símbolo, la tolerancia o usar hardware diferente

## roadmap completado

- migracion de python a web audio api
- protocolo robusto de mensajes con deteccion estable
- protocolo binario para archivos con confirmacion
- generador de ondas personalizado (senoidal, cuadrada, sierra, triangular)
- control de volumen por caracter para maxima robustez
- deteccion automatica de conflictos de frecuencias
- interfaz web responsive con visualizacion fft
- sistema de debug y logs en tiempo real
- cancelacion automatica y limpieza de recursos
- documentacion completa de problemas y soluciones
- separacion de modos: mensajes y archivos con protocolos independientes
- organizacion modular de archivos por funcionalidad

## referencias

- surfingattack: https://surfingattack.github.io/
- surfingattack: interactive hidden attack on voice assistants using ultrasonic guided waves: https://surfingattack.github.io/papers/NDSS-surfingattack.pdf
- web audio api (mdn): https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- chirp: sound-based data transfer: https://github.com/solst-ice/chirp

## contribuciones

proyecto academico, contribuciones bienvenidas: optimizacion de algoritmos, mejoras de interfaz, documentacion de casos de uso, pruebas en diferentes dispositivos

## licencia

proyecto educativo, uso responsable requerido

## autor

Isai Espinoza

---

**ver historia tecnica completa**: [HISTORIA_TECNICA.md](HISTORIA_TECNICA.md)