#!/usr/bin/env python3
"""
Visualización en tiempo real del espectro de frecuencias
Similar a Spectroid - para detectar ultrasonido visualmente
"""

import numpy as np
import sounddevice as sd
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.patches import Rectangle
import time

# Configuración
SAMPLE_RATE = 44100
CHUNK_SIZE = 2048
FREQ_MIN = 0
FREQ_MAX = 25000  # Hasta 25kHz para ver ultrasonido
MIN_ULTRASONIC_FREQ = 18000
MAX_ULTRASONIC_FREQ = 26000

# Frecuencias del protocolo para marcar
PROTOCOL_FREQS = {
    'START': 18500,
    'SYNC': 18600,
    'END': 22000,
    'A': 19800,
    'M': 21000,
    'Z': 22300
}

class EspectroVivo:
    def __init__(self):
        self.fig, self.ax = plt.subplots(figsize=(12, 8))
        self.line, = self.ax.plot([], [], 'b-', linewidth=1, alpha=0.7)
        self.ultrasonic_line, = self.ax.plot([], [], 'r-', linewidth=2, alpha=0.9)
        
        # Configurar gráfico - valores positivos para ver mejor
        self.ax.set_xlim(FREQ_MIN, FREQ_MAX)
        self.ax.set_ylim(0, 100)  # 0-100 en lugar de -80-0
        self.ax.set_xlabel('Frecuencia (Hz)')
        self.ax.set_ylabel('Magnitud (normalizada)')
        self.ax.set_title('ESPECTRO EN TIEMPO REAL - DETECCIÓN ULTRASÓNICA')
        self.ax.grid(True, alpha=0.3)
        
        # Marcar rango ultrasónico
        self.ax.axvspan(MIN_ULTRASONIC_FREQ, MAX_ULTRASONIC_FREQ, 
                       alpha=0.2, color='red', label='Rango Ultrasónico')
        
        # Marcar frecuencias del protocolo
        for name, freq in PROTOCOL_FREQS.items():
            self.ax.axvline(x=freq, color='green', linestyle='--', alpha=0.7, linewidth=1)
            self.ax.text(freq, 10, name, rotation=90, fontsize=8, ha='right', va='bottom')
        
        # Configurar stream de audio
        self.stream = sd.InputStream(
            channels=1,
            samplerate=SAMPLE_RATE,
            blocksize=CHUNK_SIZE,
            dtype=np.float32
        )
        self.stream.start()
        
        # Datos para el gráfico
        self.freqs = np.fft.rfftfreq(CHUNK_SIZE, 1/SAMPLE_RATE)
        self.mask_audible = self.freqs <= 20000
        self.mask_ultrasonic = (self.freqs >= MIN_ULTRASONIC_FREQ) & (self.freqs <= MAX_ULTRASONIC_FREQ)
        
        print("=== ESPECTRO VIVO ULTRASÓNICO ===")
        print(f"Rango: {FREQ_MIN}-{FREQ_MAX} Hz")
        print(f"Ultrasónico: {MIN_ULTRASONIC_FREQ}-{MAX_ULTRASONIC_FREQ} Hz (rojo)")
        print("Frecuencias del protocolo marcadas en verde")
        print("Presiona Ctrl+C para salir")
        print("=" * 50)
        
    def amplitud_to_db(self, amplitud):
        """Convierte amplitud a dB y normaliza a 0-100"""
        db = 20 * np.log10(np.maximum(amplitud, 1e-10))
        # Normalizar: -80dB = 0, 0dB = 100
        normalized = np.clip((db + 80) * 100 / 80, 0, 100)
        return normalized
    
    def update(self, frame):
        """Actualiza el gráfico con nuevos datos"""
        try:
            # Leer audio
            audio, overflowed = self.stream.read(CHUNK_SIZE)
            if overflowed:
                print("[WARN] Overflow")
            
            # FFT
            fft = np.fft.rfft(audio.flatten() * np.hanning(CHUNK_SIZE))
            magnitudes = np.abs(fft)
            magnitudes_db = self.amplitud_to_db(magnitudes)
            
            # Actualizar líneas
            self.line.set_data(self.freqs[self.mask_audible], magnitudes_db[self.mask_audible])
            self.ultrasonic_line.set_data(self.freqs[self.mask_ultrasonic], magnitudes_db[self.mask_ultrasonic])
            
            # Detectar picos ultrasónicos significativos
            if np.any(self.mask_ultrasonic):
                ultrasonic_mags = magnitudes_db[self.mask_ultrasonic]
                ultrasonic_freqs = self.freqs[self.mask_ultrasonic]
                
                # Encontrar picos
                peaks = []
                for i in range(1, len(ultrasonic_mags)-1):
                    if (ultrasonic_mags[i] > ultrasonic_mags[i-1] and 
                        ultrasonic_mags[i] > ultrasonic_mags[i+1] and
                        ultrasonic_mags[i] > 20):  # Umbral más bajo (20 en escala 0-100)
                        peaks.append((ultrasonic_freqs[i], ultrasonic_mags[i]))
                
                # Mostrar picos más fuertes
                if peaks:
                    peaks.sort(key=lambda x: x[1], reverse=True)
                    for freq, mag in peaks[:3]:  # Top 3
                        # Verificar si está cerca de una frecuencia del protocolo
                        for proto_name, proto_freq in PROTOCOL_FREQS.items():
                            if abs(freq - proto_freq) < 100:  # Tolerancia 100Hz
                                print(f"[DETECTADO] {proto_name}: {freq:.0f} Hz @ {mag:.1f}")
                                break
                        else:
                            print(f"[PICO] {freq:.0f} Hz @ {mag:.1f}")
            
            return self.line, self.ultrasonic_line
            
        except Exception as e:
            print(f"[ERROR] {e}")
            return self.line, self.ultrasonic_line
    
    def run(self):
        """Ejecuta la visualización"""
        try:
            ani = animation.FuncAnimation(self.fig, self.update, interval=50, blit=True)
            plt.show()
        except KeyboardInterrupt:
            print("\n[DETENIDO]")
        finally:
            self.stream.stop()
            self.stream.close()

def main():
    """Función principal"""
    try:
        espectro = EspectroVivo()
        espectro.run()
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    main() 