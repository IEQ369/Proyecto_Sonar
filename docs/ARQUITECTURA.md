# ARQUITECTURA DE SONAR

> **Estado:** arquitectura actual documentada antes de la evolución de SONAR.  
> **Baseline:** `bf3f14c`  
> **Tag de referencia:** `pre-sonar-v2-2026-08-24`  
> **Fecha:** 2026-08-24  
> **Propósito:** explicar cómo funciona realmente SONAR en el estado actual, de extremo a extremo, para poder modificarlo sin perder comprensión ni historia.

---

# 1. Qué es SONAR actualmente

SONAR es un proyecto experimental de **ciberseguridad y comunicaciones acústicas software-only** que utiliza el subsistema de audio ya presente en dispositivos comunes para explorar canales de información no convencionales mediante tonos de alta frecuencia / near-ultrasonic.

La interfaz web es una forma de operar y demostrar SONAR; **no define por sí sola la identidad del proyecto**.

La idea central es:

```text
hardware cotidiano
+
software
+
propiedad física no utilizada por el flujo normal
=
superficie de investigación de seguridad
```

Por tanto, enviar texto y archivos demuestra que el canal puede transportar información arbitraria. Esa capacidad puede estudiarse posteriormente en laboratorios como canal acústico alternativo/encubierto, junto con su detección y mitigación.

**Invariante del proyecto:** no se añade hardware dedicado para “hacer funcionar” SONAR. Si una idea requiere micrófonos externos, arrays o sensores añadidos, se considera fuera del core salvo decisión explícita del dueño.

Actualmente contiene **dos sistemas de comunicación parcialmente independientes**:

1. **Mensajería**
   - convierte caracteres en frecuencias;
   - transmite tonos;
   - detecta frecuencias mediante FFT;
   - reconstruye texto.

2. **Archivos**
   - convierte bytes en bits;
   - utiliza dos frecuencias para representar `0` y `1`;
   - añade preámbulo, cabecera y CRC;
   - intenta reconstruir el archivo.

Ambos comparten el mismo medio físico:

```text
NAVEGADOR
   ↓
Web Audio
   ↓
ALTAVOZ
   ↓
AIRE
   ↓
MICRÓFONO
   ↓
Web Audio
   ↓
NAVEGADOR
```

Pero actualmente no comparten una capa común de módem o paquetes.

---


# 1.1 Identidad vs demostraciones

Es importante separar:

```text
SONAR como tecnología
        ≠
la pantalla actual de mensajería
```

La UI actual demuestra capacidades como:

```text
TEXT
FILES
FFT / diagnóstico
```

Pero conceptualmente el core debe evolucionar hacia:

```text
datos arbitrarios
↓
protocolo
↓
módem acústico
↓
canal físico
```

Eso permitirá que en el futuro otras interfaces legítimas —por ejemplo una CLI de laboratorio, una herramienta de diagnóstico o un detector defensivo— reutilicen el mismo núcleo sin duplicar el sistema.

La estética cyberpunk actual es parte de la identidad del proyecto y se preserva. Cambios visuales no forman parte del roadmap técnico salvo necesidad funcional o decisión explícita del dueño.

---

# 2. Estructura relevante del repositorio

```text
Proyecto_Sonar/
│
├── README.md
├── HISTORIA_TECNICA.md
├── nginx.conf
│
└── src/
    └── web/
        │
        ├── backend/
        │   └── servidor_estatico.py
        │
        ├── templates/
        │   ├── index.html
        │   ├── emisor.html
        │   └── receptor.html
        │
        ├── static/
        │   ├── css/
        │   │   └── styles.css
        │   │
        │   └── js/
        │       ├── app.js
        │       ├── emisor_ultrasonico.js
        │       ├── generador_onda.js
        │       ├── protocolo_ultrasonico.js
        │       ├── fft_visualizer.js
        │       └── ui_archivo.js
        │
        └── archivos/
            ├── templates/
            │   └── index.html
            │
            └── static/
                └── js/
                    ├── app_archivos.js
                    ├── emisor_archivos.js
                    ├── receptor_archivos.js
                    └── protocolo_archivos.js
```

---

# 3. Servidor web

## Archivo

```text
src/web/backend/servidor_estatico.py
```

## Responsabilidad

No participa en la transmisión acústica.

Su función es únicamente servir la aplicación web.

Flujo:

```text
Browser
   ↓ HTTP
servidor_estatico.py
   ↓
archivos HTML / CSS / JS
```

Rutas principales:

```text
/           → /templates/index.html
/index.html → /templates/index.html
/archivos   → /archivos/templates/index.html
```

## Consecuencia arquitectónica

La comunicación acústica ocurre principalmente **en el cliente**.

El backend no procesa:

- FFT;
- mensajes;
- audio;
- archivos;
- CRC;
- señales.

Esto es importante porque SONAR puede evolucionar como una aplicación principalmente client-side.

---

# 4. Arquitectura general actual

```text
                       SONAR ACTUAL
┌────────────────────────────────────────────────────────────┐
│                         BROWSER                            │
│                                                            │
│  ┌──────────────┐                    ┌──────────────────┐   │
│  │ MENSAJERÍA   │                    │    ARCHIVOS      │   │
│  │              │                    │                  │   │
│  │ app.js       │                    │ app_archivos.js  │   │
│  │ TX/RX        │                    │ TX/RX            │   │
│  └──────┬───────┘                    └────────┬─────────┘   │
│         │                                     │             │
│         ├──────── protocolos separados ───────┤             │
│         │                                     │             │
│  protocolo_ultrasonico.js          protocolo_archivos.js    │
│         │                                     │             │
│         └──────────────┬──────────────────────┘             │
│                        │                                    │
│                 Web Audio API                              │
└────────────────────────┬───────────────────────────────────┘
                         │
                    ALTAVOZ / MIC
                         │
                         ▼
                     CANAL FÍSICO
```

El punto central es:

> **Mensajes y archivos comparten el aire, pero no comparten realmente el protocolo.**

---

# 5. Mensajería — transmisión

## Archivos principales

```text
templates/index.html
static/js/app.js
static/js/emisor_ultrasonico.js
static/js/generador_onda.js
static/js/protocolo_ultrasonico.js
```

## Flujo

Cuando el usuario escribe:

```text
HOLA
```

la intención arquitectónica es:

```text
Enter o botón
      ↓
setupEmisorUI() único
      ↓
normalizar + validar "HOLA"
      ↓
H O L A
      ↓
charToFrequency()
      ↓
generarOnda()
      ↓
AudioBufferSourceNode
      ↓
altavoz
```

El framing efectivo añade marcadores al principio y al final, y un intervalo
sin tono entre caracteres:

```text
START
SYNC
H
GAP
O
GAP
L
GAP
A
SYNC
END
```

Conceptualmente:

```text
Mensaje de aplicación
      ↓
Protocolo de caracteres
      ↓
Secuencia de símbolos acústicos
      ↓
Generador de onda
      ↓
Web Audio
```

---

# 6. Mensajería — mapa de símbolos

## Archivo

```text
static/js/protocolo_ultrasonico.js
```

El protocolo define:

```text
START
SYNC
END
```

y frecuencias individuales para caracteres.

El alfabeto soportado actualmente incluye aproximadamente:

```text
A-Z
Ñ
0-9
espacio
```

Cada carácter es directamente un símbolo físico.

Ejemplo conceptual:

```text
carácter A
   ↓
18800 Hz
```

Esto significa que la **codificación de aplicación y la modulación están acopladas**:

```text
"A" == tono concreto
```

No existe todavía una capa intermedia:

```text
"A"
 ↓ UTF-8
0x41
 ↓ bits/bytes
modulación
```

---

# 7. Mensajería — generación de señal

## Archivo

```text
static/js/generador_onda.js
```

Responsabilidad:

```text
frecuencia + duración + amplitud + tipo
              ↓
          AudioBuffer
```

Puede generar formas de onda:

```text
sine
square
sawtooth
triangle
```

y aplicar fade de entrada/salida.

Arquitectónicamente:

```text
PROTOCOLO
   ↓
"quiero 18800 Hz durante X"
   ↓
GENERADOR DE ONDA
   ↓
muestras PCM
   ↓
AudioBuffer
```

Esta separación es buena y debe conservarse conceptualmente.

---

# 8. Mensajería — temporización TX actual

## Archivo

```text
emisor_ultrasonico.js
```

El emisor envía los tonos secuencialmente.

Actualmente el patrón efectivo es:

```text
crear tono
   ↓
source.start()
   ↓
esperar con setTimeout()
   ↓
crear siguiente tono
```

Aunque se utiliza:

```js
audioCtx.currentTime
```

en parte del código, ese valor no gobierna realmente el scheduling completo.

Por tanto existen dos relojes:

```text
RELOJ DE AUDIO
AudioContext.currentTime

RELOJ JS
setTimeout / event loop
```

Actualmente el segundo domina el encadenamiento de símbolos.

Referencia:

```text
AUDITORIA.md → TIM-002
```

---

# 9. Mensajería — recepción

## Archivo principal

```text
static/js/app.js
```

Al pulsar el botón de escucha:

```text
getUserMedia()
   ↓
MediaStream
   ↓
MediaStreamSource
   ↓
AnalyserNode
   ↓
FFT
```

Configuración principal:

```text
fftSize = 2048
smoothingTimeConstant = 0.3
```

Cada iteración obtiene:

```js
analyser.getByteFrequencyData(...)
```

Busca el bin con mayor magnitud dentro de una banda aproximadamente:

```text
18.1 kHz – 22.5 kHz
```

y estima:

```text
freqPeak = maxIdx * binSize
```

---

# 10. Mensajería — bucle RX actual

El procesamiento está gobernado por:

```js
requestAnimationFrame(processFrame)
```

Por tanto el flujo real es:

```text
frame de pantalla
      ↓
leer FFT
      ↓
buscar máximo
      ↓
actualizar historial
      ↓
clasificar frecuencia
      ↓
actualizar máquina de estados
      ↓
esperar siguiente frame
```

Esto mezcla dos responsabilidades:

```text
RENDER/UI
+
TEMPORIZACIÓN DEL MÓDEM
```

Referencia:

```text
AUDITORIA.md → TIM-001
```

---

# 11. Mensajería — detector actual

El detector usa principalmente:

1. magnitud mínima;
2. frecuencia del bin máximo;
3. tolerancia alrededor de una frecuencia nominal;
4. historial de cinco mediciones;
5. al menos tres detecciones cercanas.

Conceptualmente:

```text
FFT
 ↓
máximo
 ↓
¿magnitud suficiente?
 ↓
¿frecuencia próxima?
 ↓
¿estable en historial?
 ↓
símbolo aceptado
```

No existe actualmente una medida explícita de:

```text
SNR
confidence
segundo mejor candidato
noise floor dinámico
```

---

# 12. Mensajería — máquina de estados

Estados principales:

```text
IDLE
  ↓ START
SYNC
  ↓ SYNC
DATA
  ↓ END
END / IDLE
```

Flujo ideal:

```text
IDLE
 │
 │ START estable
 ▼
SYNC
 │
 │ SYNC estable
 ▼
DATA
 │
 ├─ carácter → agregar a buffer
 │
 ├─ SYNC → separador
 │
 └─ END → entregar mensaje
             ↓
            IDLE
```

Variables principales:

```text
rxState
rxBuffer
lastChar
lastSymbolTime
freqHistory
```

Existe un lockout temporal para evitar que un mismo tono sostenido se agregue varias veces.

---

# 13. Auto-eco

SONAR intenta evitar que un dispositivo reciba su propia transmisión.

Existe:

```js
isTransmittingRef.current
```

Cuando es `true`, el receptor sigue pudiendo observar señal, pero evita procesarla como mensaje.

Arquitectónicamente esto es:

```text
TX activo
   ↓
bloquear interpretación RX local
```

La idea es correcta.

El problema actual es que existen caminos de transmisión que no actualizan el mismo estado.

Referencia:

```text
AUDITORIA.md → MSG-001 / MSG-002
```

---

# 14. Visualizador FFT

## Archivo

```text
static/js/fft_visualizer.js
```

Responsabilidad conceptual:

```text
datos FFT
   ↓
dibujar espectro
```

Debe considerarse una herramienta de:

- UI;
- diagnóstico;
- aprendizaje.

No debería formar parte de la lógica temporal del receptor.

Arquitectura deseable como principio:

```text
RECEPTOR DSP ──→ datos ──→ UI

no:

UI loop ──→ controla receptor
```

---

# 15. Archivos — visión general

La transferencia de archivos intenta implementar una capa más estructurada.

Flujo TX conceptual:

```text
File
 ↓
ArrayBuffer
 ↓
cabecera
 ↓
bits
 ↓
preámbulo
 ↓
SOI
 ↓
cabecera repetida
 ↓
bloques de datos + CRC
 ↓
END
 ↓
tonos
```

Flujo RX:

```text
micrófono
 ↓
FFT
 ↓
frecuencia
 ↓
bit / marcador
 ↓
máquina de estados
 ↓
cabecera
 ↓
bloques
 ↓
CRC
 ↓
Blob
 ↓
archivo descargable
```

---

# 16. Protocolo de archivos

## Archivo

```text
archivos/static/js/protocolo_archivos.js
```

Constantes principales:

```text
START    = 18700 Hz
SYNC     = 19195 Hz
DATA_0   = 18700 Hz
DATA_1   = 19195 Hz
END      = 19500 Hz
ACK      = 19500 Hz
```

Framing conceptual:

```text
PREÁMBULO
    ↓
SOI
    ↓
CABECERA × 3
    ↓
BLOQUES DE DATOS
    ↓
END
```

---

# 17. Cabecera de archivo

Tamaño fijo:

```text
22 bytes
```

Formato:

```text
bytes 0..3
    tamaño de archivo
    little-endian

bytes 4..19
    nombre
    16 bytes

bytes 20..21
    CRC16
```

Conceptualmente:

```text
┌──────────┬────────────────┬─────────┐
│ SIZE 4 B │ NAME 16 B      │ CRC16   │
└──────────┴────────────────┴─────────┘
```

La cabecera se transmite varias veces para intentar aplicar mayoría.

---

# 18. Bloques de archivo

Tamaño nominal:

```text
8 bytes de payload
+
1 byte CRC8
```

Conceptualmente:

```text
┌────────────────────────┬──────┐
│ DATA 8 bytes           │ CRC8 │
└────────────────────────┴──────┘
```

Cada byte:

```text
byte
 ↓
8 bits
 ↓
0 → DATA_0
1 → DATA_1
```

Esta parte representa un cambio importante respecto a mensajería:

```text
MENSAJES
carácter → frecuencia

ARCHIVOS
byte → bits → dos frecuencias
```

Son dos modulaciones distintas.

---

# 19. Archivos — máquina de estados RX

El receptor de archivos utiliza aproximadamente:

```text
WAITING_PREAMBLE
      ↓
DETECTING_SOI
      ↓
RECEIVING_HEADER
      ↓
RECEIVING_DATA
      ↓
COMPLETE

o

ERROR
```

Conceptualmente:

```text
WAITING_PREAMBLE
      │
      │ patrón detectado
      ▼
DETECTING_SOI
      │
      │ SOI válido
      ▼
RECEIVING_HEADER
      │
      │ CRC16 válido
      ▼
RECEIVING_DATA
      │
      │ bytes suficientes
      ▼
COMPLETE
```

La estructura conceptual es correcta para un protocolo con framing.

La implementación actual tiene varios fallos descritos en:

```text
AUDITORIA.md → FILE-001 ... FILE-014
```

---

# 20. Archivos — reloj RX

Al igual que mensajería, `app_archivos.js` obtiene la FFT usando el loop visual.

Cada frame puede invocar:

```text
receptor.procesarFrecuencia(...)
```

Durante recepción de datos, una detección puede producir:

```js
bufferBits.push(bit)
```

Por tanto el modelo actual es aproximadamente:

```text
FRAME DE PANTALLA = oportunidad de agregar bit
```

cuando debería existir algo del tipo:

```text
PERÍODO DE SÍMBOLO = exactamente una decisión de bit/símbolo
```

Referencia:

```text
AUDITORIA.md → FILE-003
```

---

# 21. Propiedad del estado actual

Una de las mayores fuentes de complejidad es que distintas capas mantienen copias de estado.

Ejemplos:

## Mensajes

```text
template → controles sin lógica inline
             ↓
       setupEmisorUI()
       ├─ Enter
       ├─ botón
       ├─ bloqueo isSending
       └─ estado de auto-eco
             ↓
     emitirUltrasonico()
```

Desde M2-MSG no existen dos caminos de transmisión de mensajes. `app.js`
conserva la referencia compartida de auto-eco porque también la consulta la
ruta de recepción, pero la modifica un único controlador TX.

## Archivos

```text
template → controles sin lógica inline
             ↓
       app_archivos.js
       └─ ReceptorArchivos único
             ↓
       setupEmisorArchivoUI()
       └─ archivoSeleccionado único
          ↑ input / botón / drag & drop
```

Antes de M2-FILE-004/005, las copias de estado producían situaciones donde:

```text
UI dice una cosa
módulo interno cree otra
```

La ruta activa ya no mantiene esas copias. La instancia del receptor sigue
expuesta temporalmente como `window.receptorArchivos` para depuración, pero es
la misma que recibe las detecciones del analizador.

Principio futuro:

> **Cada estado importante debe tener un único dueño.**

---

# 22. Dominios que actualmente están mezclados

SONAR contiene cinco dominios diferentes:

```text
1. UI
2. aplicación
3. protocolo
4. DSP / módem
5. dispositivo de audio
```

Actualmente sus fronteras son difusas.

Ejemplo:

```text
index.html
   ↓
decide cuándo transmitir

app.js
   ↓
dibuja UI
   ↓
hace FFT
   ↓
decodifica protocolo
   ↓
gestiona estado
```

Una arquitectura más mantenible debería separar conceptualmente:

```text
┌─────────────────┐
│       UI        │
└────────┬────────┘
         │
┌────────▼────────┐
│   APPLICATION   │
└────────┬────────┘
         │
┌────────▼────────┐
│    PROTOCOL     │
└────────┬────────┘
         │
┌────────▼────────┐
│ MODEM / DSP     │
└────────┬────────┘
         │
┌────────▼────────┐
│    AUDIO I/O    │
└─────────────────┘
```

Esto es un **principio de dirección**, no una reescritura aprobada todavía.

---

# 23. Flujo completo actual — mensajes

```text
USUARIO
  │
  │ escribe texto y usa Enter o botón
  ▼
setupEmisorUI() — controlador único
  │
  ├─ normaliza a mayúsculas
  ├─ valida caracteres soportados
  ├─ impide emisiones simultáneas
  └─ controla auto-eco y estado visual
  │
  ▼
emitirUltrasonico()
  │
  ├─ vuelve a validar el contrato de entrada
  ├─ obtiene frecuencia por carácter
  ├─ añade START/SYNC/END
  │
  ▼
generador_onda.js
  │
  ▼
AudioBufferSourceNode
  │
  ▼
ALTAVOZ
  │
  ~~~~~~~~~~~~~~~~~~~~~~~~~ CANAL ~~~~~~~~~~~~~~~~~~~~~~~
  │
  ▼
MICRÓFONO
  │
  ▼
getUserMedia()
  │
  ▼
AnalyserNode
  │
  ▼
FFT
  │
  ▼
bin de mayor magnitud
  │
  ▼
freqHistory / estabilidad
  │
  ▼
máquina IDLE/SYNC/DATA
  │
  ▼
frequencyToChar()
  │
  ▼
rxBuffer
  │
  ▼
UI
```

---

# 24. Flujo completo actual — archivos

```text
USUARIO
  │
  │ selecciona File
  ▼
emisor_archivos.js
  │
  ▼
File.arrayBuffer()
  │
  ▼
CABECERA
  │
  ├─ size
  ├─ name
  └─ CRC16
  │
  ▼
PREÁMBULO / SOI
  │
  ▼
cabecera × reps
  │
  ▼
bloques de 8 bytes
  │
  └─ CRC8
  │
  ▼
bits
  │
  ├─ 0 → DATA_0
  └─ 1 → DATA_1
  │
  ▼
Web Audio
  │
  ▼
ALTAVOZ
  │
  ~~~~~~~~~~~~~~~~~~~~~~~~~ CANAL ~~~~~~~~~~~~~~~~~~~~~~~
  │
  ▼
MICRÓFONO
  │
  ▼
AnalyserNode / FFT
  │
  ▼
frecuencia
  │
  ▼
ReceptorArchivos
  │
  ├─ preámbulo
  ├─ SOI
  ├─ cabecera
  ├─ CRC16
  ├─ bloques
  └─ CRC8
  │
  ▼
bufferBytes
  │
  ▼
Blob
  │
  ▼
archivo recibido
```

---

# 25. Qué es “protocolo” y qué es “módem”

Esta distinción será importante para aprender el proyecto.

## Protocolo

Define cosas como:

```text
cómo empieza un mensaje
qué significa un campo
qué longitud tiene
cómo sabemos que terminó
qué CRC utiliza
qué hacemos si falla
```

Ejemplo:

```text
PREAMBLE | TYPE | LENGTH | PAYLOAD | CRC
```

## Módem

Convierte información digital en señal física y viceversa.

Ejemplo:

```text
00 → F0
01 → F1
10 → F2
11 → F3
```

Actualmente SONAR mezcla parcialmente ambas capas.

En mensajería:

```text
carácter == símbolo físico
```

En archivos:

```text
bit == símbolo físico
```

Una de las preguntas de V2 será cuánto debemos desacoplar esas capas.

---

# 26. Qué es DSP dentro de SONAR

DSP = Digital Signal Processing.

En SONAR incluye tareas como:

```text
capturar muestras
↓
analizar energía/frecuencia
↓
separar señal de ruido
↓
identificar símbolo
↓
estimar confianza
```

Actualmente la principal operación DSP es:

```text
AnalyserNode FFT
↓
máximo de magnitud
```

El trabajo futuro puede incluir:

```text
ventanas
noise floor
SNR
Goertzel
interpolación
correlación
sincronización
```

pero ninguna de esas técnicas se considera aprobada solamente por aparecer aquí.

---

# 27. Los tres relojes de SONAR

Una forma útil de entender los problemas actuales es distinguir tres relojes.

## A. Reloj de audio

```text
sampleRate
AudioContext.currentTime
muestras
```

Es el reloj más cercano al medio físico.

## B. Reloj JavaScript

```text
setTimeout
event loop
promesas
```

No garantiza precisión de audio.

## C. Reloj de pantalla

```text
requestAnimationFrame
60 / 90 / 120 Hz
```

Diseñado para renderizado.

Actualmente SONAR utiliza B y C para tareas que idealmente deberían estar dominadas por A.

Este concepto explica una parte importante de los problemas de precisión.

---

# 28. El canal físico

Entre TX y RX existe algo que el software no controla completamente:

```text
ALTAVOZ
  ↓
respuesta en frecuencia
  ↓
aire / distancia / reflexiones
  ↓
ruido
  ↓
MICRÓFONO
  ↓
filtros / codec
  ↓
procesamiento del SO
  ↓
procesamiento del navegador
```

Modelo conceptual:

```text
señal TX
   ↓
CANAL
   ├─ atenuación
   ├─ ruido
   ├─ eco
   ├─ distorsión
   ├─ filtros
   └─ offset
   ↓
señal RX
```

Por eso no basta con que:

```text
frecuencia TX = frecuencia definida
```

El receptor debe tolerar que la señal recibida sea distinta.

---

# 29. Dependencias críticas de hardware

SONAR depende de hardware físico aunque su implementación sea software-only.

La filosofía no significa que el hardware deje de imponer límites; significa que **SONAR no añade hardware dedicado para sortearlos**.

SONAR depende de:

```text
sample rate efectivo
respuesta del altavoz
respuesta del micrófono
filtros antialias
procesamiento de voz
volumen
distancia
orientación
ambiente
```

Esto explica por qué parámetros globales como:

```text
AMPLITUDE = X
TOLERANCE = Y
```

pueden funcionar en una máquina y fallar en otra.

---

# 30. Near-ultrasonic vs ultrasonido

Parte de la banda actual se encuentra por debajo de 20 kHz.

Por tanto técnicamente es más correcto hablar de:

```text
high-frequency acoustic
near-ultrasonic
```

para buena parte del sistema.

Esto no reduce el valor del proyecto.

Una banda ligeramente inferior puede ser necesaria para compatibilidad con hardware común.

La arquitectura debe priorizar:

```text
fiabilidad
+
compatibilidad
```

antes que una etiqueta estricta de frecuencia.

---

# 31. Problemas arquitectónicos centrales actuales

Los bugs individuales están en `AUDITORIA.md`.

A nivel de arquitectura existen cinco problemas principales:

## A. Timing no pertenece al dominio de audio

```text
setTimeout / requestAnimationFrame
```

gobiernan partes críticas.

## B. Dos transportes separados

```text
mensajes
archivos
```

duplican lógica.

## C. UI y módem están acoplados

HTML/app contienen lógica de transmisión/recepción.

## D. Estado duplicado

Distintas partes creen poseer el mismo estado.

## E. Falta una capa medible

No existe todavía una interfaz clara:

```text
modulate(payload) → samples
demodulate(samples) → payload
```

que permita tests sintéticos independientes del navegador.

---

# 32. Fronteras que debemos conseguir antes de considerar SONAR maduro

Sin fijar todavía las tecnologías, el sistema debería terminar teniendo responsabilidades parecidas a:

```text
┌──────────────────────────────────────────┐
│ UI                                       │
│ botones, visualización, progreso         │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────▼────────────────────────┐
│ APPLICATION                              │
│ texto, archivo, diagnóstico              │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────▼────────────────────────┐
│ PACKET / PROTOCOL                        │
│ framing, length, CRC, sequence           │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────▼────────────────────────┐
│ MODEM                                    │
│ símbolos, modulación, sincronización     │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────▼────────────────────────┐
│ DSP                                      │
│ detector, SNR, timing                    │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────▼────────────────────────┐
│ AUDIO I/O                                │
│ Web Audio, micrófono, altavoz            │
└──────────────────────────────────────────┘
```

Esto expresa **responsabilidades**, no necesariamente seis carpetas o seis clases.

---

# 33. Regla: preservar antes de reemplazar

Antes de sustituir una pieza:

```text
FFT
timing
protocolo
modulación
```

debemos poder responder:

1. ¿qué hace ahora?
2. ¿qué problema concreto tiene?
3. ¿cómo lo medimos?
4. ¿qué alternativa proponemos?
5. ¿qué esperamos mejorar?
6. ¿cómo sabremos si realmente mejoró?
7. ¿qué sacrificamos?

Ejemplo:

```text
FFT actual
   ↓
baseline SER
   ↓
Goertzel candidato
   ↓
SER nuevo
   ↓
comparación
```

No:

```text
"Goertzel suena mejor"
   ↓
reescribir
```

---

# 34. Mapa de aprendizaje asociado

El proyecto puede utilizarse como ruta práctica de aprendizaje.

## Cuando trabajemos señal

Aprender:

```text
frecuencia
amplitud
fase
sample rate
Nyquist
aliasing
```

## Cuando trabajemos FFT

Aprender:

```text
dominio temporal
dominio frecuencial
bins
resolución
ventanas
spectral leakage
```

## Cuando trabajemos detección

Aprender:

```text
noise floor
SNR
threshold
confidence
clasificación
```

## Cuando trabajemos modulación

Aprender:

```text
bits
símbolos
baud
bitrate
FSK
M-FSK
ancho de banda
```

## Cuando trabajemos sincronización

Aprender:

```text
preamble
sync word
symbol timing
clock recovery
```

## Cuando trabajemos protocolo

Aprender:

```text
framing
length
sequence
CRC
ACK
ARQ
FEC
```

Cada concepto debe aparecer porque resuelve una necesidad concreta de SONAR.

---

# 35. Qué debe poder explicar el dueño del proyecto

No es necesario memorizar cada línea.

Sí debe poder explicar, a nivel conceptual:

```text
1. cómo un texto termina convertido en sonido;
2. cómo el micrófono vuelve a obtener información;
3. qué hace la FFT;
4. qué significa un símbolo;
5. por qué existe un preámbulo;
6. cómo funciona el framing;
7. para qué sirve un CRC;
8. qué limita el bitrate;
9. qué significa Nyquist;
10. qué depende del hardware;
11. qué pertenece a UI y qué pertenece al módem;
12. cómo se mide si una versión es mejor.
```

Esta será la regla “Tony + JARVIS” del proyecto:

> La IA puede acelerar cálculos, experimentos, búsqueda y código.  
> El dueño del proyecto conserva la comprensión del sistema y la decisión técnica.

---


# 35.1 Modelo de amenaza e investigación

La arquitectura debe poder estudiarse desde dos perspectivas.

## Canal ofensivo en laboratorio

```text
proceso autorizado
↓
payload
↓
módem SONAR
↓
audio
↓
otro dispositivo autorizado
↓
decodificación
```

Preguntas:

```text
¿qué capacidad tiene?
¿qué tan discreto es acústicamente?
¿qué restricciones requiere?
¿qué errores aparecen?
```

## Defensa

```text
audio observado
↓
detector / monitor
↓
clasificación
↓
alerta o mitigación
```

Preguntas:

```text
¿puede distinguirse SONAR del ruido normal?
¿qué indicadores deja?
¿qué filtros o políticas lo bloquean?
```

La arquitectura técnica debe permitir ambas líneas de estudio sin convertirse en un diseño de malware operativo.

---

# 36. Qué NO hemos decidido todavía

Este documento no aprueba:

```text
AudioWorklet obligatorio
Goertzel obligatorio
4-FSK obligatorio
FEC obligatorio
reescritura total
nuevo framework
TypeScript
backend nuevo
WebSockets
base de datos
```

Son posibilidades.

Primero:

```text
baseline
→ experimentos
→ evidencia
→ decisión
```

---

# 37. Relación con otros documentos

```text
README.md
    explicación pública

HISTORIA_TECNICA.md
    cómo evolucionó históricamente

docs/AUDITORIA.md
    qué encontramos mal / qué evaluar

docs/ARQUITECTURA.md
    cómo funciona el sistema

docs/ROADMAP.md
    en qué orden trabajaremos

PROGRESO.md
    qué hicimos realmente y qué aprendimos
```

Ninguno debería reemplazar a los otros.

---

# 38. Próximo paso arquitectónico

Antes de diseñar la arquitectura V2 definitiva debemos crear:

```text
docs/ROADMAP.md
```

El roadmap debe transformar:

```text
hallazgos de AUDITORIA
+
dependencias de ARQUITECTURA
```

en un orden ejecutable.

Ejemplo:

```text
no se puede comparar modulación
antes de tener métricas

no se debe limpiar código
antes de tener tests

no se debe diseñar ACK
antes de tener framing estable
```

Después del roadmap se podrá crear:

```text
PROGRESO.md
```

y los primeros GitHub Issues.

---

# 39. Resumen en una imagen mental

SONAR actual puede entenderse así:

```text
                  ┌───────────────┐
                  │     USER      │
                  └───────┬───────┘
                          │
                 ┌────────▼────────┐
                 │       UI        │
                 └────────┬────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
      ┌──────▼──────┐           ┌──────▼──────┐
      │  MESSAGES   │           │    FILES    │
      │ char → freq │           │ bytes→bits  │
      └──────┬──────┘           └──────┬──────┘
             │                         │
             └────────────┬────────────┘
                          │
                 ┌────────▼────────┐
                 │   WEB AUDIO     │
                 └────────┬────────┘
                          │
                       SPEAKER
                          │
                        AIR
                          │
                      MICROPHONE
                          │
                 ┌────────▼────────┐
                 │ ANALYSER / FFT  │
                 └────────┬────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
      ┌──────▼──────┐           ┌──────▼──────┐
      │ MESSAGE RX  │           │   FILE RX   │
      │ state mach. │           │ state mach. │
      └──────┬──────┘           └──────┬──────┘
             │                         │
             └────────────┬────────────┘
                          │
                     ┌────▼────┐
                     │   UI    │
                     └─────────┘
```

La V2 no debe destruir este conocimiento.

Debe convertir este prototipo en un sistema donde cada capa tenga una responsabilidad clara y podamos demostrar cuantitativamente que funciona mejor.

---

# 40. Primera separación ejecutada — E001

El baseline digital de mensajes introdujo una separación incremental sin
rediseñar la interfaz:

```text
src/web/static/js/core/
├── receptor_mensajes_core.js
└── metricas_mensajes.js

src/web/static/js/simulacion/
├── emisor_mensajes_sintetico.js
├── detector_tonos_referencia.js
├── canal_simulado.js
└── simulador_mensajes.js
```

Las responsabilidades quedan así:

```text
UI / micrófono
    ↓ entrega frecuencia, magnitud y tiempo
ReceptorMensajesCore
    ↓ entrega eventos
UI / registro / métricas
```

En el laboratorio digital:

```text
Emisor sintético
    ↓ Float32Array
Canal simulado
    ↓ Float32Array
Detector de referencia
    ↓ frecuencia y magnitud
ReceptorMensajesCore
    ↓ mensaje
Métricas
```

Esta estructura crea dos adaptadores alrededor de un mismo núcleo:

```text
adaptador real      → micrófono + AnalyserNode
adaptador simulado  → arrays + detector de referencia
```

`ReceptorMensajesCore` ya es utilizado por la página principal, eliminando la
copia anterior de la máquina de estados dentro de `app.js`.

## Límite arquitectónico actual

El detector de referencia conoce las fronteras de los segmentos producidos por
el emisor sintético. Por tanto, todavía no resuelve adquisición continua ni
sincronización temporal desconocida. Es una herramienta para aislar capas, no
una implementación final del módem.

La próxima evolución debe preservar esta separación y evitar que las métricas,
el detector o el modelo de canal vuelvan a mezclarse con la interfaz.

---

# 41. Contrato de referencia para archivos — E002

El baseline lógico de archivos añadió funciones puras de referencia dentro de
`protocolo_archivos.js`:

```text
crearCabeceraArchivo
decodificarCabeceraArchivo
codificarBloqueDatos
decodificarBloqueDatos
byteToBits
bitsToByte
crc16ccitt
crc8
```

Estas funciones permiten probar el formato sin Web Audio API, temporizadores ni
interfaz. Desde M2-FILE-001/003, las rutas activas de emisor y receptor también
utilizan este contrato para cabecera y bloques.

La comparación confirmó que la estructura conceptual puede ser consistente,
pero las rutas V1 combinan componentes incompatibles:

```text
TX cabecera: CRC calculado con tamaño cero
RX cabecera: CRC calculado con tamaño real

TX bloque: CRC8 polinomial
RX bloque: XOR simple

TX bloque final: longitud variable
RX bloque final: longitud fija de 9 bytes
```

También existen colisiones de roles físicos:

```text
START = DATA_0
SYNC  = DATA_1
END   = ACK
```

E002 conserva este comportamiento original para que las correcciones puedan
compararse contra evidencia. El contrato activo corregido es:

```text
Cabecera TX
    ↓ crearCabeceraArchivo()
22 bytes = tamaño + nombre + CRC16
    ↓ decodificarCabeceraArchivo()
Cabecera RX

1–8 bytes útiles
    ↓ relleno hasta 8 bytes + CRC8
9 bytes transmitidos
    ↓ validación CRC8 + longitud restante del archivo
1–8 bytes útiles recuperados
```

El campo de nombre utiliza UTF-8 y admite hasta 16 bytes. El truncado se realiza
por caracteres completos, por lo que una `ñ`, una tilde o un emoji no puede
quedar representado por una secuencia de bytes incompleta.

El relleno hace que todos los bloques tengan el mismo tamaño físico. Los ceros
añadidos no forman parte del archivo recuperado: la longitud total declarada en
la cabecera determina cuántos bytes del último bloque son útiles.

La compatibilidad lógica no valida todavía la ruta acústica. Continúan abiertos
el reloj de bits dependiente de frames, las colisiones entre marcadores y datos,
y el solapamiento de ventanas de decisión.

El progreso TX se deriva del mismo contrato:

```text
total = preámbulo
      + SOI
      + cabeceras repetidas
      + bloques fijos de 9 bytes
      + END
```

Cada tono emitido incrementa una vez el contador. El último tono END corresponde
al 100 %; no se usa el tamaño del archivo como aproximación del tiempo.
