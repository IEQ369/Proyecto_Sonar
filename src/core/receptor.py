import numpy as np
import sounddevice as sd
import base64
from scipy.signal import find_peaks

# --- Presentación tipo neofetch ---
def print_ascii():
    print(r"""
   ____                  _             ____                      
  / __ \\___  ____  _____(_)___  ____  / __ \\____  ____ _____ ___ 
 / / / / _ \\/ __ \\/ ___/ / __ \\/ __ \\/ /_/ / __ \\/ __ `/ __ `__ \\
/ /_/ /  __/ / / / /__/ / /_/ / / / / _, _/ /_/ / /_/ / / / / / /
\\____/\\___/_/ /_/\\___/_/ .___/_/ /_/_/ |_|\\____/\\__,_/_/ /_/ /_/ 
                      /_/                                        
""")
    print("Proyecto Sonar // Receptor ultrasónico Base64 (FSK)")
    print("-----------------------------------------------\n")

# --- Configuración de frecuencias y protocolo ---
START_FREQ = 18500  # Hz, frecuencia de inicio (18.5 kHz - inaudible y bien captado)
END_FREQ = 19900    # Hz, frecuencia de fin (19.9 kHz - inaudible y bien captado)
SYNC_FREQ = 19200   # Hz, frecuencia de sincronización (19.2 kHz)
STEP = 100          # Hz, separación entre símbolos
SYMBOL_DURATION = 0.1  # segundos (100 ms)
SYNC_DURATION = 0.2    # segundos (200 ms)
SAMPLE_RATE = 44100
FREQ_TOLERANCE = 50  # Hz, tolerancia para detección robusta
LOCKOUT_WINDOWS = 2  # Ventanas a ignorar tras detectar un símbolo
END_TIMEOUT_WINDOWS = 3  # Ventanas de timeout para END
BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

# --- Mapeo símbolo <-> frecuencia ---
def symbol_to_freq(symbol):
    idx = BASE64_ALPHABET.index(symbol)
    # Datos van de 18,600 Hz a 19,800 Hz (120 símbolos máximo)
    return START_FREQ + STEP + idx * STEP

def freq_to_symbol(freq):
    idx = int(round((freq - (START_FREQ + STEP)) / STEP))
    if 0 <= idx < len(BASE64_ALPHABET):
        return BASE64_ALPHABET[idx]
    return None

# --- Checksum simple ---
def calcular_checksum(texto):
    return sum(ord(c) for c in texto) % 64

def checksum_to_symbol(checksum):
    return BASE64_ALPHABET[checksum]

# --- Detección de frecuencia dominante en una ventana ---
def detectar_frecuencia(ventana, sample_rate):
    fft = np.fft.rfft(ventana)
    freqs = np.fft.rfftfreq(len(ventana), 1/sample_rate)
    magnitudes = np.abs(fft)
    # Busca el pico más alto en el rango ultrasónico optimizado
    rango = (freqs >= 18000) & (freqs <= 20000)
    idx_max = np.argmax(magnitudes[rango])
    freq_max = freqs[rango][idx_max]
    return freq_max, np.max(magnitudes[rango])

# --- Detección de símbolo por pico más alto en cada rango ---
def detectar_simbolo_pico(ventana, sample_rate):
    fft = np.fft.rfft(ventana)
    freqs = np.fft.rfftfreq(len(ventana), 1/sample_rate)
    magnitudes = np.abs(fft)
    mejor_simbolo = None
    mejor_pico = 0
    mejor_freq = 0
    for i, symbol in enumerate(BASE64_ALPHABET):
        f_central = symbol_to_freq(symbol)
        rango = (freqs >= f_central - FREQ_TOLERANCE) & (freqs <= f_central + FREQ_TOLERANCE)
        if np.any(rango):
            pico = np.max(magnitudes[rango])
            if pico > mejor_pico:
                mejor_pico = pico
                mejor_simbolo = symbol
                mejor_freq = f_central
    return mejor_simbolo, mejor_pico, mejor_freq

# --- Decodificación de mensaje Base64 ---
def base64_to_text(b64):
    # Añade padding si es necesario
    padding = '=' * ((4 - len(b64) % 4) % 4)
    b64_padded = b64 + padding
    try:
        return base64.b64decode(b64_padded).decode('utf-8')
    except Exception as e:
        return f"[ERROR] Decodificación fallida: {e}"

# --- Grabación y decodificación en tiempo real con lockout y SYNC ---
def recibir_mensaje(duracion=5, guardar_archivo=False, archivo_salida="recibido.txt"):
    print(f"[INFO] Grabando {duracion} segundos de audio...")
    audio = sd.rec(int(duracion * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
    sd.wait()
    audio = audio.flatten()
    print("[INFO] Grabación finalizada. Procesando...")

    ventana_size = int(SYMBOL_DURATION * SAMPLE_RATE)
    num_ventanas = len(audio) // ventana_size
    simbolos = []
    started = False
    lockout = 0
    sync_detected = False
    last_symbol_time = 0
    end_timeout = 0
    rx_base64 = ''
    rx_last_symbol = None

    for i in range(num_ventanas):
        ventana = audio[i*ventana_size:(i+1)*ventana_size]
        if lockout > 0:
            lockout -= 1
            continue
        freq, pico = detectar_frecuencia(ventana, SAMPLE_RATE)
        # Detectar START
        if not started and abs(freq - START_FREQ) < FREQ_TOLERANCE:
            started = True
            sync_detected = False
            rx_base64 = ''
            rx_last_symbol = None
            lockout = 0
            print(f"[RX] START detectado en ventana {i}")
            continue
        # Detectar SYNC
        if started and not sync_detected and abs(freq - SYNC_FREQ) < FREQ_TOLERANCE:
            sync_detected = True
            print(f"[RX] SYNC detectado en ventana {i}")
            continue
        # Detectar END
        if started and sync_detected and abs(freq - END_FREQ) < FREQ_TOLERANCE:
            print(f"[RX] END detectado en ventana {i}")
            break
        # Detectar símbolo
        if started and sync_detected:
            simbolo, pico_s, freq_s = detectar_simbolo_pico(ventana, SAMPLE_RATE)
            if simbolo:
                if simbolo != rx_last_symbol:
                    rx_base64 += simbolo
                    rx_last_symbol = simbolo
                    lockout = LOCKOUT_WINDOWS
                    print(f"[RX] Símbolo: {simbolo} ({freq_s} Hz, pico {pico_s:.1f})")
            else:
                pass  # No símbolo claro
        # Timeout END
        if started and sync_detected:
            end_timeout += 1
            if end_timeout > END_TIMEOUT_WINDOWS:
                print("[RX] END (timeout)")
                break

    # Separar datos y checksum
    if len(rx_base64) < 2:
        print("[ERROR] No se recibieron suficientes símbolos.")
        return
    data = rx_base64[:-1]
    checksum_symbol = rx_base64[-1]
    checksum = BASE64_ALPHABET.index(checksum_symbol)
    texto = base64_to_text(data)
    print(f"[INFO] Base64 recibido: {data}")
    print(f"[INFO] Texto decodificado: {texto}")
    if calcular_checksum(texto) == checksum:
        print("[INFO] Checksum verificado correctamente.")
    else:
        print(f"[ERROR] Checksum incorrecto. Esperado {checksum}, calculado {calcular_checksum(texto)}")
    # Si se solicita, guardar como archivo binario
    if guardar_archivo:
        try:
            datos = base64.b64decode(data + '=' * ((4 - len(data) % 4) % 4))
            with open(archivo_salida, 'wb') as f:
                f.write(datos)
            print(f"[INFO] Archivo guardado como {archivo_salida}")
        except Exception as e:
            print(f"[ERROR] No se pudo guardar archivo: {e}")

# --- Calibración de frecuencias ---
def calibrar_frecuencia(duracion=2):
    print(f"[CALIBRACIÓN] Grabando {duracion} segundos de audio...")
    audio = sd.rec(int(duracion * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
    sd.wait()
    audio = audio.flatten()
    print("[CALIBRACIÓN] Grabación finalizada. Analizando espectro...")
    fft = np.fft.rfft(audio)
    freqs = np.fft.rfftfreq(len(audio), 1/SAMPLE_RATE)
    magnitudes = np.abs(fft)
    rango = (freqs >= 18000) & (freqs <= 20000)
    idx_max = np.argmax(magnitudes[rango])
    freq_max = freqs[rango][idx_max]
    print(f"[CALIBRACIÓN] Frecuencia pico detectada: {freq_max:.2f} Hz")
    print("[CALIBRACIÓN] Sugerencia: usa un rango de ±50 Hz alrededor de este valor para la detección.")
    return freq_max

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    print_ascii()
    import argparse
    parser = argparse.ArgumentParser(description="Receptor ultrasónico Base64 (FSK)")
    parser.add_argument('-d', '--duracion', type=float, default=5, help='Duración de la grabación en segundos')
    parser.add_argument('--calibrar', action='store_true', help='Entrar en modo calibración de frecuencia')
    parser.add_argument('--archivo', action='store_true', help='Guardar la salida como archivo binario')
    parser.add_argument('--salida', type=str, default='recibido.txt', help='Nombre del archivo de salida')
    args = parser.parse_args()
    if args.calibrar:
        calibrar_frecuencia(duracion=args.duracion)
    else:
        recibir_mensaje(args.duracion, guardar_archivo=args.archivo, archivo_salida=args.salida)
