#!/usr/bin/env python3
"""
Test con frecuencias audibles para confirmar funcionamiento
"""

import numpy as np
import sounddevice as sd
from src.core.protocolo import ProtocoloUltrasónico
import time

def main():
    print("🔊 TEST CON FRECUENCIAS AUDIBLES")
    print("=" * 50)
    print("Este test usa frecuencias audibles (1-8 kHz)")
    print("para confirmar que el sistema de audio funciona.")
    print("=" * 50)
    
    # Crear protocolo
    protocolo = ProtocoloUltrasónico()
    
    # Test 1: Tono audible simple
    print("📡 Test 1: Tono audible a 2 kHz")
    frecuencia = 2000  # 2 kHz (audible)
    duracion = 2.0  # 2 segundos
    
    tono = protocolo.generar_tono(frecuencia, duracion)
    print(f"✅ Tono generado: {len(tono)} muestras")
    print(f"⏱️  Duración: {len(tono)/protocolo.sample_rate:.2f}s")
    print(f"🎵 Frecuencia: {frecuencia} Hz (AUDIBLE)")
    
    # Reproducir
    print("🔊 Reproduciendo tono audible...")
    print("🎧 Deberías escuchar un tono agudo de 2 segundos")
    sd.play(tono, protocolo.sample_rate)
    sd.wait()
    print("✅ Tono reproducido")
    
    time.sleep(1)
    
    # Test 2: Secuencia de tonos audibles
    print("\n📡 Test 2: Secuencia de tonos audibles")
    frecuencias = [1000, 2000, 3000, 4000, 5000]  # 1-5 kHz
    
    for i, freq in enumerate(frecuencias, 1):
        print(f"🎵 Tono {i}/5: {freq} Hz")
        tono = protocolo.generar_tono(freq, 0.5)  # 0.5 segundos
        sd.play(tono, protocolo.sample_rate)
        sd.wait()
        time.sleep(0.2)
    
    print("✅ Secuencia completada")
    
    # Test 3: Verificar configuración de audio
    print("\n📊 Test 3: Configuración de audio")
    print(f"Sample Rate: {protocolo.sample_rate} Hz")
    print(f"Volumen: {protocolo.volume}")
    
    # Verificar dispositivos de audio
    try:
        devices = sd.query_devices()
        print(f"Dispositivos de audio disponibles: {len(devices)}")
        default_output = sd.query_devices(kind='output')
        if isinstance(default_output, dict) and 'name' in default_output:
            print(f"Dispositivo de salida por defecto: {default_output['name']}")
        else:
            print(f"Dispositivo de salida por defecto: {default_output}")
    except Exception as e:
        print(f"Error al consultar dispositivos: {e}")
    
    print("\n🎯 CONCLUSIÓN:")
    print("Si escuchaste los tonos audibles, el sistema funciona.")
    print("Si no escuchaste nada, hay un problema de configuración de audio.")
    print("Las frecuencias ultrasónicas (19-22 kHz) son inaudibles pero detectables.")

if __name__ == "__main__":
    main() 