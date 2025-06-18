import numpy as np
import sounddevice as sd
import base64
import time
import argparse

# --- Presentación tipo neofetch ---
def print_ascii():
    print(r"""
   ____                  _             ____                      
  / __ \___  ____  _____(_)___  ____  / __ \____  ____ _____ ___ 
 / / / / _ \/ __ \/ ___/ / __ \/ __ \/ /_/ / __ \/ __ `/ __ `__ \
/ /_/ /  __/ / / / /__/ / /_/ / / / / _, _/ /_/ / /_/ / / / / / /
\____/\___/_/ /_/\___/_/ .___/_/ /_/_/ |_|\____/\__,_/_/ /_/ /_/ 
                      /_/                                        
""")
    print("Proyecto Sonar // Emisor ultrasónico Base64 (FSK)")
    print("-----------------------------------------------\n")

# --- Configuración de frecuencias y protocolo ---
START_FREQ = 18500  # Hz, frecuencia de inicio (18.5 kHz - inaudible y bien captado)
END_FREQ = 19900    # Hz, frecuencia de fin (19.9 kHz - inaudible y bien captado)
SYNC_FREQ = 19200   # Hz, frecuencia de sincronización (19.2 kHz)
STEP = 100          # Hz, separación entre símbolos
SYMBOL_DURATION = 0.1  # segundos (100 ms)
SYNC_DURATION = 0.2    # segundos (200 ms)
SAMPLE_RATE = 44100
AMPLITUDE = 0.7
BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

# --- Mapeo símbolo <-> frecuencia ---
def symbol_to_freq(symbol):
    idx = BASE64_ALPHABET.index(symbol)
    # Datos van de 18,600 Hz a 19,800 Hz (120 símbolos máximo)
    return START_FREQ + STEP + idx * STEP

def base64_to_freqs(b64):
    return [symbol_to_freq(s) for s in b64 if s in BASE64_ALPHABET]

# --- Codificación a Base64 (texto o binario) ---
def datos_a_base64(datos):
    if isinstance(datos, str):
        datos = datos.encode('utf-8')
    b64 = base64.b64encode(datos).decode('utf-8').rstrip('=')
    return b64

# --- Checksum simple ---
def calcular_checksum(texto):
    return sum(ord(c) for c in texto) % 64

def checksum_to_symbol(checksum):
    return BASE64_ALPHABET[checksum]

# --- Generación de tono ---
def generate_tone(frequency, duration, sample_rate=SAMPLE_RATE, amplitude=AMPLITUDE):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return amplitude * np.sin(2 * np.pi * frequency * t)

# --- Emisión de la secuencia (texto o archivo) ---
def emitir_mensaje_o_archivo(texto=None, archivo=None, duracion=SYMBOL_DURATION, amplitud=AMPLITUDE):
    if archivo:
        with open(archivo, 'rb') as f:
            datos = f.read()
        print(f"[INFO] Archivo a enviar: {archivo} ({len(datos)} bytes)")
        b64 = datos_a_base64(datos)
        checksum = calcular_checksum(datos.decode(errors='ignore'))
    elif texto is not None:
        print(f"[INFO] Texto original: {texto}")
        b64 = datos_a_base64(texto)
        checksum = calcular_checksum(texto)
    else:
        print("[ERROR] Debes especificar un mensaje o un archivo.")
        return
    print(f"[INFO] Base64: {b64}")
    print(f"[INFO] Checksum: {checksum} ({checksum_to_symbol(checksum)})")
    secuencia = [
        START_FREQ,
        SYNC_FREQ,
        *base64_to_freqs(b64),
        symbol_to_freq(checksum_to_symbol(checksum)),
        SYNC_FREQ,
        END_FREQ
    ]
    print(f"[INFO] Frecuencias a emitir: {secuencia}")
    audio = np.concatenate([
        generate_tone(f, SYNC_DURATION if f == SYNC_FREQ else duracion, amplitude=amplitud) for f in secuencia
    ])
    print(f"[INFO] Emisión iniciada... (Duración símbolo: {duracion}s, Amplitud: {amplitud})")
    sd.play(audio, SAMPLE_RATE)
    sd.wait()
    print("[INFO] Emisión finalizada.")

# --- Test de frecuencias ---
def test_frecuencias(amplitud=AMPLITUDE, duracion=SYMBOL_DURATION):
    print("[TEST] Emitiendo START...")
    sd.play(generate_tone(START_FREQ, SYNC_DURATION, amplitude=amplitud), SAMPLE_RATE)
    sd.wait()
    print("[TEST] Emitiendo SYNC...")
    sd.play(generate_tone(SYNC_FREQ, SYNC_DURATION, amplitude=amplitud), SAMPLE_RATE)
    sd.wait()
    for i, s in enumerate(BASE64_ALPHABET):
        freq = symbol_to_freq(s)
        print(f"[TEST] Emitiendo: {s} ({freq} Hz)")
        sd.play(generate_tone(freq, duracion, amplitude=amplitud), SAMPLE_RATE)
        sd.wait()
    print("[TEST] Emitiendo END...")
    sd.play(generate_tone(END_FREQ, SYNC_DURATION, amplitude=amplitud), SAMPLE_RATE)
    sd.wait()
    print("[TEST] Finalizado.")

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    print_ascii()
    parser = argparse.ArgumentParser(description="Emisor ultrasónico Base64 (FSK)")
    parser.add_argument('-m', '--mensaje', type=str, help='Mensaje a emitir')
    parser.add_argument('-f', '--file', type=str, help='Archivo a emitir')
    parser.add_argument('--dur', type=float, default=SYMBOL_DURATION, help='Duración de cada símbolo (segundos)')
    parser.add_argument('--amp', type=float, default=AMPLITUDE, help='Amplitud del tono (0-1)')
    parser.add_argument('--test', action='store_true', help='Emitir test de frecuencias')
    args = parser.parse_args()
    if args.test:
        test_frecuencias(amplitud=args.amp, duracion=args.dur)
    else:
        emitir_mensaje_o_archivo(texto=args.mensaje, archivo=args.file, duracion=args.dur, amplitud=args.amp) 