import numpy as np
import sounddevice as sd
import base64
import time
import argparse

# --- Configuración de frecuencias y protocolo ---
START_FREQ = 17500  # Hz, frecuencia de inicio
END_FREQ = 21500    # Hz, frecuencia de fin
BASE_FREQ = 18000   # Hz, frecuencia base para el primer símbolo
STEP = 100          # Hz, separación entre símbolos
SYMBOL_DURATION = 0.1  # segundos (100 ms)
SAMPLE_RATE = 44100
AMPLITUDE = 0.7

# --- Tabla Base32 estándar (RFC 4648) ---
BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

# --- Mapeo símbolo <-> frecuencia ---
def symbol_to_freq(symbol):
    idx = BASE32_ALPHABET.index(symbol)
    return BASE_FREQ + idx * STEP

def freq_to_symbol(freq):
    idx = int(round((freq - BASE_FREQ) / STEP))
    if 0 <= idx < len(BASE32_ALPHABET):
        return BASE32_ALPHABET[idx]
    return None

# --- Codificación a Base32 ---
def text_to_base32(text):
    # Codifica a bytes, luego a base32 y decodifica a str sin padding
    b32 = base64.b32encode(text.encode('utf-8')).decode('utf-8').rstrip('=')
    return b32

# --- Generación de tono ---
def generate_tone(frequency, duration, sample_rate=SAMPLE_RATE, amplitude=AMPLITUDE):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return amplitude * np.sin(2 * np.pi * frequency * t)

# --- Emisión de la secuencia ---
def emitir_mensaje(texto):
    print(f"[INFO] Texto original: {texto}")
    b32 = text_to_base32(texto)
    print(f"[INFO] Base32: {b32}")
    secuencia = [START_FREQ] + [symbol_to_freq(s) for s in b32] + [END_FREQ]
    print(f"[INFO] Frecuencias a emitir: {secuencia}")
    audio = np.concatenate([
        generate_tone(f, SYMBOL_DURATION) for f in secuencia
    ])
    print("[INFO] Emisión iniciada...")
    sd.play(audio, SAMPLE_RATE)
    sd.wait()
    print("[INFO] Emisión finalizada.")

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Emisor ultrasónico Base32 (FSK)")
    parser.add_argument('-m', '--mensaje', type=str, required=True, help='Mensaje a emitir')
    args = parser.parse_args()
    emitir_mensaje(args.mensaje) 