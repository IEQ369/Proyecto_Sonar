# ROADMAP DE SONAR

> **Estado:** plan maestro de evolución posterior a la auditoría inicial.  
> **Baseline:** `bf3f14c`  
> **Tag:** `pre-sonar-v2-2026-08-24`  
> **Fecha de inicio del roadmap:** 2026-08-24  
> **Regla principal:** SONAR debe evolucionar sin perder su identidad, sin reescrituras impulsivas y sin introducir complejidad que no pueda justificarse con pruebas.

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

## P-005 — La IA acelera, no sustituye la comprensión

Regla Tony + JARVIS:

```text
IA/Hermes:
    busca
    calcula
    ejecuta tests
    implementa trabajo pesado
    compara
    automatiza

Dueño del proyecto:
    entiende
    decide
    cuestiona
    revisa
    interpreta
```

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

Poder retomar SONAR en cualquier momento sin depender de memoria humana ni conversación previa con una IA.

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
AUDITORIA      ✅ preparado
ARQUITECTURA   ✅ preparado
ROADMAP        ✅ este documento
PROGRESO       ⬜ crear
PROJECT        ✅ estructura creada
```

## Aprendizaje

- diferencia entre documentación histórica, arquitectura, roadmap y progreso;
- baseline;
- trazabilidad;
- GitHub Flow.

## Condición de cierre

El repositorio contiene estos documentos y el dueño sabe para qué sirve cada uno.

---

# 6. MILESTONE 1 — Baseline reproducible

## Estado al 2026-09-04

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

Milestone 1 continúa abierto hasta incorporar las métricas pendientes y un
registro adecuado de pruebas físicas.

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

### M2-FILE-008

Corregir cálculo de progreso.

## Nota crítica

Los fallos de reloj de bits y preámbulo actual pueden requerir más que un parche.

Si arreglarlos implica rediseñar el módem, se trasladan a milestones posteriores en lugar de forzar una solución artificial.

## Condición de cierre

La lógica puramente determinista pasa tests.

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

## Primero crear

```text
Milestone 0
Milestone 1
primeros bugs P0 de V1 Clean
```

Cuando se acerque una fase, crear sus issues.

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

# 29. Ventana de trabajo intensivo 24–26 agosto 2026

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

# 30. Orden inmediato desde el estado actual

## Paso 1

Crear:

```text
PROGRESO.md
```

## Paso 2

Crear rama:

```text
docs/project-foundation
```

## Paso 3

Agregar:

```text
docs/AUDITORIA.md
docs/ARQUITECTURA.md
docs/ROADMAP.md
PROGRESO.md
```

## Paso 4

Revisar contenido.

## Paso 5

Commit.

## Paso 6

Push.

## Paso 7

Pull Request a `main`.

## Paso 8

Crear en GitHub:

```text
Issue: Establish reproducible SONAR baseline
Issue: Add protocol unit tests
Issue: Fix duplicate message transmission
Issue: Fix file header CRC16
Issue: Fix file block CRC8
```

No más inicialmente.

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

Crear `PROGRESO.md`, integrar los cuatro documentos mediante GitHub Flow y abrir el primer Pull Request puramente documental.

Después:

```text
Milestone 1 — Baseline reproducible
```

será el primer trabajo técnico.
