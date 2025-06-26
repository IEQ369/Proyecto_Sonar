import matplotlib
matplotlib.use('tkagg')
import numpy as np
import sounddevice as sd
import matplotlib.pyplot as plt

SAMPLE_RATE = 44100
CHUNK = 2048  # Tamaño de ventana para FFT

# --- Visualización en vivo del espectro ---
def espectro_en_vivo():
    print(f"[INFO] Mostrando espectro en vivo. Cierra la ventana para terminar.")
    fig, ax = plt.subplots(figsize=(10, 4))
    x = np.fft.rfftfreq(CHUNK, 1/SAMPLE_RATE)
    line, = ax.plot(x, np.zeros_like(x), color='#00ffff')
    ax.set_xlim(18000, 20000)  # Rango optimizado: 18-20 kHz
    ax.set_ylim(0, 1)
    ax.set_xlabel('Frecuencia (Hz)')
    ax.set_ylabel('Magnitud (normalizada)')
    ax.set_title('Espectro FFT en vivo (micrófono) - Rango 18-20 kHz')
    ax.grid(True, color='#222222')
    fig.patch.set_facecolor('black')
    ax.set_facecolor('black')
    ax.tick_params(axis='x', colors='#00ffff')
    ax.tick_params(axis='y', colors='#00ffff')
    ax.xaxis.label.set_color('#00ffff')
    ax.yaxis.label.set_color('#00ffff')
    ax.title.set_color('#00ffff')

    stream = sd.InputStream(channels=1, samplerate=SAMPLE_RATE, blocksize=CHUNK)
    stream.start()

    plt.ion()
    try:
        while plt.fignum_exists(fig.number):
            audio, _ = stream.read(CHUNK)
            audio = audio[:, 0]
            fft = np.abs(np.fft.rfft(audio * np.hanning(len(audio))))
            if np.max(fft) > 0:
                fft /= float(np.max(fft))
            line.set_ydata(fft)
            ax.set_ylim(0, float(np.max(fft))*1.1 if np.max(fft) > 0 else 1)
            plt.pause(0.005)  # Más fluido
    except KeyboardInterrupt:
        print("\n[DETENIDO] Visualización interrumpida por el usuario.")
    finally:
        stream.stop()
        plt.ioff()
        plt.close()

if __name__ == "__main__":
    espectro_en_vivo() 