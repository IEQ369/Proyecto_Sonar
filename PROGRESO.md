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
