/**
 * js/config.js
 * Configuración de conexión con Google Apps Script.
 * Define los puntos de acceso (Endpoints) para cada módulo.
 */

const Config = {
    // URL para el módulo de Logística (Compras y Proveedores)
    URL_PROVEEDORES: "https://script.google.com/macros/s/AKfycbzsojfQne5eh9V4iWCUzpcE9tlxSUL9pHMkcqWpHb0rPURDWVjCwEwH5MpdWppuE1R2/exec",
    
    // URL para el módulo de Administración (Usuarios y Roles)
    URL_USUARIOS: "https://script.google.com/macros/s/AKfycbzsojfQne5eh9V4iWCUzpcE9tlxSUL9pHMkcqWpHb0rPURDWVjCwEwH5MpdWppuE1R2/exec"
};

/**
 * Función centralizada para comunicarse con el Backend (Google Apps Script).
 * Selecciona automáticamente la URL correcta según el servicio solicitado.
 * * @param {string} servicio - 'proveedores' o 'usuarios'
 * @param {string} accion - Nombre de la función a ejecutar en el backend
 * @param {object} payload - Datos a enviar
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
            console.error("Servicio no reconocido: " + servicio);
            return { success: false, error: "Error interno: Servicio API desconocido." };
    }

    // 2. Ejecutar la petición (Fetch)
    try {
        const respuesta = await fetch(urlDestino, {
            method: "POST",
            body: JSON.stringify({ 
                accion: accion, 
                payload: payload 
            })
            // Nota: 'no-cors' no se usa aquí porque necesitamos la respuesta JSON.
            // Google Apps Script redirige (302), fetch lo sigue automáticamente.
        });

        if (!respuesta.ok) {
            throw new Error(`Error HTTP: ${respuesta.status}`);
        }

        return await respuesta.json();

    } catch (e) {
        console.error("Error de Conexión:", e);
        return { success: false, error: "No se pudo conectar con el servidor. Verifica tu internet." };
    }
}