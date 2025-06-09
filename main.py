import sounddevice as sd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import tkinter as tk
from tkinter import ttk
from scipy import signal  # Asegúrate de importar signal

class AudioTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Prueba de Audio - Proyecto Sonar")
        
        # Configuración de la interfaz
        self.setup_ui()
        
    def setup_ui(self):
        # Frame principal
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Botones
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(btn_frame, text="Listar Dispositivos", command=self.list_devices).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Probar Audio", command=self.test_audio).pack(side=tk.LEFT, padx=5)
        
        # Área de gráficos
        self.figure, self.ax = plt.subplots(figsize=(8, 4))
        self.canvas = FigureCanvasTkAgg(self.figure, master=main_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Consola de texto
        self.console = tk.Text(main_frame, height=8, state='disabled')
        self.console.pack(fill=tk.X, pady=5)
        
    def log(self, message):
        self.console.configure(state='normal')
        self.console.insert(tk.END, message + "\n")
        self.console.configure(state='disabled')
        self.console.see(tk.END)
        
    def list_devices(self):
        self.log("\n=== Dispositivos de Audio ===")
        devices = sd.query_devices()
        for i, dev in enumerate(devices):
            self.log(f"{i}: {dev['name']} (Entradas: {dev['max_input_channels']}, Salidas: {dev['max_output_channels']})")
    
    def test_audio(self):
        try:
            self.log("\nIniciando prueba ultrasónica...")
            
            # Configuración para sonido no audible
            sample_rate = 48000  # Aumentado para soportar ultrasonidos
            duration = 0.008    # 8ms de duración (más corto que antes)
            freq = 19000        # Frecuencia ultrasónica (18-20kHz)
            volume = 0.5         # Volumen moderado para evitar distorsión

            # Detección automática de dispositivos
            devices = sd.query_devices()
            input_device = sd.default.device[0]
            output_device = sd.default.device[1]
            
            # Verificar dispositivos
            if not devices[input_device]['max_input_channels'] > 0:
                input_device = next((i for i, dev in enumerate(devices) 
                                  if dev['max_input_channels'] > 0), None)
            if not devices[output_device]['max_output_channels'] > 0:
                output_device = next((i for i, dev in enumerate(devices) 
                                   if dev['max_output_channels'] > 0), None)
            
            if input_device is None or output_device is None:
                self.log("Error: No se encontraron dispositivos válidos")
                return

            # Generar tono ultrasónico
            t = np.linspace(0, duration, int(sample_rate * duration), False)
            test_signal = volume * np.sin(2 * np.pi * freq * t)
            test_signal *= np.hanning(len(test_signal))  # Suavizado

            # Configuración para captura de ecos
            delay_before_record = 0.1  # 100ms de delay
            silence = np.zeros(int(delay_before_record * sample_rate))
            full_signal = np.concatenate((test_signal, silence))

            # Reproducir con delay y grabar
            self.log("Reproduciendo pulso con delay...")
            recording = sd.playrec(full_signal, samplerate=sample_rate, 
                                 channels=1, device=(input_device, output_device))
            sd.wait()
        
            # Procesamiento mejorado
            recording = recording.flatten()
            
            # Cortar el inicio para ignorar sonido directo
            recording = recording[int(delay_before_record * sample_rate):]
            
            # Detección de ecos con umbral adaptativo
            threshold = 0.1 * np.max(np.abs(recording))
            echo_indices = np.where(np.abs(recording) > threshold)[0]
            
            # Mejora en el cálculo de distancias
            window_size = 50  # Tamaño de ventana para análisis de picos
            peaks, _ = signal.find_peaks(np.abs(recording), height=threshold, distance=window_size)
            echo_times = peaks / sample_rate
            distances = [(343 * t) / 2 for t in echo_times]  # List comprehension más eficiente
            
            # Filtrado Kalman simple
            kalman_gain = 0.3
            filtered_distances = [distances[0]]
            for i in range(1, len(distances)):
                filtered = filtered_distances[-1] + kalman_gain * (distances[i] - filtered_distances[-1])
                filtered_distances.append(filtered)
            
            # Filtrar distancias (0.1m a 1m)
            distances = [d for d in distances if 0.1 <= d <= 1.0]
        
            # Visualización mejorada
            self.ax.clear()
            self.ax.plot(np.arange(len(recording))/sample_rate, recording, label='Señal grabada')
            
            # Marcar ecos con ambas unidades
            for i, (idx, dist) in enumerate(zip(echo_indices, distances)):
                dist_cm = dist * 100  # Convertir a cm
                if i == 0:
                    self.ax.axvline(x=idx/sample_rate, color='r', linestyle='--', 
                                   label=f'Eco a {dist:.2f}m ({dist_cm:.0f}cm)')
                else:
                    self.ax.axvline(x=idx/sample_rate, color='r', linestyle='--', alpha=0.5)
            
            self.ax.set_title(f'Ecos detectados: {len(distances)} objetos cercanos')
            self.ax.legend()
            self.canvas.draw()
            
            # Gráfico polar mejorado
            fig = plt.figure(figsize=(12,6))
            
            # Subplot 1: Radar con sectores
            ax1 = fig.add_subplot(121, projection='polar')
            angles = np.linspace(0, 2*np.pi, len(distances), endpoint=False)
            colors = plt.cm.viridis(np.linspace(0, 1, len(distances)))
            
            bars = ax1.bar(angles, distances, width=0.5, alpha=0.7, color=colors,
                          linewidth=2, edgecolor='white')
            
            # Añadir etiquetas de distancia
            for angle, dist, bar in zip(angles, distances, bars):
                ax1.text(angle, dist, f'{dist*100:.0f}cm', 
                        ha='center', va='bottom', fontsize=8)
            
            ax1.set_title("Mapa de posición (radar)")
            ax1.set_theta_zero_location('N')
            ax1.set_theta_direction(-1)
            ax1.set_ylim(0, max(distances)+0.5 if distances else 1.0)
            
            # Subplot 2: Gráfico de barras direccionales
            ax2 = fig.add_subplot(122)
            dir_labels = ['Norte', 'Noreste', 'Este', 'Sureste', 
                         'Sur', 'Suroeste', 'Oeste', 'Noroeste']
            
            # Agrupar por dirección (simulado)
            dir_counts = np.zeros(8)
            for angle in angles:
                sector = int(angle // (np.pi/4)) % 8
                dir_counts[sector] += 1
            
            bars = ax2.bar(dir_labels, dir_counts, color='skyblue')
            ax2.set_title("Ecos por dirección")
            ax2.set_ylabel("Número de ecos")
            
            # Añadir valores encima de las barras
            for bar in bars:
                height = bar.get_height()
                ax2.text(bar.get_x() + bar.get_width()/2., height,
                        f'{int(height)}', ha='center', va='bottom')
            
            plt.tight_layout()
            plt.show()
            
            # Mostrar resultados en consola con ambas unidades
            self.log("\nResultados:")
            for i, dist in enumerate(distances):
                self.log(f"Objeto {i+1}: {dist:.2f}m ({dist*100:.0f}cm)")
        
        except Exception as e:
            self.log(f"✗ Error: {str(e)}")

if __name__ == "__main__":
    root = tk.Tk()
    app = AudioTestApp(root)
    root.mainloop()