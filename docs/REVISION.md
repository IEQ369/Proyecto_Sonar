# Guía de revisión — caracterización digital (2026-11-17)

Este documento acompaña la rama `claude/proyecto-grande-recomendaciones-241b1t`.
Resume qué cambió, qué se comprobó y qué te toca decidir. Los detalles y las
cifras completas están en cada experimento.

## Qué se encontró

Todo es **simulación digital**; nada de esto demuestra rendimiento por aire.

1. **V1 tolera 59 Hz hacia arriba y solo 19 Hz hacia abajo** en 33 de 40
   símbolos, por el orden en que `frequencyToChar()` recorre el mapa. Con solo
   −10 Hz de desvío ya se pierden 5 de 38 caracteres.
   ([E003](experiments/E003-regiones-decision/README.md))
2. **Hay una franja en la que V1 emite el carácter vecino** (41–49 Hz por
   debajo de cada tono, el 4,2 % de la banda). El filtro de estabilidad evita
   que sea el 23,5 %. (E003)
3. **`7`, `8` y `9` no existen a 44,1 kHz**: superan Nyquist. (E003, E004)
4. **Símbolos de 30 ms fallan y los de 120 ms no mejoran** respecto a 60 ms con
   el análisis actual de tres cuadros de 2048 muestras.
   ([E004](experiments/E004-robustez-canal/README.md))
5. **El umbral fijo de magnitud 12 no distingue ruido de señal** en el modelo.
   (E004)
6. **El mapa candidato V2-A** duplica el margen (39 Hz), cabe bajo 21,5 kHz y
   decodifica todo a 44,1 kHz; no mejora frente al ruido, y cuando falla decide
   el vecino en vez de perder el símbolo.
   ([E005](experiments/E005-mapa-candidato-v2/README.md))
7. **El alcance está en el tamaño de FFT.** Con FFT de 8192 y símbolos de
   240 ms el error a −22,7 dB baja de 0,98 a 0,15, a costa de ir cuatro veces
   más lento. Alargar el símbolo sin agrandar la FFT no cambia nada.
   ([E006](experiments/E006-fft-y-zona-muerta/README.md))
8. **Una zona muerta en V2-A elimina los caracteres equivocados** hasta ±30 Hz,
   pero reduce la tolerancia al desvío y no aporta nada frente al ruido. (E006)

### Fuera de la simulación

9. **El procesamiento de voz del navegador puede borrar la banda completa.**
   La aplicación pide el micrófono con `getUserMedia({ audio: true })`. En un
   ensayo en Chromium 153 con micrófono simulado, eso activó cancelación de eco,
   supresión de ruido y ganancia automática, y la banda de 18–22 kHz llegó en
   cero; con las tres desactivadas se detectaron 8 de 9 tonos. No es una
   medición con hardware real y tu historia técnica registra recepción real, así
   que depende del equipo. ([E007](experiments/E007-medicion-fisica/README.md))

### Protocolo de archivos V2

10. **Hay un protocolo de archivos nuevo, por paquetes, en `/archivos_v2/`.**
    16 tonos, CRC16 por bloque, lista de faltantes, reenvío y CRC32 final. En
    simulación completa el archivo con hasta 42 % de paquetes perdidos y nunca
    aceptó un bloque dañado. Es unas 1,7 veces más rápido que el anterior, no
    las seis veces que estimaba el plan. No está probado por aire.
    ([E008](experiments/E008-archivos-v2/README.md))

## Qué cambió en el repositorio

| Archivo | Cambio |
|---|---|
| `src/web/static/js/simulacion/caracterizacion.js` | Nuevo. Políticas de decisión, ventanas, barrido, réplica del detector de pico y medición por sistema |
| `src/web/static/js/simulacion/mapa_candidato_v2.js` | Nuevo. Mapa candidato, solo para simulación |
| `scripts/run_e003.js` a `run_e006.js`, `experimento_util.js` | Nuevos. Experimentos deterministas |
| `docs/experiments/E003…` a `E006…` | Nuevos. README, resultados JSON y una figura SVG |
| `tests/caracterizacion.test.js` | Nuevo. 15 pruebas; varias fijan el baseline medido |
| `src/web/laboratorio/`, `src/web/static/js/core/medicion_fisica.js` | Nuevos. Página y lógica de la medición física E007 |
| `scripts/analizar_medicion.js`, `scripts/ensayo_navegador/` | Nuevos. Análisis de capturas y ensayo en Chromium |
| `tests/medicion_fisica.test.js` | Nuevo. 8 pruebas |
| `core/trama_archivos.js`, `core/modem_mfsk.js`, `core/transferencia_archivos.js` | Nuevos. Las tres capas del protocolo de archivos V2 |
| `simulacion/simulador_archivos.js`, `scripts/run_e008.js` | Nuevos. Simulación extremo a extremo y experimento E008 |
| `src/web/archivos_v2/` | Nuevo. Pantalla del protocolo V2 |
| `src/web/archivos/templates/index.html` | Un enlace nuevo a `/archivos_v2/`; nada más |
| `tests/archivos_v2.test.js` | Nuevo. 18 pruebas |
| `docs/PLAN_ARCHIVOS.md` | Nuevo. Plan por fases, con las correcciones tras implementarlo |
| `.github/workflows/ci.yml` | Nuevo. Pruebas y experimentos con Node 22 y 24 |
| `package.json` | `npm test` ya no usa `--test-isolation=none`; scripts de experimentos |
| `README.md`, `docs/ROADMAP.md`, `PROGRESO.md`, `docs/experiments/README.md` | Estado actualizado |

**No se tocó** el protocolo, el receptor, el emisor ni las pantallas de mensajes
y archivos. V1 Clean sigue siendo exactamente la misma referencia. La página
`/laboratorio/` es nueva, usa la hoja de estilos existente y no está enlazada
desde la interfaz principal. La pantalla `/archivos_v2/` también es nueva; la
única modificación a una pantalla existente es un enlace hacia ella en
`/archivos`.

## Qué se verificó

- `npm test`: 107 pruebas aprobadas, 0 fallidas (Node 22.23).
- `npm run experiments`: los siete experimentos se ejecutan; E003–E006 y
  E008 producen el mismo archivo en ejecuciones repetidas.
- El flujo de CI pasó en GitHub con Node 22 y Node 24 en el PR #3, para los
  commits hasta E006.
- `/laboratorio/` se ejecutó de extremo a extremo en Chromium 153 sin interfaz:
  captura, análisis, descarga del JSON y emisión, sin errores en consola.
- `/archivos_v2/` recibió en Chromium 153 una transferencia con dos bloques
  perdidos y su reenvío; el archivo descargado fue idéntico al original.
- La política `v1-receptor` ejecuta el `ReceptorMensajesCore` real, y una prueba
  comprueba que la regla ±80 Hz coincide con `frequencyToChar()` en toda la
  banda.

## Qué no se verificó

- `npm test` fallaba en Node 22.23 con `--test-isolation=none` («bad option»).
  Se quitó la opción y las 66 pruebas originales pasan igual; no se investigó
  por qué se había añadido.
- Nada se probó con audio real. La página de laboratorio solo se probó en
  Chromium sin interfaz con un micrófono simulado; las pantallas de mensajes y
  archivos no se abrieron en un navegador.
- La réplica del detector no incluye el suavizado temporal del `AnalyserNode`.

## Decisiones que te tocan

0. **Antes que nada: ¿la aplicación debe pedir el micrófono sin procesamiento
   de voz?** Es un cambio de una línea en `app.js` y `app_archivos.js`, pero
   modifica la recepción de V1 Clean, así que no lo hice. El paso 6 del
   protocolo de E007 lo mide con tus equipos en dos minutos.

1. **¿Cómo corregir la asimetría de V1?** La opción de menor riesgo que
   muestran los datos es decidir por frecuencia más cercana manteniendo el mapa
   actual (margen de 19 a 49 Hz, 0 % de símbolo equivocado en E003). Cambia el
   comportamiento del receptor, así que debería ser una versión nueva y no un
   arreglo silencioso de V1 Clean.
2. **¿Qué hacer con `7`, `8` y `9`?** Moverlos bajo Nyquist obliga a cambiar el
   mapa; V2-A es una forma de hacerlo, no la única.
3. **¿Zona muerta o suma de verificación?** V2-A sin zona muerta cambia
   pérdidas por caracteres equivocados (E005); la zona muerta lo evita pero
   cuesta tolerancia (E006). Depende de cuánto desvío haya por aire.
4. **¿Velocidad o alcance?** FFT y símbolo mayores dan alcance y quitan
   velocidad (E006). Podría ser un modo seleccionable en vez de un cambio fijo.
5. **Parámetros de archivos V2.** Símbolo de 80 ms, bloques de 16 bytes y
   límite de 4 096 bytes son valores conservadores elegidos en simulación.
   Acortar el símbolo a 60 ms sube la velocidad un 30 %, pero pierde más
   paquetes con señal débil (E008).
6. **Licencia y visibilidad del repositorio** siguen pendientes y son tuyas.

## Siguientes pasos sugeridos

1. Ejecutar E007 con dos dispositivos propios: la herramienta y el protocolo ya
   están listos. Es lo que desbloquea las decisiones 0, 3 y 4.
2. Medir una suma de verificación por mensaje como alternativa a la zona muerta.
3. E3-007 (forma de onda) y la parte de E3-004 que depende del navegador.
