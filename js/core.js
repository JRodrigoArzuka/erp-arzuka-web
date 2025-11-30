/**
 * js/core.js
 * Lógica central: Configuración, Navegación y API.
 */

// ⬇️⬇️⬇️ PEGA TU URL AQUÍ ⬇️⬇️⬇️
const URL_API = "https://script.google.com/macros/s/AKfycbzsojfQne5eh9V4iWCUzpcE9tlxSUL9pHMkcqWpHb0rPURDWVjCwEwH5MpdWppuE1R2/exec";

// Variable global para compartir datos entre archivos
let globalData = {
    listas: {},
    proveedores: [],
    sucursales: [] // Se usa temporalmente al cargar un proveedor
};

// Al cargar la página
window.onload = function() {
    // Cargar datos iniciales si estamos en la vista de inicio o proveedores
    // Por defecto cargamos configuración básica si la hubiera
};

// Función de Navegación
function nav(vista) {
    // 1. Ocultar todas las vistas y desactivar menús
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#sidebar a').forEach(el => el.classList.remove('active'));
    
    // 2. Activar vista y menú seleccionado
    const vistaEl = document.getElementById('view-' + vista);
    if(vistaEl) vistaEl.classList.add('active');
    
    const linkEl = document.getElementById('link-' + vista);
    if(linkEl) linkEl.classList.add('active');

    // 3. Cerrar menú en móvil
    toggleSidebar(false);

    // 4. Cargar datos específicos según el módulo
    if(vista === 'proveedores') {
        // Esta función está en proveedores.js
        if(typeof cargarProveedores === 'function') cargarProveedores();
    }
    
    if(vista === 'usuarios') {
        // Esta función está en usuarios.js
        if(typeof cargarUsuarios === 'function') cargarUsuarios();
    }
}

// Función genérica para hablar con Google Apps Script
async function callAPI(accion, payload = {}) {
    try {
        const respuesta = await fetch(URL_API, {
            method: "POST",
            body: JSON.stringify({ accion: accion, payload: payload })
        });
        return await respuesta.json();
    } catch (e) {
        console.error("Error API:", e);
        return { success: false, error: "Error de conexión: " + e.message };
    }
}

// Funciones para el menú móvil
function toggleSidebar(forceState = null) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (forceState === false) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}