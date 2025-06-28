import numpy as np
import sounddevice as sd
import sys
import os
import time

# Agregar el directorio padre al path para imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency, get_all_frequencies
except ImportError:
    from frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency, get_all_frequencies

# --- Configuración sincronizada con emisor ---
SYMBOL_DURATION = 0.1       # 100 ms - más tiempo para mejor detección
SYNC_DURATION = 0.1         # 100 ms - igual que emisor
SAMPLE_RATE = 44100
FREQ_TOLERANCE = 45         # Hz
MIN_ULTRASONIC_FREQ = 18000 # Hz
MAX_ULTRASONIC_FREQ = 26000 # Hz
MIN_SIGNAL_DB = -80         # dB (ajustable)

# Configuración simplificada
DEBOUNCE_TIME = 0.1         # 100ms debounce - sincronizado con emisor
DEBOUNCE_FREQ = 20          # Hz - ignorar frecuencias muy cercanas

START_DETECTIONS_REQUIRED = 2
END_DETECTIONS_REQUIRED = 2

FRECUENCIAS_PROTOCOLO = get_all_frequencies() + [START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY]

def amplitud_to_db(amplitud):
    """Convierte amplitud lineal a dB"""
    if isinstance(amplitud, (list, np.ndarray)):
        return np.where(amplitud <= 0, -100.0, 20 * np.log10(amplitud))
    else:
        if amplitud <= 0:
            return -100.0
        return 20 * np.log10(amplitud)

def detectar_frecuencia_simple(ventana, sample_rate):
    """Detecta la frecuencia dominante ultrasónica de forma simple y rápida"""
    # Aplicar ventana de Hann
    ventana_hann = ventana * np.hanning(len(ventana))
    
    # FFT simple
    fft = np.fft.rfft(ventana_hann)
    freqs = np.fft.rfftfreq(len(ventana_hann), 1/sample_rate)
    magnitudes = np.abs(fft)
    
    # Filtrar frecuencias ultrasónicas
    rango_ultrasonico = (freqs >= MIN_ULTRASONIC_FREQ) & (freqs <= MAX_ULTRASONIC_FREQ)
    
    if not np.any(rango_ultrasonico):
        return 0, 0
    
    magnitudes_ultrasonicas = magnitudes[rango_ultrasonico]
    freqs_ultrasonicas = freqs[rango_ultrasonico]
    
    if len(magnitudes_ultrasonicas) == 0:
        return 0, 0
    
    # Encontrar el pico más alto
    max_idx = np.argmax(magnitudes_ultrasonicas)
    max_freq = freqs_ultrasonicas[max_idx]
    max_magnitude = magnitudes_ultrasonicas[max_idx]
    max_db = amplitud_to_db(max_magnitude)
    
    # Verificar que el pico sea significativo (umbral muy bajo)
    if max_db > MIN_SIGNAL_DB:
        return max_freq, max_db
    
    return 0, 0

class ReceptorUltrasonico:
    def __init__(self):
        self.estado = {
            'started': False,
            'sync_detected': False,
            'rx_text': '',
            'last_detection_time': 0,
            'last_detected_freq': 0,
            'start_counter': 0,
            'end_counter': 0
        }
        self.stream = None
        
    def iniciar_stream(self):
        """Inicia el stream de audio"""
        try:
            self.stream = sd.InputStream(
                channels=1, 
                samplerate=SAMPLE_RATE, 
                blocksize=int(SYMBOL_DURATION * SAMPLE_RATE),
                dtype=np.float32
            )
            self.stream.start()
            return True
        except Exception as e:
            print(f"[ERROR] No se pudo iniciar el stream: {e}")
            return False
    
    def cerrar_stream(self):
        """Cierra el stream de audio"""
        if self.stream:
            self.stream.stop()
            self.stream.close()
    
    def procesar_protocolo_simple(self, freq):
        """Procesa el protocolo de forma simple y directa"""
        tiempo_actual = time.time()
        
        # Debounce simple
        if (abs(freq - self.estado['last_detected_freq']) < DEBOUNCE_FREQ and 
            tiempo_actual - self.estado['last_detection_time'] < DEBOUNCE_TIME):
            return False
        
        # Actualizar tiempo y frecuencia de última detección
        if freq > 0:
            self.estado['last_detection_time'] = tiempo_actual
            self.estado['last_detected_freq'] = freq
        
        # START
        if not self.estado['started'] and abs(freq - START_FREQUENCY) < FREQ_TOLERANCE:
            self.estado['start_counter'] += 1
            if self.estado['start_counter'] >= START_DETECTIONS_REQUIRED:
                print(f"[START] Detectado en {freq:.0f} Hz")
                self.estado['started'] = True
                self.estado['sync_detected'] = False
                self.estado['rx_text'] = ''
                self.estado['start_counter'] = 0
                return False
        
        # SYNC
        if self.estado['started'] and not self.estado['sync_detected'] and abs(freq - SYNC_FREQUENCY) < FREQ_TOLERANCE:
            print(f"[SYNC] Detectado en {freq:.0f} Hz")
            self.estado['sync_detected'] = True
            return False
        
        # END
        if self.estado['started'] and abs(freq - END_FREQUENCY) < FREQ_TOLERANCE:
            self.estado['end_counter'] += 1
            if self.estado['end_counter'] >= END_DETECTIONS_REQUIRED:
                print(f"[END] Detectado en {freq:.0f} Hz")
                mensaje_completo = self.estado['rx_text']
                self.resetear_estado()
                return True, mensaje_completo
        
        # DATOS
        if self.estado['started'] and self.estado['sync_detected'] and is_data_frequency(freq):
            char = frequency_to_char(freq)
            if char and char != ' ':
                self.estado['rx_text'] += char
                print(f"[{char}]", end='', flush=True)
            elif char == ' ':
                self.estado['rx_text'] += ' '
                print("[SPACE]", end='', flush=True)
        
        return False
    
    def resetear_estado(self):
        """Resetea el estado del receptor"""
        self.estado['started'] = False
        self.estado['sync_detected'] = False
        self.estado['rx_text'] = ''
        self.estado['last_detection_time'] = 0
        self.estado['last_detected_freq'] = 0
        self.estado['start_counter'] = 0
        self.estado['end_counter'] = 0
    
    def escuchar_continuamente(self):
        """Receptor ultrasónico simplificado y optimizado"""
        print("=" * 60)
        print("RECEPTOR ULTRASONICO SIMPLIFICADO")
        print("=" * 60)
        print(f"[CONFIG] Umbral: {MIN_SIGNAL_DB} dB")
        print(f"[CONFIG] Rango: {MIN_ULTRASONIC_FREQ}-{MAX_ULTRASONIC_FREQ} Hz")
        print(f"[CONFIG] Tolerancia: ±{FREQ_TOLERANCE} Hz")
        print(f"[CONFIG] Debounce: {DEBOUNCE_TIME*1000:.0f}ms")
        print("=" * 60)
        print("[INFO] Esperando mensajes... (Ctrl+C para salir)")
        print("=" * 60)
        
        if not self.iniciar_stream():
            return
        
        ventana_size = int(SYMBOL_DURATION * SAMPLE_RATE)
        
        try:
            while True:
                ventana, overflowed = self.stream.read(ventana_size)
                if overflowed:
                    print("[WARN] Overflow detectado")
                
                ventana = ventana.flatten()
                
                # Detectar frecuencia de forma simple
                freq, pico_db = detectar_frecuencia_simple(ventana, SAMPLE_RATE)
                
                if freq > 0:
                    # Procesar protocolo
                    resultado = self.procesar_protocolo_simple(freq)
                    
                    if isinstance(resultado, tuple) and resultado[0]:
                        # Mensaje completo recibido
                        mensaje = resultado[1]
                        if mensaje:
                            print(f"\n\n{'='*60}")
                            print(f"MENSAJE RECIBIDO:")
                            print(f"Texto: '{mensaje}'")
                            print(f"Longitud: {len(mensaje)} caracteres")
                            print(f"{'='*60}\n")
                        else:
                            print("\n[WARN] Mensaje vacío recibido")
                
        except KeyboardInterrupt:
            print("\n[DETENIDO]")
        except Exception as e:
            print(f"\n[ERROR] {e}")
        finally:
            self.cerrar_stream()

def escuchar_continuamente():
    """Función wrapper para compatibilidad"""
    receptor = ReceptorUltrasonico()
    receptor.escuchar_continuamente()

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    escuchar_continuamente()
