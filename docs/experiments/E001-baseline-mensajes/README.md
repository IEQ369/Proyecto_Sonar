# E001 — Baseline reproducible de mensajes

> **Estado:** en progreso
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

La hipótesis todavía está **PENDIENTE**. La primera fase únicamente fija y prueba
el contrato lógico sobre el cual construiremos la señal sintética.

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
- ruido, eco y atenuación, salvo el perfil identidad.

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

El canal ya existe, pero todavía no está conectado al receptor. La siguiente
frontera es separar la máquina de estados RX de la captura por micrófono y de la
visualización FFT.
