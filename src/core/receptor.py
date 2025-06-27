import numpy as np
import sounddevice as sd
import sys
import os

# Agregar el directorio padre al path para imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency
except ImportError:
    from frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency

# --- Configuración simple ---
SYMBOL_DURATION = 0.05  # 50 ms - igual que el emisor
SAMPLE_RATE = 44100
FREQ_TOLERANCE = 100  # Hz
MIN_ULTRASONIC_FREQ = 18000  # Hz
MAX_ULTRASONIC_FREQ = 23000  # Hz
MIN_SIGNAL_DB = -35  # dB

def amplitud_to_db(amplitud):
    """Convierte amplitud lineal a dB"""
    if isinstance(amplitud, (list, np.ndarray)):
        return np.where(amplitud <= 0, -100.0, 20 * np.log10(amplitud))
    else:
        if amplitud <= 0:
            return -100.0
        return 20 * np.log10(amplitud)

def detectar_frecuencia(ventana, sample_rate):
    """Detecta la frecuencia dominante ultrasónica"""
    fft = np.fft.rfft(ventana)
    freqs = np.fft.rfftfreq(len(ventana), 1/sample_rate)
    magnitudes = np.abs(fft)
    
    # Filtrar frecuencias ultrasónicas
    rango_ultrasonico = (freqs >= MIN_ULTRASONIC_FREQ) & (freqs <= MAX_ULTRASONIC_FREQ)
    
    if not np.any(rango_ultrasonico):
        return 0, 0
    
    magnitudes_ultrasonicas = magnitudes[rango_ultrasonico]
    freqs_ultrasonicas = freqs[rango_ultrasonico]
    
    if len(magnitudes_ultrasonicas) == 0:
        return 0, 0
    
    max_idx = np.argmax(magnitudes_ultrasonicas)
    max_freq = freqs_ultrasonicas[max_idx]
    max_magnitude = magnitudes_ultrasonicas[max_idx]
    max_db = amplitud_to_db(max_magnitude)
    
    if max_db > MIN_SIGNAL_DB:
        return max_freq, max_db
    
    return 0, 0

def escuchar_continuamente():
    """Receptor ultrasónico - solo traducción"""
    print("[RECEPTOR] Iniciado - esperando mensajes...")
    
    try:
        stream = sd.InputStream(
            channels=1, 
            samplerate=SAMPLE_RATE, 
            blocksize=int(SYMBOL_DURATION * SAMPLE_RATE),
            dtype=np.float32
        )
        stream.start()
    except Exception as e:
        print(f"[ERROR] {e}")
        return

    ventana_size = int(SYMBOL_DURATION * SAMPLE_RATE)
    estado = {
        'started': False,
        'sync_detected': False,
        'rx_text': ''
    }

    try:
        while True:
            ventana, overflowed = stream.read(ventana_size)
            ventana = ventana.flatten()
            
            freq, pico_db = detectar_frecuencia(ventana, SAMPLE_RATE)
            
            if freq > 0:
                # Procesar protocolo
                if procesar_protocolo(freq, estado):
                    # Mensaje completo recibido
                    if estado['rx_text']:
                        print(f"\n[MENSAJE] {estado['rx_text']}")
                    estado['rx_text'] = ''

    except KeyboardInterrupt:
        print("\n[RECEPTOR] Detenido")
    except Exception as e:
        print(f"\n[ERROR] {e}")
    finally:
        stream.stop()
        stream.close()

def procesar_protocolo(freq, estado):
    """Procesa el protocolo START → SYNC → DATOS → SYNC → END"""
    
    # START
    if not estado['started'] and abs(freq - START_FREQUENCY) < FREQ_TOLERANCE:
        print("[START]")
        estado['started'] = True
        estado['sync_detected'] = False
        estado['rx_text'] = ''
        return False
    
    # SYNC
    if estado['started'] and not estado['sync_detected'] and abs(freq - SYNC_FREQUENCY) < FREQ_TOLERANCE:
        print("[SYNC]")
        estado['sync_detected'] = True
        return False
    
    # END
    if estado['started'] and abs(freq - END_FREQUENCY) < FREQ_TOLERANCE:
        print("[END]")
        estado['started'] = False
        estado['sync_detected'] = False
        return True
    
    # DATOS
    if estado['started'] and estado['sync_detected'] and is_data_frequency(freq):
        char = frequency_to_char(freq)
        if char:
            estado['rx_text'] += char
            print(f"[{char}]", end='', flush=True)
    
    return False

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    escuchar_continuamente()
