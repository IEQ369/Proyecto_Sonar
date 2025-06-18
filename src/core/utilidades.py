def texto_a_binario(texto):
    """
    Convierte un texto a su representación binaria ASCII.
    
    Args:
        texto (str): El texto a convertir
        
    Returns:
        str: Secuencia de bits (0s y 1s)
    """
    return ''.join(format(ord(c), '08b') for c in texto)

def binario_a_texto(binario):
    """
    Convierte una secuencia binaria ASCII a texto.
    
    Args:
        binario (str): Secuencia de bits (0s y 1s)
        
    Returns:
        str: Texto decodificado
    """
    # Asegurarse de que la longitud sea múltiplo de 8
    if len(binario) % 8 != 0:
        binario = binario[:-(len(binario) % 8)]
    
    # Convertir cada byte a carácter
    texto = ''
    for i in range(0, len(binario), 8):
        byte = binario[i:i+8]
        texto += chr(int(byte, 2))
    
    return texto
