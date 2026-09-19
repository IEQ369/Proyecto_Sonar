# AUDITORÍA TÉCNICA DE SONAR

> **Estado:** auditoría inicial, sin cambios de comportamiento aplicados.  
> **Baseline revisado:** `bf3f14c` — `Add BadBIOS link to HISTORIA_TECNICA.md`  
> **Tag de referencia:** `pre-sonar-v2-2026-08-24`  
> **Fecha de auditoría:** 2026-08-24  
> **Objetivo:** registrar de forma durable qué funciona, qué está roto, qué limita la precisión, qué debe conservarse y qué ideas deben evaluarse antes de evolucionar SONAR.

---

## 0. Principios de esta auditoría

Esta auditoría no pretende justificar una reescritura completa. SONAR ya contiene decisiones valiosas, historia técnica y una implementación funcional como prototipo de mensajería acústica. El objetivo es:

1. **Preservar lo que funciona.**
2. **Separar bugs comprobados de hipótesis.**
3. **Medir antes de optimizar.**
4. **No añadir complejidad que no aporte fiabilidad, aprendizaje o capacidad experimental.**
5. **Entender cada cambio antes de integrarlo.**
6. **Mantener evidencia y razones para poder retomar el proyecto meses o años después.**

Los hallazgos se clasifican como:

- `BUG`: comportamiento objetivamente incorrecto.
- `DSP`: señal/procesamiento digital.
- `TIMING`: temporización y sincronización.
- `AUDIO`: navegador, Web Audio y hardware.
- `MSG`: protocolo de mensajes.
- `FILE`: protocolo de archivos.
- `ARCH`: arquitectura.
- `CODE`: deuda técnica.
- `PERF`: rendimiento/capacidad.
- `DOC`: documentación.
- `GIT`: repositorio.
- `TEST`: medición y pruebas.
- `V2`: idea candidata; **no es todavía una decisión de arquitectura**.

Severidades:

- **P0 — Crítica:** impide que una función sea fiable o correcta.
- **P1 — Alta:** puede explicar fallos frecuentes o compromete fuertemente la precisión.
- **P2 — Media:** deuda o limitación importante, pero no bloquea todo.
- **P3 — Baja:** limpieza, documentación o mejora secundaria.
- **EXP — Evaluar:** requiere experimento antes de decidir.

---

# 1. Lo que merece conservarse

Antes de enumerar problemas, hay decisiones de SONAR que son una buena base.

## KEEP-001 — Migración a Web Audio

La migración desde Python a navegador resolvió una limitación real: emitir y recibir directamente desde el dispositivo cliente, especialmente móviles, sin depender de que un backend reproduzca el audio.

**Conservar:** enfoque web/multiplataforma.

---

## KEEP-002 — Separación básica de responsabilidades

Existen módulos diferenciados para:

- protocolo;
- generación de onda;
- transmisión;
- recepción;
- visualización FFT;
- archivos.

La separación no es todavía suficiente, pero la intención arquitectónica es buena.

**Conservar:** modularidad; mejorar límites entre UI, audio, módem y protocolo.

---

## KEEP-003 — Máquina de estados del receptor

El receptor de mensajes no intenta interpretar todo como caracteres continuamente. Tiene estados `IDLE → SYNC → DATA`, marcadores y timeout.

**Conservar:** decodificación orientada a estados.  
**Evolucionar:** sincronización basada en tiempo/símbolos y paquetes.

---

## KEEP-004 — Historia técnica

`HISTORIA_TECNICA.md` permitió recuperar decisiones, problemas antiguos y soluciones intentadas incluso meses después.

**Conservar:** documentación histórica.  
**Mejorar:** separar historia, auditoría, arquitectura, roadmap y progreso.

---

## KEEP-005 — Intento de detección de conflictos

`detectarConflictos()` demuestra que ya se identificó que el plan de frecuencias es una parte crítica del sistema.

**Conservar:** validaciones automáticas del protocolo.  
**Mejorar:** que los tests usen las tolerancias reales del decodificador.

---

## KEEP-006 — Experimentación con amplitud y hardware real

Los multiplicadores por carácter son una solución empírica, no definitiva, pero contienen información valiosa: distintas frecuencias se comportaron de forma muy diferente en hardware de consumo.

**Conservar como evidencia:** qué bandas/dispositivos daban problemas.  
**No conservar necesariamente:** los multiplicadores como arquitectura definitiva.

---

## KEEP-007 — Visualizador FFT

Es útil para depuración, demostración y aprendizaje.

**Conservar:** visualización.  
**Separar:** nunca debe gobernar el reloj del decodificador.

---

## KEEP-008 — Intención de integridad para archivos

El protocolo de archivos ya intentó introducir:

- preámbulo;
- SOI;
- cabecera;
- repetición;
- CRC;
- bloques;
- progreso.

Aunque la implementación actual contiene fallos críticos, la dirección conceptual es más madura que transmitir bytes sin framing.

---

# 2. Resumen ejecutivo de hallazgos

| ID | Área | Prioridad | Estado | Resumen |
|---|---|---:|---|---|
| SIG-001 | DSP | P1 | Confirmado | Ventanas de caracteres se solapan |
| SIG-002 | DSP | P1 | Confirmado | Detector de conflictos no refleja el decodificador real |
| SIG-003 | DSP | P1 | Confirmado | Marcadores demasiado próximos a símbolos de datos |
| SIG-004 | DSP/Hardware | P1 | Confirmado | Frecuencias 22.1–22.3 kHz exceden Nyquist a 44.1 kHz |
| SIG-005 | DSP | P1 | Confirmado | Fade puede ocupar más que el símbolo |
| SIG-006 | DSP | EXP | Pendiente | Forma de onda no está validada experimentalmente |
| SIG-007 | DSP | P1 | Confirmado | Compensación por amplitud es fija y dependiente del dispositivo |
| AUD-001 | Audio | P1 | Confirmado | Entrada de micrófono no desactiva procesamiento de voz |
| AUD-002 | Audio | P1 | Confirmado | TX/RX no garantizan el mismo sample rate |
| AUD-003 | Audio/DSP | P1 | Confirmado | Umbrales absolutos no se adaptan al ruido |
| AUD-004 | DSP | P2 | Confirmado | Estimación usa únicamente el bin FFT máximo |
| TIM-001 | Timing | P0 | Confirmado | `requestAnimationFrame` actúa como reloj de recepción |
| TIM-002 | Timing | P0 | Confirmado | `setTimeout` actúa como reloj de transmisión |
| TIM-003 | Timing | P1 | Confirmado | 60 ms + estabilidad de 3 muestras deja poco margen |
| MSG-001 | Mensajes | P0 | Confirmado | Existen dos listeners de Enter; puede transmitir dos veces |
| MSG-002 | Mensajes | P1 | Confirmado | Existen dos caminos TX con parámetros/estado diferentes |
| MSG-003 | Mensajes | P2 | Confirmado | Estado `END` queda prácticamente inalcanzable/redundante |
| MSG-004 | Mensajes | P3 | Confirmado | `charToFrequency()` convierte desconocidos en frecuencia válida |
| FILE-001 | Archivos | P0 | Confirmado | CRC16 de cabecera TX/RX se calcula sobre datos diferentes |
| FILE-002 | Archivos | P0 | Confirmado | CRC8 TX y RX son algoritmos distintos |
| FILE-003 | Archivos | P0 | Confirmado | Receptor cuenta frames como bits |
| FILE-004 | Archivos | P0 | Confirmado | Último bloque corto no coincide con receptor de 8 bytes |
| FILE-005 | Archivos | P0 | Confirmado | `START == DATA_0` y `SYNC == DATA_1` |
| FILE-006 | Archivos | P0 | Confirmado | Preámbulo puede contaminar el SOI por transición anticipada |
| FILE-007 | Archivos | P1 | Confirmado | ACK/NACK documentado no existe como mecanismo |
| FILE-008 | Archivos | P1 | Confirmado | `ACK == END` |
| FILE-009 | Archivos | P1 | Confirmado | Duraciones de símbolo son inconsistentes |
| FILE-010 | Archivos | P1 | Confirmado | Dos instancias independientes de `ReceptorArchivos` |
| FILE-011 | Archivos/UI | P1 | Confirmado | Drag & drop y emisor mantienen estados de archivo separados |
| FILE-012 | Archivos | P1 | Confirmado | Cancelación se pasa como opción pero nunca se consulta |
| FILE-013 | Archivos | P2 | Confirmado | Serialización de nombre y CRC diverge con nombres no ASCII |
| FILE-014 | Archivos | P2 | Confirmado | Cálculo de progreso asume bloques finales completos |
| ARCH-001 | Arquitectura | P1 | Confirmado | UI y lógica del módem están mezcladas/duplicadas |
| ARCH-002 | Arquitectura | P1 | Confirmado | Mensajes y archivos duplican dos transportes incompatibles |
| ARCH-003 | Arquitectura | P2 | Confirmado | No existe una capa de paquetes/bytes común |
| CODE-001 | Código | P2 | Confirmado | `ui_archivo.js` parece legacy y referencia función inexistente |
| CODE-002 | Código | P3 | Confirmado | Templates parciales parecen legacy |
| CODE-003 | Código | P3 | Confirmado | Variables/estados sin uso o redundantes |
| PERF-001 | Rendimiento | P1 | Confirmado | Logging intensivo ocurre dentro del camino crítico de audio |
| PERF-002 | Capacidad | P2 | Confirmado | Transferencia de archivos actual es extremadamente lenta |
| TEST-001 | Testing | P0 | Confirmado | No existe baseline cuantitativo BER/SER/PER |
| TEST-002 | Testing | P0 | Confirmado | No existe simulador/canal reproducible |
| DOC-001 | Docs | P1 | Confirmado | README/HISTORIA describen frecuencias de archivos antiguas |
| DOC-002 | Docs | P1 | Confirmado | Se afirma ACK/NACK aunque no está implementado |
| DOC-003 | Docs | P2 | Confirmado | Se documenta onda cuadrada pero TX usa seno |
| DOC-004 | Docs | P3 | Confirmado | “ASCII completo” no corresponde al alfabeto real |
| DOC-005 | Docs | P2 | Confirmado | Alcance documentado es contradictorio |
| DOC-006 | Docs | P2 | Confirmado | Instrucción de HTTPS con `http.server` no crea HTTPS |
| DOC-007 | Docs | P2 | Confirmado | Se afirma limpieza/cancelación automática sin soporte completo |
| DOC-008 | Docs | P3 | Confirmado | Badges apuntan a `STATUS` y `LICENSE` inexistentes |
| GIT-001 | Git | P2 | Confirmado | Historial contiene un `venv` enorme (~156 MB de pack) |
| V2-001 | V2 | EXP | Evaluar | Procesamiento en `AudioWorklet` |
| V2-002 | V2 | EXP | Evaluar | Scheduling sample-accurate con reloj de Web Audio |
| V2-003 | V2 | EXP | Evaluar | Goertzel frente a FFT |
| V2-004 | V2 | EXP | Evaluar | M-FSK reducido (2/4/8-FSK) |
| V2-005 | V2 | EXP | Evaluar | Protocolo binario unificado |
| V2-006 | V2 | EXP | Evaluar | Preámbulo/sync word y reloj de símbolos |
| V2-007 | V2 | EXP | Evaluar | Calibración automática por dispositivo |
| V2-008 | V2 | EXP | Evaluar | ACK/retransmisión/FEC según mediciones |

---

# 3. Señal y DSP

## SIG-001 — Solapamiento entre ventanas de caracteres

**Prioridad:** P1  
**Estado:** confirmado  
**Dónde:** `src/web/static/js/protocolo_ultrasonico.js`

Los caracteres están normalmente separados **100 Hz**, pero `frequencyToChar()` acepta un tono cuando:

```js
Math.abs(freq - frequency) <= 80
```

Dos tonos separados 100 Hz tienen por tanto una zona de aceptación común de **60 Hz**.

Ejemplo conceptual:

```text
A = 18800 Hz → acepta 18720..18880
B = 18900 Hz → acepta 18820..18980

Solapamiento: 18820..18880
```

Además, `frequencyToChar()` recorre el objeto en orden y devuelve el primer carácter coincidente, por lo que una frecuencia ambigua puede quedar sesgada hacia el símbolo que aparezca antes.

**Impacto:** errores de clasificación aun cuando la medición de frecuencia sea razonablemente buena.

**Conceptos a aprender:**

- separación de símbolos;
- regiones de decisión;
- tolerancia;
- matriz de confusión;
- frecuencia estimada vs frecuencia nominal.

**Soluciones a evaluar:**

1. reducir tolerancia;
2. aumentar separación;
3. clasificar por frecuencia más cercana en vez de “primer match”;
4. abandonar el mapa de 38 tonos si las mediciones muestran que el hardware no soporta la banda.

**Prueba necesaria:** barrido sintético alrededor de cada frecuencia y matriz de decisión.

---

## SIG-002 — `detectarConflictos()` no valida los conflictos reales

**Prioridad:** P1  
**Estado:** confirmado  
**Dónde:** `protocolo_ultrasonico.js`

La función marca conflicto entre caracteres únicamente cuando la diferencia es `<= 50 Hz`.

Sin embargo, con una tolerancia de ±80 Hz, dos símbolos a 100 Hz **sí tienen regiones de decisión superpuestas**.

Por tanto el proyecto puede mostrar “sin conflictos” aun cuando el decodificador tenga ambigüedad matemática.

**Solución correcta:** el validador debe utilizar las mismas reglas de decisión del receptor, no un número independiente.

**Concepto:** una regla de validación debe modelar el comportamiento real del sistema.

---

## SIG-003 — Frecuencias de control demasiado próximas a datos

**Prioridad:** P1  
**Estado:** confirmado

Ejemplos:

```text
START = 18500
I     = 18400
SPACE = 18600

END   = 19600
H     = 19500
J     = 19700
```

Aunque la máquina de estados reduce ciertas confusiones, el canal físico sigue teniendo símbolos de control a solo 100 Hz de datos válidos.

**Riesgo:** desplazamiento de frecuencia, resolución FFT, eco o respuesta desigual pueden convertir un dato en marcador o viceversa.

**Prueba:** medir matriz de confusión específicamente alrededor de START/SYNC/END.

---

## SIG-004 — Parte del alfabeto no es compatible con 44.1 kHz

**Prioridad:** P1  
**Estado:** confirmado

Para sample rate de 44.1 kHz:

```text
Nyquist = 22050 Hz
```

El protocolo contiene:

```text
6 = 22000 Hz
7 = 22100 Hz
8 = 22200 Hz
9 = 22300 Hz
```

`7`, `8` y `9` superan Nyquist. `6` está prácticamente en el límite.

**Consecuencia:** aumentar amplitud no puede solucionar este problema.

**Conceptos a aprender:**

- sampling rate;
- frecuencia de Nyquist;
- aliasing;
- filtros físicos del codec de audio.

**Decisión pendiente:** definir el requisito mínimo de sample rate o rediseñar la banda.

---

## SIG-005 — Fade demasiado largo respecto al símbolo

**Prioridad:** P1  
**Estado:** confirmado  
**Dónde:** `emisor_ultrasonico.js`, `generador_onda.js`

Un camino de transmisión llama:

```js
FADE_TIME: 0.035
```

mientras:

```text
SYMBOL_DURATION = 0.06 s
```

Es decir:

```text
fade in  = 35 ms
fade out = 35 ms
símbolo  = 60 ms
```

Los dos fades ocupan 70 ms en un buffer de 60 ms.

La implementación `if ... else if` hace que las regiones se interfieran de forma no deseada y reduce/perturba la energía útil.

**Solución:** definir una envolvente matemáticamente válida en función de la duración real del símbolo y medir su espectro.

**Conceptos:** envelope, discontinuidad, leakage, energía por símbolo.

---

## SIG-006 — Forma de onda no validada

**Prioridad:** EXP  
**Estado:** pendiente

`generador_onda.js` soporta sine/square/sawtooth/triangle, la historia técnica afirma que la onda cuadrada mejoró detección, pero los emisores actuales utilizan:

```js
tipo: 'sine'
```

No debe decidirse “square es mejor” solo por una prueba antigua.

Una onda cuadrada genera armónicos; cerca del límite del hardware puede comportarse de manera muy distinta según codec/parlante.

**Experimento:** comparar formas de onda con la misma energía RMS, BER/SER y dispositivos.

---

## SIG-007 — Compensación fija de amplitud por carácter

**Prioridad:** P1  
**Estado:** confirmado

Actualmente se usan reglas como:

- números 6–9: 350%;
- números 0–5: 250%;
- letras concretas: 180%.

Esto revela una respuesta de canal desigual, pero codifica una calibración de un conjunto concreto de pruebas en el protocolo global.

**Riesgos:**

- otro dispositivo puede tener respuesta opuesta;
- más amplitud no corrige aliasing;
- puede incrementar distorsión;
- dificulta comparar científicamente cambios.

**Dirección:** medir respuesta del canal y evaluar calibración dinámica.

---

# 4. Audio y navegador

## AUD-001 — Procesamiento de voz del micrófono no controlado

**Prioridad:** P1  
**Estado:** confirmado  
**Dónde:** `app.js`, `app_archivos.js`

Se solicita:

```js
getUserMedia({ audio: true })
```

No se solicitan explícitamente:

- `echoCancellation: false`;
- `noiseSuppression: false`;
- `autoGainControl: false`.

Estos sistemas están diseñados para voz, no para un módem acústico.

**Hipótesis:** pueden atenuar tonos near-ultrasonic, variar ganancia o eliminar señal sostenida.

**Prueba:** solicitar constraints, leer `track.getSettings()` y comparar BER/SNR.

---

## AUD-002 — TX y RX no garantizan el mismo sample rate

**Prioridad:** P1  
**Estado:** confirmado

El emisor intenta crear:

```js
new AudioContext({ sampleRate: 48000 })
```

El receptor crea:

```js
new AudioContext()
```

No se valida el sample rate efectivo ni se registra por sesión.

**Acción:** toda medición debe registrar `audioCtx.sampleRate`; no asumir 48 kHz.

---

## AUD-003 — Umbrales absolutos dependientes del dispositivo

**Prioridad:** P1  
**Estado:** confirmado

Mensajes:

```js
if (maxMag < 12) return;
```

Archivos:

```js
if (maxMag < 8 ...) return;
```

y dentro del receptor:

```js
if (magnitud < 20 ...) return;
```

Estos valores de `getByteFrequencyData()` no representan un SNR universal.

**Dirección:** estimar noise floor y usar relación señal/ruido/confianza.

---

## AUD-004 — Estimación limitada al bin máximo

**Prioridad:** P2  
**Estado:** confirmado

Con `fftSize = 2048`, a 48 kHz:

```text
resolución ≈ 48000 / 2048 = 23.4375 Hz/bin
```

El receptor toma:

```js
freqPeak = maxIdx * binSize
```

No existe interpolación del pico ni puntuación contra tonos candidatos.

**No implica que FFT sea incorrecta.** Debe compararse con alternativas usando tests.

---

# 5. Temporización

## TIM-001 — `requestAnimationFrame` funciona como reloj del receptor

**Prioridad:** P0  
**Estado:** confirmado

El procesamiento ocurre dentro de:

```js
function processFrame() {
    requestAnimationFrame(processFrame);
    ...
}
```

Eso acopla el demodulador a:

- frecuencia de refresco;
- carga del hilo principal;
- visibilidad de la pestaña;
- ahorro de energía;
- rendimiento del dispositivo.

La UI puede usar `requestAnimationFrame`; el módem no debería depender de él para contar/confirmar símbolos.

**Dirección V2:** procesamiento temporal en el dominio de audio.

---

## TIM-002 — `setTimeout` funciona como reloj del transmisor

**Prioridad:** P0  
**Estado:** confirmado

`emisor_ultrasonico.js` crea:

```js
let now = audioCtx.currentTime;
```

e incrementa `now`, pero ese tiempo nunca se usa para programar `source.start(when)`.

Cada tono se inicia inmediatamente y después el código espera:

```js
await new Promise(res => setTimeout(res, dur * 1000));
```

Por tanto el intervalo real depende del event loop.

**Dirección:** scheduling con el reloj de Web Audio.

---

## TIM-003 — Símbolos de 60 ms y estabilidad de 3 muestras

**Prioridad:** P1  
**Estado:** confirmado

Con 60 FPS:

```text
1 frame ≈ 16.7 ms
60 ms ≈ 3.6 frames
```

El detector exige al menos 3 muestras recientes próximas al target.

El margen es muy pequeño y varía con dispositivos de 60/90/120 Hz y pérdida de frames.

**Prueba:** medir probabilidad de adquisición por símbolo contra duración y cadencia.

---

# 6. Protocolo de mensajes

## MSG-001 — Dos listeners de Enter pueden transmitir el mismo mensaje dos veces

**Prioridad:** P0  
**Estado:** confirmado

`src/web/templates/index.html` registra un listener `keydown`.

`setupEmisorUI()` en `emisor_ultrasonico.js` registra otro listener `keydown`.

`input.onkeydown = null` no elimina listeners añadidos mediante `addEventListener()`.

**Consecuencia:** pulsar Enter puede lanzar dos `AudioContext`/transmisiones casi simultáneas.

**Acción:** debe existir un único controlador de TX.

---

## MSG-002 — Dos caminos de transmisión tienen comportamiento diferente

**Prioridad:** P1  
**Estado:** confirmado

El inline script transmite con defaults:

```js
emitirUltrasonico(val)
```

`setupEmisorUI()` transmite con:

```js
emitirUltrasonico(val, {
    AMPLITUDE: 0.08,
    FADE_TIME: 0.035
})
```

Además, solo el segundo camino modifica `isTransmittingRef` para bloquear auto-eco.

**Resultado:** Enter y botón/caminos distintos pueden tener amplitud, fade y auto-recepción diferentes.

---

## MSG-003 — Estado `END` redundante/inaccesible

**Prioridad:** P2  
**Estado:** confirmado

Al detectar END en estado `DATA`:

```js
rxState = 'END';
...
rxState = 'IDLE';
return;
```

El bloque posterior:

```js
else if (rxState === 'END')
```

prácticamente nunca procesa esa transición.

Además se limpia `rxBuffer` antes de un `console.log` que pretende imprimir el mensaje completo.

**Acción:** simplificar máquina de estados y testear transiciones.

---

## MSG-004 — Caracter desconocido cae en una frecuencia válida

**Prioridad:** P3  
**Estado:** confirmado

```js
return CHAR_FREQUENCIES[char.toUpperCase()] || MIN_DATA_FREQUENCY;
```

Un carácter no soportado puede convertirse silenciosamente en `18200 Hz`.

El emisor filtra actualmente los caracteres, por lo que el riesgo es reducido, pero la API no debería ocultar errores.

**Mejora:** devolver `null`/error explícito.

---

# 7. Protocolo de archivos

## FILE-001 — CRC16 de cabecera imposible de validar para tamaños normales

**Prioridad:** P0  
**Estado:** confirmado

TX calcula el CRC sobre:

```js
[0,0,0,0] + nombre
```

y después escribe `archivo.size` en la cabecera.

RX calcula el CRC sobre los primeros 20 bytes **ya con el tamaño real**.

Por tanto ambas partes calculan CRC sobre contenidos distintos.

**Solución:** una sola función de serialización de cabecera; calcular CRC sobre exactamente los bytes transmitidos.

---

## FILE-002 — CRC8 del emisor y receptor son algoritmos diferentes

**Prioridad:** P0  
**Estado:** confirmado

TX utiliza CRC-8 con polinomio `0x07`.

RX calcula:

```js
for (let b of bytes) crcCalc ^= b;
```

Eso es XOR acumulado, no el CRC del transmisor.

**Solución:** una implementación compartida y vectores de prueba.

---

## FILE-003 — Cada frame puede convertirse en un bit

**Prioridad:** P0  
**Estado:** confirmado

Durante `RECEIVING_DATA`:

```js
this.bufferBits.push(bit);
```

se ejecuta cada vez que `processFrame()` detecta DATA_0/DATA_1.

Un tono físico de 50 ms puede observarse varias veces:

```text
60 Hz  → ~3 frames
120 Hz → ~6 frames
```

Un bit `1` puede convertirse en `111` o `111111`.

**Conclusión:** falta recuperación/reloj de símbolos.

---

## FILE-004 — Bloque final corto no coincide con formato esperado

**Prioridad:** P0  
**Estado:** confirmado

TX:

```js
bytes.slice(i, Math.min(i + 8, bytes.length))
```

El último bloque puede tener 1–7 bytes + CRC.

RX siempre espera:

```text
8 bytes + 1 CRC = 72 bits
```

**Soluciones posibles:**

- padding a 8 bytes y truncado mediante tamaño total;
- incluir longitud de bloque;
- framing de paquete con length.

---

## FILE-005 — Marcadores y bits reutilizan exactamente las mismas frecuencias

**Prioridad:** P0  
**Estado:** confirmado

Código actual:

```text
START  = 18700
DATA_0 = 18700

SYNC   = 19195
DATA_1 = 19195

END    = 19500
ACK    = 19500
```

Aunque los estados pueden desambiguar ciertas fases, esto reduce fuertemente la robustez y produce interacciones peligrosas entre preámbulo y datos.

---

## FILE-006 — El detector abandona el preámbulo antes de que el emisor lo termine

**Prioridad:** P0  
**Estado:** confirmado

TX emite 5 pares:

```text
START SYNC
START SYNC
START SYNC
START SYNC
START SYNC
```

RX:

1. detecta START y establece `preambuloCount = 1`;
2. incrementa el contador en cada SYNC;
3. al cuarto SYNC posterior alcanza `5` y cambia a `DETECTING_SOI`.

Pero aún queda el quinto par START/SYNC del emisor.

Como:

```text
START == DATA_0
SYNC  == DATA_1
```

ese par restante puede entrar al buffer de SOI como bits `0,1` antes del SOI real.

**Impacto:** framing corrupto incluso con una señal físicamente perfecta.

---

## FILE-007 — ACK/NACK no está implementado como protocolo de confirmación

**Prioridad:** P1  
**Estado:** confirmado

La documentación describe un sistema tipo TCP con ACK/NACK.

El código no implementa:

```text
TX bloque
→ esperar ACK
→ ACK: siguiente
→ NACK/timeout: retransmitir
```

No existe NACK actual.

**Acción:** retirar la afirmación de documentación hasta implementar y probar ARQ.

---

## FILE-008 — ACK es idéntico a END

**Prioridad:** P1  
**Estado:** confirmado

```js
END: 19500,
ACK: 19500
```

No pueden distinguirse físicamente sin un contexto de estado perfectamente definido, y actualmente ACK ni siquiera se consume.

---

## FILE-009 — Duraciones de símbolo inconsistentes

**Prioridad:** P1  
**Estado:** confirmado

`PROTOCOLO_ARCHIVOS.SYMBOL_DURATION = 0.12`, utilizado en SOI.

Pero:

- preámbulo: `0.1 s`;
- cabecera: `0.05 s`;
- datos: `0.05 s`;
- END: `0.1 s`.

No existe una especificación clara de temporización que el receptor pueda seguir.

---

## FILE-010 — Se crean dos receptores de archivos distintos

**Prioridad:** P1  
**Estado:** confirmado

`app_archivos.js` crea:

```js
receptorArchivos = new ReceptorArchivos();
window.receptorArchivos = receptorArchivos;
```

El inline script de `archivos/templates/index.html` crea otro:

```js
const receptorArchivos = new ReceptorArchivos();
window.receptorArchivos = receptorArchivos;
```

El audio puede estar alimentando una instancia mientras la consola/UI referencia otra.

**Acción:** una única instancia, un único owner.

---

## FILE-011 — Drag & drop no actualiza necesariamente el estado del emisor

**Prioridad:** P1  
**Estado:** confirmado

El inline template posee su propio:

```js
let archivoSeleccionado = null;
```

`setupEmisorArchivoUI()` posee otro `archivoSeleccionado`.

Drag & drop actualiza el del template, mientras el botón de transmisión utiliza el del módulo emisor.

**Resultado posible:** UI muestra archivo seleccionado y habilita el botón, pero el emisor sigue viendo `null`.

---

## FILE-012 — Mecanismo de cancelación es código muerto

**Prioridad:** P1  
**Estado:** confirmado

UI pasa:

```js
{ cancelar: () => cancelando }
```

a `emitirArchivoRobusto()`.

Sin embargo `emitirArchivoRobusto()` nunca consulta `opts.cancelar`.

Además `cancelando` nunca cambia a `true` en el código actual.

**Conclusión:** la “cancelación automática” documentada no existe como mecanismo de interrupción del loop de transmisión.

---

## FILE-013 — Nombre del archivo se serializa de dos formas diferentes

**Prioridad:** P2  
**Estado:** confirmado

Para el CRC TX se usa `TextEncoder()` (UTF-8).

Para la cabecera se usa `charCodeAt()` almacenado en `Uint8Array`.

Con caracteres no ASCII estas representaciones pueden diferir en número y valor de bytes.

**Acción:** definir una codificación única (por ejemplo UTF-8) y longitud en bytes, no caracteres.

---

## FILE-014 — Progreso calcula bloques finales como si siempre tuvieran 8 bytes

**Prioridad:** P2  
**Estado:** confirmado

`calcularTotalSimbolos()` usa:

```text
bloques * 9 * 8
```

para todos los bloques.

Pero TX puede generar un bloque final corto.

El denominador de progreso no describe exactamente lo transmitido.

---

# 8. Arquitectura y deuda técnica

## ARCH-001 — UI, audio y protocolo están demasiado acoplados

**Prioridad:** P1

Existen decisiones de transmisión dentro de templates HTML y decisiones de UI dentro de módulos de protocolo/emisión.

**Objetivo arquitectónico futuro:**

```text
UI
 ↓
Aplicación
 ↓
Packet/Protocol
 ↓
Modem
 ↓
Audio I/O
```

La UI debe poder cambiar sin modificar el módem.

---

## ARCH-002 — Mensajes y archivos implementan dos transportes independientes

**Prioridad:** P1

Actualmente existen dos pilas:

```text
mensaje → mapa de caracteres → audio
archivo → bits/protocolo propio → audio
```

Esto duplica:

- detección;
- framing;
- timing;
- frecuencias;
- errores;
- state machines.

**Candidato V2:** el transporte transmite bytes/paquetes; texto y archivo son tipos de payload.

No se aprueba todavía hasta definir requisitos y pruebas.

---

## ARCH-003 — Falta abstracción de paquete

**Prioridad:** P2

No existe un formato común parecido a:

```text
PREAMBLE
VERSION
TYPE
SEQUENCE
LENGTH
PAYLOAD
CRC
```

Esto dificulta ACK, retransmisión, archivos, UTF-8 y futuros tipos de datos.

---

## CODE-001 — `ui_archivo.js` parece código legacy

**Prioridad:** P2

Referencia:

```js
emitirArchivoBinario(arrayBuffer)
```

sin una importación/implementación actual correspondiente y no aparece cargado por las páginas activas.

**Acción:** confirmar mediante búsqueda/coverage antes de eliminar.

---

## CODE-002 — `emisor.html` / `receptor.html` parecen fragmentos antiguos

**Prioridad:** P3

La interfaz activa concentra comportamiento en `templates/index.html`.

**Acción:** confirmar rutas/servidor y eliminar solo después de verificar que no son usadas.

---

## CODE-003 — Estado/variables redundantes

**Prioridad:** P3

Ejemplos observados:

- `isTransmitting` separado de `isTransmittingRef`;
- `lastDetectedFreq`;
- `lastPanelMsg`;
- estado `END` redundante;
- variables históricas de flags.

**Acción:** limpieza posterior a tests, no antes.

---

# 9. Rendimiento y capacidad

## PERF-001 — Logging intensivo en camino crítico

**Prioridad:** P1

El receptor de archivos imprime estado/frecuencia y bits frecuentemente dentro del loop que depende del hilo principal.

`console.log()` masivo puede alterar timing y rendimiento, especialmente en móviles/devtools abiertos.

**Dirección:** logger con niveles y posibilidad de recopilar métricas sin imprimir cada frame.

---

## PERF-002 — Velocidad de archivos requiere definir un objetivo real

**Prioridad:** P2

Con `0.05 s/bit`:

```text
20 bit/s raw
≈ 2.5 byte/s antes de overhead
```

Un archivo de 1 KiB requiere como mínimo varios minutos, más CRC, cabecera, preámbulo y repeticiones.

**No es automáticamente un defecto.**

La pregunta de producto/investigación es:

> ¿SONAR pretende transferir archivos arbitrarios o demostrar un canal de baja velocidad?

Antes de optimizar archivos se debe definir:

- tamaño objetivo;
- bitrate objetivo;
- distancia;
- PER máximo;
- prioridad entre velocidad y robustez.

---

# 10. Testing y medición

## TEST-001 — No existe baseline cuantitativo

**Prioridad:** P0

Actualmente la evaluación se expresa principalmente como:

- funciona/no funciona;
- letra problemática;
- más/menos detectable;
- distancia aproximada.

Necesitamos como mínimo:

### BER — Bit Error Rate

```text
bits incorrectos / bits enviados
```

### SER — Symbol Error Rate

```text
símbolos incorrectos / símbolos enviados
```

### PER — Packet Error Rate

```text
paquetes fallidos / paquetes enviados
```

Además registrar:

- dispositivo TX/RX;
- navegador;
- sample rate;
- distancia;
- banda;
- ruido/SNR;
- duración de símbolo;
- modulación/configuración.

Sin baseline no podemos demostrar que una V2 mejora.

---

## TEST-002 — Falta un canal/simulador reproducible

**Prioridad:** P0

Debe ser posible probar el módem sin dos dispositivos físicos en cada iteración.

Pipeline deseado:

```text
payload
→ modulador
→ señal
→ canal simulado
   + ruido
   + atenuación
   + eco
   + offset
   + clipping
→ demodulador
→ métricas
```

Esto permitirá separar fallos algorítmicos de fallos de hardware.

---

# 11. Documentación

## DOC-001 — Frecuencias de archivos desactualizadas

**Prioridad:** P1

README/HISTORIA describen aproximadamente `17000–18000 Hz`.

Código actual usa:

```text
18700
19195
19500
```

`app_archivos.js` incluso imprime en consola otro mapa distinto del definido en `protocolo_archivos.js`.

---

## DOC-002 — ACK/NACK documentado pero no implementado

**Prioridad:** P1

README e HISTORIA dicen “confirmación ACK/NACK tipo TCP”.

El protocolo actual no tiene NACK ni ciclo request/ack/retry.

---

## DOC-003 — Onda cuadrada documentada como solución, emisor actual usa seno

**Prioridad:** P2

La historia afirma que la onda cuadrada fue la solución de detectabilidad.

El código TX actual usa `sine`.

Debe documentarse como experimento histórico hasta volver a medir.

---

## DOC-004 — “Mapeo ASCII completo” es incorrecto

**Prioridad:** P3

El alfabeto implementado es:

```text
A-Z, 0-9, Ñ, espacio
```

No es ASCII completo.

---

## DOC-005 — Alcance contradictorio

**Prioridad:** P2

README:

```text
1–3 metros
```

HISTORIA:

```text
30 cm–1 m máximo probado
```

Solo deben publicarse distancias medidas bajo condiciones registradas.

---

## DOC-006 — Instrucción de HTTPS incorrecta

**Prioridad:** P2

README genera certificado con OpenSSL y después ejecuta:

```bash
python -m http.server 8000 --bind 0.0.0.0
```

Ese comando sigue sirviendo HTTP; no utiliza el certificado generado.

Debe corregirse para no confundir pruebas móviles.

---

## DOC-007 — Limpieza/cancelación documentada de forma excesiva

**Prioridad:** P2

Se afirma:

- cancelación automática;
- limpieza de recursos.

El callback de cancelación de archivos no se utiliza y no se observó un lifecycle completo que detenga tracks del micrófono/contextos al terminar.

---

## DOC-008 — Badges a archivos inexistentes

**Prioridad:** P3

README enlaza:

```text
STATUS
LICENSE
```

pero esos archivos no existen en el snapshot auditado.

---

# 12. Git y repositorio

## GIT-001 — Historial inflado por `venv`

**Prioridad:** P2  
**Estado:** confirmado

El código actual es pequeño, pero `.git/objects/pack` ronda **156 MB**.

El historial conserva binarios antiguos de entornos virtuales, incluyendo NumPy/SciPy/OpenBLAS para Linux y Windows.

Blobs históricos encontrados de decenas de MB incluyen OpenBLAS.

**Importante:** no limpiar el historial mientras se trabaja en la lógica del módem.

**Más adelante:**

1. backup/tag;
2. revisar colaboradores/remotos;
3. reescritura con `git filter-repo` si vale la pena;
4. force-push planificado;
5. documentar el cambio.

---

# 13. Ideas V2 — candidatas, no decisiones

## V2-001 — AudioWorklet

**Problema que resolvería:** desacoplar procesamiento de audio del render/UI.

**Debe demostrarse:** estabilidad temporal y mejora medible.

**Aprendizaje:** audio thread, frames de audio, buffers.

---

## V2-002 — Scheduling con reloj Web Audio

**Problema:** jitter de `setTimeout`.

**Idea:** programar fuentes usando `AudioContext.currentTime` / tiempos absolutos.

**Aprendizaje:** sample-accurate scheduling.

---

## V2-003 — Goertzel vs FFT

**Hipótesis:** si el receptor solo necesita distinguir unas pocas frecuencias candidatas, Goertzel puede ser más directo/robusto que buscar el pico de una FFT completa.

**No asumir:** medir FFT actual, FFT mejorada y Goertzel.

---

## V2-004 — Reducir M-FSK

Candidatos:

```text
2-FSK
4-FSK
8-FSK
38-FSK actual
```

Comparar:

- bitrate;
- SER;
- banda necesaria;
- compatibilidad de hardware;
- distancia;
- sensibilidad al offset.

No elegir 4-FSK por moda: decidir mediante datos.

---

## V2-005 — Protocolo binario unificado

Texto:

```text
TYPE = TEXT
PAYLOAD = UTF-8
```

Archivo:

```text
TYPE = FILE_CHUNK
PAYLOAD = bytes
```

Ambos usarían el mismo framing/módem.

**Beneficio:** una sola implementación de timing, CRC, retransmisión y detección.

---

## V2-006 — Preámbulo, sync word y reloj de símbolos

Un receptor robusto necesita saber:

1. que existe una transmisión;
2. dónde comienza;
3. cuándo muestrear cada símbolo.

Diseñar:

```text
PREAMBLE → SYNC WORD → HEADER → PAYLOAD → CRC
```

La sincronización no debe depender de “vi la frecuencia 3 veces”.

---

## V2-007 — Calibración por dispositivo

Antes de transmitir, medir respuesta en una banda segura.

Posibles datos:

```text
sample rate
noise floor
usable band
frequency offset
SNR por tono
```

Elegir parámetros según dispositivo.

---

## V2-008 — Fiabilidad: ACK/retransmisión/FEC

Orden recomendado de aprendizaje/evaluación:

1. framing correcto;
2. CRC;
3. sequence number;
4. timeout;
5. ACK;
6. retransmisión;
7. NACK solo si aporta;
8. FEC si los experimentos muestran que compensa el overhead.

---

# 14. Orden recomendado de trabajo

La auditoría no implica empezar por el primer bug de la lista.

## Fase 0 — Base documental

Crear/revisar:

```text
docs/AUDITORIA.md
docs/ARQUITECTURA.md
docs/ROADMAP.md
PROGRESO.md
```

Sin cambiar comportamiento.

---

## Fase 1 — Baseline y tests

Antes de rediseñar:

- tests unitarios de protocolo;
- vectores CRC;
- detector sintético;
- métricas BER/SER/PER;
- registro de sample rate/configuración.

---

## Fase 2 — V1 limpia

Corregir bugs independientes del diseño:

- doble transmisión;
- CRC;
- último bloque;
- dos receptores;
- drag & drop;
- cancelación falsa;
- código redundante solo cuando esté cubierto por tests.

Objetivo: tener una **V1-clean** comparable.

---

## Fase 3 — Caracterización

Medir V1-clean con:

- señal sintética;
- ruido;
- offset;
- dispositivos reales.

Esto crea el baseline contra el que se juzga V2.

---

## Fase 4 — Timing TX/RX

- scheduling de audio correcto;
- desacoplar detector de `requestAnimationFrame`.

---

## Fase 5 — Detector DSP

Comparar:

- FFT actual;
- FFT mejorada;
- Goertzel u otros detectores candidatos.

---

## Fase 6 — Sincronización

Diseñar preámbulo, sync y reloj de símbolos.

---

## Fase 7 — Modulación

Comparar esquemas mediante datos, no intuición.

---

## Fase 8 — Protocolo unificado

Definir paquete binario y tipos de payload.

---

## Fase 9 — Fiabilidad

CRC, secuencia, timeout, ACK/retransmisión y, si se justifica, FEC.

---

## Fase 10 — Calibración/adaptación

Ajuste por hardware.

---

## Fase 11 — Benchmark físico

Matriz de:

```text
TX device × RX device × distancia × ambiente × configuración
```

---

## Fase 12 — Limpieza/documentación/repo

Solo con comportamiento cubierto:

- borrar legacy;
- simplificar arquitectura;
- limpiar Git histórico si se decide;
- actualizar README;
- protocolo formal;
- benchmarks reproducibles.

---

# 15. Regla de revisión técnica

Para cada cambio importante:

## 1. Problema

¿Qué observamos exactamente?

## 2. Concepto

¿Qué conocimiento necesitas para entenderlo?

## 3. Hipótesis

¿Qué esperamos que ocurra al cambiarlo?

## 4. Implementación

Implementar el cambio acotado y registrar los componentes afectados.

## 5. Revisión

Se revisa el diff y se entiende la arquitectura afectada.

## 6. Evidencia

Test/benchmark antes y después.

## 7. Explicación

El cambio no se considera terminado hasta poder explicar aproximadamente:

- qué componente existe;
- qué entrada recibe;
- qué salida produce;
- por qué se eligió;
- qué limitaciones tiene.

## 8. Registro

Actualizar `PROGRESO.md` con la razón y el resultado.

**La comprensión y la decisión permanecen en el dueño del proyecto.**

---

# 16. Preguntas abiertas antes de fijar la arquitectura V2

Estas decisiones no deben asumirse todavía:

1. ¿El objetivo principal es mensajes, datos arbitrarios, archivos pequeños o plataforma experimental?
2. ¿Qué bitrate mínimo haría útil SONAR?
3. ¿Qué distancia mínima debe alcanzar?
4. ¿Debe funcionar obligatoriamente a 44.1 kHz?
5. ¿Near-ultrasonic (18–20 kHz) es aceptable o se exige >20 kHz?
6. ¿Qué navegadores/dispositivos son target?
7. ¿Half-duplex es suficiente?
8. ¿Cuánto overhead de robustez es aceptable?
9. ¿Se prioriza robustez o velocidad?
10. ¿Qué métricas definirán “SONAR funciona”?

Responder estas preguntas evitará construir características técnicamente interesantes pero innecesarias.

---

# 17. Próximo paso

**No implementar V2 todavía.**

Siguiente documento:

```text
docs/ARQUITECTURA.md
```

Debe reconstruir visualmente SONAR actual:

```text
UI → TX → waveform → speaker → air → microphone → analyser → detector → state machine → UI
```

y el flujo de archivos por separado.

Después:

```text
docs/ROADMAP.md
```

convertirá los hallazgos de esta auditoría en issues/fases ejecutables.

El GitHub Project será la vista operativa; esta auditoría seguirá siendo la fuente técnica de verdad.
