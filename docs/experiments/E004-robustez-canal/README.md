# E004 — Robustez de V1 Clean: atenuación, duración y muestreo

**Estado:** ejecutado el 2026-11-17 · **Roadmap:** M3, parte digital de E3-003,
E3-005 y E3-006 · **Alcance:** simulación digital determinista con ruido
uniforme. No mide audio por aire.

## Pregunta

¿Cómo cambia la tasa de error de símbolo (SER) de V1 Clean cuando la señal se
atenúa frente a un ruido fijo, cuando cambia la duración del símbolo y cuando
el audio se muestrea a 44,1 kHz en lugar de 48 kHz?

## Método

Cada uno de los 38 caracteres se transmite 5 veces como tono aislado (amplitud
0,1 multiplicada por la ganancia) con ruido uniforme de amplitud 0,05 y semillas
fijas. El receptor ve tres cuadros de 2048 muestras separados 1/60 s y centrados
en el símbolo; las detecciones se entregan al `ReceptorMensajesCore` real. Un
símbolo cuenta como error si se decide otro carácter o no se decide ninguno.

Reproducir: `npm run experiment:e004`. Datos en
[results/latest.json](results/latest.json).

## Resultados — MEDIDO

SER por relación señal/ruido de banda ancha:

| Muestreo | Símbolo | 7,8 dB | −2,7 dB | −12,2 dB | −16,7 dB | −18,2 dB | −20,2 dB | −22,7 dB |
|---|---|---|---|---|---|---|---|---|
| 48 kHz | 30 ms | 0,02 | 0,10 | 0,85 | 0,98 | 0,98 | 0,99 | 1,00 |
| 48 kHz | 60 ms (actual) | 0,00 | 0,00 | 0,00 | 0,20 | 0,49 | 0,83 | 0,95 |
| 48 kHz | 120 ms | 0,00 | 0,00 | 0,00 | 0,14 | 0,47 | 0,84 | 0,98 |
| 44,1 kHz | 30 ms | 0,08 | 0,18 | 0,83 | 0,97 | 0,99 | 0,99 | 0,99 |
| 44,1 kHz | 60 ms (actual) | 0,08 | 0,08 | 0,08 | 0,29 | 0,59 | 0,87 | 0,97 |
| 44,1 kHz | 120 ms | 0,08 | 0,08 | 0,08 | 0,25 | 0,50 | 0,82 | 0,95 |

1. **Hay un precipicio, no una pendiente.** Con símbolos de 60 ms, V1 pasa de
   0 errores a −12,2 dB a casi la mitad de los símbolos a −18,2 dB.
2. **30 ms no alcanza.** El cuadro de análisis dura 42,7 ms (2048 muestras a
   48 kHz); un símbolo más corto no llena tres cuadros y falla incluso con
   buena señal.
3. **Duplicar a 120 ms casi no ayuda** en este modelo: el receptor sigue
   usando tres cuadros de 2048 muestras, así que el tiempo extra no se integra.
4. **A 44,1 kHz hay un piso de error de 0,08** (3 de 38 caracteres) que no
   depende del ruido: son `7`, `8` y `9`, por encima de Nyquist (ver E003).
5. **El umbral fijo de magnitud (12) no separa ruido de señal** en este modelo:
   ruido de amplitud 0,001 ya produce un pico de 18, y de amplitud 0,05, 141.

## Interpretación — INFERIDO

- Si se quiere más alcance, alargar el símbolo solo sirve si el receptor
  aprovecha ese tiempo (más cuadros o una ventana mayor). Es una pregunta para
  E3-004 (tamaño de FFT), todavía **PENDIENTE**.
- El resultado 5 sugiere estimar el piso de ruido en vez de usar un umbral
  fijo, pero la escala real depende del micrófono y de la ganancia del
  navegador. **PENDIENTE** de medir con hardware.

## Limitaciones

Ruido uniforme y blanco, sin eco, sin interferencias tonales ni respuesta del
altavoz o del micrófono. Los valores de SNR son de banda ancha y no equivalen a
una distancia. Cinco repeticiones por carácter dan 190 símbolos por celda: sirve
para ver la forma de la curva, no para el segundo decimal.
