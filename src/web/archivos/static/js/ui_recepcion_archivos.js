/** Crea el enlace de descarga sin interpretar el nombre recibido como HTML. */
export function crearEnlaceDescarga(documento, archivo, url) {
    const enlace = documento.createElement('a');
    enlace.id = 'enlace-descarga-auto';
    enlace.href = url;
    enlace.download = archivo.nombre;
    enlace.style.color = '#00ff41';
    enlace.style.textDecoration = 'none';
    enlace.style.fontFamily = 'monospace';
    enlace.textContent = `descargar archivo recibido (${archivo.nombre})`;
    return enlace;
}

/** Construye una entrada del historial con texto seguro para nombres externos. */
export function crearEntradaHistorialArchivo(documento, mensaje, tipo, hora) {
    const entrada = documento.createElement('div');
    entrada.className = 'msg-log-entry ' + tipo;

    if (tipo !== 'received' && tipo !== 'sent') {
        return entrada;
    }

    const tiempo = documento.createElement('span');
    tiempo.className = 'msg-time';
    tiempo.textContent = hora;

    const etiqueta = documento.createElement('span');
    etiqueta.className = 'msg-type';
    etiqueta.style.color = tipo === 'received' ? '#ff184c' : '#00ff41';
    etiqueta.style.fontWeight = 'bold';
    etiqueta.textContent = tipo === 'received' ? '[ARCHIVO]' : '[ENVIADO]';

    const contenido = documento.createElement('span');
    contenido.textContent = mensaje;

    entrada.append(tiempo, ' ', etiqueta, ' ', contenido);
    entrada.style.borderLeft = `4px solid ${etiqueta.style.color}`;
    entrada.style.padding = '2px 0 2px 8px';
    entrada.style.marginBottom = '4px';
    entrada.style.fontFamily = 'monospace';
    return entrada;
}
