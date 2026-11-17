# E008 — Protocolo de archivos V2 de extremo a extremo

**Estado:** ejecutado el 2026-11-17 · **Alcance:** simulación digital
determinista con ruido uniforme, más un ensayo de la pantalla en Chromium con
micrófono simulado. **No hay medición por aire.**

## Qué es el protocolo V2

Tres capas, cada una en su módulo y sin dependencia del navegador:

| Capa | Módulo | Qué hace |
|---|---|---|
| Trama | `core/trama_archivos.js` | Paquete `TIPO, ID, SECUENCIA, LONGITUD, DATOS, CRC16`. Reutiliza `crc16ccitt()` |
| Física | `core/modem_mfsk.js` | 16 tonos de datos (4 bits por símbolo) y 3 de control, de 18 200 a 19 720 Hz cada 80 Hz |
| Transferencia | `core/transferencia_archivos.js` | Bloques de 16 bytes numerados, lista de faltantes, reenvío y CRC32 del archivo |

Dos decisiones de diseño que resuelven problemas del protocolo anterior:

- **Sin reloj.** Dos símbolos seguidos nunca usan el mismo tono: si un valor se
  repite, se emite el tono REPETIR. El receptor cuenta un símbolo cada vez que
  el tono estable cambia, así que no depende de temporizadores.
- **Control separado de datos.** START y DATA_0 ya no comparten frecuencia.

La pantalla está en `/archivos_v2/`, enlazada desde `/archivos`. El protocolo
anterior sigue disponible sin cambios.

Reproducir: `npm run experiment:e008` (unos 45 s). Datos en
[results/latest.json](results/latest.json).

## Resultados — MEDIDO (archivo de 128 bytes, 8 bloques)

### Canal limpio

El archivo llega íntegro en una ronda a 48 kHz, a 44,1 kHz y con el receptor a
30 cuadros por segundo. Con desvíos de frecuencia de −35 a +35 Hz también: 0 %
de pérdida.

### Atenuación frente a ruido fijo

| SNR | Rondas | Paquetes perdidos | Dañados aceptados | Archivo íntegro | Tiempo en el aire |
|---|---|---|---|---|---|
| −8,7 dB | 1 | 0 % | 0 | sí | 49 s |
| −14,7 dB | 1 | 0 % | 0 | sí | 49 s |
| −16,7 dB | 2 | 5,9 % | 0 | sí | 69 s |
| −17,8 dB | 3 | 42,3 % | 0 | sí | 106 s |
| −19,2 dB | 6 (máximo) | 91,2 % | 0 | no | 278 s |
| −20,7 dB | 6 (máximo) | 100 % | 0 | no | 295 s |

1. **El reenvío funciona:** con 42 % de paquetes perdidos el archivo se
   completa en tres rondas.
2. **Nunca se aceptó un bloque dañado**, en ninguna condición. Cuando la señal
   no alcanza, la transferencia no termina; no entrega un archivo corrupto.
3. **Con solo ruido no aparece ningún paquete válido.**

### Duración del símbolo (a −17,8 dB)

| Símbolo | Rondas | Paquetes perdidos | Archivo íntegro | Tiempo en el aire |
|---|---|---|---|---|
| 40 ms | 6 (máximo) | 100 % | no | 153 s |
| 60 ms | 5 | 75,5 % | sí | 165 s |
| 80 ms (por defecto) | 3 | 42,3 % | sí | 106 s |
| 120 ms | 5 | 48,6 % | sí | 210 s |

80 ms es el mejor de los cuatro con señal débil: los símbolos más cortos
pierden más paquetes y los más largos no compensan lo que tardan.

### Umbral de detección (a −14,7 dB)

| Margen sobre el piso de ruido | Paquetes válidos de 12 | Válidos con solo ruido |
|---|---|---|
| 55 bytes (≈15 dB) | 0 | 0 |
| 40 bytes | 9 | 0 |
| 30 bytes | 12 | 0 |
| 20 bytes (≈5,5 dB), adoptado | 12 | 0 |
| 10 bytes | 12 | 0 |

El margen de 55 bytes sirve para la herramienta de medición (E007), que no
tiene CRC. En el módem, el CRC de cada paquete ya descarta lo que el ruido hace
pasar, así que un margen bajo da sensibilidad sin aceptar datos falsos.

## Velocidad — CÁLCULO, no medición

Bytes útiles por segundo para 1 KB, con cabeceras, CRC y pausas incluidos:

| Símbolo | V2 | 1 KB tarda |
|---|---|---|
| 80 ms (por defecto) | 3,67 B/s | 4,7 min |
| 60 ms | 4,84 B/s | 3,5 min |
| 40 ms | 7,09 B/s | 2,4 min |

El protocolo anterior emite un bit cada 0,05 s con un byte de CRC por cada 8:
2,22 B/s sin contar preámbulo ni cabecera.

**Esto corrige el plan.** `docs/PLAN_ARCHIVOS.md` estimaba 6 B/s y «seis veces
más rápido». Con la sobrecarga real de la trama (7 bytes por cada 16 de datos)
y el símbolo de 80 ms, V2 es unas **1,7 veces** más rápido que el anterior, no
seis. La ganancia principal de V2 no es la velocidad: es que comprueba cada
bloque, sabe qué falta y lo recupera.

## Ensayo en navegador — MEDIDO (micrófono simulado)

`/archivos_v2/` se ejecutó en Chromium 153 sin interfaz. El micrófono era un
WAV con una transferencia de 96 bytes a la que se le quitaron los bloques 3 y
5, seguida del reenvío de esos dos bloques.

- La pantalla mostró `3,5` como bloques faltantes al terminar la primera pasada.
- Tras el reenvío marcó «recibido y verificado (96 bytes)».
- El archivo del enlace de descarga fue **idéntico byte a byte** al original.
- No hubo errores en la consola. El emisor arrancó sin errores, pero su audio
  no se puede oír en este ensayo.

Reproducir (requiere Playwright y Chromium, fuera de `npm test`):

    python3 src/web/backend/servidor_estatico.py &
    node scripts/ensayo_navegador/crear_wav_de_archivo.mjs /tmp/archivo.wav /tmp/original.bin
    node scripts/ensayo_navegador/recibir_archivo_en_chromium.cjs /tmp/archivo.wav /tmp/original.bin 56

## Limitaciones

- **Nada se probó por aire.** Eco, respuesta del altavoz y del micrófono y
  ruido real no están en el modelo. El eco puede alargar cada tono y es el
  riesgo principal para un receptor que cuenta cambios de tono.
- El receptor pide el micrófono sin procesamiento de voz, por lo observado en
  E007. Falta comprobar que todos los navegadores respetan esa petición.
- El reenvío es manual: el receptor muestra la lista y alguien la escribe en el
  emisor. No hay confirmación acústica (fase 6 del plan).
- El límite de la pantalla es de 4 096 bytes, unos 19 minutos a 80 ms.
- La captura avanza con `requestAnimationFrame`: se detiene si la pestaña del
  receptor pasa a segundo plano.
- El archivo de prueba es de 128 bytes y una sola semilla por condición: sirve
  para ver dónde está el precipicio, no para dar porcentajes finos.
