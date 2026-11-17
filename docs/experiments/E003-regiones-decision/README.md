# E003 — Regiones de decisión de V1 Clean

**Estado:** ejecutado el 2026-11-17 · **Roadmap:** M3, E3-001 y E3-002 ·
**Alcance:** simulación digital determinista. No mide audio por aire.

## Pregunta

Cuando la frecuencia observada no coincide exactamente con la nominal, ¿qué
símbolo decide el receptor de V1 Clean, y cuánto desvío tolera cada símbolo?

## Método

- **Receptor real, no un modelo.** La política `v1-receptor` lleva
  `ReceptorMensajesCore` al estado DATA y le entrega la misma frecuencia en tres
  cuadros. Así se mide el efecto combinado de `frequencyToChar()` (primer
  carácter dentro de ±80 Hz), los tonos de control (±60 Hz) y el filtro de
  estabilidad (<60 Hz). No se corrigió nada antes de medir.
- **Ventanas:** para cada símbolo se busca, hercio a hercio, hasta dónde puede
  bajar o subir la frecuencia sin que cambie la decisión.
- **Barrido:** de 18 000 a 22 500 Hz cada 5 Hz (901 puntos), comparando la
  decisión con el símbolo cuya frecuencia nominal está más cerca.
- **Variantes lógicas (E3-002):** primer coincidente a ±80, ±60 y ±40 Hz, y
  frecuencia más cercana con máximo de 50 Hz. Son hipotéticas: sirven para
  comparar, no están adoptadas.
- **Detector de pico:** cada carácter se sintetiza en su frecuencia nominal y
  se estima con una réplica del análisis de `app.js` (Blackman, FFT de 2048,
  primer bin máximo entre 18 000 y 22 500 Hz), a 48 kHz y a 44,1 kHz.

Reproducir: `npm run experiment:e003`. Datos completos en
[results/latest.json](results/latest.json).

## Resultados — MEDIDO

| Política | Margen mínimo | Margen medio | Banda sin decisión | Banda con símbolo equivocado |
|---|---|---|---|---|
| `v1-receptor` (lo que hay hoy) | 19 Hz | 25,6 Hz | 28,5 % | 4,2 % |
| primer coincidente ±80 Hz | 19 Hz | 27,6 Hz | 6,3 % | 23,5 % |
| primer coincidente ±60 Hz | 39 Hz | 42,1 Hz | 9,0 % | 8,2 % |
| primer coincidente ±40 Hz | 40 Hz | 40 Hz | 24,5 % | 0 % |
| más cercano, máx. 50 Hz | 49 Hz | 49 Hz | 14,8 % | 0 % |

1. **La región de V1 es asimétrica.** 33 de los 40 símbolos de datos toleran
   59 Hz hacia arriba pero solo 19 Hz hacia abajo. La causa es el orden de
   recorrido de `frequencyToChar()`: a 20 Hz por debajo de un carácter, el
   vecino inferior ya está dentro de ±80 Hz y aparece antes en el recorrido.
2. **El filtro de estabilidad convierte casi todos esos errores en pérdidas.**
   La regla ±80 Hz por sí sola decidiría un símbolo equivocado en el 23,5 % de
   la banda. Con el filtro del receptor queda en 4,2 %: una franja de 41 a
   49 Hz por debajo de cada carácter en la que el receptor **emite el carácter
   vecino** (por ejemplo, 18 755 Hz está más cerca de `A` pero se decide `Ñ`).
   Son 36 pares de confusión, listados en el JSON.
3. **`H` y `J` están recortados por END.** `H` (19 500 Hz) solo tolera 40 Hz
   hacia arriba y `J` (19 700 Hz) 40 Hz hacia abajo antes de leerse como END
   (19 600 ± 60 Hz), lo que terminaría el mensaje.
4. **A 44,1 kHz tres caracteres no son representables.** `7`, `8` y `9`
   (22 100–22 300 Hz) superan Nyquist (22 050 Hz). En la síntesis digital se
   pliegan y se decodifican como `6`, `5` y `4`: 35 de 38 caracteres correctos.
   A 48 kHz son 38 de 38, con un error de estimación máximo de 10,9 Hz (medio
   bin). El valor de 508 Hz que figura para 44,1 kHz es ese plegado, no ruido.
5. **Las dos variantes sin símbolo equivocado** son ±40 Hz y más cercano. La
   segunda deja menos banda sin decidir y duplica con creces el margen.

## Interpretación — INFERIDO

- El margen de 19 Hz es pequeño frente a efectos físicos conocidos. Como
  referencia de cálculo (no medición): a 20 kHz, 19 Hz de desvío Doppler
  corresponden a una velocidad relativa de **0,33 m/s**, menos que mover un
  teléfono con la mano. Falta comprobar si ocurre así por aire.
- El error de medio bin (≈11 Hz) ya consume más de la mitad de ese margen; E005
  muestra que con solo −10 Hz de desvío V1 pierde 5 de 38 caracteres.
- En un navegador real, un `OscillatorNode` por encima de Nyquist probablemente
  produce silencio en vez de plegarse; el resultado práctico sería perder esos
  caracteres en lugar de confundirlos. **PENDIENTE** de verificar en dispositivo.

## Limitaciones

No hay altavoz, micrófono, eco ni respuesta en frecuencia. El detector no
aplica el suavizado temporal del `AnalyserNode`. La frecuencia se mantiene fija
durante los tres cuadros.
