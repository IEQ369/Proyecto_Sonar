# SONAR

SONAR es un proyecto experimental de comunicación acústica y ciberseguridad. Explora si altavoces y micrófonos comunes pueden transportar datos mediante tonos de alta frecuencia, sin añadir hardware especializado. Las pantallas de mensajes y archivos sirven para estudiar y demostrar el canal.

La comunicación del contenido usa audio. El servidor HTTP solo entrega la aplicación web al navegador. Parte de las frecuencias empleadas está cerca del límite audible; por eso no se afirma que toda transmisión sea ultrasónica o inaudible.

## Estado actual

**V1 Clean** tiene corregidos los contratos lógicos de mensajes y archivos que impedían comparaciones reproducibles. La suite automatizada cuenta con 79 pruebas aprobadas. Los experimentos E001 y E002 conservan resultados y fallos del prototipo como línea base.

Esto **no demuestra fiabilidad acústica física**. Continúan pendientes la caracterización de frecuencias, la sincronización temporal y las pruebas controladas con altavoces y micrófonos reales. Tampoco se debe asumir que la transferencia de archivos por aire o un mecanismo de confirmación y reenvío ya sean fiables.

La caracterización digital de V1 Clean ya tiene sus primeras mediciones (E003, E004 y E005, en simulación):

- cada carácter tolera 59 Hz de desvío hacia arriba pero solo 19 Hz hacia abajo;
- con audio a 44,1 kHz, `7`, `8` y `9` quedan por encima de Nyquist y no se decodifican;
- símbolos de 30 ms no alcanzan para el análisis actual, y alargarlos a 120 ms casi no mejora;
- un mapa candidato (V2-A) corrige los dos primeros puntos, no mejora frente al ruido y falla de forma distinta. No está adoptado.

El siguiente trabajo técnico es revisar esos resultados ([guía de revisión](docs/REVISION.md)), completar la caracterización y repetirla bajo condiciones físicas controladas. El enfoque de la investigación científica con el equipo todavía debe definirse.

## Ejecutar localmente

Requisitos: Python 3 para servir la interfaz y un navegador con Web Audio API.

1. Desde la raíz del proyecto, ejecutar:

       python3 src/web/backend/servidor_estatico.py

2. Abrir http://localhost:8000/ para mensajes o http://localhost:8000/archivos para archivos.

El servidor sirve archivos estáticos; no procesa las señales ni los datos transmitidos. En otro dispositivo, el acceso por HTTP mediante la IP de la laptop puede cargar la página, pero el permiso del micrófono normalmente exige un contexto seguro, como HTTPS. Por ello, que la página abra en un celular no implica que pueda recibir audio.

## Pruebas y experimentos

Requisitos: Node.js y npm.

    npm test
    npm run experiment:e001
    npm run experiment:e002
    npm run experiments

`npm test` verifica contratos lógicos y simulaciones deterministas sin requerir dos dispositivos. E001 estudia mensajes y E002 documenta defectos históricos del protocolo de archivos. `npm run experiments` ejecuta además E003 (regiones de decisión), E004 (robustez) y E005 (comparación con un mapa candidato). Cada envío se verifica en GitHub Actions con Node 22 y 24. Algunos tests imprimen conflictos conocidos de frecuencias: esos mensajes son evidencia de problemas pendientes, no fallos de la suite.

Los resultados y su interpretación están en [docs/experiments](docs/experiments/README.md). Los tests se conservan porque permiten detectar regresiones y sostener las afirmaciones técnicas del proyecto.

## Estructura

    Proyecto_Sonar/
    ├── README.md                 entrada y estado actual
    ├── PROGRESO.md               bitácora de decisiones y resultados
    ├── HISTORIA_TECNICA.md       evolución histórica
    ├── docs/                    arquitectura, auditoría, roadmap y experimentos
    ├── scripts/                 ejecución de experimentos reproducibles
    ├── src/web/backend/         servidor estático local
    ├── src/web/static/          mensajes: interfaz, protocolo y simulador
    ├── src/web/archivos/        flujo de archivos
    └── tests/                   pruebas automáticas

La distribución de `src/web` todavía refleja dos flujos parcialmente separados, mensajes y archivos. Reorganizar los módulos requerirá actualizar sus importaciones y rutas; no se han movido solo por estética.

## Limitaciones conocidas

- Algunas ventanas de decisión de frecuencias se solapan.
- El mapa de mensajes incluye tonos problemáticos para audio a 44,1 kHz.
- El receptor de archivos aún tiene problemas de reloj y frecuencias de control que colisionan con datos.
- El resultado real depende del hardware, el ruido, el eco y la posición de los dispositivos.

Ninguna distancia de alcance o tasa de éxito físico está validada como garantía. Las pruebas de seguridad deben realizarse únicamente con dispositivos propios o en entornos autorizados.

## Documentación

- [Arquitectura y funcionamiento](docs/ARQUITECTURA.md) — descripción de la base histórica, previa a los últimos cambios de V1 Clean.
- [Auditoría técnica](docs/AUDITORIA.md) — problemas comprobados y evidencia.
- [Roadmap](docs/ROADMAP.md) — dirección y límites del proyecto.
- [Experimentos](docs/experiments/README.md) — configuraciones y resultados reproducibles.
- [Guía de revisión](docs/REVISION.md) — qué cambió el 2026-11-17, qué se verificó y qué decisiones quedan abiertas.
- [Progreso](PROGRESO.md) — secuencia de cambios, decisiones y pendientes.
- [Historia técnica](HISTORIA_TECNICA.md) — evolución del prototipo.

## Referencias y antecedentes

Estas fuentes ya figuraban en el README original del proyecto y se conservan
para orientar la investigación. No todas son artículos científicos ni prueban
por sí mismas los resultados de SONAR:

- [SurfingAttack — sitio del proyecto](https://surfingattack.github.io/).
- [SurfingAttack: Interactive Hidden Attack on Voice Assistants Using Ultrasonic Guided Waves — artículo](https://surfingattack.github.io/papers/NDSS-surfingattack.pdf).
- [Web Audio API — documentación de MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API).
- [Chirp: Sound-based Data Transfer — proyecto de código](https://github.com/solst-ice/chirp).

La [historia técnica](HISTORIA_TECNICA.md#referencias) conserva además el
antecedente de BadBIOS, señalado allí como mito/leyenda y no como evidencia
experimental del proyecto.

## Licencia y autoría

Autor: Isai Espinoza Quiroga.

Aún no se ha elegido una licencia de reutilización. Antes de abrir el repositorio a contribuciones o redistribuir el código, se debe tomar esa decisión y añadir el archivo de licencia correspondiente.
