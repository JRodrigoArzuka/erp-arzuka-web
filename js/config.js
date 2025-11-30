/**
 * js/config.js
 * Configuración de conexión con Google Apps Script.
 * Define los puntos de acceso (Endpoints) para cada módulo.
 * CONTIENE LA ÚNICA IMPLEMENTACIÓN DE callAPI
 */

const Config = {
    // URL para el módulo de Logística (Compras y Proveedores)
    URL_PROVEEDORES: "https://script.google.com/macros/s/AKfycbzsojfQne5eh9V4iWCUzpcE9tlxSUL9pHMkcqWpHb0rPURDWVjCwEwH5MpdWppuE1R2/exec",
    
    // URL para el módulo de Administración (Usuarios y Roles)
    URL_USUARIOS: "https://script.google.com/macros/s/AKfycbzzIyzLjeUbWW6W1_Dx4SV0-F8V_HxjgKkLARF__XI_eI5nbya59Y3LnrasoEN97OR8RA/exec",
    
    // Timeout para peticiones (8 segundos)
    TIMEOUT: 8000
};

/**
 * FUNCIÓN CENTRALIZADA PARA TODAS LAS COMUNICACIONES CON EL BACKEND
 * @param {string} servicio - 'proveedores' o 'usuarios'
 * @param {string} accion - Nombre de la función a ejecutar en el backend
 * @param {object} payload - Datos a enviar
 * @returns {Promise<object>} Respuesta del servidor
 */
async function callAPI(servicio, accion, payload = {}) {
    let urlDestino = "";

    // 1. Router: Seleccionar la URL según el módulo
    switch (servicio) {
        case 'proveedores':
            urlDestino = Config.URL_PROVEEDORES;
            break;
        case 'usuarios':
            urlDestino = Config.URL_USUARIOS;
            break;
        default:
            console.error("❌ Servicio no reconocido:", servicio);
            return { 
                success: false, 
                error: `Servicio '${servicio}' no configurado.` 
            };
    }

    // 2. Validación básica del payload
    if (typeof payload !== 'object') {
        console.error("❌ Payload debe ser un objeto");
        return { 
            success: false, 
            error: "Payload inválido: debe ser un objeto" 
        };
    }

    // 3. Preparar la petición con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Config.TIMEOUT);

    try {
        const respuesta = await fetch(urlDestino, {
            method: "POST",
            body: JSON.stringify({ 
                accion: accion, 
                payload: payload 
            }),
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}: ${respuesta.statusText}`);
        }

        const datos = await respuesta.json();
        
        // Validar estructura básica de respuesta
        if (typeof datos !== 'object') {
            throw new Error("Respuesta del servidor no es JSON válido");
        }

        return datos;

    } catch (error) {
        clearTimeout(timeoutId);
        
        console.error("🔥 Error en callAPI:", {
            servicio,
            accion,
            error: error.message
        });

        // Mensajes de error amigables
        if (error.name === 'AbortError') {
            return { 
                success: false, 
                error: "⏰ El servidor no respondió a tiempo. Verifica tu conexión." 
            };
        }

        return { 
            success: false, 
            error: `🔌 Error de conexión: ${error.message}` 
        };
    }
}