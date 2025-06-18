"""
Protocolo de transmisión ultrasónica basado en Chirp
START → SYNC → DATOS → SYNC → END
"""

import time
import numpy as np
import sounddevice as sd
from .frecuencias import *

# Configuración del protocolo
START_DURATION = 0.12    # segundos
SYNC_DURATION = 0.08     # segundos  
CHAR_DURATION = 0.07     # segundos
CHAR_GAP = 0.03          # segundos
END_DURATION = 0.12      # segundos

# Configuración de audio
SAMPLE_RATE = 44100      # Hz
VOLUME = 0.8             # Volumen (0.0-1.0)

class ProtocoloUltrasónico:
    """Implementación del protocolo de transmisión ultrasónica"""
    
    def __init__(self, sample_rate=SAMPLE_RATE, volume=VOLUME):
        self.sample_rate = sample_rate
        self.volume = volume
        
    def generar_tono(self, frecuencia, duracion):
        """Genera un tono sinusoidal de la frecuencia especificada"""
        t = np.linspace(0, duracion, int(self.sample_rate * duracion), False)
        return self.volume * np.sin(2 * np.pi * frecuencia * t)
    
    def transmitir_caracter(self, caracter):
        """Transmite un solo carácter"""
        frecuencia = char_to_frequency(caracter)
        tono = self.generar_tono(frecuencia, CHAR_DURATION)
        silencio = np.zeros(int(self.sample_rate * CHAR_GAP))
        return np.concatenate([tono, silencio])
    
    def transmitir_mensaje(self, mensaje):
        """Transmite un mensaje completo usando el protocolo"""
        # START
        start_tono = self.generar_tono(START_FREQUENCY, START_DURATION)
        
        # SYNC inicial
        sync_tono = self.generar_tono(SYNC_FREQUENCY, SYNC_DURATION)
        
        # Datos
        datos_audio = []
        for char in mensaje:
            datos_audio.append(self.transmitir_caracter(char))
        
        # SYNC final
        sync_final = self.generar_tono(SYNC_FREQUENCY, SYNC_DURATION)
        
        # END
        end_tono = self.generar_tono(END_FREQUENCY, END_DURATION)
        
        # Concatenar todo
        audio_completo = np.concatenate([
            start_tono,
            sync_tono,
            *datos_audio,
            sync_final,
            end_tono
        ])
        
        return audio_completo
    
    def reproducir_mensaje(self, mensaje):
        """Reproduce un mensaje directamente"""
        audio = self.transmitir_mensaje(mensaje)
        sd.play(audio, self.sample_rate)
        sd.wait()
    
    def calcular_duracion_mensaje(self, mensaje):
        """Calcula la duración total de transmisión de un mensaje"""
        duracion_datos = len(mensaje) * (CHAR_DURATION + CHAR_GAP)
        return START_DURATION + SYNC_DURATION + duracion_datos + SYNC_DURATION + END_DURATION

class ReceptorUltrasónico:
    """Implementación del receptor ultrasónico"""
    
    def __init__(self, sample_rate=SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.estado = "ESPERANDO"  # ESPERANDO, RECIBIENDO, PROCESANDO
        self.buffer_mensaje = ""
        self.ultima_deteccion = 0
        
    def detectar_frecuencia(self, audio_chunk):
        """Detecta la frecuencia dominante en un chunk de audio"""
        # Implementar FFT para detectar frecuencia
        # Por ahora retorna None (placeholder)
        return None
    
    def procesar_audio(self, audio_chunk):
        """Procesa un chunk de audio y actualiza el estado"""
        frecuencia = self.detectar_frecuencia(audio_chunk)
        
        if frecuencia is None:
            return None
            
        ahora = time.time()
        
        # Detectar START
        if abs(frecuencia - START_FREQUENCY) < 50:
            self.estado = "RECIBIENDO"
            self.buffer_mensaje = ""
            self.ultima_deteccion = ahora
            return "START"
            
        # Detectar SYNC
        elif abs(frecuencia - SYNC_FREQUENCY) < 50:
            self.ultima_deteccion = ahora
            return "SYNC"
            
        # Detectar END
        elif abs(frecuencia - END_FREQUENCY) < 50:
            self.estado = "PROCESANDO"
            mensaje = self.buffer_mensaje
            self.buffer_mensaje = ""
            self.estado = "ESPERANDO"
            return f"END:{mensaje}"
            
        # Detectar datos
        elif is_data_frequency(frecuencia) and self.estado == "RECIBIENDO":
            caracter = frequency_to_char(frecuencia)
            self.buffer_mensaje += caracter
            self.ultima_deteccion = ahora
            return f"DATA:{caracter}"
            
        # Timeout
        elif ahora - self.ultima_deteccion > 1.0 and self.estado == "RECIBIENDO":
            self.estado = "ESPERANDO"
            self.buffer_mensaje = ""
            return "TIMEOUT"
            
        return None 