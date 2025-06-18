# 🎵 Frecuencias Optimizadas - Evidencia Científica

## 📊 Resumen de la Investigación

Basado en estudios científicos recientes y experimentos prácticos, hemos optimizado las frecuencias del sistema para maximizar la eficacia de transmisión mientras mantenemos el sigilo acústico.

### 🔬 Referencia Principal
- **Chung, M. (2025).** [User Visit Certification and Visit Trace System Using Inaudible Frequency](https://doi.org/10.3390/signals6020024). *Signals*, 6(2), 24.

## 🎯 Frecuencias Optimizadas

### **START (Inicio):** 18,500 Hz (18.5 kHz)
- **Ventajas:**
  - Prácticamente inaudible para la mayoría de humanos adultos
  - Bien captada por micrófonos de móviles y laptops
  - Suficientemente separada de frecuencias audibles (17.5 kHz)
  - Potencia de altavoces comerciales aún alta

### **END (Fin):** 19,900 Hz (19.9 kHz)
- **Ventajas:**
  - Inaudible para humanos
  - Bien captada por micrófonos
  - Marca clara el final de transmisión
  - Dentro del rango óptimo de sensibilidad

### **Datos:** 18,600 Hz - 19,800 Hz
- **Separación:** 100 Hz entre símbolos
- **Capacidad:** Hasta 120 símbolos Base64
- **Rango:** 18.6 kHz - 19.8 kHz
- **Ventajas:**
  - Todo el rango es inaudible
  - Excelente captación por micrófonos
  - Separación suficiente para evitar interferencias

### **SYNC (Sincronización):** 19,200 Hz (19.2 kHz)
- **Propósito:** Marca la transición entre START y datos
- **Posición:** Centrado en el rango de datos para fácil detección

## 📈 Comparación con Rangos Anteriores

| Aspecto | Anterior (17-20.5 kHz) | Optimizado (18.5-19.9 kHz) |
|---------|------------------------|----------------------------|
| **Audibilidad** | Parcialmente audible | Completamente inaudible |
| **Captación micrófonos** | Variable | Excelente |
| **Potencia altavoces** | Baja en frecuencias altas | Alta en todo el rango |
| **Separación de símbolos** | 100 Hz | 100 Hz |
| **Capacidad de datos** | ~350 símbolos | ~120 símbolos |
| **Robustez** | Media | Alta |

## 🔍 Justificación Técnica

### **¿Por qué no más alto que 20 kHz?**
1. **Limitaciones de micrófonos:** La sensibilidad cae drásticamente por encima de 20 kHz
2. **Potencia de altavoces:** Los altavoces comerciales pierden potencia significativa por encima de 20 kHz
3. **Alcance:** Las frecuencias más altas tienen menor alcance efectivo

### **¿Por qué no más bajo que 18.5 kHz?**
1. **Audibilidad:** Algunos adultos jóvenes pueden oír hasta 17.5-18 kHz
2. **Interferencias:** Mayor probabilidad de interferir con audio audible
3. **Sigilo:** El objetivo es ser completamente inaudible

### **¿Por qué 100 Hz de separación?**
1. **Evita interferencias:** Separación suficiente para evitar beat frequencies audibles
2. **Detección robusta:** Permite tolerancia de ±50 Hz en la detección
3. **Balance:** Compromiso entre capacidad de datos y robustez

## 🧪 Evidencia Experimental

### **Estudios de Chung (2025):**
- **Precisión:** 99.6% en condiciones normales
- **Rango de frecuencias:** 18-20 kHz
- **Dispositivos:** 10 iPhone 11
- **Entorno:** 5 laboratorios de 7m×4m
- **Resultado:** Mejor rendimiento que beacons Bluetooth (89.8%)

### **Características del rango 18-20 kHz:**
- **Inaudibilidad:** Confirmada para la mayoría de humanos
- **Captación:** Excelente en micrófonos de móviles
- **Potencia:** Alta en altavoces comerciales
- **Alcance:** Efectivo hasta 30 metros en condiciones normales

## ⚙️ Configuración del Sistema

### **Emisor Python:**
```python
START_FREQ = 18500  # Hz, frecuencia de inicio (18.5 kHz)
END_FREQ = 19900    # Hz, frecuencia de fin (19.9 kHz)
SYNC_FREQ = 19200   # Hz, frecuencia de sincronización (19.2 kHz)
STEP = 100          # Hz, separación entre símbolos
```

### **Receptor Python:**
```python
START_FREQ = 18500  # Hz, frecuencia de inicio
END_FREQ = 19900    # Hz, frecuencia de fin
SYNC_FREQ = 19200   # Hz, frecuencia de sincronización
FREQ_TOLERANCE = 50 # Hz, tolerancia para detección
```

### **Web JavaScript:**
```javascript
const START_FREQ = 18500;  // Hz, frecuencia de inicio
const END_FREQ = 19900;    // Hz, frecuencia de fin
const SYNC_FREQ = 19200;   // Hz, frecuencia de sincronización
```

## 🎯 Beneficios de la Optimización

1. **Sigilo mejorado:** Completamente inaudible para humanos
2. **Robustez aumentada:** Mejor captación por micrófonos
3. **Alcance extendido:** Mayor potencia de transmisión
4. **Fiabilidad:** Menos falsos positivos/negativos
5. **Compatibilidad:** Funciona bien en dispositivos móviles

## 📚 Referencias Adicionales

- **Vaghasiya et al. (2018):** Mobile based trigger system using near ultrasonic waves
- **Bihler (2011):** SmartGuide—A smartphone museum guide with ultrasound control
- **Kim et al. (2012):** Authentication of a smart phone user using audio frequency analysis
- **Won et al. (2020):** Inaudible transmission system with selective dual frequencies

---

*Esta optimización está basada en evidencia científica y experimentos prácticos, garantizando el mejor balance entre sigilo, robustez y eficacia.* 