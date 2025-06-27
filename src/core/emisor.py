import numpy as np
import sounddevice as sd
import time
import argparse
import sys
import os

# Agregar el directorio padre al path para imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.frecuencias import char_to_frequency, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY
except ImportError:
    from frecuencias import char_to_frequency, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY

# --- Configuración de emisión ---
SYMBOL_DURATION = 0.05  # segundos (50 ms)
SYNC_DURATION = 0.1     # segundos (100 ms)
SAMPLE_RATE = 44100
AMPLITUDE = 0.7

# --- Generación de tono ---
def generate_tone(frequency, duration, sample_rate=SAMPLE_RATE, amplitude=AMPLITUDE):
    """Genera un tono sinusoidal de la frecuencia especificada"""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return amplitude * np.sin(2 * np.pi * frequency * t)

# --- Cálculo de duración de mensaje ---
def calcular_duracion_mensaje(mensaje, duracion=SYMBOL_DURATION):
    """Calcula la duración total de transmisión de un mensaje"""
    # START + SYNC inicial + datos + SYNC final + END
    duracion_datos = len(mensaje) * duracion
    return SYNC_DURATION + SYNC_DURATION + duracion_datos + SYNC_DURATION + SYNC_DURATION

# --- Emisión de mensaje completo ---
def emitir_mensaje(texto, duracion=SYMBOL_DURATION, amplitud=AMPLITUDE):
    """Emite un mensaje completo usando el protocolo START → SYNC → DATOS → SYNC → END"""
    if not texto:
        print("[ERROR] Mensaje vacío")
        return

    print(f"[INFO] Texto a enviar: {texto}")
    print(f"[INFO] Duración estimada: {calcular_duracion_mensaje(texto, duracion):.2f} segundos")
    
    # Convertir texto a secuencia de frecuencias
    frecuencias_datos = [char_to_frequency(c) for c in texto]
    
    # Secuencia completa del protocolo
    secuencia = [
        START_FREQUENCY,  # Señal de inicio
        SYNC_FREQUENCY,   # Sincronización inicial
        *frecuencias_datos,  # Datos del mensaje
        SYNC_FREQUENCY,   # Sincronización final
        END_FREQUENCY     # Señal de fin
    ]
    
    print(f"[INFO] Frecuencias a emitir: {secuencia}")
    
    # Generar audio completo
    audio_segmentos = []
    for i, freq in enumerate(secuencia):
        # Usar duración SYNC para START, SYNC y END, duración normal para datos
        if freq in [START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY]:
            duracion_tono = SYNC_DURATION
        else:
            duracion_tono = duracion
            
        tono = generate_tone(freq, duracion_tono, SAMPLE_RATE, amplitud)
        audio_segmentos.append(tono)
    
    # Concatenar todos los segmentos
    audio_completo = np.concatenate(audio_segmentos)
    
    print(f"[INFO] Emisión iniciada... (Duración símbolo: {duracion}s, Amplitud: {amplitud})")
    print(f"[INFO] Duración total: {len(audio_completo)/SAMPLE_RATE:.2f} segundos")
    
    # Reproducir audio
    sd.play(audio_completo, SAMPLE_RATE)
    sd.wait()
    print("[INFO] Emisión finalizada.")

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Emisor ultrasónico (FSK)")
    parser.add_argument('-m', '--mensaje', type=str, required=True, help='Mensaje a emitir')
    args = parser.parse_args()
    
    emitir_mensaje(args.mensaje)