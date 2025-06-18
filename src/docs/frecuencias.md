# Mapeo de Frecuencias Ultrasónicas

## Visión General

Este documento describe el mapeo completo de caracteres ASCII a frecuencias ultrasónicas, basado en el protocolo de Chirp pero adaptado para frecuencias inaudibles.

## Rango de Frecuencias

- **Inicio**: 18,500 Hz (START)
- **Fin**: 25,500 Hz (último carácter especial)
- **Separación**: 100 Hz entre caracteres
- **Total de caracteres**: 68 caracteres soportados

## Mapeo Detallado

### Frecuencias de Control
| Función | Frecuencia | Descripción |
|---------|------------|-------------|
| START | 18,500 Hz | Inicio de transmisión |
| SYNC | 18,600 Hz | Sincronización |
| END | 22,000 Hz | Fin de transmisión |

### Caracteres de Datos

#### Espacio
| Carácter | Frecuencia |
|----------|------------|
| ` ` (espacio) | 18,700 Hz |

#### Números (0-9)
| Carácter | Frecuencia | Carácter | Frecuencia |
|----------|------------|----------|------------|
| `0` | 18,800 Hz | `5` | 19,300 Hz |
| `1` | 18,900 Hz | `6` | 19,400 Hz |
| `2` | 19,000 Hz | `7` | 19,500 Hz |
| `3` | 19,100 Hz | `8` | 19,600 Hz |
| `4` | 19,200 Hz | `9` | 19,700 Hz |

#### Letras Mayúsculas (A-Z)
| Carácter | Frecuencia | Carácter | Frecuencia | Carácter | Frecuencia |
|----------|------------|----------|------------|----------|------------|
| `A` | 19,800 Hz | `J` | 20,700 Hz | `S` | 21,600 Hz |
| `B` | 19,900 Hz | `K` | 20,800 Hz | `T` | 21,700 Hz |
| `C` | 20,000 Hz | `L` | 20,900 Hz | `U` | 21,800 Hz |
| `D` | 20,100 Hz | `M` | 21,000 Hz | `V` | 21,900 Hz |
| `E` | 20,200 Hz | `N` | 21,100 Hz | `W` | 22,000 Hz |
| `F` | 20,300 Hz | `O` | 21,200 Hz | `X` | 22,100 Hz |
| `G` | 20,400 Hz | `P` | 21,300 Hz | `Y` | 22,200 Hz |
| `H` | 20,500 Hz | `Q` | 21,400 Hz | `Z` | 22,300 Hz |
| `I` | 20,600 Hz | `R` | 21,500 Hz | | |

#### Caracteres Especiales
| Carácter | Frecuencia | Carácter | Frecuencia | Carácter | Frecuencia |
|----------|------------|----------|------------|----------|------------|
| `!` | 22,400 Hz | `(` | 23,200 Hz | `[` | 24,000 Hz |
| `@` | 22,500 Hz | `)` | 23,300 Hz | `]` | 24,100 Hz |
| `#` | 22,600 Hz | `-` | 23,400 Hz | `\|` | 24,200 Hz |
| `$` | 22,700 Hz | `_` | 23,500 Hz | `\` | 24,300 Hz |
| `%` | 22,800 Hz | `+` | 23,600 Hz | `:` | 24,400 Hz |
| `^` | 22,900 Hz | `=` | 23,700 Hz | `;` | 24,500 Hz |
| `&` | 23,000 Hz | `{` | 23,800 Hz | `"` | 24,600 Hz |
| `*` | 23,100 Hz | `}` | 23,900 Hz | `'` | 24,700 Hz |

| Carácter | Frecuencia | Carácter | Frecuencia | Carácter | Frecuencia |
|----------|------------|----------|------------|----------|------------|
| `<` | 24,800 Hz | `,` | 25,000 Hz | `?` | 25,300 Hz |
| `>` | 24,900 Hz | `.` | 25,100 Hz | `` ` `` | 25,400 Hz |
| | | | `/` | 25,200 Hz | `~` | 25,500 Hz |

## Consideraciones Técnicas

### Ancho de Banda
- **Total**: 7,000 Hz (18,500 - 25,500 Hz)
- **Datos**: 6,800 Hz (18,700 - 25,500 Hz)
- **Separación**: 100 Hz (mínimo para evitar interferencias)

### Compatibilidad de Hardware
- **Micrófonos**: La mayoría captan hasta 20 kHz
- **Parlantes**: Algunos limitados a 18-20 kHz
- **Filtros**: Algunos sistemas filtran >20 kHz

### Optimizaciones
- **Caracteres comunes** (espacio, números, letras) en frecuencias más bajas
- **Caracteres especiales** en frecuencias más altas
- **Separación uniforme** para facilitar detección

## Funciones de Utilidad

```python
from src.core.frecuencias import *

# Convertir carácter a frecuencia
freq = char_to_frequency('A')  # 19800 Hz

# Convertir frecuencia a carácter
char = frequency_to_char(19800)  # 'A'

# Verificar tipo de frecuencia
is_control = is_control_frequency(18500)  # True
is_data = is_data_frequency(19800)  # True
``` 