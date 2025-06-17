import numpy as np
import sounddevice as sd
from utilidades import binario_a_texto  # Asumo que tienes esta función inversa

# Parámetros
sample_rate = 44100
duration_ms = 100  # Debe coincidir con el emisor
window_size = int(sample_rate * duration_ms / 1000)

# Frecuencias a detectar
freq_1 = 20000
freq_0 = 19000

def goertzel(samples, sample_rate, freq):
    """Algoritmo Goertzel para detectar potencia en frecuencia específica."""
    k = int(0.5 + ((window_size * freq) / sample_rate))
    omega = (2.0 * np.pi * k) / window_size
    sine = np.sin(omega)
    cosine = np.cos(omega)
    coeff = 2 * cosine
    q0, q1, q2 = 0, 0, 0
    for sample in samples:
        q0 = coeff * q1 - q2 + sample
        q2 = q1
        q1 = q0
    power = q1**2 + q2**2 - q1 * q2 * coeff
    return power

def detectar_bit(samples):
    power_1 = goertzel(samples, sample_rate, freq_1)
    power_0 = goertzel(samples, sample_rate, freq_0)
    return '1' if power_1 > power_0 else '0'

def callback(indata, frames, time, status):
    global binario_recibido
    if status:
        print(status)
    samples = indata[:, 0]
    bit = detectar_bit(samples)
    binario_recibido += bit
    print(f"Bit detectado: {bit}", end='', flush=True)

if __name__ == "__main__":
    print("Iniciando receptor...")
    binario_recibido = ""
    with sd.InputStream(channels=1, samplerate=sample_rate, blocksize=window_size, callback=callback):
        print(f"Escuchando tonos de {duration_ms} ms para 19kHz y 20kHz... Presiona Ctrl+C para parar.")
        try:
            while True:
                pass
        except KeyboardInterrupt:
            print("\nRecepción terminada.")
            texto = binario_a_texto(binario_recibido)
            print(f"\nMensaje recibido: {texto}")
