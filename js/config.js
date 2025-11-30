/**
 * js/config.js - VERSIÓN DE PRUEBAS
 */

const Config = {
    URL_PROVEEDORES: "https://script.google.com/macros/s/AKfycbzsojfQne5eh9V4iWCUzpcE9tlxSUL9pHMkcqWpHb0rPURDWVjCwEwH5MpdWppuE1R2/exec",
    URL_USUARIOS: "https://script.google.com/macros/s/AKfycbzzIyzLjeUbWW6W1_Dx4SV0-F8V_HxjgKkLARF__XI_eI5nbya59Y3LnrasoEN97OR8RA/exec"
};

async function callAPI(servicio, accion, payload = {}) {
    let urlDestino = servicio === 'usuarios' ? Config.URL_USUARIOS : Config.URL_PROVEEDORES;

    console.log(`📡 [FRONT] Llamando: ${servicio}.${accion}`, payload);

    try {
        const respuesta = await fetch(urlDestino, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                accion: accion, 
                payload: payload 
            })
        });

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}: ${respuesta.statusText}`);
        }

        const datos = await respuesta.json();
        console.log(`✅ [FRONT] Respuesta ${servicio}.${accion}:`, datos);
        return datos;

    } catch (error) {
        console.error(`🔥 [FRONT] Error en ${servicio}.${accion}:`, error);
        return { 
            success: false, 
            error: `Error de conexión: ${error.message}` 
        };
    }
}