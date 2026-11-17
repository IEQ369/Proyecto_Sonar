# ROADMAP DE SONAR

> **Estado:** plan maestro de evolución posterior a la auditoría inicial.  
> **Baseline:** `bf3f14c`  
> **Tag:** `pre-sonar-v2-2026-08-24`  
> **Fecha de inicio del roadmap:** 2026-08-24  
> **Regla principal:** SONAR debe evolucionar sin perder su identidad, sin reescrituras impulsivas y sin introducir complejidad que no pueda justificarse con pruebas.

## Lectura del estado actual — 2026-11-17

Este documento nació como plan de V1 a V2 en agosto de 2026. Las secciones
fechadas de agosto se conservan como registro histórico; para decidir el próximo
trabajo, usar este estado y las entradas recientes de `PROGRESO.md`.

| Frente | Estado verificado | Siguiente decisión o trabajo |
|---|---|---|
| Fundación documental (M0) | Documentos integrados en `main` y enviados al repositorio remoto el 2026-09-19 | Cambiar la visibilidad cuando el propietario revise el alcance público del historial |
| Baseline (M1) | E001 y E002 conservan resultados del baseline digital; faltan métricas y registro físico del alcance original | Ampliar medidas cuando corresponda, sin llamar "física" a la simulación |
| V1 Clean (M2) | Alcance lógico cerrado; 79 pruebas aprobadas el 2026-11-17 (66 de V1 Clean y 13 de caracterización) | Conservar esta versión como referencia de comparación |
| Caracterización (M3) | Parte digital de E3-001, E3-002, E3-003, E3-005 y E3-006 medida en E003 y E004 (2026-11-17). Faltan E3-004 (tamaño de FFT), E3-007 (forma de onda) y toda la parte física | Revisar E003–E005 y decidir sobre el candidato V2-A; ver `docs/REVISION.md` |
| Investigación científica | Pregunta y alcance todavía provisionales | Acordarlos con el coordinador y el equipo; usar mediciones propias y fuentes trazables |

La revisión externa recibida el 2026-09-17 figura como **observaciones
contrastadas**, no como instrucciones de implementación. La inserción del nombre
de archivo recibido mediante `innerHTML` se corrigió el 2026-09-19 y tiene dos
pruebas de regresión. Las otras observaciones permanecen como trabajo por evaluar.

---

# 0. Identidad del proyecto

SONAR es, ante todo, un proyecto de **ciberseguridad**.

No nació como una aplicación genérica para enviar texto o archivos. Su objetivo es explorar cómo software ejecutado sobre hardware cotidiano puede revelar o explotar capacidades que el uso normal del dispositivo no considera.

La pregunta central que guía el proyecto es:

> **¿Qué capacidad no obvia puede extraerse, mediante software, de componentes comunes como altavoz y micrófono, y qué implicaciones de seguridad aparecen cuando esa capacidad se utiliza como canal?**

Por tanto, mensajes y archivos son demostraciones de una propiedad más profunda: si un canal acústico puede transportar información arbitraria entre dispositivos, también puede estudiarse como canal alternativo o encubierto en escenarios de seguridad controlados.

**Restricción permanente de diseño:** SONAR debe seguir siendo *software-only*. No se añadirá hardware dedicado, arrays de micrófonos ni sensores externos para resolver una limitación, salvo que el dueño del proyecto cambie explícitamente esta regla.

SONAR no nació como una aplicación genérica para enviar texto o archivos.

La idea original surgió a partir de una escena de *Pantheon* en la que un sistema aislado debía ser alcanzado mediante un medio no convencional. La parte que más influyó en el proyecto fue la idea de utilizar sonido/ultrasonido como una forma alternativa de interacción con un entorno físicamente aislado.

La primera visión de SONAR fue:

```text
usar ultrasonido
        ↓
medir/reflejar el entorno
        ↓
reconstruir espacialmente
        ↓
obtener una representación 3D
```

La intención era aproximarse conceptualmente a un LiDAR, pero utilizando sonido.

De esa relación conceptual nació también el nombre:

```text
LiDAR  → luz
SONAR  → sonido
```

La investigación inicial mostró que conseguir un mapeo 3D útil con el hardware genérico disponible no era razonable con un único micrófono. La geometría espacial exige más información, normalmente múltiples receptores, posiciones conocidas, arrays, movimiento controlado u otro hardware adicional.

El proyecto no se abandonó.

Se produjo un **pivot técnico**.

La propiedad más aprovechable del medio acústico era:

```text
dispositivos físicamente cercanos
+
sin red entre ellos
+
altavoz
+
micrófono
=
canal alternativo de comunicación
```

SONAR evolucionó entonces hacia:

```text
comunicación acústica
+
seguridad informática
+
canales encubiertos / air-gap
+
exfiltración experimental de datos
```

Durante la investigación aparecieron referencias relacionadas con:

- canales acústicos entre sistemas aislados;
- ataques mediante ultrasonido;
- SurfingAttack;
- canales laterales/acústicos;
- investigaciones tipo BadBIOS;
- ataques que utilizan dispositivos físicos comunes como medio.

Esto define la identidad del proyecto:

> **SONAR es una plataforma experimental de seguridad y comunicaciones acústicas sobre hardware de consumo.**

La mensajería y los archivos son aplicaciones de esa plataforma, no el objetivo final de identidad.

---

# 1. Principios que no debemos perder

## P-001 — Seguridad e investigación primero

Cada nueva capacidad debería responder al menos a una de estas preguntas:

```text
¿enseña algo sobre comunicaciones acústicas?
¿enseña algo sobre seguridad?
¿permite experimentar con un canal alternativo?
¿permite medir mejor el sistema?
¿mejora fiabilidad real?
```

Si una feature solo hace que SONAR se parezca más a una aplicación de mensajería convencional, probablemente no sea prioritaria.

---

## P-002 — No convertir SONAR en un proyecto genérico

No perseguir como objetivo principal:

```text
chat completo
red social
Dropbox acústico
mensajería bonita
gestor de archivos genérico
```

Puede existir UI para demostrar esas funciones, pero el valor diferencial permanece en el canal físico.

---

## P-003 — Diseño visual bloqueado por defecto

El diseño actual forma parte de la identidad del proyecto.

Por tanto:

```text
NO rediseño visual automático
NO cambio de estética por refactor
NO sustitución del estilo por componentes genéricos
NO framework visual nuevo sin necesidad
```

Se permiten:

```text
correcciones funcionales
accesibilidad
estados nuevos
feedback de errores
diagnóstico
controles necesarios
```

siempre preservando el lenguaje visual existente.

La dirección estética pertenece al dueño del proyecto.

---

## P-004 — No reescribir desde cero

La V2 no significa borrar V1.

La evolución debe ser:

```text
medir V1
↓
entender V1
↓
corregir V1
↓
comparar alternativas
↓
reemplazar solo donde exista evidencia
```

---

## P-005 — Comprensión y decisión técnica

El dueño del proyecto debe entender, cuestionar y revisar los cambios antes de
adoptarlos. Los experimentos y comparaciones deben quedar documentados para
que las decisiones puedan verificarse más adelante.

Ningún cambio central se considera terminado si no puede explicarse conceptualmente.

---


# 1.1 Modelo de investigación de seguridad

SONAR debe permitir pensar como atacante y defensor sin confundir la investigación con el despliegue sobre terceros.

Escenarios válidos del proyecto:

```text
dispositivos propios
laboratorios
CTF
air-gap simulado
máquinas virtuales o físicas autorizadas
evaluación defensiva
```

El valor técnico está en comprender:

```text
cómo puede existir el canal
qué datos puede transportar
qué condiciones necesita
cómo se detecta
cómo se interrumpe
qué huellas deja
qué límites físicos tiene
```

Esta separación protege la utilidad científica del proyecto y evita que el roadmap derive hacia un "malware por ultrasonido" como producto.

---

# 2. Líneas de evolución

SONAR tiene cuatro líneas posibles.

No todas se desarrollarán al mismo tiempo.

## Línea A — Acoustic Modem

Convertir SONAR en un canal acústico fiable y medible.

Incluye:

```text
mensajes
bytes
paquetes
archivos pequeños
integridad
retransmisión
calibración
```

**Esta es la línea principal actual.**

---

## Línea B — Air-gap / covert-channel research

Utilizar el módem como laboratorio de seguridad:

```text
máquina aislada
↓
audio
↓
receptor externo
```

Investigar:

- capacidad;
- alcance;
- detectabilidad;
- mitigaciones;
- límites reales;
- escenarios defensivos.

**Prioridad futura alta una vez que el módem sea estable.**

---

## Línea C — Acoustic attack / defense research

Investigar de forma controlada fenómenos como:

```text
comandos acústicos
frecuencias poco perceptibles
asistentes de voz
detección de señales anómalas
```

Inspiración histórica:

```text
SurfingAttack
```

Objetivo futuro posible:

```text
ATAQUE experimental
          ↓
medición
          ↓
DETECCIÓN
          ↓
mitigación
```

No se implementa antes de estabilizar las bases.

---

## Línea D — Spatial acoustic sensing bajo restricción software-only

La idea original de mapeo no se elimina del proyecto, pero tampoco justifica romper la filosofía de SONAR.

La pregunta futura será:

> **¿Cuánta información espacial puede extraerse utilizando únicamente el hardware acústico que ya trae un dispositivo común y software?**

Temas que podrían estudiarse sin asumir hardware adicional:

```text
echo / reverberación
time-of-flight cuando la plataforma lo permita
movimiento del propio dispositivo
cambios relativos de fase/amplitud
respuesta del entorno
sensor fusion con hardware ya presente en el dispositivo
```

Si una capacidad exige inevitablemente varios micrófonos externos, arrays dedicados u otro hardware añadido, se documentará como **límite físico de la restricción software-only**, no como motivo para cambiar las reglas del proyecto.

No es parte de SONAR V2 inmediata.

Debe conservarse como **North Star histórico**, no como promesa actual.

---

## 2.1 — Investigación científica para la feria (trabajo paralelo)

La investigación del equipo puede avanzar mientras se caracteriza el módem.
No necesita esperar a que SONAR sea un producto terminado, pero tampoco debe
presentar las pruebas digitales como resultados físicos.

Orden de trabajo propuesto, sujeto a acuerdo con el coordinador:

1. Delimitar una pregunta científica comprobable y el alcance de la feria.
2. Revisar literatura pertinente y registrar las fuentes, sin fijar de antemano
   una cantidad de artículos como criterio de calidad.
3. Definir hipótesis, variables, controles, dispositivos y métricas antes de
   recolectar datos.
4. Ejecutar y guardar experimentos reproducibles, primero digitales y luego
   físicos cuando exista un protocolo seguro y viable.
5. Analizar los resultados, incluyendo fallos y límites, y redactar conclusiones
   que no excedan la evidencia.

El material de exposición se prepara fuera del repositorio. La pregunta
científica sigue siendo provisional; la elección final corresponde al dueño del
proyecto junto con el coordinador y el grupo.

---

# 3. Definición de éxito

Antes de hablar de tecnologías debemos definir qué significa:

```text
"SONAR funciona"
```

## Nivel 1 — Signal

El sistema identifica correctamente símbolos físicos.

Métricas:

```text
SER
SNR
confidence
frequency offset
```

---

## Nivel 2 — Packet

Puede transmitir paquetes digitales completos.

Métricas:

```text
PER
CRC failures
latency
retries
```

---

## Nivel 3 — Data

Puede transmitir contenido arbitrario.

Métricas:

```text
BER
effective bitrate
goodput
integrity
```

---

## Nivel 4 — Hardware

Funciona en más de un par específico de dispositivos.

Matriz:

```text
TX × RX × browser × sample rate
```

---

## Nivel 5 — Security research

El canal puede utilizarse para estudiar escenarios concretos:

```text
air-gap
detectability
defense
covert communication
```

---

# 4. Dependencias fundamentales

El roadmap no es una lista arbitraria.

Existen dependencias.

```text
AUDITORÍA
   ↓
ARQUITECTURA ACTUAL
   ↓
BASELINE
   ↓
TESTS
   ↓
V1 CLEAN
   ↓
CARACTERIZACIÓN
   ↓
TIMING
   ↓
DSP
   ↓
SYNC
   ↓
MODULACIÓN
   ↓
PACKETS
   ↓
RELIABILITY
   ↓
CALIBRATION
   ↓
BENCHMARK
   ↓
SECURITY RESEARCH
```

Ejemplos:

```text
No elegir Goertzel
sin poder comparar SER.

No elegir 4-FSK
sin medir 38-FSK actual.

No implementar ACK
sin framing fiable.

No limpiar legacy
sin tests que protejan comportamiento.

No afirmar alcance
sin benchmark reproducible.
```

---

# 5. MILESTONE 0 — Fundación del proyecto

## Objetivo

Poder retomar SONAR en cualquier momento sin depender de conversaciones o
explicaciones que no hayan quedado registradas.

## Entregables

```text
docs/AUDITORIA.md
docs/ARQUITECTURA.md
docs/ROADMAP.md
PROGRESO.md
GitHub Project
```

## Estado

```text
AUDITORIA       ✅ documento local creado
ARQUITECTURA    ✅ documento local creado; descripción histórica de V1
ROADMAP         ✅ creado; estado actualizado aquí
PROGRESO        ✅ creado y actualizado hasta 2026-09-17
PROJECT         ◻️ constaba como creado en el plan inicial; estado externo no verificado aquí
```

La fundación documental local está cumplida. Publicar la versión actual del
repositorio y comprobar el estado del GitHub Project son tareas separadas.

## Aprendizaje

- diferencia entre documentación histórica, arquitectura, roadmap y progreso;
- baseline;
- trazabilidad;
- GitHub Flow.

## Condición de cierre

El repositorio contiene estos documentos y el dueño sabe para qué sirve cada uno.

---

# 6. MILESTONE 1 — Baseline reproducible

## Estado revisado el 2026-09-17

| Tarea | Estado | Evidencia actual |
|---|---|---|
| M1-001 | Parcial | SER implementada para mensajes; BER, PER, bitrate, goodput, latencia y SNR pendientes |
| M1-002 | Parcial | entorno de ejecución digital registrado; entorno físico pendiente |
| M1-003 | Completa para baseline lógico | mensajes, bits, CRC8, CRC16, cabecera y bloques medidos; cinco incompatibilidades V1 preservadas |
| M1-004 | Completa para mensajes | tonos y secuencias sintéticas deterministas |
| M1-005 | Versión mínima | identidad, ganancia y ruido uniforme con semilla |

Evidencia principal:

```text
docs/experiments/E001-baseline-mensajes/
```

Milestone 1 continúa abierto en su **alcance original** hasta incorporar las
métricas pendientes y un registro adecuado de pruebas físicas. Esto no impidió
cerrar M2 en su alcance lógico: son criterios de cierre diferentes. E001 y E002
son evidencia digital/histórica, no una tasa de éxito acústico entre dispositivos.

## Objetivo

Transformar:

```text
"funciona más o menos"
```

en:

```text
"este sistema tiene estos resultados"
```

## Tareas principales

### M1-001 — Definir métricas

Implementar/definir:

```text
BER
SER
PER
bitrate
goodput
latency
SNR
```

### M1-002 — Registrar entorno

Toda prueba debe poder guardar:

```text
device TX
device RX
browser
OS
sample rate
distancia
volumen
configuración
fecha
```

### M1-003 — Vectores de protocolo

Crear tests deterministas para:

```text
char mapping
frequency mapping
CRC8
CRC16
header serialization
bit packing
```

### M1-004 — Señales sintéticas

Generar señales conocidas sin hardware real.

### M1-005 — Canal simulado mínimo

Introducir:

```text
atenuación
ruido
```

Primera versión simple.

## Condición de cierre

Podemos ejecutar una prueba y obtener un resultado cuantitativo reproducible.

## Aprendizaje

- BER/SER/PER;
- unidad de prueba;
- baseline;
- reproducibilidad;
- diferencia entre error físico y error lógico.

---

# 7. MILESTONE 2 — SONAR V1 Clean

## Objetivo

Tener una versión del diseño actual que no contenga bugs lógicos conocidos que invaliden la comparación futura.

**No cambia todavía la arquitectura fundamental del módem.**

**Estado del milestone:** completado el 2026-09-08 en su alcance lógico. Los
defectos de reloj de bits, preámbulo y regiones de decisión no recibieron parches
sin evidencia; pasan a caracterización y rediseño como indica la nota crítica.

## Grupo A — Mensajes

### M2-MSG-001

Eliminar transmisión doble por Enter.

**Estado:** completado el 2026-09-08. `setupEmisorUI()` es el único propietario
de los eventos de Enter y del botón. Una prueba comprueba que un segundo intento
mientras existe una emisión en curso no inicia otra transmisión.

Referencia:

```text
AUDITORIA MSG-001
```

### M2-MSG-002

Unificar el camino TX.

**Estado:** completado el 2026-09-08. Enter y el botón utilizan la misma función,
los mismos parámetros de emisión, el mismo bloqueo de auto-eco y el mismo
registro del mensaje enviado.

Referencia:

```text
MSG-002
```

### M2-MSG-003

Simplificar estados END/redundantes con tests.

**Estado:** completado el 2026-09-08. El núcleo separado conserva únicamente
`IDLE`, `SYNC` y `DATA`; END produce el evento final y reinicia directamente el
receptor. Las transiciones y el reinicio están cubiertos por pruebas.

### M2-MSG-004

Errores explícitos para caracteres no soportados.

**Estado:** completado el 2026-09-08. La entrada se normaliza a mayúsculas, pero
ya no se eliminan ni convierten silenciosamente símbolos desconocidos.

---

## Grupo B — Archivos

### M2-FILE-001

Unificar CRC16.

**Estado:** completado el 2026-09-08. El emisor crea la cabecera mediante
`crearCabeceraArchivo()` y el receptor la interpreta mediante
`decodificarCabeceraArchivo()`. Ambos calculan CRC16 sobre los mismos 20 bytes.

### M2-FILE-002

Unificar CRC8.

**Estado:** completado el 2026-09-08. Emisor y receptor utilizan el CRC8
polinomial compartido; se eliminó el XOR acumulado de la ruta activa.

### M2-FILE-003

Definir correctamente bloque final.

**Estado:** completado el 2026-09-08. Todos los bloques transportan 8 bytes más
CRC8. El último se rellena con ceros para validar el mismo formato y el receptor
conserva únicamente los bytes útiles indicados por el tamaño total.

### M2-FILE-004

Eliminar instancias duplicadas de receptor.

**Estado:** completado el 2026-09-08. `app_archivos.js` crea la única instancia
de `ReceptorArchivos`; la plantilla ya no contiene lógica ni una segunda
instancia inline.

### M2-FILE-005

Unificar estado de drag/drop y selección de archivo.

**Estado:** completado el 2026-09-08. Botón, input y drag/drop llaman a
`seleccionarArchivo()` y actualizan la misma referencia utilizada al transmitir.

### M2-FILE-006

Implementar o retirar cancelación falsa.

**Estado:** completado el 2026-09-08 mediante retirada. Se eliminaron
`cancelando`, `detenerTransmision` y la opción que siempre devolvía `false`. No
existía un control real de cancelación que conservar.

### M2-FILE-007

Unificar codificación del nombre de archivo.

**Estado:** completado el 2026-09-08. El nombre se codifica en UTF-8 con un
máximo de 16 bytes y nunca se corta en medio de un carácter multibyte.

### M2-FILE-008

Corregir cálculo de progreso.

**Estado:** completado el 2026-09-08. El denominador y el contador incluyen
preámbulo, SOI, cabeceras repetidas, bloques rellenados y END. Una prueba del
emisor completo confirma que el último símbolo produce exactamente 100 %.

## Nota crítica

Los fallos de reloj de bits y preámbulo actual pueden requerir más que un parche.

Si arreglarlos implica rediseñar el módem, se trasladan a milestones posteriores en lugar de forzar una solución artificial.

## Condición de cierre

La lógica puramente determinista pasa tests.

**Cumplida el 2026-09-08:** 64 pruebas aprobadas y 0 fallidas. Esto no sustituye
las futuras pruebas acústicas.

## Aprendizaje

- CRC;
- serialización;
- ownership de estado;
- framing;
- regresiones.

---

# 8. MILESTONE 3 — Caracterización de V1

## Objetivo

Medir el diseño actual **antes de reemplazarlo**.

La primera medición debe registrar la versión y los parámetros realmente
ejecutados. El comportamiento actual de `frequencyToChar()` —elige el primer
carácter dentro de ±80 Hz y no necesariamente el más cercano— es parte del
baseline que se debe **medir**, no corregir silenciosamente antes del barrido.
Después se podrá comparar, con los mismos vectores, una decisión por frecuencia
más cercana. El barrido digital no demuestra rendimiento por aire.

El riesgo de inserción HTML descrito en M13 se corrigió el 2026-09-19. Antes de
pruebas con archivos enviados por terceros, verificar además la interfaz en un
navegador real; la prueba automatizada cubre la construcción segura de los nodos.

## Experimentos

### E3-001 — Decision regions

Barrido alrededor de cada tono.

Salida:

```text
frecuencia real
→ símbolo detectado
```

Construir matriz de confusión.

### E3-002 — Tolerancia

Comparar:

```text
±80 Hz
±60 Hz
±40 Hz
nearest-frequency
```

sin adoptar todavía una configuración definitiva.

### E3-003 — Duración de símbolo

Comparar varias duraciones.

### E3-004 — FFT size

Comparar resolución/latencia.

### E3-005 — Noise threshold

Medir threshold fijo vs noise floor.

### E3-006 — Sample rate

Medir 44.1 vs 48 kHz cuando hardware lo permita.

### E3-007 — Forma de onda

Comparar:

```text
sine
square
otras si aportan
```

con energía comparable.

## Condición de cierre

Existe un informe baseline de V1.

## Aprendizaje

- FFT;
- bins;
- Nyquist;
- spectral leakage;
- SNR;
- regiones de decisión;
- tradeoff tiempo/frecuencia.

---

# 9. MILESTONE 4 — Timing correcto de TX

## Problema

Actualmente:

```text
setTimeout
```

gobierna el encadenamiento de tonos.

## Objetivo

Hacer que el reloj de audio determine los tiempos.

## Tareas

### M4-001

Entender:

```text
AudioContext.currentTime
```

### M4-002

Crear una secuencia programada de símbolos.

### M4-003

Medir jitter real.

### M4-004

Comparar contra TX antiguo.

## Condición de cierre

Los tiempos de inicio/fin no dependen del event loop normal de JavaScript.

## Aprendizaje

- sample clock;
- scheduling;
- jitter;
- tiempo absoluto vs timers.

---

# 10. MILESTONE 5 — Timing correcto de RX

## Problema

Actualmente:

```text
requestAnimationFrame
```

participa en la decodificación temporal.

## Objetivo

Separar:

```text
UI rendering
```

de:

```text
audio processing
```

## Candidatos

```text
AudioWorklet
procesamiento por bloques de audio
otra estrategia Web Audio medible
```

No se impone implementación hasta prototipo.

## Experimentos

Comparar comportamiento con:

```text
60 Hz display
120 Hz display
tab background
CPU load
```

## Condición de cierre

La decodificación no cambia materialmente por frecuencia de pantalla.

## Aprendizaje

- audio thread;
- render thread;
- buffers;
- real-time constraints.

---

# 11. MILESTONE 6 — Detector DSP

## Objetivo

Elegir el detector mediante evidencia.

## Candidatos

### D6-A — FFT actual mejorada

Posibles mejoras:

```text
windowing
peak interpolation
candidate scoring
noise floor
```

### D6-B — Goertzel

Medir energía solo en tonos candidatos.

### D6-C — Otros

Solo si los resultados justifican exploración.

## Métricas

```text
SER
CPU
latency
robustness
noise tolerance
```

## Condición de cierre

La elección del detector está respaldada por benchmark.

## Aprendizaje

- FFT;
- Goertzel;
- filtros;
- energía;
- confidence;
- signal detection.

---

# 12. MILESTONE 7 — Sincronización

## Objetivo

Responder con precisión:

```text
¿dónde empieza una transmisión?
¿dónde empieza un símbolo?
```

## Componentes posibles

```text
PREAMBLE
SYNC WORD
symbol period
correlation
timing recovery
```

## No hacer

```text
"vi la frecuencia 3 veces"
```

como única definición temporal.

## Experimentos

- pérdida del primer símbolo;
- arranque a mitad de transmisión;
- ruido previo;
- eco;
- frecuencia offset.

## Condición de cierre

El receptor adquiere una transmisión de manera reproducible y conoce fronteras de símbolos.

## Aprendizaje

- preamble;
- correlation;
- symbol clock;
- synchronization.

---

# 13. MILESTONE 8 — Elegir modulación

## Objetivo

Determinar cuántos símbolos físicos conviene utilizar.

## Candidatos mínimos

```text
2-FSK
4-FSK
8-FSK
38-FSK actual
```

## Evaluar

```text
SER
bitrate
bandwidth
device compatibility
distance
frequency selectivity
```

## Regla

No elegir un esquema porque “suena profesional”.

Elegir por resultados.

## Aprendizaje

- bit;
- symbol;
- baud;
- bitrate;
- M-FSK;
- bandwidth;
- coding efficiency.

---

# 14. MILESTONE 9 — Protocolo binario unificado

## Objetivo

Desacoplar contenido y señal.

En lugar de:

```text
"A" = una frecuencia
```

usar:

```text
"A"
↓
UTF-8
↓
bytes
↓
packet
↓
symbols
```

## Formato candidato

```text
PREAMBLE
SYNC
VERSION
TYPE
SEQUENCE
LENGTH
PAYLOAD
CRC
```

## Tipos iniciales

```text
TEXT
FILE_META
FILE_CHUNK
CONTROL
```

No añadir más hasta necesitarlos.

## Beneficio

Mensajes y archivos compartirían:

```text
módem
framing
CRC
timing
reliability
```

## Condición de cierre

El transporte puede mover un `Uint8Array` arbitrario.

## Aprendizaje

- layering;
- packets;
- serialization;
- endianness;
- UTF-8.

---

# 15. MILESTONE 10 — Fiabilidad

## Orden

### R10-001 — CRC

Detectar corrupción.

### R10-002 — Sequence number

Detectar duplicados/orden.

### R10-003 — Timeout

Detectar ausencia de respuesta.

### R10-004 — ACK

Confirmar recepción.

### R10-005 — Retransmission

Reenviar cuando sea necesario.

### R10-006 — NACK

Solo si aporta frente a timeout.

### R10-007 — FEC

Evaluar únicamente mediante métricas.

## Condición de cierre

Una pequeña cantidad de errores de canal no convierte inmediatamente una transmisión en fracaso total.

## Aprendizaje

- ARQ;
- reliability;
- CRC vs FEC;
- overhead;
- latency.

---

# 16. MILESTONE 11 — Calibración adaptativa

## Objetivo

No asumir que todos los altavoces/micrófonos son iguales.

## Posible proceso

```text
START CALIBRATION
       ↓
tone sweep / candidate tones
       ↓
RX measures
       ↓
noise floor
usable band
frequency offset
relative response
       ↓
profile
```

## Salida posible

```text
sample rate: 48000
usable band: 18.1–19.4 kHz
noise floor: ...
preferred tones: ...
```

## Condición de cierre

SONAR puede seleccionar parámetros compatibles con el dispositivo o advertir que no existe una banda adecuada.

## Aprendizaje

- frequency response;
- calibration;
- channel estimation;
- adaptive systems.

---

# 17. MILESTONE 12 — Benchmark físico

## Objetivo

Crear evidencia real del canal.

## Matriz

### Dispositivos

```text
Laptop A
Laptop B
Phone A
Phone B
...
```

### Distancia

```text
10 cm
25 cm
50 cm
1 m
2 m
3 m
```

### Ambiente

```text
quiet
conversation
music
street/ambient noise
```

### Dirección

```text
A → B
B → A
```

## Datos

```text
BER
SER
PER
bitrate
goodput
SNR
sample rate
retries
```

## Condición de cierre

README puede publicar resultados reales con metodología reproducible.

---

# 18. MILESTONE 13 — Limpieza y deuda técnica

Solo después de tests suficientes.

## Tareas

```text
legacy JS
templates muertos
variables sin uso
logs excesivos
ownership duplicado
nombres
estructura de carpetas
```

## Observaciones externas contrastadas el 2026-09-17

Son puntos para planificar, no cambios aprobados ni ejecutados en esta fecha.
La revisión fue de código; no reemplaza la auditoría acústica ni sus mediciones.

| Observación | Comprobación local | Prioridad y momento propuestos |
|---|---|---|
| Nombre recibido en `app_archivos.js` interpolado en `innerHTML` del enlace y del registro | Confirmado en la revisión del 2026-09-17; corregido el 2026-09-19 mediante nodos DOM y texto literal | Dos pruebas de regresión aprobadas; queda pendiente la verificación manual en navegador. Era un riesgo de inyección HTML/XSS; no hay explotación práctica documentada aquí. |
| Bucle de micrófono y análisis espectral repetido en `app.js` y `app_archivos.js` | Confirmado: ambos capturan audio, calculan bins y buscan el pico por separado | Refactor posterior, con pruebas que protejan ambas rutas; no es condición previa para medir V1 tal como existe. |
| Rangos, duraciones y tolerancias repartidos entre protocolo, emisor, receptor y apps | Confirmado: hay valores distintos, algunos por fase o modo; no todos deben hacerse idénticos | Inventariar significado de cada valor y tener una fuente explícita por protocolo antes de rediseñar el mapa V2; preservar los valores de V1 en sus mediciones. |
| Log de frecuencias de archivos en `app_archivos.js` | Confirmado en la revisión: anunciaba START=18500, pero `PROTOCOLO_ARCHIVOS.START` vale 18700 | Corregido el 2026-09-19: el diagnóstico lee directamente las constantes; no modifica el protocolo. |
| Selección del primer carácter dentro de tolerancia en `frequencyToChar()` | Confirmado en código; puede elegir un tono menos cercano cuando se solapan ventanas | Medir en E3-001 y comparar luego una alternativa; no cambiar el baseline antes de registrarlo. |

La lógica pura de `core/receptor_mensajes_core.js`, `metricas_mensajes.js` y
`generador_onda.js` ofrece patrones útiles para nuevas separaciones entre
protocolo, navegador y pruebas. No implica reescribir de golpe el flujo de
archivos ni declarar que todo su comportamiento ya está validado.

## Git histórico

Evaluar limpieza de `venv` histórico.

No hacerlo mientras exista riesgo de romper colaboración o referencias.

## Condición de cierre

La arquitectura física del repo refleja la arquitectura conceptual.

---

# 19. MILESTONE 14 — Documentación pública

## README

Debe responder:

```text
qué es SONAR
por qué existe
cómo funciona
qué logra
qué NO logra
cómo probarlo
benchmarks
limitaciones
```

## Documentos técnicos

```text
PROTOCOL.md
BENCHMARKS.md
SECURITY.md
```

solo cuando exista contenido real suficiente.

## Evitar

```text
marketing técnico
afirmaciones no medidas
"robusto"
"seguro"
"3 metros"
```

sin datos.

---

# 20. MILESTONE 15 — Air-gap research

Una vez estable el módem.

## Objetivo

Evaluar SONAR como canal en escenarios controlados.

Preguntas:

```text
¿qué capacidad tiene?
¿qué hardware necesita?
¿qué tan detectable es?
¿qué distancia?
¿qué ruido lo rompe?
¿qué filtros lo bloquean?
```

## Entregables

```text
scenario
measurements
pcap/log equivalent where applicable
acoustic captures
defensive recommendations
```

## Línea defensiva

Diseñar también:

```text
detector
alert
mitigation
```

para que SONAR sea útil en ambos lados de la seguridad.

---

# 21. MILESTONE 16 — Acoustic command research

Línea experimental futura.

Inspiración:

```text
SurfingAttack
asistentes de voz
ultrasonic / near-ultrasonic injection
```

## Restricción

Solo en:

```text
dispositivos propios
laboratorio
entorno controlado
```

## Objetivos posibles

```text
reproducibilidad
detección
frecuencias efectivas
defensas
```

No pertenece al core del módem.

---

# 22. MILESTONE 17 — Spatial SONAR (software-only)

La idea original puede reabrirse cuando exista:

```text
tiempo
conocimiento DSP suficiente
capacidad de medición reproducible
```

La restricción permanece:

```text
NO hardware acústico externo añadido
NO arrays construidos para SONAR
NO micrófonos extra como requisito
```

## Preguntas a estudiar

```text
¿puede estimarse distancia mediante eco con APIs/hardware comunes?
¿qué resolución temporal real expone el navegador/SO?
¿puede aprovecharse el movimiento del dispositivo?
¿qué información espacial puede inferirse de cambios relativos?
¿qué sensores ya presentes podrían complementar la estimación sin añadir hardware?
```

## Primera meta realista

No saltar directamente a:

```text
mapa 3D completo
```

Empezar por:

```text
detectar evidencia de una reflexión
↓
estimar si puede medirse distancia de forma repetible
↓
estudiar información espacial relativa
↓
evaluar reconstrucción 2D
↓
solo entonces reconsiderar 3D
```

Si la física o las APIs hacen inviable una etapa bajo la restricción software-only, ese resultado también es conocimiento útil y debe documentarse.

Esta línea conserva la visión original sin convertir SONAR en un proyecto de hardware.

---

# 23. Orden de creación de Issues

No crear todos los issues del roadmap el primer día.

El Project se volvería ruido.

## Inicio histórico

```text
Milestone 0
Milestone 1
primeros bugs P0 de V1 Clean
```

Esas tareas ya se abordaron en el código local. Desde el estado actual, crear
solo issues próximos y verificables: E3-001, verificación de la interfaz de
archivos en navegador y, si se decide publicar el repositorio, decisión sobre
historial/licencia. Cuando se acerque otra fase, crear sus issues.

Regla:

```text
ROADMAP = todo el viaje
ISSUES  = trabajo próximo/accionable
PROJECT = estado visual del trabajo
```

---

# 24. GitHub Flow para SONAR

## main

Debe representar estado integrado.

No trabajar directamente salvo cambios triviales/urgentes que se decidan explícitamente.

## Rama por cambio

Ejemplos:

```text
docs/project-foundation
test/protocol-baseline
fix/double-transmission
fix/file-crc
feature/signal-simulator
refactor/audio-timing
feature/rx-audioworklet
experiment/goertzel-detector
```

## Flujo

```text
Issue
 ↓
branch
 ↓
commits
 ↓
tests
 ↓
PROGRESO.md
 ↓
Pull Request
 ↓
review
 ↓
merge
 ↓
Done
```

Aunque exista una sola persona.

El PR funciona como checkpoint técnico y memoria de la decisión.

---

# 25. Uso del GitHub Project

## Status

```text
BACKLOG
READY
IN PROGRESS
IN REVIEW
BLOCKED
DONE
```

## Priority

```text
P0 Critical
P1 High
P2 Medium
P3 Low
```

## Type

Usar según el trabajo:

```text
Bug
DSP
Audio
Timing
Protocol
Experiment
Research
Refactor
Docs
Feature
```

## Area

```text
TX
RX
Audio
Messages
Files
Protocol
Tests
UI
Repo
Architecture
```

## Phase

Usar la fase equivalente del roadmap.

---

# 26. Definition of Ready

Un issue no pasa a `READY` hasta tener:

```text
problema entendido
alcance limitado
criterio de éxito
dependencias satisfechas
test posible
```

Ejemplo malo:

```text
"Mejorar audio"
```

Ejemplo bueno:

```text
"Eliminar doble emisión al pulsar Enter"

Esperado:
una acción del usuario → una única transmisión.
```

---

# 27. Definition of Done

Un issue no es `DONE` solamente porque el código compile.

Debe cumplir cuando aplique:

```text
[ ] comportamiento implementado
[ ] tests
[ ] comparación/baseline
[ ] diff revisado
[ ] dueño entiende el cambio
[ ] documentación actualizada
[ ] PROGRESO.md actualizado
[ ] PR integrado
```

---

# 28. Formato de PROGRESO.md

Cada sesión relevante:

```text
## YYYY-MM-DD — título

### Objetivo

### Problema / observación

### Concepto aprendido

### Hipótesis

### Cambios

### Archivos

### Pruebas

### Resultados

### Decisiones y motivo

### Pendiente

### Próximo paso
```

No es necesario llenar todos los apartados cuando no correspondan.

---

# 29. Registro histórico — ventana de trabajo intensivo 24–26 agosto 2026

Esta sección conserva la planificación de aquellas fechas; las casillas que
siguen son una instantánea antigua y **no** describen el estado de septiembre.
Consultar la tabla inicial y las secciones M0–M3 para el estado actual.

El objetivo de estos días **NO es terminar SONAR V2**.

Sería contraproducente.

Debemos aprovechar el periodo de trabajo intensivo para dejar tareas de alto razonamiento resueltas y el proyecto autosuficiente.

## Prioridad A

```text
✅ auditoría
✅ arquitectura actual
✅ roadmap
⬜ progreso
⬜ integrar documentación al repo
```

## Prioridad B

```text
crear issues iniciales
crear primer PR de documentación
definir baseline/tests
```

## Prioridad C

Si existe tiempo:

```text
crear scaffolding de tests
capturar V1 baseline
corregir primeros bugs P0 puramente lógicos
```

## No intentar apresuradamente

```text
Goertzel
4-FSK
AudioWorklet completo
protocolo V2 completo
FEC
calibración
```

Es mejor dejar una especificación buena que diez implementaciones incomprendidas.

---

# 30. Orden próximo desde el estado del 2026-09-17

## A — Compartir el repositorio sin perder contexto

- Revisar los cambios locales de `README.md`, `.gitignore`, `PROGRESO.md` y este
  roadmap antes de confirmarlos; no se ha hecho `commit` ni `push` en esta
  actualización.
- Revisar el historial que aún contiene un `venv` antiguo y decidir si limpiar
  ese historial con un plan explícito. `.gitignore` no lo elimina retroactivamente.
- Elegir una licencia si se desea autorizar reutilización y contribuciones.
- Antes de abrirlo a terceros, revisar contenido sensible e instrucciones de
  ejecución. Publicar el repositorio no equivale a alojar una demo web.

## B — Siguiente experimento técnico

- Especificar E3-001: frecuencias emitidas, paso del barrido, detector usado,
  versión de V1 Clean, resultado esperado y formato de la matriz de confusión.
- Ejecutar primero el barrido sintético con el receptor actual sin cambiar su
  regla de decisión; documentar errores y zonas ambiguas.
- Comparar después alternativas de decisión con exactamente los mismos vectores
  y métricas. Solo adoptar cambios con evidencia.
- Verificar en navegador la descarga y el historial de archivos tras la
  corrección de inserción HTML; no se necesita reestructurar todo el módem.

## C — Trabajo con el equipo de investigación

- Preparar una explicación del prototipo, V1 Clean, evidencia y límites sin
  guardar las diapositivas personales dentro del repositorio.
- Acordar con el coordinador la pregunta científica y un protocolo de medición.
- Repartir tareas concretas según disponibilidad, manteniendo trazabilidad en
  `PROGRESO.md` y en las configuraciones/resultados de los experimentos.

Estos frentes pueden avanzar en paralelo. Ninguno autoriza afirmar fiabilidad
física antes de medirla.

---

# 31. Roadmap visual resumido

```text
                  SONAR
                    │
                    ▼
        ┌────────────────────┐
        │ 0. FOUNDATION      │
        │ docs + project     │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 1. BASELINE        │
        │ metrics + tests    │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 2. V1 CLEAN        │
        │ proven bugs        │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 3. CHARACTERIZE    │
        │ measure old modem  │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 4-5. TIMING        │
        │ TX + RX clocks     │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 6. DSP             │
        │ detector           │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 7. SYNC            │
        │ timing recovery    │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 8. MODULATION      │
        │ measured choice    │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 9. PACKETS         │
        │ unified transport  │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 10. RELIABILITY    │
        │ ARQ/FEC if useful  │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 11. CALIBRATION    │
        │ adapt to devices   │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 12. BENCHMARK      │
        │ real hardware      │
        └─────────┬──────────┘
                  ▼
        ┌────────────────────┐
        │ 13-14. MATURITY    │
        │ cleanup + docs     │
        └─────────┬──────────┘
                  │
          ┌───────┼───────────┐
          ▼       ▼           ▼
       AIR-GAP  ATTACKS   SPATIAL SONAR
       RESEARCH DEFENSE      RESEARCH
```

---

# 32. Decisiones que deben mantenerse abiertas

Todavía NO decidir:

```text
qué M-FSK final
qué detector final
frecuencia exacta final
symbol duration final
FEC sí/no
full duplex sí/no
framework frontend
hardware extra
```

Cualquier decisión de estas necesita:

```text
problema
alternativas
medición
tradeoff
decisión
```

---

# 33. North Star

SONAR no necesita ser el canal acústico más rápido del mundo ni competir con Wi‑Fi, Bluetooth o aplicaciones de mensajería.

Una dirección más coherente es:

> **Construir una plataforma de investigación de ciberseguridad, completamente software-only, entendible, medible y adaptable, que demuestre hasta dónde pueden reutilizarse de forma no convencional los subsistemas acústicos de hardware de consumo.**

El principio conceptual detrás del proyecto es que una tecnología diseñada para un uso inocuo puede adquirir propiedades de seguridad inesperadas cuando se la observa desde otro modelo de amenaza.

Por eso SONAR debe permitir estudiar, en entornos propios y controlados:

```text
air-gap communication
covert/acoustic channels
data transfer as proof of channel capacity
detectability
monitoring
mitigation
acoustic command research
spatial acoustic sensing under software-only constraints
```

La mensajería y la transferencia de archivos son demostraciones del canal; **no son el límite conceptual del proyecto**.

El objetivo es conservar siempre:

```text
seguridad
discreción como propiedad investigable
software-only
hardware cotidiano
experimentación medible
identidad cyberpunk/hacking
```

sin convertir el proyecto en malware operativo ni perder su carácter de investigación.

---

# 34. Próximo paso

Iniciar **E3-001 — barrido sintético y matriz de confusión de V1 Clean** como
siguiente trabajo técnico. En paralelo, decidir la visibilidad del repositorio
y definir con el coordinador la pregunta de investigación. Verificar en navegador
la interfaz de archivos antes de pruebas con archivos de terceros.

No comenzar por cambiar la modulación, sustituir el detector ni reestructurar
todo `archivos`: primero registrar qué hace V1 Clean y distinguir los riesgos
de seguridad de las limitaciones acústicas.
