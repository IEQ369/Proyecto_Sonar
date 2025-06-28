#!/usr/bin/env python3
"""
Test simple del micrófono
"""

import numpy as np
import sounddevice as sd
import time

def test_microfono():
    """Test básico del micrófono"""
    print("=== TEST MICRÓFONO ===")
    
    # Configuración
    sample_rate = 44100
    duration = 1.0  # 1 segundo
    channels = 1
    
    print(f"Grabando {duration} segundo...")
    
    try:
        # Grabar audio
        audio = sd.rec(int(sample_rate * duration), 
                      samplerate=sample_rate, 
                      channels=channels, 
                      dtype=np.float32)
        sd.wait()
        
        # Analizar
        rms = np.sqrt(np.mean(audio**2))
        max_amp = np.max(np.abs(audio))
        
        print(f"RMS: {rms:.6f}")
        print(f"Max amplitud: {max_amp:.6f}")
        
        if rms > 0.001:
            print("✅ Micrófono funciona - hay señal")
        else:
            print("❌ Micrófono no detecta señal")
            
        # FFT simple
        fft = np.fft.rfft(audio.flatten())
        freqs = np.fft.rfftfreq(len(audio), 1/sample_rate)
        magnitudes = np.abs(fft)
        
        # Buscar picos
        peaks = []
        for i in range(1, len(magnitudes)-1):
            if magnitudes[i] > magnitudes[i-1] and magnitudes[i] > magnitudes[i+1]:
                if magnitudes[i] > np.max(magnitudes) * 0.1:  # 10% del máximo
                    peaks.append((freqs[i], magnitudes[i]))
        
        print(f"\nPicos detectados: {len(peaks)}")
        for freq, mag in sorted(peaks, key=lambda x: x[1], reverse=True)[:5]:
            print(f"  {freq:.0f} Hz @ {mag:.6f}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_microfono() 