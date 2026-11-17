# E006 — Tamaño de FFT y zona muerta

**Estado:** ejecutado el 2026-11-17 · **Roadmap:** M3, E3-004 (parte digital) ·
**Alcance:** simulación digital determinista con ruido uniforme, a 48 kHz. No
mide audio por aire.

Responde las dos preguntas que E004 y E005 dejaron abiertas.

Reproducir: `npm run experiment:e006` (unos 15 s). Datos en
[results/latest.json](results/latest.json).

## A — ¿Un tamaño de FFT mayor da más alcance?

**Método.** Igual que E004 (V1 Clean con el receptor real, tres cuadros por
símbolo, 5 repeticiones por carácter), variando el tamaño de FFT y la duración
del símbolo.

**Resultados — MEDIDO.** Tasa de error de símbolo:

| FFT (cuadro) | Símbolo | −12,2 dB | −18,2 dB | −22,7 dB | −26,2 dB |
|---|---|---|---|---|---|
| 1024 (21,3 ms) | 60 ms | 0,09 | 0,89 | 0,98 | 1,00 |
| 2048 (42,7 ms), actual | 60 ms | 0,00 | 0,49 | 0,95 | 0,99 |
| 2048 (42,7 ms) | 240 ms | 0,00 | 0,47 | 0,98 | 1,00 |
| 4096 (85,3 ms) | 60 ms | 0,00 | 0,23 | 0,92 | 0,98 |
| 4096 (85,3 ms) | 120 ms | 0,00 | 0,01 | 0,69 | 0,96 |
| 8192 (170,7 ms) | 60 ms | 0,00 | 0,09 | 0,73 | 0,95 |
| 8192 (170,7 ms) | 120 ms | 0,00 | 0,00 | 0,26 | 0,79 |
| 8192 (170,7 ms) | 240 ms | 0,00 | 0,00 | 0,15 | 0,68 |

1. **El alcance está en el tamaño de FFT, no en la duración del símbolo por sí
   sola.** Con FFT de 2048, cuadruplicar el símbolo a 240 ms no cambia nada
   (0,49 → 0,47 a −18,2 dB). Con FFT de 8192 y el mismo símbolo de 240 ms, el
   error a −18,2 dB baja a 0 y a −22,7 dB queda en 0,15.
2. **Las dos cosas deben crecer juntas.** FFT de 8192 con símbolos de 60 ms
   mejora poco (0,73 a −22,7 dB), porque el cuadro dura casi el triple que el
   tono.
3. **Reducir a 1024 empeora** incluso con buena señal (0,09 a −12,2 dB).
4. **El precio es la velocidad:** símbolos de 240 ms son cuatro veces más
   lentos que los actuales.

**Interpretación — INFERIDO.** Cada duplicación de la FFT desplaza el
precipicio unos 3 dB, lo esperable al estrechar el ancho de cada bin. En un
navegador, una FFT mayor también hace más lento el `AnalyserNode` y suaviza los
cambios entre símbolos; ese efecto no está en el modelo. **PENDIENTE** de medir.

## B — ¿Una zona muerta evita que V2-A decida el vecino?

**Método.** El candidato V2-A de E005 (paso de 80 Hz) con tres distancias
máximas de decisión: 40 Hz (sin zona muerta), 30 Hz (20 Hz de zona muerta) y
20 Hz (40 Hz de zona muerta).

**Resultados — MEDIDO.** Correctos / equivocados / perdidos, de 38 caracteres,
según el desvío de frecuencia y sin ruido:

| Distancia máxima | ±10 Hz | −20 Hz | +20 Hz | −30 Hz | +30 Hz | −40 Hz | +40 Hz |
|---|---|---|---|---|---|---|---|
| 40 Hz | 38/0/0 | 38/0/0 | 38/0/0 | 36/2/0 | 35/3/0 | 19/17/2 | 18/19/1 |
| 30 Hz | 38/0/0 | 36/0/2 | 35/0/3 | 20/0/18 | 19/0/19 | 3/2/33 | 2/3/33 |
| 20 Hz | 35–36/0/2–3 | 19/0/19 | 20/0/18 | 3/0/35 | 4/0/34 | 0/0/38 | 0/0/38 |

1. **La zona muerta funciona:** con máximo de 30 Hz no hay ningún carácter
   equivocado hasta ±30 Hz; los fallos pasan a ser pérdidas.
2. **Pero cuesta tolerancia:** a ±30 Hz se decodifican 19–20 caracteres en
   lugar de 35–36, y a ±20 Hz ya se pierden 2–3.
3. **Con 20 Hz se pierde la ventaja sobre V1:** falla incluso a ±10 Hz, por el
   error de medio bin del detector (≈11 Hz).
4. **Frente al ruido las tres variantes son iguales** y ninguna decide un
   carácter equivocado (por ejemplo, a −18,2 dB: 102, 102 y 100 correctos de
   190, el resto perdidos). El acuerdo de tres cuadros ya filtra el ruido.

**Interpretación — INFERIDO.** La zona muerta solo protege frente a desvíos
sistemáticos de frecuencia, no frente al ruido. Si esos desvíos resultan
pequeños por aire, 40 Hz sin zona muerta es mejor; si son frecuentes, una suma
de verificación protegería sin sacrificar tolerancia. Esa decisión depende de
una medición física que aún no existe.

## Limitaciones

Las de E004 y E005: ruido uniforme y blanco, sin eco ni respuesta del altavoz o
del micrófono, sin suavizado temporal del `AnalyserNode`, y 190 símbolos por
celda. La parte A solo se midió a 48 kHz.
