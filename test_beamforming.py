from beamforming import Beamformer
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import tkinter as tk
from tkinter import ttk
import sounddevice as sd  # Añadir este import

class AudioVisualizer:
    def __init__(self, root):
        self.root = root
        self.root.title("Visualizador de Audio")
        
        # Configuración inicial
        self.frequency = 1000  # Frecuencia audible en Hz
        self.duration = 2.0     # Duración en segundos
        self.sample_rate = 44100
        
        # Interfaz
        self.setup_ui()
        
        # Configurar dispositivo de audio
        self.setup_audio_devices()
        
    def setup_ui(self):
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Controles
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill=tk.X, pady=5)
        
        ttk.Label(control_frame, text="Frecuencia (Hz):").pack(side=tk.LEFT)
        self.freq_entry = ttk.Entry(control_frame, width=8)
        self.freq_entry.insert(0, "1000")
        self.freq_entry.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(control_frame, text="Generar Onda", command=self.update_plot).pack(side=tk.LEFT, padx=5)
        
        # Gráficos
        self.figure, (self.ax1, self.ax2) = plt.subplots(2, 1, figsize=(10, 6))
        self.canvas = FigureCanvasTkAgg(self.figure, master=main_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Generar primera visualización
        self.update_plot()
    
    def setup_audio_devices(self):
        """Listar y configurar dispositivos de audio"""
        print("\nDispositivos de audio disponibles:")
        devices = sd.query_devices()
        for i, dev in enumerate(devices):
            print(f"{i}: {dev['name']} (Entradas: {dev['max_input_channels']}, Salidas: {dev['max_output_channels']})")
        
        # Configurar dispositivo por defecto
        sd.default.samplerate = self.sample_rate
        sd.default.device = 'default'  # Usar dispositivo predeterminado

    def generate_wave(self):
        try:
            self.frequency = float(self.freq_entry.get())
        except ValueError:
            self.frequency = 1000
            self.freq_entry.delete(0, tk.END)
            self.freq_entry.insert(0, "1000")
            
        t = np.linspace(0, self.duration, int(self.sample_rate * self.duration), False)
        signal = np.sin(2 * np.pi * self.frequency * t)
        
        # Reproducir el sonido generado
        sd.play(signal, self.sample_rate)
        sd.wait()  # Esperar a que termine la reproducción
        
        return signal
    
    def update_plot(self):
        signal = self.generate_wave()
        bf = Beamformer()
        angle = bf.estimate_direction(signal)
        
        # Limpiar gráficos
        self.ax1.clear()
        self.ax2.clear()
        
        # Gráfico 1: Onda de audio
        self.ax1.plot(signal[:1000])
        self.ax1.set_title(f'Onda de {self.frequency}Hz (primeros 1000 puntos)')
        self.ax1.set_xlabel('Muestras')
        self.ax1.set_ylabel('Amplitud')
        
        # Gráfico 2: Dirección estimada
        self.ax2 = plt.subplot(2, 1, 2, polar=True)
        bars = self.ax2.bar(np.radians(angle), 1, width=np.radians(15), color='r', alpha=0.7)
        self.ax2.set_title(f'Dirección estimada: {angle:.1f}°')
        self.ax2.set_ylim(0, 1)
        self.ax2.grid(True)
        
        self.canvas.draw()

if __name__ == "__main__":
    root = tk.Tk()
    app = AudioVisualizer(root)
    root.mainloop()