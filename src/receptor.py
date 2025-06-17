import numpy as np
import sounddevice as sd
import base64
from scipy.signal import find_peaks

# --- Configuración de frecuencias y protocolo ---
START_FREQ = 17500  # Hz, frecuencia de inicio
END_FREQ = 21500    # Hz, frecuencia de fin
BASE_FREQ = 18000   # Hz, frecuencia base para el primer símbolo
STEP = 100          # Hz, separación entre símbolos
SYMBOL_DURATION = 0.1  # segundos (100 ms)
SAMPLE_RATE = 44100
BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

# --- Mapeo frecuencia <-> símbolo ---
def freq_to_symbol(freq):
    idx = int(round((freq - BASE_FREQ) / STEP))
    if 0 <= idx < len(BASE32_ALPHABET):
        return BASE32_ALPHABET[idx]
    return None

def symbol_to_freq(symbol):
    idx = BASE32_ALPHABET.index(symbol)
    return BASE_FREQ + idx * STEP

# --- Decodificación de mensaje Base32 ---
def base32_to_text(b32):
    # Añade padding si es necesario
    padding = '=' * ((8 - len(b32) % 8) % 8)
    b32_padded = b32 + padding
    try:
        return base64.b32decode(b32_padded).decode('utf-8')
    except Exception as e:
        return f"[ERROR] Decodificación fallida: {e}"

# --- Detección de frecuencia dominante en una ventana ---
def detectar_frecuencia(ventana, sample_rate):
    fft = np.fft.rfft(ventana)
    freqs = np.fft.rfftfreq(len(ventana), 1/sample_rate)
    magnitudes = np.abs(fft)
    # Busca el pico más alto en el rango ultrasónico
    rango = (freqs >= 17000) & (freqs <= 22000)
    idx_max = np.argmax(magnitudes[rango])
    freq_max = freqs[rango][idx_max]
    return freq_max

# --- Grabación y decodificación en tiempo real ---
def recibir_mensaje(duracion=5):
    print(f"[INFO] Grabando {duracion} segundos de audio...")
    audio = sd.rec(int(duracion * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
    sd.wait()
    audio = audio.flatten()
    print("[INFO] Grabación finalizada. Procesando...")

    ventana_size = int(SYMBOL_DURATION * SAMPLE_RATE)
    num_ventanas = len(audio) // ventana_size
    simbolos = []
    started = False

    for i in range(num_ventanas):
        ventana = audio[i*ventana_size:(i+1)*ventana_size]
        freq = detectar_frecuencia(ventana, SAMPLE_RATE)
        # print(f"Ventana {i}: {freq:.1f} Hz")
        if not started:
            if abs(freq - START_FREQ) < STEP/2:
                started = True
                print(f"[INFO] Detectado START en ventana {i}")
            continue
        if abs(freq - END_FREQ) < STEP/2:
            print(f"[INFO] Detectado END en ventana {i}")
            break
        simbolo = freq_to_symbol(freq)
        if simbolo:
            simbolos.append(simbolo)
        else:
            simbolos.append('?')

    mensaje_b32 = ''.join(simbolos)
    print(f"[INFO] Base32 recibido: {mensaje_b32}")
    texto = base32_to_text(mensaje_b32)
    print(f"[INFO] Texto decodificado: {texto}")

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Receptor ultrasónico Base32 (FSK)")
    parser.add_argument('-d', '--duracion', type=float, default=5, help='Duración de la grabación en segundos')
    args = parser.parse_args()
    recibir_mensaje(args.duracion)
