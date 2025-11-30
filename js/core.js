/**
 * js/core.js
 * Núcleo de la aplicación: Manejo de API y Estado.
 */

// Estado global de la aplicación
let globalData = {
    listas: {},
    proveedores: [],
    sucursales: [],
    usuarios: []
};

// --- FUNCIÓN CENTRAL DE API ---
// Esta función decide automáticamente qué URL usar basándose en el "servicio"
async function callAPI(servicio, accion, payload = {}) {
    let urlDestino = "";

    // 1. Router de URLs (Selecciona el script correcto)
    if (servicio === 'proveedores') {
        // Usa la URL del script antiguo (Gestión de proveedores)
        if (typeof Config !== 'undefined' && Config.URL_PROVEEDORES) {
            urlDestino = Config.URL_PROVEEDORES;
        } else {
            // Fallback por si no existe config.js (NO RECOMENDADO, pero previene errores)
            urlDestino = "https://script.google.com/macros/s/AKfycbzsojfQne5eh9V4iWCUzpcE9tlxSUL9pHMkcqWpHb0rPURDWVjCwEwH5MpdWppuE1R2/exec";
        }
    } 
    else if (servicio === 'usuarios') {
        // Usa la URL del script nuevo (Gestión de usuarios y login)
        if (typeof Config !== 'undefined' && Config.URL_USUARIOS) {
            urlDestino = Config.URL_USUARIOS;
        } else {
            // Fallback
            urlDestino = "https://script.google.com/macros/s/AKfycbzzIyzLjeUbWW6W1_Dx4SV0-F8V_HxjgKkLARF__XI_eI5nbya59Y3LnrasoEN97OR8RA/exec";
        }
    }
    else {
        alert("Error de programación: Servicio desconocido (" + servicio + ")");
        return { success: false, error: "Servicio desconocido" };
    }

    // 2. Ejecución de la petición
    try {
        const respuesta = await fetch(urlDestino, {
            method: "POST",
            body: JSON.stringify({ 
                accion: accion, 
                payload: payload 
            })
        });
        return await respuesta.json();

    } catch (e) {
        console.error("Error API:", e);
        return { success: false, error: "Error de conexión: " + e.message };
    }
}

// --- NAVEGACIÓN ---
function nav(vista) {
    // Ocultar todas las vistas y desactivar menús
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#sidebar a').forEach(el => el.classList.remove('active'));
    
    // Activar vista
    const vistaEl = document.getElementById('view-' + vista);
    if(vistaEl) vistaEl.classList.add('active');
    
    // Activar link
    const linkEl = document.getElementById('link-' + vista);
    if(linkEl) linkEl.classList.add('active');

    // En móvil, cerrar el menú al hacer clic
    toggleSidebar(false);

    // Carga diferida de datos (Lazy Loading)
    if(vista === 'proveedores') {
        if(typeof cargarProveedores === 'function') cargarProveedores();
    }
    
    if(vista === 'usuarios') {
        // Esta función está en js/usuarios.js
        if(typeof cargarUsuarios === 'function') cargarUsuarios();
    }
}

// --- UTILIDADES UI ---
function toggleSidebar(forceState = null) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('login-overlay'); // Reutilizamos el z-index o creamos uno nuevo
    // Nota: En index.html hay un div id="overlay" específico para el menú móvil
    const menuOverlay = document.getElementById('overlay'); 
    
    if (forceState === false) {
        sidebar.classList.remove('active');
        if(menuOverlay) menuOverlay.classList.remove('active');
    } else {
        sidebar.classList.toggle('active');
        if(menuOverlay) menuOverlay.classList.toggle('active');
    }
}