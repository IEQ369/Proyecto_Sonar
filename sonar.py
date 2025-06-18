#!/usr/bin/env python3
"""
PROYECTO SONAR - Sistema de Exfiltración Ultrasónica
Transmite datos por frecuencias inaudibles (ultrasonido)
Basado en ataques reales como DolphinAttack
"""

import sys
import time
import threading
from src.core.protocolo import ProtocoloUltrasónico, ReceptorUltrasónico
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
    [ESTADO: OPERATIVO]
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
        # Crear el protocolo ultrasónico
        self.protocolo = ProtocoloUltrasónico()
        # Crear el receptor
        self.receptor = ReceptorUltrasónico()
        # Crear barra de progreso
        self.barra_progreso = BarraProgreso()
        self.activo = False
        
    def mostrar_menu_principal(self):
        """Muestra el menú principal del sistema"""
        print("\n" + "="*60)
        print("SISTEMA SONAR - MENÚ PRINCIPAL")
        print("="*60)
        print("[1] MODO TRANSMISIÓN - Enviar datos por ultrasonido")
        print("[2] MODO RECEPCIÓN - Escuchar transmisiones")
        print("[3] CONFIGURACIÓN - Ajustar parámetros")
        print("[4] ESTADO - Información del sistema")
        print("[5] SALIR - Terminar programa")
        print("="*60)
        
    def modo_transmision(self):
        """Modo para transmitir datos por ultrasonido"""
        print("\n[MODO TRANSMISIÓN ACTIVADO]")
        print("Rango de frecuencias: 18.7-22.4 kHz (ultrasónicas)")
        print("Protocolo: INICIO -> SYNC -> DATOS -> SYNC -> FIN")
        print("-" * 50)
        
        while True:
            print("\nOpciones de transmisión:")
            print("[1] Mensaje manual")
            print("[2] Transmitir archivo")
            print("[3] Modo continuo")
            print("[4] Volver al menú principal")
            
            opcion = input("\nSelecciona una opción: ").strip()
            
            if opcion == "1":
                self.transmitir_mensaje_manual()
            elif opcion == "2":
                self.transmitir_archivo()
            elif opcion == "3":
                self.modo_continuo()
            elif opcion == "4":
                break
            else:
                print("[ERROR] Opción inválida")
                
    def transmitir_mensaje_manual(self):
        """Transmite un mensaje que escribes manualmente"""
        mensaje = input("\nEscribe el mensaje a transmitir: ").strip()
        if not mensaje:
            print("[ERROR] Mensaje vacío")
            return
            
        print(f"\n[TRANSMITIENDO] Mensaje: '{mensaje}'")
        print(f"[INFO] Frecuencias ultrasónicas (no se escuchan)")
        print(f"[INFO] Duración estimada: {self.protocolo.calcular_duracion_mensaje(mensaje):.2f} segundos")
        
        # Mostrar qué frecuencias se van a usar
        print("\n[MAPEADO DE FRECUENCIAS]")
        for char in mensaje:
            freq = char_to_frequency(char)
            print(f"  '{char}' -> {freq} Hz")
        
        confirmar = input("\n¿Transmitir el mensaje? (s/n): ").strip().lower()
        if confirmar == 's':
            try:
                self.protocolo.reproducir_mensaje(mensaje)
                print("[ÉXITO] Transmisión completada")
            except Exception as e:
                print(f"[ERROR] Fallo en transmisión: {e}")
        else:
            print("[CANCELADO] Transmisión abortada")
            
    def transmitir_archivo(self):
        """Transmite el contenido de un archivo de texto"""
        archivo = input("\nRuta del archivo a transmitir: ").strip()
        try:
            with open(archivo, 'r', encoding='utf-8') as f:
                contenido = f.read().strip()
                
            if not contenido:
                print("[ERROR] Archivo vacío")
                return
                
            print(f"\n[ARCHIVO] Ruta: {archivo}")
            print(f"[INFO] Longitud: {len(contenido)} caracteres")
            print(f"[INFO] Duración estimada: {self.protocolo.calcular_duracion_mensaje(contenido):.2f} segundos")
            
            confirmar = input("\n¿Transmitir archivo? (s/n): ").strip().lower()
            if confirmar == 's':
                print("[TRANSMITIENDO] Contenido del archivo...")
                self.protocolo.reproducir_mensaje(contenido)
                print("[ÉXITO] Archivo transmitido")
            else:
                print("[CANCELADO] Transmisión de archivo abortada")
                
        except FileNotFoundError:
            print(f"[ERROR] Archivo no encontrado: {archivo}")
        except Exception as e:
            print(f"[ERROR] Error al leer archivo: {e}")
            
    def modo_continuo(self):
        """Modo para transmitir mensajes continuamente"""
        print("\n[MODO CONTINUO]")
        print("Transmite mensajes continuamente hasta que pares")
        print("Escribe 'salir' para terminar o Ctrl+C para interrumpir")
        
        try:
            while True:
                mensaje = input("\nMensaje (o 'salir'): ").strip()
                if mensaje.lower() == 'salir':
                    break
                    
                if mensaje:
                    print(f"[TRANSMITIENDO] '{mensaje}'")
                    self.protocolo.reproducir_mensaje(mensaje)
                    print("[ÉXITO] Mensaje enviado")
                    
        except KeyboardInterrupt:
            print("\n[DETENIDO] Modo continuo interrumpido")
            
    def modo_recepcion(self):
        """Modo para recibir datos por ultrasonido"""
        print("\n[MODO RECEPCIÓN ACTIVADO]")
        print("Escuchando frecuencias ultrasónicas...")
        print("Presiona Ctrl+C para detener")
        print("-" * 50)
        
        # Variables para el receptor
        mensajes_recibidos = []
        
        def procesar_audio(indata, frames, time, status):
            if status:
                print(f"\n[ADVERTENCIA] Estado: {status}")
            
            resultado = self.receptor.procesar_audio(indata[:, 0])
            if resultado:
                # Detener la barra temporalmente para mostrar el mensaje
                self.barra_progreso.detener()
                print(f"\n[RECIBIDO] {resultado}")
                mensajes_recibidos.append(resultado)
                # Reiniciar la barra
                self.barra_progreso.iniciar("Escuchando")
        
        try:
            with sd.InputStream(callback=procesar_audio, 
                              channels=1, 
                              samplerate=self.receptor.sample_rate,
                              blocksize=1024):
                print("[ACTIVO] Receptor iniciado")
                print("[INFO] Escuchando frecuencias ultrasónicas (18.7-22.4 kHz)")
                print("[INFO] Presiona Ctrl+C para detener")
                print()
                
                # Iniciar barra de progreso
                self.barra_progreso.iniciar("Escuchando")
                
                while True:
                    time.sleep(0.1)
                    
        except KeyboardInterrupt:
            self.barra_progreso.detener()
            print("\n[DETENIDO] Receptor terminado")
            
            # Mostrar resumen de mensajes recibidos
            if mensajes_recibidos:
                print(f"\n[RESUMEN] Mensajes recibidos: {len(mensajes_recibidos)}")
                for i, msg in enumerate(mensajes_recibidos, 1):
                    print(f"  {i}. {msg}")
            else:
                print("\n[INFO] No se recibieron mensajes")
                
        except Exception as e:
            self.barra_progreso.detener()
            print(f"\n[ERROR] Error en receptor: {e}")
            
    def configuracion(self):
        """Configuración del sistema"""
        print("\n[CONFIGURACIÓN DEL SISTEMA]")
        print("-" * 40)
        print(f"Frecuencia de muestreo: {self.protocolo.sample_rate} Hz")
        print(f"Volumen: {self.protocolo.volume}")
        print(f"Frecuencia base: {self.protocolo.frecuencia_base} Hz")
        print(f"Rango ultrasónico: 18.7-22.4 kHz")
        print("-" * 40)
        
        print("\nOpciones:")
        print("[1] Ajustar volumen")
        print("[2] Cambiar frecuencia base")
        print("[3] Volver")
        
        opcion = input("\nSelecciona: ").strip()
        
        if opcion == "1":
            try:
                nuevo_volumen = float(input("Nuevo volumen (0.0-1.0): "))
                if 0.0 <= nuevo_volumen <= 1.0:
                    self.protocolo.volume = nuevo_volumen
                    print(f"[ÉXITO] Volumen ajustado a: {nuevo_volumen}")
                else:
                    print("[ERROR] Volumen debe estar entre 0.0 y 1.0")
            except ValueError:
                print("[ERROR] Valor inválido")
                
        elif opcion == "2":
            try:
                nueva_freq = int(input("Nueva frecuencia base (Hz): "))
                if nueva_freq > 0:
                    self.protocolo.frecuencia_base = nueva_freq
                    print(f"[ÉXITO] Frecuencia base ajustada a: {nueva_freq} Hz")
                else:
                    print("[ERROR] Frecuencia debe ser positiva")
            except ValueError:
                print("[ERROR] Valor inválido")
                
    def estado_sistema(self):
        """Muestra el estado actual del sistema"""
        print("\n[ESTADO DEL SISTEMA]")
        print("-" * 40)
        print(f"Frecuencia de muestreo: {self.protocolo.sample_rate} Hz")
        print(f"Volumen: {self.protocolo.volume}")
        print(f"Frecuencia base: {self.protocolo.frecuencia_base} Hz")
        print(f"Protocolo: Ultrasónico (18.7-22.4 kHz)")
        print(f"Receptor: {'ACTIVO' if self.activo else 'INACTIVO'}")
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
            opcion = input("\nSelecciona una opción: ").strip()
            
            if opcion == "1":
                self.modo_transmision()
            elif opcion == "2":
                self.modo_recepcion()
            elif opcion == "3":
                self.configuracion()
            elif opcion == "4":
                self.estado_sistema()
                input("\nPresiona Enter para continuar...")
            elif opcion == "5":
                print("\n[TERMINADO] Sistema apagado")
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
        print("\n\n[INTERRUMPIDO] Sistema terminado por el usuario")
    except Exception as e:
        print(f"\n[ERROR FATAL] {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 