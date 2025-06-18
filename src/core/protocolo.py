"""
Protocolo de transmisión ultrasónica basado en Chirp
START → SYNC → DATOS → SYNC → END
"""

import time
import numpy as np
import sounddevice as sd
from .frecuencias import *
import threading
import os

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
        self.frecuencia_base = START_FREQUENCY  # Para compatibilidad
        
    def generar_tono(self, frecuencia, duracion):
        """Genera un tono sinusoidal de la frecuencia especificada"""
        t = np.linspace(0, duracion, int(self.sample_rate * duracion), False)
        return self.volume * np.sin(2 * np.pi * frecuencia * t)
    
    def visualizar_fft_ascii(self, audio_chunk, frecuencia_esperada=None):
        """Visualiza el espectro FFT en ASCII art"""
        # Calcular FFT
        fft = np.fft.fft(audio_chunk)
        freqs = np.fft.fftfreq(len(audio_chunk), 1/self.sample_rate)
        
        # Solo frecuencias positivas
        positive_freqs = freqs[:len(freqs)//2]
        positive_fft = np.abs(fft[:len(fft)//2])
        
        # Encontrar la frecuencia dominante
        if len(positive_fft) > 0:
            max_idx = np.argmax(positive_fft)
            freq_dominante = positive_freqs[max_idx]
            amplitud_max = positive_fft[max_idx]
        else:
            freq_dominante = 0
            amplitud_max = 0
        
        # Crear visualización ASCII
        altura = 10
        ancho = 60
        
        # Limpiar pantalla (Windows)
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print(f"🎵 ESPECTRO FFT ULTRASÓNICO")
        print(f"═" * 50)
        print(f"📊 Frecuencia dominante: {freq_dominante:.0f} Hz")
        print(f"📈 Amplitud máxima: {amplitud_max:.2f}")
        
        if frecuencia_esperada:
            print(f"🎯 Frecuencia esperada: {frecuencia_esperada:.0f} Hz")
            diferencia = abs(freq_dominante - frecuencia_esperada)
            print(f"📏 Diferencia: {diferencia:.0f} Hz")
        
        print(f"═" * 50)
        
        # Crear gráfico ASCII
        for i in range(altura):
            linea = ""
            for j in range(ancho):
                # Mapear posición a frecuencia
                freq_idx = int(j * len(positive_freqs) / ancho)
                if freq_idx < len(positive_fft):
                    amplitud = positive_fft[freq_idx]
                    # Normalizar amplitud
                    amplitud_norm = min(amplitud / (amplitud_max + 1e-10), 1.0)
                    # Mapear a altura
                    altura_char = int(amplitud_norm * altura)
                    
                    if i >= (altura - altura_char):
                        if amplitud_norm > 0.8:
                            linea += "█"
                        elif amplitud_norm > 0.6:
                            linea += "▓"
                        elif amplitud_norm > 0.4:
                            linea += "▒"
                        elif amplitud_norm > 0.2:
                            linea += "░"
                        else:
                            linea += " "
                    else:
                        linea += " "
                else:
                    linea += " "
            print(linea)
        
        # Escala de frecuencias
        freq_min = positive_freqs[0] if len(positive_freqs) > 0 else 0
        freq_max = positive_freqs[-1] if len(positive_freqs) > 0 else 0
        print(f"📏 {freq_min:.0f} Hz {' ' * (ancho-20)} {freq_max:.0f} Hz")
        print(f"═" * 50)
    
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
    
    def reproducir_mensaje_con_visualizacion(self, mensaje):
        """Reproduce un mensaje con visualización FFT en tiempo real"""
        audio = self.transmitir_mensaje(mensaje)
        
        # Dividir audio en chunks para visualización
        chunk_size = int(self.sample_rate * 0.1)  # 100ms chunks
        chunks = [audio[i:i+chunk_size] for i in range(0, len(audio), chunk_size)]
        
        print(f"🚀 Transmitiendo: '{mensaje}'")
        print(f"⏱️  Duración estimada: {len(audio)/self.sample_rate:.2f}s")
        print(f"📦 Chunks de visualización: {len(chunks)}")
        print("=" * 50)
        
        # Reproducir con visualización
        for i, chunk in enumerate(chunks):
            # Mostrar información del chunk
            if i == 0:
                self.visualizar_fft_ascii(chunk, START_FREQUENCY)
            elif i == 1:
                self.visualizar_fft_ascii(chunk, SYNC_FREQUENCY)
            elif i == len(chunks) - 2:
                self.visualizar_fft_ascii(chunk, SYNC_FREQUENCY)
            elif i == len(chunks) - 1:
                self.visualizar_fft_ascii(chunk, END_FREQUENCY)
            else:
                # Para datos, mostrar la frecuencia esperada del carácter
                char_idx = (i - 2) // 2  # Aproximación
                if char_idx < len(mensaje):
                    freq_esperada = char_to_frequency(mensaje[char_idx])
                    self.visualizar_fft_ascii(chunk, freq_esperada)
                else:
                    self.visualizar_fft_ascii(chunk)
            
            # Reproducir chunk
            sd.play(chunk, self.sample_rate)
            sd.wait()
            
            # Pequeña pausa para visualización
            time.sleep(0.05)
        
        print("✅ Transmisión completada!")
    
    def reproducir_mensaje(self, mensaje):
        """Reproduce un mensaje directamente (método original)"""
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