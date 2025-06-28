import numpy as np
import sounddevice as sd
import scipy.signal as signal
import sys
import os
import time
from collections import deque

# Agregar el directorio padre al path para imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency, get_all_frequencies
except ImportError:
    from frecuencias import frequency_to_char, START_FREQUENCY, SYNC_FREQUENCY, END_FREQUENCY, is_data_frequency, get_all_frequencies

# Configuración optimizada para ultrasonido
SAMPLE_RATE = 96000
WINDOW_MS = 100  # Ventana más pequeña para mejor resolución temporal
WINDOW_SIZE = int(SAMPLE_RATE * (WINDOW_MS / 1000))
OVERLAP = 0.5  # 50% overlap para mejor resolución
HOP_SIZE = int(WINDOW_SIZE * (1 - OVERLAP))

# Rango ultrasónico y tolerancias
MIN_ULTRASONIC_FREQ = 18000
MAX_ULTRASONIC_FREQ = 26000
FREQ_TOLERANCE = 50  # Hz

# Parámetros de detección robusta
MIN_SNR_DB = 8  # SNR mínimo para considerar señal válida
PERSISTENCE_FRAMES = 4  # Frames consecutivos para confirmar detección
DEBOUNCE_FRAMES = 6  # Frames para debounce entre detecciones
HISTORY_SIZE = 10  # Historial para promedio móvil

# Filtro pasa-banda Butterworth 8º orden (más selectivo)
sos = signal.butter(8, [MIN_ULTRASONIC_FREQ, MAX_ULTRASONIC_FREQ], 
                   btype='bandpass', fs=SAMPLE_RATE, output='sos')

class ReceptorUltrasonicoRobusto:
    def __init__(self, modo_diagnostico=False):
        self.modo_diagnostico = modo_diagnostico
        self.stream = None
        self.estado = {
            'started': False,
            'sync_detected': False,
            'rx_text': '',
            'start_counter': 0,
            'end_counter': 0
        }
        
        # Historiales para detección robusta
        self.freq_history = deque(maxlen=HISTORY_SIZE)
        self.db_history = deque(maxlen=HISTORY_SIZE)
        self.detection_history = deque(maxlen=PERSISTENCE_FRAMES)
        
        # Umbral dinámico
        self.noise_floor = -60
        self.snr_threshold = MIN_SNR_DB
        
        # Control de debounce
        self.last_detection_time = 0
        self.debounce_frames = 0
        
        # Estadísticas
        self.frame_count = 0
        self.detection_count = 0
        
    def medir_ruido_fondo(self, duracion=3):
        """Medición robusta del ruido de fondo con múltiples muestras"""
        print(f"[INFO] Midiendo ruido de fondo durante {duracion}s...")
        
        frames_needed = int(duracion * SAMPLE_RATE / HOP_SIZE)
        noise_samples = []
        
        stream = sd.InputStream(
            channels=1, 
            samplerate=SAMPLE_RATE, 
            blocksize=HOP_SIZE,
            dtype=np.float32
        )
        stream.start()
        
        try:
            for _ in range(frames_needed):
                data, _ = stream.read(HOP_SIZE)
                data = data.flatten()
                
                # Aplicar filtro
                filtered = signal.sosfilt(sos, data)
                
                # FFT con ventana de Hann
                windowed = filtered * signal.windows.hann(len(filtered))
                fft = np.fft.rfft(windowed)
                freqs = np.fft.rfftfreq(len(windowed), 1/SAMPLE_RATE)
                
                # Solo rango ultrasónico
                mask = (freqs >= MIN_ULTRASONIC_FREQ) & (freqs <= MAX_ULTRASONIC_FREQ)
                if np.any(mask):
                    magnitudes = np.abs(fft[mask])
                    noise_level = 20 * np.log10(np.mean(magnitudes) + 1e-10)
                    noise_samples.append(noise_level)
                    
        finally:
            stream.stop()
            stream.close()
        
        if noise_samples:
            self.noise_floor = np.percentile(noise_samples, 95)  # 95th percentile
            print(f"[INFO] Ruido de fondo: {self.noise_floor:.1f} dB")
            print(f"[INFO] Umbral de detección: {self.noise_floor + self.snr_threshold:.1f} dB")
        else:
            print("[WARN] No se pudo medir ruido de fondo")
            self.noise_floor = -50
    
    def iniciar_stream(self):
        """Iniciar stream de audio con configuración optimizada"""
        try:
            self.stream = sd.InputStream(
                channels=1,
                samplerate=SAMPLE_RATE,
                blocksize=HOP_SIZE,
                dtype=np.float32,
                latency='low'
            )
            self.stream.start()
            print(f"[INFO] Stream iniciado - Sample rate: {self.stream.samplerate} Hz")
            return True
        except Exception as e:
            print(f"[ERROR] No se pudo iniciar stream: {e}")
            return False
    
    def cerrar_stream(self):
        if self.stream:
            self.stream.stop()
            self.stream.close()
    
    def procesar_frame(self, data):
        """Procesamiento robusto de un frame de audio"""
        # Aplicar filtro pasa-banda
        filtered = signal.sosfilt(sos, data)
        
        # Ventana de Hann para reducir leakage
        windowed = filtered * signal.windows.hann(len(filtered))
        
        # FFT
        fft = np.fft.rfft(windowed)
        freqs = np.fft.rfftfreq(len(windowed), 1/SAMPLE_RATE)
        
        # Solo rango ultrasónico
        mask = (freqs >= MIN_ULTRASONIC_FREQ) & (freqs <= MAX_ULTRASONIC_FREQ)
        if not np.any(mask):
            return 0, -100, 0
        
        magnitudes = np.abs(fft[mask])
        freqs_rango = freqs[mask]
        
        # Encontrar pico principal
        peak_idx = np.argmax(magnitudes)
        peak_freq = freqs_rango[peak_idx]
        peak_magnitude = magnitudes[peak_idx]
        
        # Calcular SNR
        noise_level = np.mean(magnitudes)
        snr = peak_magnitude / (noise_level + 1e-10)
        snr_db = 20 * np.log10(snr)
        
        # Magnitud en dB
        peak_db = 20 * np.log10(peak_magnitude + 1e-10)
        
        return peak_freq, peak_db, snr_db
    
    def detectar_frecuencia_robusta(self, freq, db, snr):
        """Detección robusta con persistencia temporal y SNR"""
        # Actualizar historiales
        self.freq_history.append(freq)
        self.db_history.append(db)
        
        # Verificar SNR mínimo
        if snr < self.snr_threshold:
            self.detection_history.append(False)
            return False, 0
        
        # Verificar umbral de magnitud
        if db < (self.noise_floor + self.snr_threshold):
            self.detection_history.append(False)
            return False, 0
        
        # Verificar persistencia temporal
        recent_detections = sum(self.detection_history)
        if recent_detections >= PERSISTENCE_FRAMES - 1:
            # Frecuencia estable en el tiempo
            freq_std = np.std(list(self.freq_history)[-3:]) if len(self.freq_history) >= 3 else 0
            if freq_std < 100:  # Frecuencia estable
                self.detection_history.append(True)
                return True, freq
            else:
                self.detection_history.append(False)
                return False, 0
        else:
            self.detection_history.append(True)
            return False, 0
    
    def aplicar_debounce(self, freq):
        """Debounce temporal mejorado"""
        current_time = time.time()
        
        # Verificar si es la misma frecuencia
        if abs(freq - self.last_detection_time) < FREQ_TOLERANCE:
            self.debounce_frames += 1
        else:
            self.debounce_frames = 0
            self.last_detection_time = freq
        
        return self.debounce_frames >= DEBOUNCE_FRAMES
    
    def procesar_protocolo(self, freq):
        """Procesamiento del protocolo de comunicación"""
        if not self.estado['started'] and abs(freq - START_FREQUENCY) < FREQ_TOLERANCE:
            self.estado['start_counter'] += 1
            if self.estado['start_counter'] >= 2:
                print(f"\n[START] Detectado en {freq:.0f} Hz")
                self.estado['started'] = True
                self.estado['sync_detected'] = False
                self.estado['rx_text'] = ''
                self.estado['start_counter'] = 0
                return False
        
        elif self.estado['started'] and not self.estado['sync_detected'] and abs(freq - SYNC_FREQUENCY) < FREQ_TOLERANCE:
            print(f"[SYNC] Detectado en {freq:.0f} Hz")
            self.estado['sync_detected'] = True
            return False
        
        elif self.estado['started'] and abs(freq - END_FREQUENCY) < FREQ_TOLERANCE:
            self.estado['end_counter'] += 1
            if self.estado['end_counter'] >= 2:
                print(f"\n[END] Detectado en {freq:.0f} Hz")
                mensaje = self.estado['rx_text']
                print(f"\n{'='*60}")
                print(f"MENSAJE RECIBIDO: '{mensaje}'")
                print(f"Longitud: {len(mensaje)} caracteres")
                print(f"{'='*60}\n")
                self.resetear_estado()
                return True, mensaje
        
        elif self.estado['started'] and self.estado['sync_detected'] and is_data_frequency(freq):
            char = frequency_to_char(freq)
            if char:
                self.estado['rx_text'] += char
                print(char, end='', flush=True)
        
        return False
    
    def resetear_estado(self):
        """Resetear estado del receptor"""
        self.estado = {
            'started': False,
            'sync_detected': False,
            'rx_text': '',
            'start_counter': 0,
            'end_counter': 0
        }
        self.freq_history.clear()
        self.db_history.clear()
        self.detection_history.clear()
        self.debounce_frames = 0
    
    def modo_diagnostico_continuo(self):
        """Modo de diagnóstico para validar hardware"""
        print("=" * 60)
        print("MODO DIAGNÓSTICO - VALIDACIÓN DE HARDWARE")
        print("=" * 60)
        print("Este modo muestra el espectro ultrasónico en tiempo real")
        print("para validar que el micrófono capta ultrasonidos correctamente.")
        print("Presiona Ctrl+C para salir")
        print("=" * 60)
        
        if not self.iniciar_stream():
            return
        
        try:
            while True:
                if self.stream is None:
                    break
                
                data, overflowed = self.stream.read(HOP_SIZE)
                if overflowed:
                    print("[WARN] Overflow detectado")
                
                data = data.flatten()
                freq, db, snr = self.procesar_frame(data)
                
                self.frame_count += 1
                
                # Mostrar estadísticas cada 50 frames
                if self.frame_count % 50 == 0:
                    print(f"\n[STATS] Frames: {self.frame_count}, Detecciones: {self.detection_count}")
                    print(f"[STATS] Ruido de fondo: {self.noise_floor:.1f} dB")
                
                # Mostrar picos significativos
                if db > (self.noise_floor + 5):
                    print(f"[PICO] {freq:.0f} Hz @ {db:.1f} dB (SNR: {snr:.1f} dB)")
                    self.detection_count += 1
                
                # Pequeña pausa para no saturar la consola
                time.sleep(0.01)
                
        except KeyboardInterrupt:
            print("\n[DETENIDO]")
        finally:
            self.cerrar_stream()
    
    def escuchar_continuamente(self):
        """Modo principal de escucha"""
        print("=" * 60)
        print("RECEPTOR ULTRASONICO ROBUSTO")
        print("=" * 60)
        print(f"[CONFIG] Sample rate: {SAMPLE_RATE} Hz")
        print(f"[CONFIG] Ventana: {WINDOW_MS} ms ({WINDOW_SIZE} muestras)")
        print(f"[CONFIG] Overlap: {OVERLAP*100:.0f}%")
        print(f"[CONFIG] Rango: {MIN_ULTRASONIC_FREQ}-{MAX_ULTRASONIC_FREQ} Hz")
        print(f"[CONFIG] SNR mínimo: {MIN_SNR_DB} dB")
        print(f"[CONFIG] Persistencia: {PERSISTENCE_FRAMES} frames")
        print("=" * 60)
        
        # Medir ruido de fondo
        self.medir_ruido_fondo()
        
        if not self.iniciar_stream():
            return
        
        print("[INFO] Esperando mensajes... (Ctrl+C para salir)")
        print("=" * 60)
        
        try:
            while True:
                if self.stream is None:
                    break
                
                data, overflowed = self.stream.read(HOP_SIZE)
                if overflowed:
                    print("[WARN] Overflow detectado")
                
                data = data.flatten()
                freq, db, snr = self.procesar_frame(data)
                
                # Detección robusta
                detectado, freq_confirmada = self.detectar_frecuencia_robusta(freq, db, snr)
                
                if detectado and self.aplicar_debounce(freq_confirmada):
                    print(f"[DETECTADO] {freq_confirmada:.0f} Hz @ {db:.1f} dB (SNR: {snr:.1f} dB)")
                    
                    # Procesar protocolo
                    resultado = self.procesar_protocolo(freq_confirmada)
                    if isinstance(resultado, tuple) and resultado[0]:
                        # Mensaje completo recibido
                        pass
                
        except KeyboardInterrupt:
            print("\n[DETENIDO]")
        finally:
            self.cerrar_stream()

def escuchar_continuamente(modo_diagnostico=False):
    receptor = ReceptorUltrasonicoRobusto(modo_diagnostico)
    if modo_diagnostico:
        receptor.modo_diagnostico_continuo()
    else:
        receptor.escuchar_continuamente()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Receptor ultrasónico robusto')
    parser.add_argument('--diagnostico', action='store_true', 
                       help='Modo diagnóstico para validar hardware')
    args = parser.parse_args()
    
    escuchar_continuamente(args.diagnostico)
