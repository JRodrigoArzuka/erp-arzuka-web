/**
 * js/proveedores.js
 * Lógica del módulo de Gestión de Proveedores
 */

// --- CARGAR DATOS ---
async function cargarProveedores() {
    const tbody = document.getElementById('cuerpoTablaProv');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><span class="spinner-border text-primary"></span> Cargando datos...</td></tr>';

    const datos = await callAPI('obtenerDatosCompletos');

    if (datos.success) {
        globalData.proveedores = datos.proveedores;
        globalData.sucursales = datos.sucursales; // Guardamos todas las sucursales
        globalData.listas = datos.listas; 
        
        renderTablaProveedores();
        prepararListasAuxiliares(); 
    } else {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${datos.error}</td></tr>`;
    }
}

function renderTablaProveedores() {
    const tbody = document.getElementById('cuerpoTablaProv');
    tbody.innerHTML = '';

    if (!globalData.proveedores || globalData.proveedores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay proveedores registrados.</td></tr>';
        return;
    }

    globalData.proveedores.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <div class="fw-bold text-primary">${p.Nombre_Comercial}</div>
                    <div class="small text-muted">${p.Razon_Social}</div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">${p.Tipo_Proveedor}</span><br>
                    ${p.RUC || p.DNI || '-'}
                </td>
                <td>${p.Telefono_Principal || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarProveedor('${p.ID_Proveedor}')">
                        <i class="bi bi-pencil-square"></i> Editar
                    </button>
                </td>
            </tr>`;
    });
}

// --- PREPARAR FORMULARIO ---
function prepararListasAuxiliares() {
    // 1. Checkboxes de Pagos
    const divPagos = document.getElementById("divFormasPago");
    if(divPagos) {
        divPagos.innerHTML = '';
        if (globalData.listas["Forma de Pago"]) {
            globalData.listas["Forma de Pago"].forEach(item => {
                divPagos.innerHTML += `
                    <div class="form-check">
                        <input class="form-check-input check-pago" type="checkbox" value="${item.valor}" id="pago_${item.valor}">
                        <label class="form-check-label" for="pago_${item.valor}">${item.valor}</label>
                    </div>`;
            });
        }
    }

    // 2. Datalists Globales
    llenarDatalist('listaGlobalZonas', 'Zona');
    llenarDatalist('listaGlobalUrbanizaciones', 'Urbanizacion');
}

function llenarDatalist(idLista, tipoLista) {
    const dl = document.getElementById(idLista);
    if(dl && globalData.listas[tipoLista]) {
        dl.innerHTML = '';
        globalData.listas[tipoLista].forEach(item => {
            dl.innerHTML += `<option value="${item.valor}"></option>`;
        });
    }
}

// --- ABRIR MODALES ---
function abrirModalNuevoProveedor() {
    // Resetear form
    document.getElementById('formProveedor').reset();
    document.getElementById('ID_Proveedor').value = "";
    document.getElementById('modalTituloProveedor').innerText = "Nuevo Proveedor";
    document.getElementById('numSucursales').value = 1;
    
    // Limpiar checks
    document.querySelectorAll('.check-pago').forEach(ch => ch.checked = false);
    
    // Generar 1 sucursal vacía
    renderSucursales(); 
    
    // Mostrar
    new bootstrap.Modal(document.getElementById('modalFormularioProveedor')).show();
}

function editarProveedor(id) {
    const p = globalData.proveedores.find(x => x.ID_Proveedor === id);
    if(!p) return;

    // Llenar datos principales
    document.getElementById('ID_Proveedor').value = p.ID_Proveedor;
    document.getElementById('tipoProveedor').value = p.Tipo_Proveedor;
    toggleDocumento(); // Ajustar label RUC/DNI
    document.getElementById('txtDocumento').value = (p.Tipo_Proveedor === 'Formal') ? p.RUC : p.DNI;
    document.getElementById('razonSocial').value = p.Razon_Social;
    document.getElementById('nombreComercial').value = p.Nombre_Comercial;
    document.getElementById('domicilioFiscal').value = p.Domicilio_Fiscal;
    document.getElementById('telefonoPrincipal').value = p.Telefono_Principal;
    document.getElementById('aceptaCredito').checked = (p.Acepta_Credito === true || p.Acepta_Credito === 'true');
    document.getElementById('diasCredito').value = p.Dias_Credito;
    document.getElementById('nroCuenta').value = p.Nro_Cuenta;
    document.getElementById('nroYapePlin').value = p.Nro_Yape_Plin;

    // Checks Pagos
    const pagos = (p.Metodos_Pago || "").split(', ');
    document.querySelectorAll('.check-pago').forEach(ch => {
        ch.checked = pagos.includes(ch.value);
    });

    // Cargar Sucursales
    const misSucursales = globalData.sucursales.filter(s => s.ID_Proveedor === id);
    document.getElementById('numSucursales').value = misSucursales.length;
    
    // Renderizar y llenar
    const contenedor = document.getElementById("contenedorSucursales");
    contenedor.innerHTML = ""; // Limpiar
    
    misSucursales.forEach((suc, index) => {
        const i = index + 1;
        contenedor.insertAdjacentHTML('beforeend', htmlSucursal(i));
        
        // Llenar selects (Cascada)
        setTimeout(() => {
            cargarDepartamentos(i);
            const bloque = document.getElementById(`sucursal_${i}`);
            if(bloque) {
                bloque.querySelector('.suc-contacto').value = suc.Contacto_Sucursal;
                bloque.querySelector('.suc-telefono').value = suc.Telefono_Sucursal;
                bloque.querySelector('.suc-direccion').value = suc.Direccion;
                bloque.querySelector('.suc-zona').value = suc.Zona;
                bloque.querySelector('.suc-urb').value = suc.Urbanizacion;
                
                // Depto
                const deptoSel = document.getElementById(`depto_${i}`);
                deptoSel.value = suc.Departamento;
                
                // Prov
                cargarProvincias(i);
                const provSel = document.getElementById(`prov_${i}`);
                provSel.value = suc.Provincia;
                
                // Dist (Ciudad)
                cargarCiudades(i);
                const distSel = document.getElementById(`dist_${i}`);
                distSel.value = suc.Ciudad;
            }
        }, 50); // Pequeño delay para asegurar que el HTML existe
    });

    document.getElementById('modalTituloProveedor').innerText = "Editar: " + p.Nombre_Comercial;
    new bootstrap.Modal(document.getElementById('modalFormularioProveedor')).show();
}

// --- UTILIDADES DE FORMULARIO ---
function toggleDocumento() {
    const tipo = document.getElementById('tipoProveedor').value;
    document.getElementById('lblDoc').innerText = (tipo === 'Formal') ? 'RUC' : 'DNI';
}

// --- LÓGICA SUCURSALES ---
function renderSucursales() {
    const num = parseInt(document.getElementById("numSucursales").value) || 0;
    const contenedor = document.getElementById("contenedorSucursales");
    const actuales = contenedor.children.length;

    if (num > actuales) {
        for (let i = actuales + 1; i <= num; i++) {
            contenedor.insertAdjacentHTML('beforeend', htmlSucursal(i));
            cargarDepartamentos(i);
        }
    } else if (num < actuales) {
        for (let i = actuales; i > num; i--) {
            if(contenedor.lastElementChild) contenedor.lastElementChild.remove();
        }
    }
}

function htmlSucursal(i) {
    return `
    <div class="sucursal-bloque" id="sucursal_${i}">
        <h6 class="text-primary mb-3"><i class="bi bi-shop"></i> Sucursal #${i}</h6>
        <div class="row g-2">
            <div class="col-md-6"><input type="text" class="form-control form-control-sm suc-contacto" placeholder="Contacto"></div>
            <div class="col-md-6"><input type="text" class="form-control form-control-sm suc-telefono" placeholder="Teléfono Sucursal"></div>
            <div class="col-md-8"><input type="text" class="form-control form-control-sm suc-direccion" placeholder="Dirección Exacta"></div>
            <div class="col-md-4"><input type="text" class="form-control form-control-sm suc-zona" list="listaGlobalZonas" placeholder="Zona"></div>
            
            <div class="col-md-3">
                <select class="form-select form-select-sm suc-depto" id="depto_${i}" onchange="cargarProvincias(${i})"></select>
            </div>
            <div class="col-md-3">
                <select class="form-select form-select-sm suc-prov" id="prov_${i}" onchange="cargarCiudades(${i})" disabled></select>
            </div>
            <div class="col-md-3">
                <select class="form-select form-select-sm suc-dist" id="dist_${i}" disabled></select>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control form-control-sm suc-urb" list="listaGlobalUrbanizaciones" placeholder="Urbanización">
            </div>
        </div>
    </div>`;
}

// --- COMBOS EN CASCADA ---
function cargarDepartamentos(i) {
    const sel = document.getElementById(`depto_${i}`);
    sel.innerHTML = '<option value="">Dpto...</option>';
    if(globalData.listas["Departamento"]) {
        globalData.listas["Departamento"].forEach(d => {
            sel.innerHTML += `<option value="${d.valor}">${d.valor}</option>`;
        });
    }
}

function cargarProvincias(i) {
    const depto = document.getElementById(`depto_${i}`).value;
    const selProv = document.getElementById(`prov_${i}`);
    selProv.innerHTML = '<option value="">Prov...</option>';
    selProv.disabled = true;
    document.getElementById(`dist_${i}`).disabled = true;

    if(depto && globalData.listas["Provincia"]) {
        const filtrados = globalData.listas["Provincia"].filter(x => x.agrupador === depto);
        filtrados.forEach(p => {
            selProv.innerHTML += `<option value="${p.valor}">${p.valor}</option>`;
        });
        selProv.disabled = false;
    }
}

function cargarCiudades(i) { // Ciudades = Distritos
    const prov = document.getElementById(`prov_${i}`).value;
    const selDist = document.getElementById(`dist_${i}`);
    selDist.innerHTML = '<option value="">Dist...</option>';
    selDist.disabled = true;

    if(prov && globalData.listas["Ciudad"]) {
        const filtrados = globalData.listas["Ciudad"].filter(x => x.agrupador === prov);
        filtrados.forEach(c => {
            selDist.innerHTML += `<option value="${c.valor}">${c.valor}</option>`;
        });
        selDist.disabled = false;
    }
}

// --- GUARDAR TODO ---
async function guardarProveedorCompleto() {
    const btn = document.querySelector('#modalFormularioProveedor .modal-footer .btn-primary');
    const originalText = btn.innerText;
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    // 1. Recopilar Datos Principales
    const tipo = document.getElementById('tipoProveedor').value;
    const rucVal = document.getElementById('txtDocumento').value;
    
    const pagos = [];
    document.querySelectorAll('.check-pago:checked').forEach(ch => pagos.push(ch.value));

    const datosPrincipales = {
        ID_Proveedor: document.getElementById("ID_Proveedor").value,
        Tipo_Proveedor: tipo,
        RUC: (tipo === 'Formal') ? rucVal : "",
        DNI: (tipo === 'Informal') ? rucVal : "",
        Razon_Social: document.getElementById('razonSocial').value,
        Nombre_Comercial: document.getElementById('nombreComercial').value,
        Domicilio_Fiscal: document.getElementById('domicilioFiscal').value,
        Telefono_Principal: document.getElementById('telefonoPrincipal').value,
        Acepta_Credito: document.getElementById('aceptaCredito').checked,
        Dias_Credito: document.getElementById('diasCredito').value,
        Metodos_Pago: pagos.join(', '),
        Nro_Cuenta: document.getElementById('nroCuenta').value,
        Nro_Yape_Plin: document.getElementById('nroYapePlin').value
    };

    // 2. Recopilar Sucursales
    const sucursales = [];
    document.querySelectorAll('.sucursal-bloque').forEach((bloque) => {
        sucursales.push({
            Contacto_Sucursal: bloque.querySelector('.suc-contacto').value,
            Telefono_Sucursal: bloque.querySelector('.suc-telefono').value,
            Direccion: bloque.querySelector('.suc-direccion').value,
            Zona: bloque.querySelector('.suc-zona').value,
            Departamento: bloque.querySelector('.suc-depto').value,
            Provincia: bloque.querySelector('.suc-prov').value,
            Ciudad: bloque.querySelector('.suc-dist').value,
            Urbanizacion: bloque.querySelector('.suc-urb').value
        });
    });

    const payload = { datosPrincipales, sucursales };

    // 3. Enviar a API
    const datos = await callAPI('guardarProveedorCompleto', payload);

    if (datos.success) {
        alert("✅ Proveedor guardado exitosamente");
        // Cerrar modal
        const modalEl = document.getElementById('modalFormularioProveedor');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        // Recargar lista
        cargarProveedores();
    } else {
        alert("❌ Error: " + datos.error);
    }

    btn.disabled = false; 
    btn.innerText = originalText;
}