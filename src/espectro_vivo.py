import matplotlib
matplotlib.use('tkagg')
import numpy as np
import sounddevice as sd
import matplotlib.pyplot as plt
import datetime

SAMPLE_RATE = 44100
CHUNK = 2048  # Tamaño de ventana para FFT

# --- Visualización en vivo del espectro ---
def espectro_en_vivo(duracion=10):
    print(f"[INFO] Mostrando espectro en vivo durante {duracion} segundos...")
    fig, ax = plt.subplots(figsize=(10, 4))
    x = np.fft.rfftfreq(CHUNK, 1/SAMPLE_RATE)
    line, = ax.plot(x, np.zeros_like(x), color='#00ffff')
    ax.set_xlim(0, 22000)
    ax.set_ylim(0, 1)
    ax.set_xlabel('Frecuencia (Hz)')
    ax.set_ylabel('Magnitud (normalizada)')
    ax.set_title('Espectro FFT en vivo (micrófono)')
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
    start_time = datetime.datetime.now()
    elapsed = 0
    while elapsed < duracion:
        audio, _ = stream.read(CHUNK)
        audio = audio[:, 0]
        fft = np.abs(np.fft.rfft(audio * np.hanning(len(audio))))
        if np.max(fft) > 0:
            fft /= float(np.max(fft))
        line.set_ydata(fft)
        ax.set_ylim(0, float(np.max(fft))*1.1 if np.max(fft) > 0 else 1)
        plt.pause(0.01)
        elapsed = (datetime.datetime.now() - start_time).total_seconds()

    stream.stop()
    plt.ioff()
    plt.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Visualización en vivo del espectro FFT (micrófono)")
    parser.add_argument('-d', '--duracion', type=float, default=10, help='Duración en segundos')
    args = parser.parse_args()
    espectro_en_vivo(duracion=args.duracion) 