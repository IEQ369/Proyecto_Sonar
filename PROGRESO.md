# PROGRESO — SONAR

> Bitácora técnica y de aprendizaje del proyecto.  
> Este archivo registra **qué se hizo, por qué se hizo, qué se aprendió y qué sigue**.  
> No reemplaza a `AUDITORIA.md`, `ARQUITECTURA.md` ni `ROADMAP.md`.

---

# Cómo usar este archivo

Cada sesión importante debe registrar, cuando corresponda:

```text
Fecha
Objetivo
Problema / observación
Concepto aprendido
Hipótesis
Cambios realizados
Archivos involucrados
Pruebas
Resultados
Decisiones y motivo
Pendientes
Próximo paso
```

No es obligatorio llenar todos los campos en cada entrada.

La prioridad es conservar **el razonamiento y la evidencia**, no solamente una lista de commits.

---

# 2026-08-24 — Retoma del proyecto y auditoría integral

## Objetivo

Retomar SONAR después de un periodo largo sin desarrollo y determinar:

- qué funciona realmente;
- qué partes están rotas;
- qué limita la precisión;
- qué decisiones históricas siguen teniendo sentido;
- qué deuda técnica existe;
- qué debe conservarse;
- cómo evolucionar el proyecto sin perder su identidad.

---

## Estado inicial

Baseline del repositorio:

```text
commit:
bf3f14c — Add BadBIOS link to HISTORIA_TECNICA.md
```

Rama principal:

```text
main
```

Estado Git:

```text
main == origin/main
working tree limpio
```

Tag creado para preservar el estado anterior a esta revisión:

```text
pre-sonar-v2-2026-08-24
```

Se conserva además una copia ZIP del proyecto obtenida desde el servidor.

---

## Decisión de flujo Git

Inicialmente se creó una rama:

```text
dev/sonar-v2
```

pero se descartó esa estrategia.

### Motivo

El proyecto utilizará **GitHub Flow**.

Modelo acordado:

```text
main
 │
 ├── branch pequeña por cambio
 │
 ├── commits
 │
 ├── tests
 │
 ├── Pull Request
 │
 └── merge a main
```

No se mantendrá una rama `dev` permanente.

---

## Identidad del proyecto recuperada

Durante esta sesión se reconstruyó también la motivación original de SONAR.

SONAR nació como un proyecto de **ciberseguridad**, inspirado inicialmente por la idea de utilizar ultrasonido para interactuar con sistemas aislados y extraer capacidades inesperadas del hardware cotidiano.

La primera idea explorada fue un sistema de sensado/mapeo espacial mediante sonido.

Cuando esa dirección demostró tener limitaciones importantes bajo la restricción de hardware disponible, el proyecto pivotó hacia:

```text
canales acústicos
+
air-gap
+
comunicación alternativa
+
exfiltración experimental
+
seguridad informática
```

Referencias conceptuales históricas incluyen:

```text
BadBIOS
SurfingAttack
canales acústicos / air-gap
investigaciones de exfiltración por sonido
```

---

## Restricción fundamental recuperada

SONAR es **software-only**.

Esto significa:

```text
usar hardware que el dispositivo ya posee
```

y no:

```text
añadir micrófonos externos
arrays dedicados
sensores construidos específicamente
hardware adicional para salvar limitaciones
```

Si una idea no puede realizarse bajo esta restricción, se documentará como límite físico/técnico.

No se cambiará la filosofía del proyecto solamente para conseguir una feature.

---

## Filosofía técnica

La pregunta central del proyecto queda expresada como:

> ¿Qué capacidad no obvia puede extraerse mediante software de componentes comunes como altavoz y micrófono, y qué implicaciones de seguridad aparecen cuando esa capacidad se utiliza como canal?

La mensajería y transferencia de archivos son **demostraciones del canal**, no la identidad completa de SONAR.

---

## Identidad visual

El diseño actual se considera parte de la identidad del proyecto.

Decisión:

```text
NO rediseñar la UI por defecto
NO reemplazar el estilo
NO introducir componentes visuales genéricos
```

Se permiten:

```text
mejoras funcionales
accesibilidad
nuevos estados
diagnóstico
controles necesarios
```

siempre preservando la estética actual.

La dirección visual queda bajo decisión del dueño del proyecto.

---

# Auditoría técnica inicial

Se revisó el proyecto completo y se creó:

```text
docs/AUDITORIA.md
```

La auditoría clasifica hallazgos por:

```text
DSP
Audio
Timing
Mensajes
Archivos
Arquitectura
Código
Testing
Documentación
Git
Ideas V2
```

---

## Principales problemas confirmados

### Señal / DSP

- ventanas de decisión de caracteres separadas 100 Hz usan tolerancia ±80 Hz;
- existen regiones de decisión superpuestas;
- `detectarConflictos()` no modela correctamente esa tolerancia;
- símbolos de control se encuentran demasiado próximos a datos;
- frecuencias de 22.1–22.3 kHz exceden Nyquist en 44.1 kHz;
- fade de 35 ms + 35 ms puede superar un símbolo de 60 ms;
- compensación fija de amplitud depende del dispositivo;
- threshold absoluto no se adapta al noise floor;
- el detector usa principalmente el máximo de la FFT.

---

### Temporización

Se confirmó que dos relojes inapropiados gobiernan partes del módem:

```text
TX → setTimeout()
RX → requestAnimationFrame()
```

Esto puede introducir:

```text
jitter
dependencia de FPS
dependencia del event loop
comportamiento diferente entre dispositivos
```

---

### Mensajería

Se confirmó:

```text
dos listeners de Enter
```

que pueden iniciar dos transmisiones.

También existen dos caminos de transmisión con parámetros y manejo de estado diferentes.

---

### Archivos

Se encontraron fallos críticos:

```text
CRC16 TX/RX diferente
CRC8 TX/RX diferente
frames interpretados como bits
bloque final corto incompatible
START == DATA_0
SYNC == DATA_1
ACK == END
preámbulo puede contaminar SOI
ACK/NACK documentado pero no implementado
dos instancias de ReceptorArchivos
drag & drop con estado duplicado
cancelación declarada pero no funcional
```

Conclusión:

> La transferencia de archivos actual no debe considerarse fiable aunque la interfaz exista.

---

### Navegador / Audio

Se confirmó que:

```text
getUserMedia({ audio: true })
```

no intenta desactivar explícitamente:

```text
echoCancellation
noiseSuppression
autoGainControl
```

Estos mecanismos pueden interferir con señales de alta frecuencia.

TX y RX tampoco registran/garantizan de forma consistente el sample rate real.

---

### Testing

No existe todavía un baseline cuantitativo.

Faltan:

```text
BER
SER
PER
SNR
bitrate
goodput
latency
```

Tampoco existe un simulador reproducible del canal.

---

### Git

El código actual es relativamente pequeño, pero el historial Git contiene binarios históricos de un `venv`.

El `.git` ronda aproximadamente:

```text
156 MB
```

Se encontraron blobs antiguos grandes de:

```text
OpenBLAS
NumPy
SciPy
entornos Linux/Windows
```

Decisión:

> No limpiar el historial mientras se trabaja en el módem.

La limpieza Git se evaluará al final, de forma planificada.

---

# Arquitectura documentada

Se creó:

```text
docs/ARQUITECTURA.md
```

Este documento describe **SONAR actual**, no una V2 imaginaria.

Se documentaron:

```text
TX mensajes
RX mensajes
FFT
máquina de estados
generación de onda
timing
auto-eco
visualizador
TX archivos
RX archivos
cabeceras
CRC
framing
estado duplicado
dependencias físicas
```

---

## Distinción aprendida: protocolo vs módem

### Protocolo

Define:

```text
framing
campos
longitud
CRC
secuencia
ACK
```

### Módem

Convierte:

```text
información digital
↕
señal física
```

Actualmente SONAR mezcla parcialmente ambas capas.

Esta separación será importante en el futuro.

---

## Distinción aprendida: tres relojes

### Audio clock

```text
sample rate
AudioContext.currentTime
muestras
```

### JavaScript clock

```text
setTimeout
event loop
```

### Display clock

```text
requestAnimationFrame
60 / 90 / 120 Hz
```

La arquitectura actual utiliza relojes JS/display para funciones que idealmente deberían depender del reloj de audio.

---

# Roadmap construido

Se creó:

```text
docs/ROADMAP.md
```

El roadmap evita una reescritura inmediata.

Orden acordado:

```text
0. Foundation
1. Baseline
2. V1 Clean
3. Characterization
4. TX Timing
5. RX Timing
6. DSP
7. Synchronization
8. Modulation
9. Unified Packet Protocol
10. Reliability
11. Calibration
12. Physical Benchmark
13. Cleanup
14. Public Documentation
15. Air-gap Research
16. Acoustic Attack / Defense Research
17. Spatial SONAR software-only
```

---

## Regla principal del roadmap

No elegir tecnologías antes de medir.

Ejemplos:

```text
NO:
"Goertzel suena mejor → implementarlo"

SÍ:
FFT baseline
↓
Goertzel prototype
↓
SER / CPU / latency
↓
comparar
↓
decidir
```

Lo mismo aplica a:

```text
4-FSK
8-FSK
FEC
ACK/NACK
AudioWorklet
```

---

# Modelo de aprendizaje

Se decidió trabajar con el principio:

```text
Tony + JARVIS
```

La IA/Hermes puede:

```text
buscar
analizar
generar pruebas
automatizar
implementar
comparar
```

El dueño debe conservar:

```text
comprensión
criterio
decisión
revisión
interpretación
```

---

## Ciclo acordado para cada cambio

```text
1. Problema
2. Concepto
3. Hipótesis
4. Alternativas
5. Decisión
6. Implementación
7. Test
8. Interpretación
9. Documentación
```

Un cambio central no se considera terminado si no puede explicarse aproximadamente:

```text
qué hace
qué recibe
qué produce
por qué existe
por qué se eligió
qué limita
```

---

# GitHub Project

Se creó:

```text
SONAR — Engineering
```

Vista principal:

```text
Board
```

Estados:

```text
BACKLOG
READY
IN PROGRESS
IN REVIEW
BLOCKED
DONE
```

Campos personalizados:

```text
Priority
Type
Area
Phase
```

El Project será una vista operativa.

No reemplaza documentación.

Relación:

```text
AUDITORIA.md
      ↓
ROADMAP.md
      ↓
GitHub Issue
      ↓
GitHub Project
      ↓
branch
      ↓
PR
      ↓
main
```

---

# Decisiones que permanecen abiertas

Todavía no se ha decidido:

```text
FFT vs Goertzel
38-FSK vs 8-FSK vs 4-FSK vs 2-FSK
frecuencias finales
duración final de símbolo
FEC
ACK/NACK definitivo
AudioWorklet como implementación final
formato definitivo de packet
bitrate objetivo
distancia objetivo
full/half duplex
```

Estas decisiones requieren medición.

---

# Archivos creados durante la sesión

Preparados fuera del repositorio para revisión:

```text
AUDITORIA_SONAR.md
ARQUITECTURA_SONAR.md
ROADMAP_SONAR.md
PROGRESO_SONAR.md
```

Al integrarlos al repo se renombrarán a:

```text
docs/AUDITORIA.md
docs/ARQUITECTURA.md
docs/ROADMAP.md
PROGRESO.md
```

---

# Pendientes inmediatos

## Fundación

- [ ] crear rama GitHub Flow para documentación;
- [ ] copiar documentos al repositorio;
- [ ] revisar diff;
- [ ] commit;
- [ ] push;
- [ ] Pull Request;
- [ ] merge a `main`.

## Primer trabajo técnico

Después:

- [ ] definir métricas;
- [ ] crear tests deterministas de protocolo;
- [ ] crear baseline;
- [ ] crear primeras señales sintéticas.

---

# Próximo paso

Abrir la primera rama:

```text
docs/project-foundation
```

Integrar únicamente documentación.

**No modificar código funcional todavía.**

Después de cerrar ese PR:

```text
Milestone 1 — Baseline reproducible
```

será el inicio oficial del trabajo técnico.

---

# 2026-09-01 — Inicio de Milestone 1 y contrato E001

## Objetivo

Comenzar el baseline reproducible del modo de mensajes sin depender de dos
dispositivos, altavoz, aire o micrófono.

## Problema / observación

Las pruebas físicas mezclan demasiadas causas posibles:

```text
emisor
temporización
altavoz
ambiente
micrófono
FFT
detector
decodificador
```

Si una transmisión falla, esa prueba por sí sola no identifica cuál de esas
partes produjo el error.

Además, la página principal posee dos listeners de Enter. Uno transmite con
amplitud base `0.08` y fade `0.035 s`; el otro utiliza los valores por defecto
`0.15` y `0.025 s`. Enter puede iniciar ambas rutas, mientras que el botón usa
la segunda. Esta contradicción queda registrada y no se corrige durante el
baseline.

## Concepto aprendido

Una señal digital puede representarse como muestras de amplitud:

```text
x[n] → Float32Array
```

Un canal identidad permite comprobar primero el software:

```text
y[n] = x[n]
```

Después se podrán introducir atenuación, ruido, eco o retardo de forma
controlada. Si el sistema falla con `y[n] = x[n]`, la causa no puede atribuirse
al aire ni al hardware.

## Hipótesis

Una señal sintética perfecta debe ser recuperada sin errores si el contrato
entre emisor y receptor es correcto.

La hipótesis sigue pendiente porque esta sesión cerró únicamente la primera
fase lógica del experimento.

## Cambios realizados

- creado el contrato de experimento `E001`;
- registrada una configuración legible por código;
- añadido un ejecutor de pruebas basado en Node sin dependencias externas;
- creados vectores deterministas para `A` y `SONAR 01`;
- añadidas pruebas de mapeo, marcadores, solapamientos y Nyquist;
- creada la rama `codex/test-reproducible-baseline`;
- no se modificó código funcional ni la interfaz visual.

## Archivos involucrados

```text
package.json
tests/protocolo_mensajes.test.js
tests/configuracion_e001.test.js
docs/experiments/README.md
docs/experiments/E001-baseline-mensajes/README.md
docs/experiments/E001-baseline-mensajes/config.json
PROGRESO.md
```

## Pruebas

Comando:

```text
npm test
```

Resultado:

```text
9 aprobadas
0 fallidas
```

## Resultados e interpretación

- el mapeo desde cada frecuencia central es determinista;
- los vectores documentados coinciden con el protocolo ejecutable;
- ningún marcador coincide exactamente con un centro de datos;
- se confirmaron 34 pares de ventanas de decisión solapadas;
- `7`, `8` y `9` están sobre Nyquist a 44,1 kHz;
- esto valida el contrato lógico central, no el receptor de audio.

SER, BER y PER todavía no se reportan como resultados porque aún no se ha
ejecutado una transmisión digital completa. BER se reservará para el flujo
binario y PER para una definición formal de paquete.

## Decisión y motivo

No reorganizar ni corregir V1 antes de capturar su comportamiento. La evolución
se realizará mediante módulos pequeños y comprobables, comenzando con un
generador puro que devuelva muestras sin reproducirlas.

## Próximo paso

E001-B — implementar y verificar:

```text
tono conocido → Float32Array
secuencia de mensaje → muestras concatenadas
longitud, amplitud, frecuencia y fade deterministas
```

## Continuación de la sesión — E001-B y E001-C

Se extrajo la fórmula matemática de `generador_onda.js` a una función pura que
devuelve muestras. `generarOnda()` utiliza ahora esa misma función para llenar
su `AudioBuffer`, por lo que simulación y reproducción no mantienen fórmulas
duplicadas.

También se añadió un canal identidad:

```text
Float32Array TX
      ↓
y[n] = x[n]
      ↓
Float32Array RX independiente
```

Pruebas acumuladas:

```text
18 aprobadas
0 fallidas
```

Resultados nuevos:

- tono de 60 ms a 48 kHz: 2880 muestras;
- silencio de 20 ms a 48 kHz: 960 muestras;
- secuencia sintética de `A`: 21120 muestras, equivalentes a 440 ms;
- generación repetible muestra por muestra;
- canal identidad exacto y sin memoria compartida;
- el fade de 35 ms del perfil Enter se solapa dentro de un símbolo de 60 ms.

El siguiente paso ya no es producir audio: es separar la máquina de estados del
receptor para poder entregarle detecciones controladas y, después, conectar las
muestras sintéticas mediante un detector medible.

---

# 2026-09-04 — E001-D/E/F y primer baseline extremo a extremo

## Objetivo

Completar una base digital reproducible capaz de ejecutar el receptor sin
micrófono y localizar fallos lógicos antes de realizar pruebas físicas.

## Cambios realizados

- completada la clase `ReceptorMensajesCore` iniciada durante el ejercicio de
  aprendizaje;
- separada la máquina de estados de la captura, la Transformada Rápida de
  Fourier y la interfaz;
- conectada la página principal al nuevo núcleo del receptor;
- creado un emisor sintético de mensajes y segmentos;
- creado un detector de tonos de referencia;
- añadida la tasa de error de símbolos mediante distancia de edición;
- ampliado el canal con ganancia y ruido uniforme reproducible;
- creado `npm run experiment:e001` para escribir un informe JSON;
- verificada la carga de la página principal sin errores JavaScript;
- preservado el diseño visual existente.

## Recorrido comprobado

```text
mensaje
→ muestras Float32Array
→ canal simulado
→ detector de referencia
→ máquina de estados
→ mensaje recibido
→ SER
```

SER significa *Symbol Error Rate* o tasa de error de símbolos.

## Pruebas automáticas

```text
npm test
```

Resultado:

```text
35 aprobadas
0 fallidas
```

Las páginas `/` y `/archivos` también fueron cargadas mediante el servidor
estático y no produjeron errores de consola JavaScript. No se concedió acceso al
micrófono, por lo que esto no se registra como prueba acústica. El servidor
mantiene el 404 ya conocido de `favicon.ico`, sin efecto sobre el protocolo.

## Experimento ejecutado

```text
npm run experiment:e001
```

Resumen:

```text
identity-a              A        → A         SER 0
identity-sonar-01       SONAR 01 → SONAR 01  SER 0
identity-repeated-aa    AA       → A         SER 0,5
attenuation-50-a        A        → vacío     SER 1
noise-002-a             A        → A         SER 0
```

Tres de cinco mensajes fueron recuperados completamente.

## Hallazgo principal

`AA` pierde el segundo carácter incluso con canal identidad y detección correcta
de ambos tonos. El intervalo entre decisiones es exactamente 80 ms, mientras
que el receptor exige un valor estrictamente mayor a 80 ms para aceptar dos
símbolos iguales.

Este resultado aísla el defecto en el bloqueo temporal del receptor. No puede
atribuirse al altavoz, aire, micrófono o ruido.

La prueba de ganancia `0,5` describe la escala numérica del simulador. No debe
interpretarse como un resultado de volumen físico al 50 %.

## Decisiones

- conservar `AA → A` como resultado de baseline y corregirlo posteriormente en
  Milestone 2;
- mantener el detector de referencia separado del detector del navegador;
- no presentar el ruido uniforme como modelo acústico real;
- cerrar E001 como baseline digital inicial, no como validación física;
- mantener Milestone 1 abierto para protocolo binario, métricas restantes y
  registro de pruebas físicas.

## Archivos principales

```text
src/web/static/js/core/receptor_mensajes_core.js
src/web/static/js/core/metricas_mensajes.js
src/web/static/js/simulacion/emisor_mensajes_sintetico.js
src/web/static/js/simulacion/detector_tonos_referencia.js
src/web/static/js/simulacion/canal_simulado.js
src/web/static/js/simulacion/simulador_mensajes.js
scripts/run_e001.js
tests/receptor_mensajes_core.test.js
tests/simulador_mensajes.test.js
docs/experiments/E001-baseline-mensajes/results/latest.json
```

## Próximo paso

Completar M1-003 para el protocolo binario de archivos mediante vectores de
cabecera, empaquetado de bits, CRC8 y CRC16 antes de corregir sus defectos.

## Continuación — E002 baseline lógico de archivos

Se creó un contrato de referencia para comprobar el protocolo de archivos sin
generar audio.

Pruebas acumuladas:

```text
45 aprobadas
0 fallidas
```

Comando experimental:

```text
npm run experiment:e002
```

Resultados:

```text
CRC16 transmitido por cabecera V1: 53940
CRC16 calculado por receptor:      59143

CRC8 transmitido para [1..8]:      62
XOR calculado por receptor:        8

bloque final de 3 bytes + CRC:     4 bytes
bloque esperado por receptor:      9 bytes
```

Se confirmaron además:

```text
START = DATA_0
SYNC  = DATA_1
END   = ACK
```

y solapamiento de ventanas binarias porque la separación es 495 Hz y cada
decisión admite 300 Hz.

## Interpretación

La hipótesis de compatibilidad emisor ↔ receptor fue refutada. Una transferencia
puede fallar aunque todos los bits acústicos sean perfectos, porque la cabecera
y los bloques no comparten el mismo cálculo de integridad ni la misma longitud
final.

Estas observaciones pertenecen al protocolo lógico. No son resultados sobre
alcance, ruido físico, altavoces o micrófonos.

## Estado de la base

La base reproducible inicial queda formada por:

```text
E001 → mensajes, muestras, canal, detector, receptor y SER
E002 → bits, cabecera, bloques, CRC y conflictos de archivos
```

Los dos experimentos producen resultados JSON repetibles y conservan los
defectos V1 antes de corregirlos.

## Próximo paso

La base ya permite formular una investigación científica sin depender de
afirmaciones históricas del README. El siguiente trabajo debe definirse a partir
de la pregunta, hipótesis y alcance de esa investigación, o continuar Milestone
1 con relación señal-ruido, latencia y registro de pruebas físicas.

---

# 2026-09-08 — Milestone 2, limpieza lógica de mensajes

## Objetivo

Corregir los errores lógicos conocidos del flujo de mensajes sin rediseñar aún
el mapa de frecuencias ni confundir una mejora de software con una validación
del canal acústico físico.

## Problemas comprobados

- la plantilla y `setupEmisorUI()` registraban controladores de Enter distintos;
- Enter y el botón utilizaban amplitud, fade y control de auto-eco diferentes;
- los caracteres desconocidos se eliminaban o se convertían silenciosamente en
  una frecuencia válida;
- dos caracteres iguales separados exactamente por los 80 ms del protocolo no
  eran aceptados porque el receptor exigía un intervalo estrictamente mayor;
- el navegador podía conservar módulos JavaScript antiguos durante el
  desarrollo y mostrar un comportamiento diferente al código del repositorio.

## Concepto aprendido

Una línea base conserva el comportamiento anterior para poder compararlo; una
prueba de regresión describe el comportamiento correcto que no debe volver a
romperse. Por eso el resultado histórico de E001 (`AA → A`, SER 0,5) se conserva,
mientras que las pruebas actuales ya exigen `AA → AA`, SER 0.

SER significa *Symbol Error Rate* o tasa de error de símbolos.

## Cambios

- se eliminó la lógica de transmisión incrustada en `index.html`;
- Enter y el botón utilizan ahora un único controlador;
- un bloqueo impide iniciar dos emisiones simultáneas;
- normalización y validación forman parte del contrato compartido;
- `charToFrequency()` produce un error explícito ante símbolos desconocidos;
- emisor real y emisor sintético aplican la misma validación;
- el límite temporal acepta un símbolo repetido cuando transcurrieron exactamente
  80 ms;
- el servidor local añade `Cache-Control: no-store` para cargar siempre los
  módulos actuales durante las verificaciones.

No se modificaron las frecuencias, tolerancias, duraciones, forma de onda ni
algoritmo de detección.

## Archivos principales

```text
src/web/static/js/protocolo_ultrasonico.js
src/web/static/js/emisor_ultrasonico.js
src/web/static/js/core/receptor_mensajes_core.js
src/web/static/js/simulacion/emisor_mensajes_sintetico.js
src/web/templates/index.html
src/web/backend/servidor_estatico.py
tests/emisor_mensajes_ui.test.js
tests/protocolo_mensajes.test.js
tests/receptor_mensajes_core.test.js
tests/simulador_mensajes.test.js
```

## Pruebas

```text
npm test
```

Resultado:

```text
51 aprobadas
0 fallidas
```

La verificación en navegador confirmó:

- `/` carga sin errores JavaScript;
- `/archivos` carga sin errores JavaScript;
- `HOLA!` muestra `Caracteres no soportados: !` y no inicia audio;
- la página principal contiene un único script de aplicación y ya no contiene
  un segundo controlador TX incrustado.

No se concedió acceso al micrófono y esta sesión no constituye una prueba
acústica de recepción.

## Resultado

Quedan completados M2-MSG-001, M2-MSG-002, M2-MSG-003 y M2-MSG-004. El flujo
de mensajes V1 está lógicamente más limpio y sus regresiones principales están
cubiertas, pero continúan abiertos los defectos del diseño de señal ya medidos:
solapamientos de ventanas, frecuencias sobre Nyquist a 44,1 kHz, temporización
basada en `setTimeout`/`requestAnimationFrame` y umbrales dependientes del
dispositivo.

Nyquist es el límite máximo representable sin ambigüedad por una frecuencia de
muestreo; para 44,1 kHz es 22,05 kHz.

## Decisiones y motivo

- conservar E001 como evidencia histórica, sin sobrescribir su JSON;
- no corregir todavía el mapa de tonos, porque su reemplazo requiere una
  comparación experimental;
- continuar Milestone 2 con el contrato lógico de archivos antes de realizar
  mediciones acústicas físicas.

## Próximo paso

M2-FILE-001 a M2-FILE-003: hacer que emisor y receptor de archivos compartan el
mismo CRC16, CRC8 y formato de bloque final, con pruebas antes de conectar el
contrato a la interfaz.

## Continuación — contrato activo de archivos

### Objetivo

Corregir las tres incompatibilidades de serialización que impedían aceptar una
transferencia incluso suponiendo bits acústicos perfectos.

### Hipótesis

Si emisor y receptor usan las mismas funciones para crear y leer cabeceras y
bloques, cualquier secuencia de bytes sin alteraciones debe reconstruirse
exactamente, incluyendo archivos cuyo tamaño no sea múltiplo de ocho.

### Cambios

- el emisor sustituyó el cálculo manual defectuoso por
  `crearCabeceraArchivo()`;
- el receptor sustituyó su lectura manual por
  `decodificarCabeceraArchivo()`;
- el receptor valida CRC8 con el mismo polinomio `0x07` que el emisor;
- cada bloque se rellena hasta ocho bytes y añade un noveno byte CRC8;
- el receptor calcula cuántos bytes útiles quedan según el tamaño de cabecera y
  descarta únicamente el relleno del último bloque;
- se añadieron validaciones para tipos, tamaños de bloque y longitud útil.

### Pruebas

```text
npm test
```

Resultado acumulado:

```text
56 aprobadas
0 fallidas
```

Las pruebas nuevas comprueban:

- cabecera válida y detección de una cabecera alterada;
- bloque válido y detección de un bloque alterado;
- último bloque de tres bytes empaquetado en nueve bytes;
- recuperación de los tres bytes sin conservar cinco ceros de relleno;
- rechazo de bloques con más de ocho bytes;
- reconstrucción exacta de archivos deterministas de 1 a 25 bytes.

### Resultado

Quedan completados M2-FILE-001, M2-FILE-002 y M2-FILE-003. La incompatibilidad
lógica CRC16/CRC8/bloque final está corregida en las rutas activas.

Esto no demuestra todavía una transferencia acústica completa. El receptor
continúa tratando llamadas de `requestAnimationFrame` como oportunidades para
agregar bits y el mapa físico mantiene colisiones conocidas. Esos defectos no
se ocultaron ni se presentaron como resueltos.

### Decisiones y motivo

- usar relleno en lugar de introducir ahora un campo nuevo de longitud por
  paquete, porque mantiene un formato fijo y la cabecera ya contiene el tamaño
  total necesario para retirar el relleno;
- conservar intactos el documento y JSON de E002 como línea base histórica;
- separar compatibilidad lógica de sincronización acústica.

### Próximo paso

Continuar la limpieza de archivos con propiedad única del receptor y del archivo
seleccionado (M2-FILE-004 y M2-FILE-005), antes de abordar cancelación, nombre y
progreso.

## Continuación — propiedad única de estado en archivos

### Problema

La plantilla creaba un receptor de archivos y `app_archivos.js` creaba otro. De
forma análoga, drag/drop guardaba el archivo seleccionado en una variable de la
plantilla, mientras el emisor consultaba una variable distinta.

El resultado podía ser contradictorio:

```text
interfaz: archivo seleccionado
emisor:   ningún archivo seleccionado
```

### Cambios

- se retiró todo el módulo JavaScript incrustado en la plantilla de archivos;
- `app_archivos.js` conserva la única instancia de `ReceptorArchivos`;
- `setupEmisorArchivoUI()` es dueño del único `archivoSeleccionado`;
- selección por input, botón y drag/drop llaman a la misma función;
- el objeto enviado es exactamente el último objeto mostrado en la interfaz;
- se añadieron dependencias inyectables para probar la interfaz sin abrir el
  selector del sistema ni reproducir audio;
- se retiraron las variables y la opción de cancelación que nunca interrumpían
  la transmisión.

### Pruebas

Resultado acumulado:

```text
58 aprobadas
0 fallidas
```

Las pruebas nuevas confirman que:

- input y drag/drop actualizan una sola referencia;
- después de arrastrar un segundo archivo, el emisor recibe ese segundo objeto;
- la plantilla y la aplicación contienen en conjunto una única construcción
  `new ReceptorArchivos()`.

### Resultado

Quedan completados M2-FILE-004, M2-FILE-005 y M2-FILE-006. Esto elimina dos
fuentes de estado contradictorio y evita afirmar que existe una cancelación
funcional.

### Pendiente

- M2-FILE-007: definir la codificación y truncado del nombre en bytes;
- M2-FILE-008: hacer que el progreso cuente todos los símbolos realmente
  emitidos, incluido SOI;
- el reloj de bits y las colisiones físicas permanecen fuera de esta corrección.

SOI significa *Start of Information*: patrón que marca el comienzo de la
información estructurada después del preámbulo.

### Próximo paso

Cerrar M2-FILE-007/008. Después revisar la condición de cierre completa de
Milestone 2 y decidir qué defectos de temporización deben pasar al rediseño del
módem en lugar de recibir parches inseguros.
