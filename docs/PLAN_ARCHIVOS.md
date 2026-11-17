# Plan para completar el protocolo de archivos

> **Estado al 2026-11-17:** las fases 1 a 5 están implementadas y probadas en
> simulación y en un navegador con micrófono simulado
> ([E008](experiments/E008-archivos-v2/README.md)). Faltan la fase 0 (medición
> por aire), la 6 (confirmación acústica) y la 7 (dos tonos simultáneos).
>
> **Correcciones a este plan tras implementarlo:**
>
> - El emisor anterior usa símbolos de 0,05 s, no de 0,12 s: su velocidad es de
>   unos 2,2 bytes por segundo, no 1.
> - La estimación de 6 bytes por segundo para V2 no contaba la sobrecarga de la
>   trama. Medido, V2 da 3,7 bytes por segundo con símbolos de 80 ms: unas 1,7
>   veces el anterior, no seis.
> - El símbolo quedó en 80 ms sin pausa, no en 60 ms con 20 ms de pausa.
> - El bloque quedó en 16 bytes con 7 de trama (se añadió un identificador de
>   transferencia de un byte).
>
> El texto de abajo se conserva como se redactó, para que se vea qué cambió.

## Por qué no se «completó» directamente

El protocolo actual envía **un bit por tono** (`DATA_0` y `DATA_1`) con
símbolos de 0,12 s: unos 8 bits por segundo, es decir, cerca de **1 byte por
segundo**. Con un byte de comprobación cada 8 bytes, 1 KB tarda alrededor de
18 minutos (cálculo, no medición). Terminar la máquina de estados sobre esa base
daría un sistema correcto pero inutilizable, así que el plan empieza por la capa
que decide la velocidad.

Además, hoy `START` comparte frecuencia con `DATA_0`, `SYNC` con `DATA_1` y
`END` con `ACK`: el receptor solo puede distinguirlos por contexto.

## En qué basarse: es un módem, no un sistema de archivos

La pregunta «¿a qué protocolo me baso si es sonido?» tiene respuesta conocida.
El sonido es solo el medio; lo que hay que construir son las capas de un módem:

| Capa | Qué resuelve | Referencia clásica |
|---|---|---|
| Física | Convertir símbolos en tonos y tonos en símbolos | Módems FSK/MFSK (Bell 103, Bell 202) |
| Trama | Saber dónde empieza un paquete y si llegó bien | HDLC, AX.25: preámbulo, longitud, CRC |
| Transferencia | Partir el archivo y recuperar lo perdido | XMODEM: bloques numerados y reenvío |

XMODEM es la referencia más directa: bloques pequeños numerados, cada uno con su
comprobación, y el receptor pide repetir los que fallan. Es simple, está bien
documentado y fue diseñado para canales lentos y ruidosos.

## Diseño propuesto

### Capa física: 16 tonos, 4 bits por símbolo

- 16 tonos de datos separados 80 Hz, más tonos de control **propios**, todos
  bajo 21,5 kHz (E003: lo que supera Nyquist a 44,1 kHz no llega).
- Decisión por frecuencia más cercana (E003: es la regla sin símbolo
  equivocado) y acuerdo de tres cuadros (E006: filtra el ruido).
- Símbolos de 60 ms con 20 ms de pausa (E004: 30 ms no alcanza).
- Velocidad estimada: 4 bits cada 80 ms = 50 bits/s, unos **6 bytes por
  segundo**, seis veces la actual. 1 KB tardaría unos 3,5 minutos con la
  sobrecarga de trama. Es un cálculo; hay que medirlo.
- Un mismo byte nunca produce dos símbolos iguales seguidos sin pausa
  detectable: el receptor necesita la pausa o un tono alterno para separar
  símbolos repetidos. **Suposición por confirmar:** cómo lo resuelve hoy el
  receptor de archivos.

### Capa de trama: paquetes autocontenidos

    PREÁMBULO | TIPO | SECUENCIA | LONGITUD | DATOS (≤16 bytes) | CRC16

- Preámbulo: tonos de control alternados, para que el receptor encuentre el
  inicio sin depender del paquete anterior.
- `TIPO`: cabecera de archivo, datos o fin.
- `SECUENCIA`: número de paquete, para detectar pérdidas y duplicados.
- CRC16-CCITT sobre todo el paquete. Ya existe `crc16ccitt()`; E002 documenta
  que emisor y receptor lo calculaban sobre datos distintos, y V1 Clean lo
  unificó. Reutilizar esa función, no escribir otra.

### Capa de transferencia: dos etapas

1. **Unidireccional con repetición.** El emisor envía cabecera, paquetes y fin.
   El receptor guarda los paquetes válidos por número de secuencia y, al
   terminar, muestra cuáles faltan. El usuario pulsa «reenviar faltantes» en el
   emisor indicando esos números. No requiere que los dos equipos emitan.
2. **Confirmación acústica (ACK/NACK).** El receptor responde por sonido tras
   cada grupo de paquetes. Exige que ambos equipos emitan y escuchen, y que
   ninguno se oiga a sí mismo. Solo tiene sentido si E007 muestra que el canal
   funciona en los dos sentidos.

La cabecera de archivo conserva lo que ya existe: tamaño, nombre y un CRC del
archivo completo para la verificación final.

## Flujo de trabajo

Cada fase termina con pruebas automáticas y un experimento reproducible, igual
que E003–E006. No se toca el protocolo actual hasta la fase 5.

| Fase | Entregable | Condición de cierre |
|---|---|---|
| 0 | Ejecutar E007 con dos dispositivos | Se sabe qué banda llega y cuánto desvío hay |
| 1 | `core/trama_archivos.js`: armar y validar paquetes, sin audio | Pruebas de ida y vuelta, paquetes corruptos rechazados |
| 2 | `core/modem_mfsk.js`: bytes ↔ símbolos ↔ frecuencias | Pruebas de ida y vuelta para los 256 valores de byte |
| 3 | Simulación extremo a extremo con `canal_simulado.js` | Experimento E008: un archivo de 1 KB llega íntegro sin ruido, y se mide la tasa de paquetes perdidos con ruido |
| 4 | Receptor con reensamblado y lista de faltantes | Experimento E009: recuperación tras perder paquetes al azar |
| 5 | Conectar a la pantalla de archivos como modo nuevo | El modo actual sigue disponible; prueba manual entre dos equipos |
| 6 | ACK/NACK acústico | Solo si la fase 0 muestra canal en los dos sentidos |
| 7 (opcional) | Dos tonos simultáneos por símbolo | Ver «Fase opcional» más abajo |

**Avance:** fases 1 y 2 en `core/trama_archivos.js` y `core/modem_mfsk.js`;
fases 3 y 4 en `simulacion/simulador_archivos.js` y E008 (se unieron en un solo
experimento); fase 5 en `/archivos_v2/`.

Las fases 1 a 4 son deterministas y no necesitan hardware: se pueden hacer en
una o dos sesiones de trabajo.

## Fase opcional: dos tonos simultáneos por símbolo

La telefonía ya resolvió cómo enviar más datos por símbolo sin acortarlo:
emitir varias frecuencias a la vez. Hay tres variantes conocidas.

| Técnica | Idea | Dónde se usa |
|---|---|---|
| FDM | Cada usuario ocupa su propia banda | Varias llamadas por un mismo cable |
| DTMF | Dos tonos a la vez, uno de cada grupo | Teclado del teléfono: 4 + 4 tonos, 16 teclas |
| Multiportadora (DMT, OFDM) | Un flujo repartido en muchas frecuencias simultáneas | ADSL, WiFi, 4G |

La que encaja con SONAR es **DTMF**: dos grupos de 16 tonos y, en cada símbolo,
un tono de cada grupo. Son 8 bits, un byte completo por símbolo.

- **Velocidad estimada:** 8 bits cada 80 ms = 100 bits/s, unos 12 bytes por
  segundo, el doble que con un solo tono. Es un cálculo; hay que medirlo.
- **Banda:** 32 tonos a 80 Hz ocupan unos 2,6 kHz. Caben bajo 21,5 kHz con los
  tonos de control, pero con menos holgura.

### Costos que hay que medir antes de adoptarla

1. **Menos alcance.** La amplitud se reparte entre los dos tonos, así que cada
   uno llega más débil. E004 y E006 muestran que el error sube de golpe al bajar
   la señal.
2. **Puede volverse audible.** Los altavoces pequeños no son lineales: dos tonos
   a 19 y 19,5 kHz pueden producir un tono de diferencia a 500 Hz, dentro del
   rango audible. Es el fenómeno que aprovechan los ataques citados en el
   README. **No está medido en este proyecto**; es un riesgo conocido.
3. **Otro detector.** El receptor actual toma el bin más fuerte de la banda.
   Con dos tonos debe buscar un pico por grupo, y las réplicas de simulación
   (`estimarPicoAnalizador`) necesitan una variante equivalente.

### Cómo evaluarla

| Paso | Qué se hace | Condición para seguir |
|---|---|---|
| 7a | Experimento en simulación: tasa de error de uno y dos tonos con la misma amplitud total, frente a atenuación | La pérdida de alcance es aceptable frente a duplicar la velocidad |
| 7b | Ampliar `/laboratorio/` para emitir pares de tonos y registrar la banda audible (por debajo de 18 kHz) | No aparecen tonos de diferencia por encima del piso de ruido |
| 7c | Capa física alternativa en `core/modem_mfsk.js`, detrás de la misma interfaz bytes ↔ símbolos | Las pruebas de las fases 1 a 4 pasan sin cambios |

Solo tiene sentido después de la fase 4: la trama y la transferencia no cambian,
así que se puede adoptar o descartar sin rehacer nada. Si 7b falla, se descarta
aunque 7a salga bien, porque el proyecto dejaría de ser inaudible.

## Decisiones que dependen de ti

1. **Tamaño máximo de archivo.** A 6 bytes por segundo, 10 KB son unos 35
   minutos. Conviene fijar un límite honesto (por ejemplo, 2 KB) y decirlo en
   la interfaz.
2. **¿Reemplazar o convivir?** El plan propone un modo nuevo junto al actual,
   por el principio de no reescribir desde cero.
3. **¿Etapa 2 o no?** El ACK acústico duplica la complejidad. La etapa 1 ya
   permite completar una transferencia.
4. **¿Velocidad o discreción?** La fase 7 duplica la velocidad si los dos tonos
   no generan sonido audible en tus equipos. Si lo generan, hay que elegir.

## Riesgos conocidos

- El procesamiento de voz del navegador puede borrar la banda (E007). Sin
  resolver la decisión 0 de `docs/REVISION.md`, nada de esto llega por aire.
- La velocidad estimada supone que el receptor distingue símbolos de 60 ms;
  E004 y E006 lo miden solo en simulación.
- Con 16 tonos más control, la banda ocupada es de unos 1,6 kHz: cabe con
  holgura, pero la respuesta real de altavoces y micrófonos puede obligar a
  moverla.
