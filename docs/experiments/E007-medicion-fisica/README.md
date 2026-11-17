# E007 — Primera medición física: tonos aislados

**Estado:** herramienta lista y ensayada en un navegador con micrófono simulado
(2026-11-17). **La medición por aire está PENDIENTE**: necesita dos dispositivos.

## Pregunta

¿Cuánto se parece el modelo digital de E003–E006 a lo que ocurre entre un
altavoz y un micrófono reales? En concreto, para tonos aislados de 18 a 22 kHz:

1. ¿qué tonos llegan y con cuánto margen sobre el ruido?
2. ¿cuánto se desvía la frecuencia observada respecto a la emitida? (V1 Clean
   solo tolera 19 Hz hacia abajo, según E003);
3. ¿cambia el resultado si el navegador procesa la señal del micrófono?

## Herramienta

`/laboratorio/` es una página aparte de la aplicación. No transmite mensajes y
no está enlazada desde la interfaz principal.

- **Emisor:** reproduce 9 tonos (18 000 a 22 000 Hz cada 500 Hz), de 1 s con
  0,5 s de pausa, con `generarOnda`, el mismo camino de audio que la aplicación.
- **Receptor:** usa un `AnalyserNode` con los parámetros de la aplicación (FFT
  de 2048, suavizado 0,3). En cada cuadro guarda el pico tal como lo vería el
  receptor, un pico interpolado más fino que un bin, la magnitud y el piso de
  ruido de la banda. Al detener, descarga un JSON y muestra un resumen.
- **Sin sincronización:** los tonos están separados 500 Hz, así que cada cuadro
  se asigna a su tono por frecuencia. Los dos equipos no comparten reloj.
- **Privacidad:** el JSON incluye el agente de usuario del navegador y las
  notas que escribas; no guarda audio ni identificadores del micrófono.

Volver a analizar una captura: `node scripts/analizar_medicion.js captura.json`.

## Protocolo

Solo con dispositivos propios, a volumen moderado. Algunas personas y animales
perciben estas frecuencias.

1. Iniciar el servidor (`python3 src/web/backend/servidor_estatico.py`) y abrir
   `/laboratorio/` en los dos equipos. El micrófono exige un contexto seguro:
   `localhost` o HTTPS (ver `nginx.conf`).
2. Colocar los equipos a una distancia medida (empezar por 30 cm), sin moverlos.
3. En el receptor, anotar equipos, distancia, volumen y lugar; pulsar
   **INICIAR CAPTURA**.
4. Esperar 3 s en silencio, pulsar **EMITIR PLAN** en el emisor y esperar a que
   termine (13,5 s) más otros 3 s.
5. Pulsar **DETENER Y DESCARGAR** y conservar el JSON.
6. Repetir desmarcando «Captura como la aplicación». Es la comparación más
   importante (ver el ensayo de abajo).
7. Si hay tiempo: repetir a 1 m, intercambiar los papeles de los equipos y
   hacer una captura moviendo el receptor con la mano, para ver el desvío.

Guardar las capturas en `docs/experiments/E007-medicion-fisica/results/` con un
nombre que indique equipos y distancia.

## Cómo leer el resultado

| Columna | Qué responde |
|---|---|
| Detectado / Cuadros | Si el tono llegó. Un tono de 1 s debería dar unos 60 cuadros |
| Sobre el piso (dB) | Margen frente al ruido. Si cae al subir la frecuencia, la banda alta no conviene |
| Desvío mediano (Hz) | Error sistemático de frecuencia entre los dos equipos |
| Desvío mín–máx (Hz) | Variación durante el tono. Compararla con los 19 Hz de margen de V1 |
| Tono fuera del plan | Interferencias: otra fuente emite en la banda |

## Ensayo de la herramienta — MEDIDO (no es una medición por aire)

Para comprobar que la herramienta funciona de extremo a extremo se ejecutó en
Chromium 153 sin interfaz, entregándole como micrófono un WAV con el plan
sintetizado y un desvío conocido de +12 Hz en cada tono. Resultados en
[results/ensayo-navegador-simulado.json](results/ensayo-navegador-simulado.json).

| Captura | Ajustes que aplicó Chromium | Tonos detectados | Magnitud máxima en la banda |
|---|---|---|---|
| Como la aplicación (`audio: true`) | cancelación de eco, supresión de ruido y ganancia automática **activas** | 0 de 9 | 0 |
| Sin procesamiento | las tres **desactivadas** | 8 de 9 | 203 |

1. **Con la captura que usa hoy la aplicación, la banda de 18 a 22 kHz llegó
   en cero.** `app.js` y `app_archivos.js` piden el micrófono con
   `getUserMedia({ audio: true })`, y Chromium activó por defecto las tres
   etapas de procesamiento de voz.
2. **Sin procesamiento, la herramienta recuperó el desvío:** entre 11,7 y
   12,3 Hz de mediana en los ocho tonos detectados, frente a los 12 Hz
   aplicados. El pico interpolado mide por debajo del tamaño de bin.
3. **El tono de 22 000 Hz no llegó** y el margen cae desde 20 kHz (55 dB a
   19 kHz, 27 dB a 21,5 kHz). El contexto de audio era de 44,1 kHz y la
   conversión desde 48 kHz atenúa cerca de Nyquist.

### Qué significa y qué no

- Es un resultado de **un navegador, una versión y un micrófono simulado**. No
  demuestra que ocurra igual en un teléfono o en una laptop reales.
- `HISTORIA_TECNICA.md` registra recepción real entre 30 cm y 1 m, así que en
  al menos algunos equipos la banda sí pasa con `audio: true`. Lo que deja
  ver el ensayo es que **depende del navegador y del equipo**, y que hoy la
  aplicación no lo controla.
- **Hipótesis a comprobar (PENDIENTE):** pedir el micrófono con
  `echoCancellation`, `noiseSuppression` y `autoGainControl` desactivados mejora
  o iguala la recepción en todos los equipos. El paso 6 del protocolo lo mide
  en dos minutos. No se cambió la aplicación: V1 Clean sigue siendo la
  referencia hasta tener esa medición.

Reproducir el ensayo (requiere Playwright y Chromium, fuera de `npm test`):

    python3 src/web/backend/servidor_estatico.py &
    node scripts/ensayo_navegador/crear_wav_del_plan.mjs /tmp/plan.wav
    node scripts/ensayo_navegador/capturar_en_chromium.cjs /tmp/plan.wav /tmp/captura.json no

## Limitaciones

- La página se probó en Chromium sin interfaz; no en Firefox, Safari ni móviles.
- La captura avanza con `requestAnimationFrame`: se detiene si la pestaña pasa
  a segundo plano.
- El criterio de «tono» es un margen fijo de 55 bytes (unos 15 dB) sobre la
  mediana de la banda; es conservador y puede descartar tonos débiles.
- El emisor separa los tonos con `setTimeout`, como la aplicación. La duración
  observada puede variar algunas decenas de milisegundos.
