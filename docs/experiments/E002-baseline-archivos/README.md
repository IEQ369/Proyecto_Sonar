# E002 — Baseline lógico del protocolo de archivos

> **Estado:** baseline lógico completado
>
> **Fecha:** 2026-09-04
>
> **Milestone:** M1 — Baseline reproducible
>
> **Configuración:** [`config.json`](config.json)

## Pregunta

¿El emisor y el receptor V1 de archivos comparten el mismo contrato lógico para
cabecera, bits, bloques y comprobaciones de integridad?

## Hipótesis

Una cabecera o bloque producido por el emisor debería ser aceptado por el
receptor cuando los datos no sufren alteraciones.

La hipótesis fue **REFUTADA**. Existen incompatibilidades deterministas antes de
introducir señal acústica, ruido o hardware.

## Conceptos

- **Bit:** unidad binaria con valor `0` o `1`.
- **Byte:** grupo de ocho bits; puede representar valores de 0 a 255.
- **Cabecera:** metadatos enviados antes del contenido, como tamaño y nombre.
- **Payload:** datos útiles transportados por un bloque.
- **CRC:** comprobación de redundancia cíclica; cálculo para detectar cambios en
  los datos. Emisor y receptor deben utilizar exactamente la misma variante.
- **XOR:** operación lógica «o exclusivo». Un XOR simple no equivale al CRC8
  polinomial implementado por el emisor.

## Alcance

E002 comprueba sin audio:

- conversión byte ↔ bits;
- vectores estándar CRC16-CCITT y CRC8;
- serialización de cabecera de 22 bytes;
- orden little-endian del tamaño y CRC;
- bloques completos y bloque final corto;
- compatibilidad de los cálculos de integridad;
- asignación y separación de frecuencias.

Little-endian significa que el byte menos significativo de un número se guarda
primero.

No se ejecutaron:

- tonos sintéticos para archivos;
- máquina de estados completa de archivos;
- altavoz o micrófono;
- retransmisiones, ACK o NACK;
- correcciones del protocolo activo.

ACK significa confirmación positiva y NACK confirmación negativa.

## Ejecución

```text
npm test
npm run experiment:e002
```

El segundo comando escribe [`results/latest.json`](results/latest.json).

## Resultados

```text
45 pruebas aprobadas
0 pruebas fallidas
5 incompatibilidades confirmadas
```

### 1. CRC16 de cabecera incompatible

El emisor calcula el CRC16 usando cuatro bytes de tamaño iguales a cero. Luego
coloca el tamaño real dentro de la cabecera. El receptor vuelve a calcular el
CRC sobre el tamaño real y obtiene otro valor.

Resultado para tamaño `1` y nombre `A`:

```text
CRC16 transmitido por V1    → 53940
CRC16 calculado por RX      → 59143
cabecera de referencia      → válida
cabecera del emisor V1      → rechazada por el cálculo del receptor
```

### 2. CRC8 de bloque incompatible

El emisor usa CRC8 con polinomio `0x07`. El receptor calcula únicamente el XOR
de los ocho bytes. Ambos resultados no son intercambiables.

Para los bytes `[1, 2, 3, 4, 5, 6, 7, 8]`:

```text
CRC8 del emisor → 62
XOR del receptor → 8
```

### 3. Bloque final corto incompatible

El emisor añade un CRC al número real de bytes restantes. Para tres bytes crea:

```text
3 bytes de datos + 1 CRC = 4 bytes
```

El receptor espera siempre:

```text
8 bytes de datos + 1 CRC = 9 bytes
```

Por ello un archivo cuyo tamaño no sea múltiplo de ocho deja al receptor
esperando bits que el emisor nunca enviará.

### 4. Colisiones exactas de roles

```text
START = DATA_0 = 18700 Hz
SYNC  = DATA_1 = 19195 Hz
END   = ACK    = 19500 Hz
```

Una misma frecuencia representa dos significados. La máquina de estados intenta
distinguirlos por contexto, pero el preámbulo y la secuencia binaria pueden
contaminarse mutuamente.

### 5. Ventanas binarias solapadas

`DATA_0` y `DATA_1` están separados por 495 Hz. El receptor utiliza una
tolerancia general de 300 Hz alrededor de cada frecuencia:

```text
300 Hz + 300 Hz > 495 Hz
```

Existe una región donde un pico puede satisfacer ambas decisiones. Además, el
código pregunta primero si está cerca de `DATA_1`, por lo que esa región tiende
a resolverse como bit `1`.

## Lo que sí funciona lógicamente

- los 256 valores posibles de un byte sobreviven byte → bits → byte;
- CRC16-CCITT produce `0x29B1` para el vector estándar `123456789`;
- CRC8 produce `0xF4` para el mismo vector;
- una cabecera creada con el CRC sobre sus primeros 20 bytes se valida;
- un bloque completo creado y validado con el mismo CRC8 se recupera.

Esto demuestra que las funciones básicas pueden formar un contrato consistente.
El fallo se encuentra principalmente en cómo el emisor y el receptor combinan
esas funciones.

## Conclusión

La transferencia V1 no puede considerarse confiable incluso bajo un canal
digital perfecto. Probar primero con dos dispositivos no ayudaría a localizar
estos defectos porque el intercambio ya es incompatible antes de producir
audio.

E002 preserva los valores originales como baseline. Las correcciones deben
realizarse posteriormente con nuevas pruebas que demuestren compatibilidad
emisor ↔ receptor sin ocultar estas observaciones.
