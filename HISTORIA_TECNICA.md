# Historia Técnica - SONAR

**Nota**: Este archivo contiene la evolución técnica completa del proyecto. Para uso rápido, consulta el [README.md](README.md) principal.

## Descripción

Sistema completo de transmisión de datos por ultrasonido usando **Web Audio API** y **JavaScript puro**. Permite transmitir mensajes de texto y archivos entre dispositivos (laptops, móviles) aprovechando hardware de audio común, sin necesidad de red ni cables.

**Estado Actual**: ✅ **FUNCIONAL** - Sistema robusto con transmisión de mensajes y archivos, optimizado para hardware de consumo.

## Evolución Técnica del Proyecto

### **Fase 1: Python (Abandonada)**

**Problemas descubiertos:**
- **Permisos móviles**: `sounddevice` no soporta dispositivos móviles, limitando las pruebas a laptops.
- **FFT lento**: El procesamiento en Python era muy lento para detección en tiempo real.
- **Detección imprecisa**: El FFT de Python no detectaba específicamente ultrasonidos, solo tenía rangos generales.
- **Confusión de emisión**: Al usar Python como backend, el celular no emitía sus propios sonidos, solo recibía órdenes de la laptop.

### **Fase 2: Migración a Web (Actual)**

**Razones de la migración:**
- **HTTPS obligatorio**: Los navegadores móviles requieren HTTPS para permisos de micrófono.
- **Web Audio API**: Procesamiento de audio nativo y rápido en el navegador.
- **Multiplataforma**: Funciona en laptops, móviles, tablets sin instalación.
- **Tiempo real**: FFT y detección mucho más rápida que Python.

## Problemas Técnicos Descubiertos y Soluciones

### **Problema: Tipo de Onda Senoidal Débil**

**Descubrimiento:**
- Las ondas senoidales puras se atenúan mucho en frecuencias ultrasónicas.
- El micrófono no las detectaba bien, especialmente frecuencias altas (J, K, P, X, Y, Z, Ñ).
- Apps móviles de generación de tonos "sonaban diferente" y eran más detectables.

**Solución:**
- **Generador de ondas personalizado**: Creamos `generador_onda.js` con múltiples tipos de onda.
- **Onda cuadrada**: Mucho más detectable por tener más armónicos.
- **Control de amplitud por carácter**: Números (350%), letras problemáticas (180%), resto (100%).

### **Problema: Conflictos de Frecuencias**

**Descubrimiento:**
- **C (19000 Hz) vs SYNC (19050 Hz)**: Solo 50 Hz de diferencia.
- **I (19600 Hz) vs END (19600 Hz)**: Misma frecuencia (0 Hz diferencia).
- **D (19100 Hz) vs SYNC (19050 Hz)**: Solo 50 Hz de diferencia.

**Solución:**
- **Reasignación de frecuencias**: C → 18300 Hz, I → 18400 Hz, D → 18200 Hz.
- **Sistema de detección automática**: Función `detectarConflictos()` que identifica problemas.
- **Rango optimizado**: 18200-22300 Hz con separación mínima de 100 Hz.

### **Problema: Limitaciones de Hardware Móvil**

**Descubrimiento:**
- **Parlantes pequeños**: Distorsión al máximo volumen en frecuencias altas.
- **Emisión débil**: Celular → Laptop funciona mal, Laptop → Celular funciona bien.
- **Frecuencias problemáticas**: Números (21400-22300 Hz) muy difíciles de detectar.

**Solución:**
- **Amplitud diferenciada**: Números 6-9 (350%), números 0-5 (250%).
- **Protocolo robusto**: Tolerancia de 60 Hz, detección estable con 3 muestras.
- **Documentación de limitaciones**: El hardware de cada dispositivo es el principal limitante.

### **Problema: Caracteres Especiales**

**Descubrimiento:**
- **Ñ no se emitía**: El filtro de caracteres eliminaba la Ñ del procesamiento.
- **Filtro restrictivo**: `/[^A-Z0-9 ]/g` no incluía caracteres especiales.

**Solución:**
- **Filtro corregido**: `/[^A-Z0-9Ñ ]/g` incluye la Ñ.
- **Amplitud aumentada**: Ñ recibe 180% del volumen normal.



## Características Principales

### **Transmisión de Mensajes**
- Protocolo robusto: START → SYNC → DATOS → SYNC → END
- Mapeo ASCII completo: A-Z, 0-9, Ñ, espacio
- Control de volumen por carácter (números y letras problemáticas)
- Detección estable con historial de frecuencias
- Debug en tiempo real con logs específicos

### **Transmisión de Archivos**
- Protocolo binario separado: 17000-18000 Hz
- Confirmación ACK/NACK tipo TCP
- Barra de progreso en tiempo real
- Descarga automática del archivo recibido
- Cancelación automática al cerrar/recargar página

### **Interfaz Web**
- Diseño cyberpunk con visualización FFT en tiempo real
- Navegación entre mensajes y archivos
- Drag & drop para archivos
- Feedback visual del estado de transmisión
- Responsive para móviles y laptops



## Protocolos Implementados

### **Protocolo de Mensajes (18600-22300 Hz)**
- **START**: 18500 Hz
- **SYNC**: 19050 Hz  
- **END**: 19600 Hz
- **Caracteres**: 18600-22300 Hz (espaciados cada 100 Hz)
- **Tolerancia**: 60 Hz
- **Duración**: Símbolos 0.06s, marcadores 0.09s

### **Protocolo de Archivos (17000-18000 Hz)**
- **START**: 17000 Hz
- **SYNC**: 17500 Hz
- **END**: 18000 Hz
- **BIT_0**: 17100 Hz
- **BIT_1**: 17600 Hz
- **ACK**: 17200 Hz
- **NACK**: 17700 Hz

## Técnicas de Robustez Implementadas

### **1. Emisor (Técnicas de Calidad y Robustez)**

#### [OK] **Implementadas y Funcionales:**
- **Fade in/out**: Suaviza inicio y final de cada tono para evitar clics y artefactos
- **Control de volumen por carácter**: Números (350%), letras problemáticas (180%), resto (100%)
- **Duraciones precisas**: Símbolos 0.06s, marcadores 0.09s, gaps 0.02s
- **Secuencia de protocolo clara**: START → SYNC → DATOS → SYNC → END
- **Mapeo de caracteres amplio**: A-Z, 0-9, Ñ, espacio
- **Configurabilidad de parámetros**: Amplitud, duración, fade time ajustables
- **Logs de depuración**: Muestra secuencia de frecuencias y eventos

#### [X] **No Implementadas (Consideradas Innecesarias):**
- **Tonos paralelos**: No se implementó por complejidad y limitaciones de hardware
- **Variación de parámetros según ambiente**: Se mantuvieron valores fijos optimizados

### **2. Receptor (Técnicas de Detección y Decodificación)**

#### [OK] **Implementadas y Funcionales:**
- **Detección de frecuencia dominante**: Busca el pico más fuerte en el espectro
- **Tolerancia de frecuencia configurable**: 60 Hz para aceptar variaciones
- **Umbral de magnitud configurable**: Filtra ruido (mínimo 12 en escala 0-255)
- **Buffer de historia de frecuencias**: Usa 5 frames para confirmar estabilidad
- **Debounce y lockout avanzados**: Evita repeticiones accidentales
- **Reconocimiento de marcadores**: Cambia estado solo con START, SYNC, END correctos
- **Timeouts y reinicio automático**: 2 segundos sin actividad = reinicio
- **Logs de depuración**: Muestra estado, buffer, frecuencias detectadas

#### [X] **No Implementadas:**
- **Detección de tonos paralelos**: No aplicable sin emisión paralela
- **Ajuste dinámico de parámetros**: Se mantuvieron valores fijos optimizados

### **3. FFT y Visualización (Técnicas de Fluidez)**

#### [OK] **Implementadas y Funcionales:**
- **Tamaño de FFT optimizado**: 2048 para balance entre resolución y velocidad
- **SmoothingTimeConstant bajo**: 0.3 para cambios casi en tiempo real
- **Actualización con requestAnimationFrame**: Sincronizado con refresco de pantalla
- **Canvas responsivo**: Se adapta a cualquier pantalla
- **Visualización clara de picos**: Barras con gradientes y resaltado del dominante
- **Visualización de frecuencia y magnitud**: Muestra valores en tiempo real
- **Optimización del bucle de dibujo**: Solo actualiza lo necesario por frame
- **Rango de frecuencias específico**: 18100-22500 Hz para ultrasonidos

#### [X] **No Implementadas:**
- **Visualización de segunda frecuencia**: No era necesaria para el protocolo
- **Ajuste automático del rango**: Se mantuvo fijo para consistencia
- **Animaciones para eventos**: Se prefirió simplicidad sobre efectos visuales

### **4. Técnicas de Robustez Específicas del Proyecto**

#### [OK] **Innovaciones Propias:**
- **Control de amplitud diferenciado**: Números 6-9 (350%), 0-5 (250%), letras problemáticas (180%)
- **Detección automática de conflictos**: Función que identifica frecuencias problemáticas
- **Reasignación inteligente de frecuencias**: C, D, I movidas para evitar conflictos
- **Protocolo binario separado**: Archivos en rango diferente (17000-18000 Hz)
- **Confirmación ACK/NACK**: Sistema tipo TCP para archivos
- **Cancelación automática**: Limpieza de recursos al cerrar/recargar

## Limitaciones y Consideraciones

### Hardware
- **Parlantes móviles**: Distorsión en frecuencias altas, emisión débil
- **Micrófonos**: Sensibilidad variable, atenuación en ultrasonidos
- **Distancia**: Limitada por atenuación del aire (1-3 metros máximo)

### Software
- **HTTPS requerido**: Para permisos de micrófono en móviles
- **Navegador**: Web Audio API no disponible en navegadores antiguos
- **Rendimiento**: FFT en tiempo real puede ser intensivo en dispositivos débiles

### Ambiente
- **Ruido**: Sensible a interferencias y eco
- **Condiciones**: Rendimiento variable según acústica del ambiente

## Roadmap Completado

- [x] Migración de Python a Web Audio API
- [x] Protocolo robusto de mensajes con detección estable
- [x] Protocolo binario para archivos con confirmación
- [x] Generador de ondas personalizado (senoidal, cuadrada, sierra, triangular)
- [x] Control de volumen por carácter para máxima robustez
- [x] Detección automática de conflictos de frecuencias
- [x] Interfaz web responsive con visualización FFT
- [x] Sistema de debug y logs en tiempo real
- [x] Cancelación automática y limpieza de recursos
- [x] Documentación completa de problemas y soluciones

## Referencias

- [SurfingAttack:](https://surfingattack.github.io/)()
- [SurfingAttack: Interactive Hidden Attack on Voice Assistants Using Ultrasonic Guided Waves](https://surfingattack.github.io/papers/NDSS-surfingattack.pdf)
- [Web Audio API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Chirp: Sound-based Data Transfer](https://github.com/solst-ice/chirp)

## Contribuciones

Este proyecto es parte de trabajo académico universitario. Las contribuciones son bienvenidas, especialmente en:
- Optimización de algoritmos de detección
- Mejoras en la interfaz de usuario
- Documentación de casos de uso
- Pruebas en diferentes dispositivos y ambientes

## Licencia

Proyecto educativo. Uso responsable requerido.
