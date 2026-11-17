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

## Qué cambió en el repositorio

| Archivo | Cambio |
|---|---|
| `src/web/static/js/simulacion/caracterizacion.js` | Nuevo. Políticas de decisión, ventanas, barrido, réplica del detector de pico y medición por sistema |
| `src/web/static/js/simulacion/mapa_candidato_v2.js` | Nuevo. Mapa candidato, solo para simulación |
| `scripts/run_e003.js`, `run_e004.js`, `run_e005.js`, `experimento_util.js` | Nuevos. Experimentos deterministas |
| `docs/experiments/E003…`, `E004…`, `E005…` | Nuevos. README, resultados JSON y una figura SVG |
| `tests/caracterizacion.test.js` | Nuevo. 13 pruebas; varias fijan el baseline medido |
| `.github/workflows/ci.yml` | Nuevo. Pruebas y experimentos con Node 22 y 24 |
| `package.json` | `npm test` ya no usa `--test-isolation=none`; scripts de experimentos |
| `README.md`, `docs/ROADMAP.md`, `PROGRESO.md`, `docs/experiments/README.md` | Estado actualizado |

**No se tocó** el protocolo, el receptor, el emisor, la interfaz ni el diseño
visual. V1 Clean sigue siendo exactamente la misma referencia.

## Qué se verificó

- `npm test`: 79 pruebas aprobadas, 0 fallidas (Node 22.23).
- `npm run experiments`: los cinco experimentos se ejecutan; E003–E005 producen
  el mismo archivo en ejecuciones repetidas.
- La política `v1-receptor` ejecuta el `ReceptorMensajesCore` real, y una prueba
  comprueba que la regla ±80 Hz coincide con `frequencyToChar()` en toda la
  banda.

## Qué no se verificó

- **El flujo de CI no se ha ejecutado en GitHub.** Se escribió y los mismos
  comandos pasan en local, pero su primera ejecución real será en el PR.
- `npm test` fallaba en Node 22.23 con `--test-isolation=none` («bad option»).
  Se quitó la opción y las 66 pruebas originales pasan igual; no se investigó
  por qué se había añadido.
- Nada se probó en un navegador ni con audio real.
- La réplica del detector no incluye el suavizado temporal del `AnalyserNode`.

## Decisiones que te tocan

1. **¿Cómo corregir la asimetría de V1?** La opción de menor riesgo que
   muestran los datos es decidir por frecuencia más cercana manteniendo el mapa
   actual (margen de 19 a 49 Hz, 0 % de símbolo equivocado en E003). Cambia el
   comportamiento del receptor, así que debería ser una versión nueva y no un
   arreglo silencioso de V1 Clean.
2. **¿Qué hacer con `7`, `8` y `9`?** Moverlos bajo Nyquist obliga a cambiar el
   mapa; V2-A es una forma de hacerlo, no la única.
3. **¿Zona muerta o suma de verificación?** V2-A sin zona muerta cambia
   pérdidas por caracteres equivocados (ver E005).
4. **Licencia y visibilidad del repositorio** siguen pendientes y son tuyas.

## Siguientes pasos sugeridos

1. E3-004: comparar tamaños de FFT y número de cuadros, que es donde E004
   indica que está el alcance.
2. Repetir E005 con una variante de V2-A con zona muerta.
3. Primera medición física controlada: un solo tono, dos dispositivos propios,
   desvío y magnitud observados, para saber cuánto se parece el modelo al aire.
