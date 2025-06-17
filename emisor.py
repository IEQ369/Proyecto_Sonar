from pydub import AudioSegment
from pydub.playback import play
import numpy as np
from utilidades import texto_a_binario

def generar_tono(frecuencia=20000, duracion_ms=100, volumen_db=-10):
    sample_rate = 44100
    t = np.linspace(0, duracion_ms / 1000, int(sample_rate * duracion_ms / 1000), False)
    tono = np.sin(2 * np.pi * frecuencia * t) * 32767
    tono = tono.astype(np.int16)
    
    audio = AudioSegment(
        tono.tobytes(),
        frame_rate=sample_rate,
        sample_width=2,
        channels=1
    ).apply_gain(volumen_db)
    
    return audio

if __name__ == "__main__":
    mensaje = input("Introduce el mensaje a enviar: ")
    binario = texto_a_binario(mensaje)
    print(f"Binario generado: {binario}")

    tonos = []

    for bit in binario:
        if bit == '1':
            tonos.append(generar_tono(20000))  # Bit 1 = 20 kHz
        else:
            tonos.append(generar_tono(19000))  # Bit 0 = 19 kHz

    print("Reproduciendo señal ultrasónica...")
    for tono in tonos:
        play(tono)
