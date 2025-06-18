"""
Mapeo de frecuencias ultrasónicas basado en el protocolo de Chirp
Adaptado para frecuencias inaudibles (18.5-22 kHz)
"""

# Frecuencias de control (protocolo)
START_FREQUENCY = 18500  # Hz - Inicio de transmisión
SYNC_FREQUENCY = 18600   # Hz - Sincronización
END_FREQUENCY = 22000    # Hz - Fin de transmisión

# Rango de frecuencias para datos (cada 100Hz de separación)
MIN_DATA_FREQUENCY = 18700  # Hz
MAX_DATA_FREQUENCY = 21900  # Hz
FREQUENCY_STEP = 100        # Hz

# Mapeo ASCII → Frecuencia ultrasónica (basado en chirp)
CHAR_FREQUENCIES = {
    # Espacio - frecuencia más baja
    ' ': 18700,
    
    # Números - 18800-19700 Hz (100Hz separación)
    '0': 18800, '1': 18900, '2': 19000, '3': 19100, '4': 19200,
    '5': 19300, '6': 19400, '7': 19500, '8': 19600, '9': 19700,
    
    # Letras mayúsculas - 19800-21900 Hz (100Hz separación)
    'A': 19800, 'B': 19900, 'C': 20000, 'D': 20100, 'E': 20200,
    'F': 20300, 'G': 20400, 'H': 20500, 'I': 20600, 'J': 20700,
    'K': 20800, 'L': 20900, 'M': 21000, 'N': 21100, 'O': 21200,
    'P': 21300, 'Q': 21400, 'R': 21500, 'S': 21600, 'T': 21700,
    'U': 21800, 'V': 21900, 'W': 22000, 'X': 22100, 'Y': 22200,
    'Z': 22300,
    
    # Caracteres especiales - 22400-23300 Hz
    '!': 22400, '@': 22500, '#': 22600, '$': 22700, '%': 22800,
    '^': 22900, '&': 23000, '*': 23100, '(': 23200, ')': 23300,
    '-': 23400, '_': 23500, '+': 23600, '=': 23700, '{': 23800,
    '}': 23900, '[': 24000, ']': 24100, '|': 24200, '\\': 24300,
    ':': 24400, ';': 24500, '"': 24600, "'": 24700, '<': 24800,
    '>': 24900, ',': 25000, '.': 25100, '/': 25200, '?': 25300,
    '`': 25400, '~': 25500,
}

def char_to_frequency(char):
    """Convierte un carácter a su frecuencia correspondiente"""
    return CHAR_FREQUENCIES.get(char.upper(), 18700)  # Espacio por defecto

def frequency_to_char(frequency):
    """Convierte una frecuencia a su carácter correspondiente"""
    # Buscar la frecuencia más cercana
    for char, freq in CHAR_FREQUENCIES.items():
        if abs(freq - frequency) <= FREQUENCY_STEP / 2:
            return char
    return ' '  # Espacio por defecto

def get_all_frequencies():
    """Retorna todas las frecuencias disponibles"""
    return list(CHAR_FREQUENCIES.values())

def get_frequency_range():
    """Retorna el rango de frecuencias de datos"""
    return MIN_DATA_FREQUENCY, MAX_DATA_FREQUENCY

def is_control_frequency(frequency):
    """Verifica si es una frecuencia de control"""
    return frequency in [START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY]

def is_data_frequency(frequency):
    """Verifica si es una frecuencia de datos"""
    return MIN_DATA_FREQUENCY <= frequency <= MAX_DATA_FREQUENCY 