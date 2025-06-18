#!/usr/bin/env python3
"""
Script de prueba para el protocolo ultrasónico
Basado en Chirp pero adaptado para frecuencias inaudibles
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from core.protocolo import ProtocoloUltrasónico, SAMPLE_RATE
from core.frecuencias import *

def test_frecuencias():
    """Prueba el mapeo de frecuencias"""
    print("=== PRUEBA DE FRECUENCIAS ===")
    
    # Probar caracteres básicos
    test_chars = ['A', 'B', 'C', '1', '2', '3', ' ', '!', '@']
    
    for char in test_chars:
        freq = char_to_frequency(char)
        char_back = frequency_to_char(freq)
        print(f"'{char}' → {freq} Hz → '{char_back}'")
    
    print(f"\nRango de frecuencias: {MIN_DATA_FREQUENCY}-{MAX_DATA_FREQUENCY} Hz")
    print(f"Total de caracteres soportados: {len(CHAR_FREQUENCIES)}")

def test_protocolo():
    """Prueba el protocolo de transmisión"""
    print("\n=== PRUEBA DE PROTOCOLO ===")
    
    protocolo = ProtocoloUltrasónico()
    
    # Mensaje de prueba
    mensaje = "HOLA MUNDO 123"
    print(f"Mensaje: '{mensaje}'")
    
    # Calcular duración
    duracion = protocolo.calcular_duracion_mensaje(mensaje)
    print(f"Duración estimada: {duracion:.2f} segundos")
    
    # Generar audio (sin reproducir)
    audio = protocolo.transmitir_mensaje(mensaje)
    print(f"Audio generado: {len(audio)} muestras")
    print(f"Duración real: {len(audio) / SAMPLE_RATE:.2f} segundos")
    
    return audio

def test_velocidad():
    """Prueba la velocidad de transmisión"""
    print("\n=== PRUEBA DE VELOCIDAD ===")
    
    protocolo = ProtocoloUltrasónico()
    
    # Calcular velocidad para diferentes tamaños
    tamanos = [10, 50, 100, 200, 500]
    
    for tamano in tamanos:
        mensaje = "A" * tamano
        duracion = protocolo.calcular_duracion_mensaje(mensaje)
        velocidad = tamano / duracion
        print(f"{tamano} caracteres: {duracion:.2f}s → {velocidad:.1f} chars/s")

def main():
    """Función principal"""
    print("🚀 PROYECTO SONAR - PRUEBA DE PROTOCOLO ULTRASÓNICO")
    print("=" * 60)
    
    try:
        test_frecuencias()
        test_protocolo()
        test_velocidad()
        
        print("\n✅ Todas las pruebas completadas exitosamente!")
        print("\nPara transmitir un mensaje real, ejecuta:")
        print("python -c \"from src.core.protocolo import ProtocoloUltrasónico; ProtocoloUltrasónico().reproducir_mensaje('HOLA')\"")
        
    except Exception as e:
        print(f"\n❌ Error durante las pruebas: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 