"""
Mapeo de frecuencias ultrasónicas SOLO para letras y números, rango funcional 18.7-19.6 kHz
"""

# Frecuencias de control (protocolo)
START_FREQUENCY = 18500  # Hz - Inicio de transmisión
SYNC_FREQUENCY = 18600   # Hz - Sincronización
END_FREQUENCY = 19700    # Hz - Fin de transmisión

MIN_DATA_FREQUENCY = 18700
MAX_DATA_FREQUENCY = 19600
FREQUENCY_STEP = 100

# Letras y números (A-Z, 0-9) en el rango funcional - MAPEO ÚNICO
CHAR_FREQUENCIES = {
    # Letras A-Z (26 letras)
    'A': 18700, 'B': 18800, 'C': 18900, 'D': 19000, 'E': 19100,
    'F': 19200, 'G': 19300, 'H': 19400, 'I': 19500, 'J': 19600,
    'K': 19700, 'L': 19800, 'M': 19900, 'N': 20000, 'O': 20100,
    'P': 20200, 'Q': 20300, 'R': 20400, 'S': 20500, 'T': 20600,
    'U': 20700, 'V': 20800, 'W': 20900, 'X': 21000, 'Y': 21100,
    'Z': 21200,
    
    # Números 0-9 (10 números)
    '0': 21300, '1': 21400, '2': 21500, '3': 21600, '4': 21700,
    '5': 21800, '6': 21900, '7': 22000, '8': 22100, '9': 22200,
    ' ': 22300, # Espacio
    'Ñ': 22400  # Ñ
}

def char_to_frequency(char):
    """Convierte un carácter a su frecuencia correspondiente"""
    return CHAR_FREQUENCIES.get(char.upper(), 18700)

def frequency_to_char(frequency):
    """Convierte una frecuencia a su carácter correspondiente"""
    for char, freq in CHAR_FREQUENCIES.items():
        if abs(freq - frequency) <= FREQUENCY_STEP / 2:
            return char
    return ''

def get_all_frequencies():
    return list(CHAR_FREQUENCIES.values())

def get_frequency_range():
    return MIN_DATA_FREQUENCY, MAX_DATA_FREQUENCY

def is_control_frequency(frequency):
    return frequency in [START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY]

def is_data_frequency(frequency):
    return MIN_DATA_FREQUENCY <= frequency <= MAX_DATA_FREQUENCY 