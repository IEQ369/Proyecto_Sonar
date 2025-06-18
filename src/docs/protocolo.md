# Protocolo Ultrasónico - Documentación Técnica

## Visión General

Este protocolo está basado en el sistema de Chirp pero adaptado para frecuencias ultrasónicas (18.5-22 kHz) para mantener la discreción y evitar detección humana.

## Estructura del Protocolo

```
START (18.5 kHz) → SYNC (18.6 kHz) → DATOS (18.7-22.3 kHz) → SYNC (18.6 kHz) → END (22.0 kHz)
```

### Frecuencias de Control

- **START**: 18,500 Hz - Inicio de transmisión
- **SYNC**: 18,600 Hz - Sincronización
- **END**: 22,000 Hz - Fin de transmisión

### Frecuencias de Datos

- **Espacio**: 18,700 Hz
- **Números (0-9)**: 18,800-19,700 Hz (cada 100Hz)
- **Letras (A-Z)**: 19,800-22,300 Hz (cada 100Hz)
- **Caracteres especiales**: 22,400-25,500 Hz (cada 100Hz)

## Timing

- **START**: 0.12 segundos
- **SYNC**: 0.08 segundos
- **Carácter**: 0.07 segundos + 0.03 segundos de silencio
- **END**: 0.12 segundos

## Ventajas del Protocolo

1. **Simplicidad**: Mapeo directo ASCII → frecuencia
2. **Robustez**: Separación de 100Hz entre caracteres
3. **Discreción**: Frecuencias ultrasónicas inaudibles
4. **Compatibilidad**: Funciona con micrófonos de móviles/laptops
5. **Velocidad**: ~100 bytes/segundo (realista)

## Comparación con Chirp

| Aspecto | Chirp | Nuestro Protocolo |
|---------|-------|-------------------|
| Frecuencias | 900-8200 Hz (audible) | 18.5-22 kHz (ultrasónico) |
| Separación | 100 Hz | 100 Hz |
| Discreción | Baja | Alta |
| Compatibilidad | Alta | Media |
| Velocidad | ~100 bytes/seg | ~100 bytes/seg |

## Implementación

El protocolo se implementa en `src/core/protocolo.py` con las clases:
- `ProtocoloUltrasónico`: Para transmisión
- `ReceptorUltrasónico`: Para recepción

## Uso

```python
from src.core.protocolo import ProtocoloUltrasónico

# Transmitir mensaje
protocolo = ProtocoloUltrasónico()
protocolo.reproducir_mensaje("HOLA MUNDO")
``` 