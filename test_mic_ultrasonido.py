#!/usr/bin/env python3
"""
Test específico del micrófono para ultrasonido
"""

import numpy as np
import sounddevice as sd
import time

def test_mic_ultrasonido():
    """Test específico para frecuencias ultrasónicas"""
    print("=== TEST MICRÓFONO ULTRASÓNICO ===")
    
    # Configuración
    sample_rate = 44100
    duration = 2.0  # 2 segundos
    channels = 1
    
    # Frecuencias a testear (las del protocolo)
    frecuencias_test = [
        18500,  # START
        18600,  # SYNC  
        18700,  # Espacio
        19800,  # A
        21000,  # M
        22000,  # END
    ]
    
    print(f"Grabando {duration} segundos...")
    print("Haz ruido o habla durante la grabación para comparar")
    
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
        
        # FFT
        fft = np.fft.rfft(audio.flatten())
        freqs = np.fft.rfftfreq(len(audio), 1/sample_rate)
        magnitudes = np.abs(fft)
        
        print(f"\n=== ANÁLISIS POR FRECUENCIAS ===")
        
        # Analizar frecuencias audibles (0-20kHz)
        rango_audible = freqs <= 20000
        magnitudes_audibles = magnitudes[rango_audible]
        freqs_audibles = freqs[rango_audible]
        
        if len(magnitudes_audibles) > 0:
            max_audible_idx = np.argmax(magnitudes_audibles)
            max_audible_freq = freqs_audibles[max_audible_idx]
            max_audible_mag = magnitudes_audibles[max_audible_idx]
            print(f"Pico audible: {max_audible_freq:.0f} Hz @ {max_audible_mag:.6f}")
        
        # Analizar frecuencias ultrasónicas (18-26kHz)
        rango_ultrasonico = (freqs >= 18000) & (freqs <= 26000)
        magnitudes_ultrasonicas = magnitudes[rango_ultrasonico]
        freqs_ultrasonicas = freqs[rango_ultrasonico]
        
        if len(magnitudes_ultrasonicas) > 0:
            max_ultrasonico_idx = np.argmax(magnitudes_ultrasonicas)
            max_ultrasonico_freq = freqs_ultrasonicas[max_ultrasonico_idx]
            max_ultrasonico_mag = magnitudes_ultrasonicas[max_ultrasonico_idx]
            print(f"Pico ultrasónico: {max_ultrasonico_freq:.0f} Hz @ {max_ultrasonico_mag:.6f}")
        
        # Comparar respuesta
        if len(magnitudes_audibles) > 0 and len(magnitudes_ultrasonicas) > 0:
            ratio = max_ultrasonico_mag / max_audible_mag
            print(f"Ratio ultrasónico/audible: {ratio:.3f}")
            
            if ratio < 0.1:
                print("❌ Micrófono atenúa mucho ultrasonido")
            elif ratio < 0.5:
                print("⚠️ Micrófono atenúa ultrasonido moderadamente")
            else:
                print("✅ Micrófono responde bien a ultrasonido")
        
        # Buscar picos cerca de las frecuencias del protocolo
        print(f"\n=== PICOS CERCA DEL PROTOCOLO ===")
        tolerancia = 100  # Hz
        
        for freq_test in frecuencias_test:
            rango_busqueda = (freqs >= freq_test - tolerancia) & (freqs <= freq_test + tolerancia)
            if np.any(rango_busqueda):
                magnitudes_rango = magnitudes[rango_busqueda]
                freqs_rango = freqs[rango_busqueda]
                max_rango_idx = np.argmax(magnitudes_rango)
                max_rango_freq = freqs_rango[max_rango_idx]
                max_rango_mag = magnitudes_rango[max_rango_idx]
                
                if max_rango_mag > np.max(magnitudes) * 0.01:  # 1% del máximo
                    print(f"  {freq_test} Hz: {max_rango_freq:.0f} Hz @ {max_rango_mag:.6f}")
                else:
                    print(f"  {freq_test} Hz: Sin señal significativa")
            else:
                print(f"  {freq_test} Hz: Sin detección")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_mic_ultrasonido() 