/**
 * js/usuarios.js
 * Lógica completa para Empleados y Roles
 */

// Variable para almacenar los roles cargados y usarlos en el select de empleados
let rolesCache = [];

// --- EMPLEADOS ---

async function cargarUsuarios() {
    const tbody = document.getElementById('cuerpoTablaUsuarios');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5"><span class="spinner-border text-primary"></span> Cargando...</td></tr>';
    
    const datos = await callAPI('usuarios', 'obtenerUsuarios');
    
    if(datos.success) {
        tbody.innerHTML = '';
        if(!datos.usuarios || datos.usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay usuarios.</td></tr>';
        } else {
            datos.usuarios.forEach(u => {
                tbody.innerHTML += `
                    <tr>
                        <td>${u.nombre}</td>
                        <td>${u.correo}</td>
                        <td><span class="badge bg-info text-dark">${u.nombre_rol}</span></td>
                        <td><span class="badge bg-${u.estado === 'Activo' ? 'success' : 'secondary'}">${u.estado}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario('${u.id}', '${u.nombre}', '${u.correo}', '${u.id_rol}')"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario('${u.id}')"><i class="bi bi-trash"></i></button>
                        </td>
                    </tr>`;
            });
        }
        // Cargar roles en el select por si vamos a crear uno nuevo
        cargarRolesEnSelect(); 
    } else {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${datos.error}</td></tr>`;
    }
}

async function guardarUsuario() {
    const btn = document.querySelector('#modalNuevoUsuario .modal-footer .btn-primary');
    btn.disabled = true; btn.innerText = "Guardando...";

    const payload = {
        id: document.getElementById('idUserEdicion').value,
        nombre: document.getElementById('txtUserNombre').value,
        correo: document.getElementById('txtUserCorreo').value,
        password: document.getElementById('txtUserPass').value, // Solo se envía si el usuario la cambió o es nuevo
        rol: document.getElementById('txtUserRol').value
    };

    if(!payload.nombre || !payload.correo || !payload.rol) {
        alert("Por favor completa nombre, correo y rol.");
        btn.disabled = false; btn.innerText = "Guardar Empleado";
        return;
    }

    const datos = await callAPI('usuarios', 'guardarUsuario', payload);
    if(datos.success) {
        bootstrap.Modal.getInstance(document.getElementById('modalNuevoUsuario')).hide();
        cargarUsuarios();
        alert("Usuario guardado exitosamente.");
    } else {
        alert("Error: " + datos.error);
    }
    btn.disabled = false; btn.innerText = "Guardar Empleado";
}

function abrirModalUsuario() {
    document.getElementById('formUsuario').reset();
    document.getElementById('idUserEdicion').value = "";
    document.getElementById('tituloModalUser').innerText = "Nuevo Empleado";
    
    const passField = document.getElementById('txtUserPass');
    passField.value = "12345678";
    passField.disabled = true; // En creación es por defecto
    document.getElementById('helpPass').innerText = "Contraseña por defecto: 12345678";
    
    cargarRolesEnSelect(); // Asegurar que el select tenga datos
    new bootstrap.Modal(document.getElementById('modalNuevoUsuario')).show();
}

function editarUsuario(id, nombre, correo, rolId) {
    document.getElementById('idUserEdicion').value = id;
    document.getElementById('txtUserNombre').value = nombre;
    document.getElementById('txtUserCorreo').value = correo;
    document.getElementById('txtUserRol').value = rolId;
    document.getElementById('tituloModalUser').innerText = "Editar Empleado";
    
    const passField = document.getElementById('txtUserPass');
    passField.value = "";
    passField.disabled = false; // Permitir cambio
    passField.placeholder = "Dejar vacío para no cambiar";
    document.getElementById('helpPass').innerText = "Escribe una nueva contraseña solo si deseas cambiarla.";

    new bootstrap.Modal(document.getElementById('modalNuevoUsuario')).show();
}

async function eliminarUsuario(id) {
    if(!confirm("¿Estás seguro de eliminar este usuario?")) return;
    const datos = await callAPI('usuarios', 'eliminarUsuario', id);
    if(datos.success) {
        cargarUsuarios();
    } else {
        alert("Error: " + datos.error);
    }
}

// --- ROLES ---

async function cargarRoles() {
    const tbody = document.getElementById('cuerpoTablaRoles');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-5"><span class="spinner-border text-secondary"></span> Cargando roles...</td></tr>';
    
    const datos = await callAPI('usuarios', 'obtenerRoles');
    
    if(datos.success) {
        rolesCache = datos.roles; // Guardar en caché para el select de usuarios
        tbody.innerHTML = '';
        
        datos.roles.forEach(r => {
            const permisosCount = r.permisos.length;
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${r.nombre}</td>
                    <td>
                        <span class="badge bg-light text-dark border">${permisosCount} permisos</span>
                        <small class="text-muted ms-2">${permisosCount > 0 ? 'Activos' : 'Sin acceso'}</small>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick='editarRol(${JSON.stringify(r)})'><i class="bi bi-gear"></i> Configurar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarRol('${r.id}')"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="3" class="text-danger text-center">${datos.error}</td></tr>`;
    }
}

// Función auxiliar para llenar el select del modal de usuario
function cargarRolesEnSelect() {
    const select = document.getElementById('txtUserRol');
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    // Si no hay caché, intentamos cargar (esto pasa si entramos directo a Empleados sin pasar por Roles)
    if(rolesCache.length === 0) {
        callAPI('usuarios', 'obtenerRoles').then(res => {
            if(res.success) {
                rolesCache = res.roles;
                rolesCache.forEach(r => {
                    select.innerHTML += `<option value="${r.id}">${r.nombre}</option>`;
                });
            }
        });
    } else {
        rolesCache.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${r.nombre}</option>`;
        });
    }
}

function abrirModalRol() {
    document.getElementById('idRolEdicion').value = "";
    document.getElementById('txtNombreRol').value = "";
    document.getElementById('tituloModalRol').innerText = "Nuevo Rol";
    // Desmarcar todos los checkboxes
    document.querySelectorAll('.check-permiso').forEach(c => c.checked = false);
    new bootstrap.Modal(document.getElementById('modalNuevoRol')).show();
}

function editarRol(rol) {
    document.getElementById('idRolEdicion').value = rol.id;
    document.getElementById('txtNombreRol').value = rol.nombre;
    document.getElementById('tituloModalRol').innerText = "Configurar Rol: " + rol.nombre;
    
    // Marcar los permisos que tiene el rol
    document.querySelectorAll('.check-permiso').forEach(c => {
        c.checked = rol.permisos.includes(c.value);
    });
    
    new bootstrap.Modal(document.getElementById('modalNuevoRol')).show();
}

async function guardarRol() {
    const btn = document.querySelector('#modalNuevoRol .modal-footer .btn-success');
    btn.disabled = true; btn.innerText = "Guardando...";

    const nombre = document.getElementById('txtNombreRol').value;
    if(!nombre) {
        alert("El nombre del rol es obligatorio");
        btn.disabled = false; btn.innerText = "Guardar Rol";
        return;
    }

    // Recolectar permisos marcados
    const permisos = [];
    document.querySelectorAll('.check-permiso:checked').forEach(c => {
        permisos.push(c.value);
    });

    const payload = {
        id: document.getElementById('idRolEdicion').value,
        nombre: nombre,
        permisos: permisos
    };

    const datos = await callAPI('usuarios', 'guardarRol', payload);
    if(datos.success) {
        bootstrap.Modal.getInstance(document.getElementById('modalNuevoRol')).hide();
        cargarRoles();
        alert("Rol guardado correctamente.");
    } else {
        alert("Error: " + datos.error);
    }
    btn.disabled = false; btn.innerText = "Guardar Rol";
}

async function eliminarRol(id) {
    if(!confirm("¿Estás seguro? Si hay usuarios con este rol, no se podrá eliminar.")) return;
    
    const datos = await callAPI('usuarios', 'eliminarRol', id);
    if(datos.success) {
        cargarRoles();
    } else {
        alert("Error: " + datos.error);
    }
}