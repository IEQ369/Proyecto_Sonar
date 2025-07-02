"""
Proyecto Sonar - Core Module
Herramienta ofensiva de exfiltración de datos por ultrasonido
"""

__version__ = "1.0.0"
__author__ = "Qwerty"
__description__ = "Sistema ultrasónico para exfiltración de datos"

# Importar módulos principales
from .frecuencias import *
from .emisor import *

# Exportar funciones principales para uso directo
__all__ = [
    # Frecuencias
    'char_to_frequency',
    'frequency_to_char',
    'START_FREQUENCY',
    'SYNC_FREQUENCY', 
    'END_FREQUENCY',
    'is_data_frequency',
    
    # Emisor
    'emitir_mensaje',
    'generate_tone',
    'calcular_duracion_mensaje',
    
    # Receptor
    'escuchar_continuamente',
    'detectar_frecuencia'
] 