import numpy as np
import sounddevice as sd
import sys
import os
import time
from collections import deque

# Agregar el directorio padre al path para imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency
except ImportError:
    from frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency

# --- Configuración mejorada ---
SYMBOL_DURATION = 0.05      # 50 ms - duración de datos
SYNC_DURATION = 0.1         # 100 ms - duración de SYNC/START/END
SAMPLE_RATE = 44100
FREQ_TOLERANCE = 50         # Hz - más estricto
MIN_ULTRASONIC_FREQ = 18000 # Hz
MAX_ULTRASONIC_FREQ = 26000 # Hz - ampliado para cubrir todo el rango
MIN_SIGNAL_DB = -50         # dB - umbral más alto para mejor detección
TIMEOUT_SECONDS = 2.0       # Timeout para mensajes incompletos

# Buffer para promediar detecciones
DETECTION_BUFFER_SIZE = 3

def amplitud_to_db(amplitud):
    """Convierte amplitud lineal a dB"""
    if isinstance(amplitud, (list, np.ndarray)):
        return np.where(amplitud <= 0, -100.0, 20 * np.log10(amplitud))
    else:
        if amplitud <= 0:
            return -100.0
        return 20 * np.log10(amplitud)

def detectar_frecuencia_mejorada(ventana, sample_rate):
    """Detecta la frecuencia dominante ultrasónica con mejor precisión"""
    # Aplicar ventana de Hann para reducir leakage
    ventana_hann = ventana * np.hanning(len(ventana))
    
    # FFT con más puntos para mejor resolución
    fft = np.fft.rfft(ventana_hann, n=len(ventana_hann) * 2)
    freqs = np.fft.rfftfreq(len(ventana_hann) * 2, 1/sample_rate)
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
    
    # Verificar que el pico sea significativo
    if max_db > MIN_SIGNAL_DB:
        # Verificar que no sea ruido (debe ser al menos 3dB más alto que el segundo pico)
        magnitudes_sorted = np.sort(magnitudes_ultrasonicas)[::-1]
        if len(magnitudes_sorted) > 1:
            if magnitudes_sorted[0] > magnitudes_sorted[1] * 1.4:  # ~3dB
                return max_freq, max_db
    
    return 0, 0

class ReceptorUltrasonico:
    def __init__(self):
        self.estado = {
            'started': False,
            'sync_detected': False,
            'rx_text': '',
            'last_detection_time': 0,
            'detection_buffer': deque(maxlen=DETECTION_BUFFER_SIZE)
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
    
    def detectar_frecuencia_estable(self, ventana, sample_rate):
        """Detecta frecuencia usando un buffer para estabilizar la detección"""
        freq, db = detectar_frecuencia_mejorada(ventana, sample_rate)
        
        if freq > 0:
            self.estado['detection_buffer'].append(freq)
            
            # Si tenemos suficientes detecciones, usar la más común
            if len(self.estado['detection_buffer']) >= DETECTION_BUFFER_SIZE:
                freqs = list(self.estado['detection_buffer'])
                # Encontrar la frecuencia más común (moda)
                from collections import Counter
                freq_counts = Counter(freqs)
                freq_estable = freq_counts.most_common(1)[0][0]
                return freq_estable, db
        
        return freq, db
    
    def procesar_protocolo_mejorado(self, freq):
        """Procesa el protocolo con mejor manejo de estados y timeouts"""
        tiempo_actual = time.time()
        
        # Timeout: si han pasado más de TIMEOUT_SECONDS sin detección, resetear
        if self.estado['started'] and (tiempo_actual - self.estado['last_detection_time']) > TIMEOUT_SECONDS:
            print(f"[TIMEOUT] Reseteando estado después de {TIMEOUT_SECONDS}s sin detección")
            self.resetear_estado()
            return False
        
        # Actualizar tiempo de última detección
        if freq > 0:
            self.estado['last_detection_time'] = tiempo_actual
        
        # START
        if not self.estado['started'] and abs(freq - START_FREQUENCY) < FREQ_TOLERANCE:
            print(f"[START] Detectado en {freq:.0f} Hz")
            self.estado['started'] = True
            self.estado['sync_detected'] = False
            self.estado['rx_text'] = ''
            self.estado['detection_buffer'].clear()
            return False
        
        # SYNC
        if self.estado['started'] and not self.estado['sync_detected'] and abs(freq - SYNC_FREQUENCY) < FREQ_TOLERANCE:
            print(f"[SYNC] Detectado en {freq:.0f} Hz")
            self.estado['sync_detected'] = True
            self.estado['detection_buffer'].clear()
            return False
        
        # END
        if self.estado['started'] and abs(freq - END_FREQUENCY) < FREQ_TOLERANCE:
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
        self.estado['detection_buffer'].clear()
    
    def escuchar_continuamente(self):
        """Receptor ultrasónico mejorado con mejor manejo de errores"""
        print("=" * 60)
        print("🎵 RECEPTOR ULTRASÓNICO MEJORADO")
        print("=" * 60)
        print(f"[CONFIG] Umbral: {MIN_SIGNAL_DB} dB")
        print(f"[CONFIG] Rango: {MIN_ULTRASONIC_FREQ}-{MAX_ULTRASONIC_FREQ} Hz")
        print(f"[CONFIG] Tolerancia: ±{FREQ_TOLERANCE} Hz")
        print(f"[CONFIG] Timeout: {TIMEOUT_SECONDS}s")
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
                
                # Detectar frecuencia con estabilización
                freq, pico_db = self.detectar_frecuencia_estable(ventana, SAMPLE_RATE)
                
                if freq > 0:
                    # Procesar protocolo
                    resultado = self.procesar_protocolo_mejorado(freq)
                    
                    if isinstance(resultado, tuple) and resultado[0]:
                        # Mensaje completo recibido
                        mensaje = resultado[1]
                        if mensaje:
                            print(f"\n\n{'='*60}")
                            print(f"📨 MENSAJE RECIBIDO:")
                            print(f"📝 Texto: '{mensaje}'")
                            print(f"📊 Longitud: {len(mensaje)} caracteres")
                            print(f"{'='*60}\n")
                        else:
                            print(f"\n[WARN] Mensaje vacío recibido")
                
                # Pequeña pausa para no saturar CPU
                time.sleep(0.001)
                
        except KeyboardInterrupt:
            print(f"\n\n{'='*60}")
            print("🛑 RECEPTOR DETENIDO")
            print(f"{'='*60}")
        except Exception as e:
            print(f"\n[ERROR] Error inesperado: {e}")
        finally:
            self.cerrar_stream()

def escuchar_continuamente():
    """Función wrapper para compatibilidad"""
    receptor = ReceptorUltrasonico()
    receptor.escuchar_continuamente()

# --- Uso desde línea de comandos ---
if __name__ == "__main__":
    escuchar_continuamente()
