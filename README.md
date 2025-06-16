# Proyecto: **Exfiltración de datos por ultrasonido (Prueba de concepto ofensiva)**

## 📌 Propósito del proyecto

Este proyecto tiene como objetivo demostrar cómo un atacante podría **exfiltrar datos (por ejemplo, comandos, texto o archivos pequeños)** usando señales **inaudibles (ultrasonido)**, aprovechando los micrófonos y parlantes comunes de laptops y celulares. Se inspira en ataques reales como **SurfingAttack**, **DolphinAttack** y **DiskFiltration**.

> ⚠️ El proyecto es solo una **prueba de concepto educativa y ética**. Su intención es demostrar vulnerabilidades reales y ayudar a entender cómo funcionan ciertos ataques para luego poder defenderse de ellos.

---

## 🎯 Objetivos

- ✅ Crear un sistema simple que permita enviar datos codificados desde un **laptop** a un **celular** usando sonidos por encima del umbral auditivo humano (~18-22 kHz).
- ✅ Codificar los datos en **binario (ASCII)** y reproducirlos como tonos breves por el parlante.
- ✅ Detectar y decodificar esos tonos en otro dispositivo (por ahora puede grabar, y más adelante procesar).
- ✅ Mostrar cómo incluso con **hardware común**, es posible implementar técnicas de ciberseguridad ofensiva.

---

## 🧠 Idea general

1. El atacante usa un **emisor** (ej: laptop) que convierte texto en binario.
2. Luego reproduce esos bits como tonos **ultrasónicos** (ej: 20 kHz = bit 1, 19 kHz = bit 0).
3. Un **receptor** (ej: celular) graba ese audio y lo convierte nuevamente a binario.
4. Ese binario se traduce a **texto legible o comandos** (ASCII).
5. El sistema puede ampliarse para:
   - Enviar **comandos invisibles** a asistentes virtuales.
   - Exfiltrar contraseñas, tokens, etc., desde una víctima sin cables ni red.

---

## 📦 Componentes del sistema

| Componente   | Descripción                                                                   |
| ------------ | ----------------------------------------------------------------------------- |
| Emisor       | Laptop que convierte texto a ultrasonido usando Python (con `pydub`, `numpy`) |
| Receptor     | Celular que graba audio y luego decodifica tonos (por ahora puede ser manual) |
| Codificación | ASCII a binario, y cada bit representado como una frecuencia                  |
| Comunicación | Solo sonido (sin red, sin USB, sin Bluetooth)                                 |

---

## 🛠️ Tecnología usada

- **Python** (emisor)
- **pydub, numpy, scipy** para generar y reproducir los tonos.
- **Celular Android** con grabadora de audio (por ahora).
- (Más adelante) Python para decodificar grabaciones.

---

## 🚧 Limitaciones conocidas

- Los **micrófonos y parlantes integrados** tienen limitaciones para captar o emitir ciertas frecuencias.
- Por ahora, se requiere una grabadora en el celular (receptor), el procesamiento será manual.
- El sistema puede fallar en entornos muy ruidosos o con eco fuerte.

---

## 🧱 Etapas del proyecto

1. ✅ [ ] Codificar texto a binario y generar audio ultrasónico en PC.
2. ✅ [ ] Emitir correctamente una secuencia binaria (ej: “HELLO”) como audio.
3. ✅ [ ] Grabar desde el celular para comprobar si se escuchan (o detectan) los tonos.
4. ⏳ [ ] Decodificar el audio desde el celular o PC (más adelante).
5. ⏳ [ ] Simular un ataque realista (comando o mensaje oculto).
6. ⏳ [ ] (Opcional) Mostrar cómo un asistente virtual puede ser activado.
7. ⏳ [ ] Crear defensa que detecte tonos sospechosos (modo pasivo).

---

## ✍️ Notas personales

- Este proyecto fue elegido como alternativa **ofensiva** dentro del área de ciberseguridad.
- Está inspirado en casos reales, no es algo simple ni común, y tiene un enfoque técnico serio.
- Aunque soy principiante en programación, usaré este proyecto para aprender más sobre:
  - Codificación binaria
  - Audio digital
  - Seguridad informática
  - Python
- Las pruebas se harán con **una laptop y un celular** (hardware limitado).
- En caso de que los dispositivos no soporten bien frecuencias altas, se usará un **parlante externo** para mejorar la emisión de ultrasonido, sin perder el foco original del proyecto.

---

## ✅ Meta final

Tener una **PoC (prueba de concepto)** funcional que:

- Envíe mensajes ocultos de un dispositivo a otro usando solo audio ultrasónico.
- Pueda presentarse como una amenaza realista en escenarios de ciberseguridad.
- Me permita explicarlo con claridad y defender la viabilidad técnica del ataque.

---
