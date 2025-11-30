/**
 * js/config.js - VERSIÓN FINAL CORREGIDA
 * @description Configuración con routing correcto entre microservicios
 */

const Config = {
    // Servicio de Logística (Proveedores + Compras)
    URL_PROVEEDORES: "https://script.google.com/macros/s/AKfycbzsojfQne5eh9V4iWCUzpcE9tlxSUL9pHMkcqWpHb0rPURDWVjCwEwH5MpdWppuE1R2/exec",
    
    // Servicio de Administración (Usuarios + Roles + Login)
    URL_USUARIOS: "https://script.google.com/macros/s/AKfycbzzIyzLjeUbWW6W1_Dx4SV0-F8V_HxjgKkLARF__XI_eI5nbya59Y3LnrasoEN97OR8RA/exec"
};

/**
 * Función callAPI con routing inteligente
 */
async function callAPI(servicio, accion, payload = {}) {
    // Determinar URL destino
    const urlDestino = servicio === 'usuarios' ? Config.URL_USUARIOS : Config.URL_PROVEEDORES;
    
    console.log(`📡 [${servicio.toUpperCase()}] ${accion}`, payload);

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
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        
        if (!datos.success) {
            console.warn(`⚠️ [${servicio}] ${accion} falló:`, datos.error);
        } else {
            console.log(`✅ [${servicio}] ${accion} exitoso`);
        }
        
        return datos;

    } catch (error) {
        console.error(`🔥 [${servicio}] Error en ${accion}:`, error);
        return { 
            success: false, 
            error: `Error de conexión con ${servicio}: ${error.message}` 
        };
    }
}