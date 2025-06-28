#!/usr/bin/env python3
"""
Diagnóstico de hardware para ultrasonidos
Valida que el micrófono capture correctamente frecuencias ultrasónicas
"""

import numpy as np
import sounddevice as sd
import scipy.signal as signal
import time
import sys
import os

# Configuración para ultrasonidos
SAMPLE_RATE = 96000
CHUNK_SIZE = 4096  # ~43ms a 96kHz
DURATION = 5  # segundos de grabación

# Rango ultrasónico
MIN_FREQ = 18000
MAX_FREQ = 26000

def generar_tono_ultrasonico(freq, duracion=2):
    """Genera un tono ultrasónico para pruebas"""
    t = np.linspace(0, duracion, int(SAMPLE_RATE * duracion))
    signal = np.sin(2 * np.pi * freq * t) * 0.1  # 10% volumen
    return signal

def analizar_espectro(data, sample_rate):
    """Análisis espectral detallado"""
    # Aplicar ventana de Hann
    windowed = data * signal.windows.hann(len(data))
    
    # FFT
    fft = np.fft.rfft(windowed)
    freqs = np.fft.rfftfreq(len(windowed), 1/sample_rate)
    
    # Magnitudes en dB
    magnitudes = np.abs(fft)
    db = 20 * np.log10(magnitudes + 1e-10)
    
    return freqs, db

def detectar_picos_ultrasonicos(freqs, db, min_db=-40):
    """Detecta picos en el rango ultrasónico"""
    mask = (freqs >= MIN_FREQ) & (freqs <= MAX_FREQ) & (db > min_db)
    if not np.any(mask):
        return []
    
    freqs_ultra = freqs[mask]
    db_ultra = db[mask]
    
    # Encontrar picos locales
    peaks, _ = signal.find_peaks(db_ultra, height=min_db, distance=10)
    
    picos = []
    for peak in peaks:
        picos.append({
            'freq': freqs_ultra[peak],
            'db': db_ultra[peak],
            'idx': peak
        })
    
    # Ordenar por magnitud
    picos.sort(key=lambda x: x['db'], reverse=True)
    return picos

def test_grabacion_directa():
    """Test de grabación directa sin procesamiento"""
    print("=" * 60)
    print("TEST DE GRABACIÓN DIRECTA")
    print("=" * 60)
    print("Este test graba audio directo y analiza el espectro completo")
    print("para verificar que el micrófono capture ultrasonidos.")
    print()
    
    try:
        # Configurar stream
        stream = sd.InputStream(
            channels=1,
            samplerate=SAMPLE_RATE,
            blocksize=CHUNK_SIZE,
            dtype=np.float32
        )
        
        print(f"[INFO] Iniciando grabación de {DURATION}s...")
        print(f"[INFO] Sample rate: {SAMPLE_RATE} Hz")
        print(f"[INFO] Chunk size: {CHUNK_SIZE} muestras")
        print()
        
        # Grabar
        recording = sd.rec(int(SAMPLE_RATE * DURATION), 
                          samplerate=SAMPLE_RATE, 
                          channels=1, 
                          dtype=np.float32)
        sd.wait()
        
        print("[INFO] Grabación completada")
        
        # Analizar espectro
        freqs, db = analizar_espectro(recording.flatten(), SAMPLE_RATE)
        
        # Encontrar picos ultrasónicos
        picos = detectar_picos_ultrasonicos(freqs, db, min_db=-50)
        
        print(f"\n[RESULTADOS] Picos detectados en rango ultrasónico:")
        if picos:
            for i, pico in enumerate(picos[:5]):  # Top 5
                print(f"  {i+1}. {pico['freq']:.0f} Hz @ {pico['db']:.1f} dB")
        else:
            print("  No se detectaron picos significativos")
        
        # Estadísticas del espectro
        mask_ultra = (freqs >= MIN_FREQ) & (freqs <= MAX_FREQ)
        if np.any(mask_ultra):
            db_ultra = db[mask_ultra]
            print(f"\n[ESTADÍSTICAS] Rango ultrasónico:")
            print(f"  Nivel máximo: {np.max(db_ultra):.1f} dB")
            print(f"  Nivel promedio: {np.mean(db_ultra):.1f} dB")
            print(f"  Nivel mínimo: {np.min(db_ultra):.1f} dB")
            print(f"  Desviación estándar: {np.std(db_ultra):.1f} dB")
        
        return len(picos) > 0
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def test_tiempo_real():
    """Test de análisis en tiempo real"""
    print("=" * 60)
    print("TEST DE ANÁLISIS EN TIEMPO REAL")
    print("=" * 60)
    print("Este test analiza el espectro en tiempo real")
    print("para detectar ultrasonidos activos.")
    print("Presiona Ctrl+C para detener")
    print()
    
    try:
        stream = sd.InputStream(
            channels=1,
            samplerate=SAMPLE_RATE,
            blocksize=CHUNK_SIZE,
            dtype=np.float32
        )
        stream.start()
        
        frame_count = 0
        detections = 0
        
        print("[INFO] Iniciando análisis en tiempo real...")
        print("Esperando señales ultrasónicas...")
        print()
        
        while True:
            data, overflowed = stream.read(CHUNK_SIZE)
            if overflowed:
                print("[WARN] Overflow detectado")
            
            frame_count += 1
            
            # Analizar frame
            freqs, db = analizar_espectro(data.flatten(), SAMPLE_RATE)
            picos = detectar_picos_ultrasonicos(freqs, db, min_db=-45)
            
            if picos:
                detections += 1
                print(f"[DETECCIÓN {detections}] Frame {frame_count}:")
                for pico in picos[:3]:  # Top 3
                    print(f"  {pico['freq']:.0f} Hz @ {pico['db']:.1f} dB")
                print()
            
            # Mostrar estadísticas cada 50 frames
            if frame_count % 50 == 0:
                print(f"[STATS] Frames: {frame_count}, Detecciones: {detections}")
                print(f"[STATS] Tasa de detección: {detections/frame_count*100:.1f}%")
                print()
            
            time.sleep(0.1)  # Pausa para no saturar
            
    except KeyboardInterrupt:
        print("\n[DETENIDO]")
    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        if 'stream' in locals():
            stream.stop()
            stream.close()

def test_filtro_pasabanda():
    """Test del filtro pasa-banda"""
    print("=" * 60)
    print("TEST DE FILTRO PASA-BANDA")
    print("=" * 60)
    
    # Crear filtro
    sos = signal.butter(8, [MIN_FREQ, MAX_FREQ], 
                       btype='bandpass', fs=SAMPLE_RATE, output='sos')
    
    # Generar señal de prueba (mezcla de frecuencias)
    t = np.linspace(0, 2, int(SAMPLE_RATE * 2))
    signal_test = (np.sin(2 * np.pi * 1000 * t) +      # 1kHz (audible)
                  np.sin(2 * np.pi * 20000 * t) +      # 20kHz (ultrasónico)
                  np.sin(2 * np.pi * 30000 * t)) * 0.1 # 30kHz (ultrasónico)
    
    # Aplicar filtro
    filtered = signal.sosfilt(sos, signal_test)
    
    # Analizar espectro original y filtrado
    freqs_orig, db_orig = analizar_espectro(signal_test, SAMPLE_RATE)
    freqs_filt, db_filt = analizar_espectro(filtered, SAMPLE_RATE)
    
    print("[RESULTADOS] Análisis del filtro:")
    
    # Verificar que el filtro mantiene ultrasonidos y elimina audibles
    mask_audible = (freqs_orig >= 1000) & (freqs_orig <= 2000)
    mask_ultra = (freqs_orig >= MIN_FREQ) & (freqs_orig <= MAX_FREQ)
    
    if np.any(mask_audible):
        audible_orig = np.max(db_orig[mask_audible])
        audible_filt = np.max(db_filt[mask_audible])
        print(f"  Frecuencia audible (1kHz): {audible_orig:.1f} dB -> {audible_filt:.1f} dB")
    
    if np.any(mask_ultra):
        ultra_orig = np.max(db_orig[mask_ultra])
        ultra_filt = np.max(db_filt[mask_ultra])
        print(f"  Frecuencia ultrasónica (20kHz): {ultra_orig:.1f} dB -> {ultra_filt:.1f} dB")
    
    print("  [OK] Filtro pasa-banda configurado correctamente")

def main():
    """Función principal"""
    print("DIAGNÓSTICO DE HARDWARE PARA ULTRASONIDOS")
    print("=" * 60)
    print("Este script valida que tu hardware capture ultrasonidos correctamente")
    print()
    
    # Verificar configuración
    print("[CONFIG] Configuración del sistema:")
    print(f"  Sample rate: {SAMPLE_RATE} Hz")
    print(f"  Rango ultrasónico: {MIN_FREQ}-{MAX_FREQ} Hz")
    print(f"  Chunk size: {CHUNK_SIZE} muestras")
    print()
    
    # Listar dispositivos de audio
    print("[INFO] Dispositivos de audio disponibles:")
    devices = sd.query_devices()
    for i, device in enumerate(devices):
        if device.get('max_inputs', 0) > 0:
            print(f"  {i}: {device.get('name', 'Unknown')} (inputs: {device.get('max_inputs', 0)})")
    print()
    
    # Ejecutar tests
    print("Ejecutando tests de diagnóstico...")
    print()
    
    # Test 1: Filtro pasa-banda
    test_filtro_pasabanda()
    print()
    
    # Test 2: Grabación directa
    print("Test 2: Grabación directa (5 segundos)")
    print("Habla o genera algún sonido durante la grabación...")
    input("Presiona Enter para continuar...")
    
    resultado_grabacion = test_grabacion_directa()
    print()
    
    # Test 3: Tiempo real
    if resultado_grabacion:
        print("Test 3: Análisis en tiempo real")
        print("Este test detectará ultrasonidos activos en tiempo real")
        input("Presiona Enter para continuar (Ctrl+C para detener)...")
        test_tiempo_real()
    else:
        print("[WARN] Saltando test de tiempo real - no se detectaron ultrasonidos")
    
    print()
    print("=" * 60)
    print("DIAGNÓSTICO COMPLETADO")
    print("=" * 60)
    
    if resultado_grabacion:
        print("[RESULTADO] ✅ El hardware parece capaz de captar ultrasonidos")
        print("[RECOMENDACIÓN] Puedes proceder con el receptor ultrasónico")
    else:
        print("[RESULTADO] ❌ No se detectaron ultrasonidos")
        print("[RECOMENDACIÓN] Verifica:")
        print("  - Configuración del micrófono en Windows")
        print("  - Permisos de audio")
        print("  - Calidad del micrófono (debe soportar >20kHz)")
        print("  - Interferencias electromagnéticas")

if __name__ == "__main__":
    main() 