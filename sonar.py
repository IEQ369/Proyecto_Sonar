#!/usr/bin/env python3
"""
PROYECTO SONAR - Sistema de Exfiltración Ultrasónica
Transmite datos por frecuencias inaudibles (ultrasonido)
Basado en ataques reales como DolphinAttack
"""

import sys
import time
import threading
from src.core.emisor import emitir_mensaje, calcular_duracion_mensaje
from src.core.receptor import escuchar_continuamente
from src.core.frecuencias import char_to_frequency, frequency_to_char
import sounddevice as sd
import numpy as np

def mostrar_banner():
    """Muestra el banner del proyecto"""
    banner = """
    ███████╗ ██████╗ ███╗   ██╗ █████╗ ██████╗ 
    ██╔════╝██╔═══██╗████╗  ██║██╔══██╗██╔══██╗
    ███████╗██║   ██║██╔██╗ ██║███████║██████╔╝
    ╚════██║██║   ██║██║╚██╗██║██╔══██║██╔══██╗
    ███████║╚██████╔╝██║ ╚████║██║  ██║██║  ██║
    ╚══════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝
                                                
    [SISTEMA DE EXFILTRACIÓN ULTRASÓNICA]
    [FRECUENCIAS: 18.7-22.4 kHz (inaudibles)]
    [PROTOCOLO: INICIO-SYNC-DATOS-SYNC-FIN]
    """
    print(banner)

class BarraProgreso:
    """Clase para mostrar una barra de progreso giratoria"""
    
    def __init__(self):
        self.caracteres = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        self.indice = 0
        self.activo = False
        self.thread = None
        
    def iniciar(self, mensaje="Escuchando"):
        """Inicia la barra de progreso en un hilo separado"""
        self.activo = True
        self.thread = threading.Thread(target=self._mostrar_progreso, args=(mensaje,))
        self.thread.daemon = True
        self.thread.start()
        
    def detener(self):
        """Detiene la barra de progreso"""
        self.activo = False
        if self.thread:
            self.thread.join(timeout=1)
        print()  # Nueva línea para limpiar la barra
        
    def _mostrar_progreso(self, mensaje):
        """Muestra la barra de progreso giratoria"""
        inicio = time.time()
        while self.activo:
            tiempo_transcurrido = int(time.time() - inicio)
            minutos = tiempo_transcurrido // 60
            segundos = tiempo_transcurrido % 60
            
            # Limpiar línea anterior
            print(f"\r{self.caracteres[self.indice]} {mensaje}... [{minutos:02d}:{segundos:02d}]", end='', flush=True)
            
            self.indice = (self.indice + 1) % len(self.caracteres)
            time.sleep(0.1)

class SistemaSonar:
    """Sistema principal para transmitir y recibir datos por ultrasonido"""
    
    def __init__(self):
        # Crear barra de progreso
        self.barra_progreso = BarraProgreso()
        self.activo = False
        
    def mostrar_menu_principal(self):
        """Muestra el menú principal del sistema"""
        print("\n" + "="*50)
        print("SISTEMA SONAR - MENÚ PRINCIPAL")
        print("="*50)
        print("[1] EMITIR - Enviar mensaje por ultrasonido")
        print("[2] RECIBIR - Escuchar transmisiones")
        print("[3] ESTADO - Información del sistema")
        print("[4] SALIR - Terminar programa")
        print("="*50)
        
    def modo_emision(self):
        """Modo para emitir mensajes por ultrasonido"""
        print("\n[MODO EMISIÓN]")
        print("Rango de frecuencias: 18.7-22.4 kHz (ultrasónicas)")
        print("-" * 40)
        
        while True:
            print("\nOpciones:")
            print("[1] Mensaje")
            print("[2] Volver al menú principal")
            
            opcion = input("\nSelecciona: ").strip()
            
            if opcion == "1":
                self.modo_continuo()
            elif opcion == "2":
                break
            else:
                print("[ERROR] Opción inválida")
                
    def modo_continuo(self):
        """Modo para emitir mensajes continuamente"""
        print("\n[MENSAJE]")
        print("Escribe 'salir' para terminar o Ctrl+C para interrumpir")
        
        try:
            while True:
                mensaje = input("\nMensaje (o 'salir'): ").strip()
                if mensaje.lower() == 'salir':
                    break
                    
                if mensaje:
                    print(f"[EMITIENDO] '{mensaje}'")
                    print(f"[INFO] Duración: {calcular_duracion_mensaje(mensaje):.2f} segundos")
                    emitir_mensaje(mensaje)
                    print("[ÉXITO] Enviado")
                    
        except KeyboardInterrupt:
            print("\n[DETENIDO]")
            
    def modo_recepcion(self):
        """Modo para recibir datos por ultrasonido"""
        print("\n[MODO RECEPCIÓN]")
        print("Escuchando frecuencias ultrasónicas...")
        print("Presiona Ctrl+C para detener")
        print("-" * 40)
        
        try:
            escuchar_continuamente()
        except KeyboardInterrupt:
            print("\n[DETENIDO]")
        except Exception as e:
            print(f"\n[ERROR] {e}")
            
    def estado_sistema(self):
        """Muestra el estado actual del sistema"""
        print("\n[ESTADO DEL SISTEMA]")
        print("-" * 40)
        print(f"Frecuencia de muestreo: 44100 Hz")
        print(f"Volumen: 0.7")
        print(f"Frecuencia START: 18500 Hz")
        print(f"Frecuencia SYNC: 18600 Hz")
        print(f"Frecuencia END: 22000 Hz")
        print(f"Rango de datos: 18700-25500 Hz")
        print("-" * 40)
        
        # Verificar dispositivos de audio
        try:
            devices = sd.query_devices()
            default_output = sd.query_devices(kind='output')
            print(f"Salida de audio: {default_output['name'] if isinstance(default_output, dict) else default_output}")
            print(f"Dispositivos disponibles: {len(devices)}")
        except Exception as e:
            print(f"[ADVERTENCIA] Error al consultar dispositivos: {e}")
            
    def ejecutar(self):
        """Ejecuta el sistema principal"""
        mostrar_banner()
        time.sleep(1)
        
        while True:
            self.mostrar_menu_principal()
            opcion = input("\nSelecciona: ").strip()
            
            if opcion == "1":
                self.modo_emision()
            elif opcion == "2":
                self.modo_recepcion()
            elif opcion == "3":
                self.estado_sistema()
                input("\nPresiona Enter para continuar...")
            elif opcion == "4":
                print("\n[TERMINADO]")
                break
            else:
                print("[ERROR] Opción inválida")
                
            print()

def main():
    """Función principal del programa"""
    try:
        sonar = SistemaSonar()
        sonar.ejecutar()
    except KeyboardInterrupt:
        print("\n\n[INTERRUMPIDO]")
    except Exception as e:
        print(f"\n[ERROR FATAL] {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 