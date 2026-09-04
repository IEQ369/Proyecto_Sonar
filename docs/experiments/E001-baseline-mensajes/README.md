# E001 — Baseline reproducible de mensajes

> **Estado:** baseline digital inicial completado
>
> **Inicio:** 2026-09-01
>
> **Milestone:** M1 — Baseline reproducible
>
> **Configuración:** [`config.json`](config.json)

## Pregunta

¿Puede el protocolo de mensajes de SONAR generar y recuperar una transmisión
de manera determinista cuando se elimina temporalmente el altavoz, el aire y el
micrófono?

## Hipótesis

Si el emisor y el receptor comparten un contrato correcto, una señal sintética
que atraviesa un canal identidad debe recuperarse sin errores. Un fallo en esas
condiciones pertenece al software; un éxito digital seguido de un fallo físico
orientaría la investigación hacia el navegador, el dispositivo o el ambiente.

La hipótesis fue comprobada parcialmente. Mensajes sin símbolos consecutivos se
recuperan en el canal identidad, pero `AA` se recupera como `A`. Por tanto, la
afirmación general «todo mensaje perfecto llega sin errores» queda refutada por
la lógica temporal actual del receptor.

## Modelo que vamos a comprobar

```text
mensaje
  ↓
secuencia de símbolos y frecuencias
  ↓
muestras Float32Array producidas por TX
  ↓
canal simulado
  ↓
muestras entregadas a RX
  ↓
símbolos y mensaje detectados
  ↓
métricas contra el resultado esperado
```

El array representa amplitudes de una señal muestreada. No representa el aire
completo ni pretende modelar todavía toda su física.

## Alcance

E001 cubre inicialmente el modo de mensajes:

- caracteres `A-Z`, `Ñ`, dígitos y espacio;
- marcadores `START`, `SYNC` y `END`;
- señales sinusoidales a 48 kHz;
- canal identidad;
- detector y decodificador de mensajes;
- SER y tasa de mensajes correctos.

Quedan fuera de esta primera iteración:

- transferencia de archivos;
- CRC8 y CRC16 del protocolo binario;
- altavoz, micrófono, distancia y habitación;
- corrección de los defectos conocidos de V1;
- comparación FFT frente a Goertzel;
- eco y modelos físicos realistas del canal.

## Unidad de prueba

Un símbolo esperado puede terminar como:

```text
correcto
sustituido por otro
omitido
acompañado por una inserción
```

La métrica principal será:

```text
SER = (sustituciones + omisiones + inserciones) / símbolos esperados
```

Para mensajes completos registraremos:

```text
tasa de mensajes correctos = mensajes idénticos / mensajes enviados
```

BER quedará reservado para una secuencia binaria definida. PER se añadirá
cuando el proyecto cierre formalmente la definición de paquete. No se
presentarán ambas métricas antes de tener esas unidades.

## Perfiles actuales que no deben confundirse

La V1 posee dos rutas de transmisión en la página principal:

1. `setupEmisorUI()` registra Enter con amplitud base `0.08` y fade `0.035 s`.
2. El script de la plantilla registra botón y Enter con los valores por defecto:
   amplitud base `0.15` y fade `0.025 s`.

Pulsar Enter puede activar ambas rutas porque limpiar `onkeydown` no elimina un
listener agregado mediante `addEventListener`. E001 conservará este hecho como
observación del baseline; no lo corregirá silenciosamente.

## Fases

### E001-A — Contrato lógico

- comprobar el mapeo exacto carácter ↔ frecuencia;
- verificar vectores de secuencia conocidos;
- registrar solapamientos de ventanas y límites de Nyquist;
- comprobar que la configuración documentada coincide con el código.

### E001-B — Señal sintética

- producir tonos como `Float32Array` sin reproducirlos;
- verificar longitud, amplitud, frecuencia y fade;
- concatenar marcadores, datos y silencios de forma determinista.

### E001-C — Canal identidad

- entregar exactamente las muestras de TX a la entrada digital de RX;
- comprobar que el canal no modifica longitud ni valores.

### E001-D — Receptor aislado

- alimentar al receptor con tonos matemáticos de referencia;
- medir detección de frecuencia, símbolos y framing.

### E001-E — Extremo a extremo

- alimentar al receptor con muestras generadas por el emisor de SONAR;
- calcular SER y tasa de mensajes correctos;
- comparar la señal de referencia con la señal del emisor.

### E001-F — Canal degradado

- añadir ruido y atenuación con semilla reproducible;
- buscar el primer punto de degradación;
- no incluir todavía conclusiones sobre hardware real.

## Vectores iniciales

```text
"A"
START, SYNC, A, SYNC, END
18500, 19050, 18800, 19050, 19600 Hz
```

```text
"SONAR 01"
START, SYNC, S, O, N, A, R, espacio, 0, 1, SYNC, END
```

Los valores completos están en `config.json` y deben ser comprobados por las
pruebas automáticas para evitar que documentación y código diverjan.

## Condición de cierre

E001 se considera terminado cuando un solo comando puede:

1. generar todos los casos con configuración registrada;
2. ejecutar el receptor sin micrófono;
3. guardar esperado, recibido y métricas;
4. repetir el resultado de manera determinista;
5. diferenciar un fallo del emisor de uno del receptor;
6. producir una conclusión escrita sin afirmar más de lo medido.

## Resultados

### E001-A

**Estado:** MEDIDO el 2026-09-01.

Comando ejecutado:

```text
npm test
```

Resultado:

```text
9 pruebas aprobadas
0 pruebas fallidas
```

Observaciones reproducidas:

- todos los caracteres regresan correctamente desde su frecuencia central;
- los dos vectores iniciales coinciden con el protocolo ejecutable;
- ningún marcador comparte exactamente una frecuencia central de datos;
- existen 34 pares de ventanas de decisión solapadas con tolerancia ±80 Hz;
- `7`, `8` y `9` superan Nyquist cuando la tasa real es 44,1 kHz;
- la configuración documentada coincide con las duraciones actuales de V1.

### Interpretación

El mapeo exacto es determinista, pero eso no valida todavía la recepción. En una
frecuencia central ideal cada carácter puede recuperarse; entre centros
adyacentes existen regiones ambiguas porque los tonos suelen estar separados
100 Hz y cada ventana acepta ±80 Hz.

La consola actual informa cuatro proximidades entre datos y marcadores, pero no
los 34 solapamientos carácter-carácter. Por tanto, el mensaje de consola no debe
usarse como prueba de ausencia de conflictos.

Estos resultados no incluyen FFT, temporización, ruido, altavoz ni micrófono. El
siguiente paso verificable es E001-B: producir las muestras sintéticas sin
reproducir audio.

### E001-B — Señal sintética

**Estado:** MEDIDO el 2026-09-01.

Se separó la matemática existente de `generarOnda()` en una función pura. La
misma fórmula puede ahora devolver un `Float32Array` o llenar el `AudioBuffer`
que reproduce la aplicación. No se creó una segunda fórmula diferente para el
experimento.

Resultados comprobados:

- un símbolo de `0.06 s` a 48 kHz contiene exactamente 2880 muestras;
- dos generaciones con la misma configuración son idénticas;
- una sinusoidal sin fade coincide con la fórmula muestreada esperada;
- un silencio de `0.02 s` contiene 960 muestras de valor cero;
- los segmentos se concatenan sin alterar orden ni valores;
- el vector sintético de `A` dura `0.44 s` y contiene 21120 muestras;
- el perfil de Enter solapa fade-in y fade-out porque `2 × 0.035 s > 0.06 s`.

El último punto es una observación del baseline, no una corrección. La prueba
permite comparar posteriormente ese perfil con alternativas sin perder la
referencia de V1.

### E001-C — Canal identidad

**Estado:** MEDIDO el 2026-09-01.

El canal identidad devuelve una copia exacta del `Float32Array`. La copia no
comparte memoria con la entrada, de modo que una modificación accidental del
receptor no puede alterar retroactivamente la señal del emisor.

El conjunto acumulado queda en:

```text
18 pruebas aprobadas
0 pruebas fallidas
```

### E001-D — Receptor aislado

**Estado:** MEDIDO el 2026-09-04.

La máquina de estados se separó de `app.js` y ahora recibe únicamente:

```text
frecuencia detectada
magnitud detectada
tiempo de detección
```

El núcleo no conoce el micrófono, el lienzo de visualización ni elementos HTML.
Las pruebas comprueban:

- estado y buffer iniciales;
- rechazo de un START aislado;
- estabilidad de tres detecciones;
- transiciones `IDLE → SYNC → DATA`;
- reconstrucción de `A` y retorno a `IDLE`;
- rechazo de señales bajo el umbral;
- cancelación por timeout.

`app.js` utiliza ahora este mismo núcleo. La página principal cargó en el
navegador sin errores de JavaScript. No se concedió permiso al micrófono y no se
considera realizada una prueba acústica.

### E001-E — Extremo a extremo digital

**Estado:** MEDIDO el 2026-09-04.

Se creó un detector de referencia que compara las muestras contra todas las
frecuencias candidatas. Su función es servir como instrumento de laboratorio;
no sustituye ni valida todavía la Transformada Rápida de Fourier utilizada por
el navegador.

El recorrido ejecutado es:

```text
mensaje
→ plan de tonos
→ Float32Array
→ canal simulado
→ detector de referencia
→ máquina de estados
→ mensaje recibido
→ tasa de error de símbolos
```

Resultados con canal identidad:

| Entrada | Salida | Errores | SER | Interpretación |
|---|---|---:|---:|---|
| `A` | `A` | 0 | 0 | recorrido básico correcto |
| `SONAR 01` | `SONAR 01` | 0 | 0 | varios símbolos correctos |
| `AA` | `A` | 1 | 0,5 | segundo símbolo bloqueado |

SER significa *Symbol Error Rate* o tasa de error de símbolos. En mensajería,
cada carácter transmitido cuenta como un símbolo de datos.

El caso `AA` falla aunque las dos frecuencias fueron detectadas correctamente.
Esto aísla el defecto en el bloqueo temporal del receptor: entre decisiones hay
exactamente 80 ms y la condición existente exige más de 80 ms para aceptar dos
caracteres iguales consecutivos.

### E001-F — Canal degradado mínimo

**Estado:** MEDIDO el 2026-09-04.

Se añadieron ganancia y ruido uniforme con semilla. La semilla hace que la misma
configuración produzca exactamente la misma secuencia de ruido.

| Caso | Entrada | Salida | SER |
|---|---|---|---:|
| ganancia `0,5`, sin ruido | `A` | vacío | 1 |
| ganancia `1`, ruido `0,02`, semilla `369` | `A` | `A` | 0 |

La ganancia `0,5` no representa automáticamente «volumen físico al 50 %». El
detector de laboratorio convierte amplitud numérica a una escala de 0 a 255
antes de aplicar el umbral heredado de V1. Este resultado caracteriza ese
modelo numérico, no un altavoz, micrófono o habitación.

## Ejecución reproducible

Pruebas completas:

```text
npm test
```

Experimento y generación del resultado JSON:

```text
npm run experiment:e001
```

Resultado registrado:

```text
35 pruebas aprobadas
0 pruebas fallidas
3 de 5 casos experimentales con mensaje completo correcto
```

El informe legible por máquinas se encuentra en
[`results/latest.json`](results/latest.json).

## Limitaciones del baseline

- el simulador conoce el inicio y final de cada segmento generado;
- todavía no busca fronteras desconocidas dentro de un flujo continuo;
- el detector de referencia no es el `AnalyserNode` del navegador;
- el ruido uniforme no modela una habitación ni la respuesta de hardware;
- no se midió relación señal-ruido en decibelios;
- no se probaron altavoz, aire ni micrófono;
- el protocolo de archivos permanece fuera de E001.

`AnalyserNode` es el componente de Web Audio API que obtiene el espectro usado
por la interfaz. API significa interfaz de programación de aplicaciones.

## Conclusión

E001 cumple su condición de cierre como baseline digital inicial: un comando
genera casos, ejecuta el receptor sin micrófono, calcula la tasa de error y
guarda resultados reproducibles.

La evidencia permite distinguir dos clases de fallo:

1. `AA` demuestra un fallo de lógica RX porque el detector sí encontró ambos
   tonos y el canal fue perfecto.
2. Un futuro fallo exclusivo de la ruta física, después de superar estas
   pruebas, podrá investigarse en adquisición, navegador, hardware o ambiente.

E001 no demuestra que SONAR funcione acústicamente. Establece una referencia
controlada desde la cual comparar correcciones y pruebas físicas posteriores.
