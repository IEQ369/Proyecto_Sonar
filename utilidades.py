def texto_a_binario(texto):
    return ''.join(format(ord(c), '08b') for c in texto)

def binario_a_texto(binario):
    chars = [binario[i:i+8] for i in range(0, len(binario), 8)]
    return ''.join(chr(int(c, 2)) for c in chars)
