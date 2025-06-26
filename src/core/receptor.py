import numpy as np
import sounddevice as sd
from scipy.signal import find_peaks
from .frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency

# --- Configuración de recepción ---
SYMBOL_DURATION = 0.1  # segundos (100 ms)
SAMPLE_RATE = 44100
FREQ_TOLERANCE = 50  # Hz, tolerancia para detección robusta
LOCKOUT_WINDOWS = 2  # Ventanas a ignorar tras detectar un símbolo

# --- Detección de frecuencia dominante en una ventana ---
def detectar_frecuencia(ventana, sample_rate):
    """Detecta la frecuencia dominante en una ventana de audio"""
    fft = np.fft.rfft(ventana)
    freqs = np.fft.rfftfreq(len(ventana), 1/sample_rate)
    magnitudes = np.abs(fft)
    
    # Busca el pico más alto en el rango ultrasónico optimizado
    rango = (freqs >= 18000) & (freqs <= 26000)
    if np.any(rango):
        idx_max = np.argmax(magnitudes[rango])
        freq_max = freqs[rango][idx_max]
        return freq_max, np.max(magnitudes[rango])
    return 0, 0

# --- Escucha continua hasta cancelar ---
def escuchar_continuamente():
    """Escucha continuamente frecuencias ultrasónicas hasta que se cancele"""
    print("[INFO] Iniciando modo de escucha continua.")
    print("[INFO] Presiona Ctrl+C para detener.")
    print("[INFO] Escuchando frecuencias ultrasónicas...")
    
    stream = sd.InputStream(channels=1, samplerate=SAMPLE_RATE, blocksize=int(SYMBOL_DURATION * SAMPLE_RATE))
    stream.start()

    ventana_size = int(SYMBOL_DURATION * SAMPLE_RATE)
    estado = {
        'started': False,
        'lockout': 0,
        'sync_detected': False,
        'rx_text': '',
        'rx_last_char': None,
        'buffer_chars': []
    }
    buffer_size = 20  # Tamaño del buffer para mostrar últimos caracteres

    try:
        i = 0
        while True:
            ventana, _ = stream.read(ventana_size)
            ventana = ventana.flatten()
            
            if procesar_ventana(ventana, i, estado, buffer_size):
                # Mensaje completo recibido
                procesar_mensaje_recibido(estado['rx_text'])
                estado['started'] = False
                estado['sync_detected'] = False
                estado['rx_text'] = ''
                estado['buffer_chars'].clear()
            i += 1

    except KeyboardInterrupt:
        print("\n[INFO] Recepción interrumpida por el usuario.")
    finally:
        stream.stop()
        stream.close()

def procesar_mensaje_recibido(rx_text):
    """Procesa un mensaje recibido"""
    if len(rx_text) == 0:
        return
    
    print(f"\n[RECIBIDO] {rx_text}")

def procesar_ventana(ventana, i, estado, buffer_size):
    """Procesa una ventana de audio y actualiza el estado de la recepción"""
    if estado['lockout'] > 0:
        estado['lockout'] -= 1
        return False

    freq, pico = detectar_frecuencia(ventana, SAMPLE_RATE)
    
    # Detectar START
    if not estado['started'] and abs(freq - START_FREQUENCY) < FREQ_TOLERANCE:
        estado['started'] = True
        estado['sync_detected'] = False
        estado['rx_text'] = ''
        estado['rx_last_char'] = None
        estado['lockout'] = 0
        estado['buffer_chars'].clear()
        print(f"\n[RX] START detectado ({freq:.0f} Hz)")
        return False
    
    # Detectar SYNC
    if estado['started'] and not estado['sync_detected'] and abs(freq - SYNC_FREQUENCY) < FREQ_TOLERANCE:
        estado['sync_detected'] = True
        print(f"[RX] SYNC detectado ({freq:.0f} Hz)")
        return False
    
    # Detectar END
    if estado['started'] and abs(freq - END_FREQUENCY) < FREQ_TOLERANCE:
        print(f"[RX] END detectado ({freq:.0f} Hz)")
        return True
    
    # Detectar caracteres de datos
    if estado['started'] and estado['sync_detected'] and is_data_frequency(freq):
        char = frequency_to_char(freq)
        if char and char != estado['rx_last_char']:
            estado['rx_text'] += char
            estado['rx_last_char'] = char
            estado['lockout'] = LOCKOUT_WINDOWS
            
            # Actualizar buffer de caracteres
            estado['buffer_chars'].append(char)
            if len(estado['buffer_chars']) > buffer_size:
                estado['buffer_chars'].pop(0)
            
            print(f"[RX] '{char}' ({freq:.0f} Hz) | Buffer: {''.join(estado['buffer_chars'])}")
    
    return False

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    escuchar_continuamente()
