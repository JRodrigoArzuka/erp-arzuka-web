/**
 * js/compras.js
 * Lógica del módulo de Compras con Subida de Archivos (Base64)
 * Actualizado por Especialista ERP
 */

let itemsCompra = [];

// --- CARGA INICIAL ---
async function abrirModalCompra() {
    // Limpiar formulario previo
    document.getElementById('formCompra').reset();
    
    // Limpiar el input de archivo manualmente por seguridad
    const fileInput = document.getElementById('fileComprobante');
    if(fileInput) fileInput.value = "";

    itemsCompra = [];
    renderTablaItems();
    
    // Establecer fecha de hoy
    const dateInput = document.getElementById('dateFecha');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    // Mostrar estado de carga en los selects
    const selects = ['selectProveedorCompra', 'selectAlmacen', 'selectTipoComp', 'selectFormaPagoCompra', 'selectEstadoCompra'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '<option>Cargando...</option>';
    });

    new bootstrap.Modal(document.getElementById('modalNuevaCompra')).show();

    // Llamar a la API (Backend) para llenar las listas
    // Usamos el servicio 'proveedores' que contiene la lógica de compras en tu backend actual
    const datos = await callAPI('proveedores', 'obtenerDatosCompra'); 
    
    if(datos.success) {
        poblarSelect('selectProveedorCompra', datos.proveedores, 'id', 'nombre');
        poblarSelect('selectAlmacen', datos.almacenes, 'cod', 'nombre');
        poblarSelect('selectTipoComp', datos.listas.Tipo_Comprobante);
        poblarSelect('selectFormaPagoCompra', datos.listas.Forma_Pago);
        poblarSelect('selectEstadoCompra', datos.listas.Estado_Compra);
    } else {
        alert("Error cargando datos: " + datos.error);
    }
}

function poblarSelect(id, datos, keyVal = null, keyText = null) {
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Seleccione...</option>';
    
    if(Array.isArray(datos)) {
        datos.forEach(d => {
            // Si el dato es objeto usamos las llaves, si es string simple usamos el valor directo
            let val = keyVal ? d[keyVal] : d;
            let txt = keyText ? d[keyText] : d;
            sel.innerHTML += `<option value="${val}">${txt}</option>`;
        });
    }
}

// --- CÁLCULOS Y TABLA DE ITEMS ---
function calcularCostoItem() {
    const cant = parseFloat(document.getElementById('itemCantidad').value) || 0;
    const total = parseFloat(document.getElementById('itemTotal').value) || 0;
    const unitInput = document.getElementById('itemUnitario');
    
    if(cant > 0 && total > 0) {
        unitInput.value = (total / cant).toFixed(2);
    } else {
        unitInput.value = "";
    }
}

function agregarItem() {
    const tipo = document.getElementById('itemTipo').value;
    const desc = document.getElementById('itemDesc').value;
    const cant = parseFloat(document.getElementById('itemCantidad').value);
    const unidad = document.getElementById('itemUnidad').value;
    const total = parseFloat(document.getElementById('itemTotal').value);
    const unit = parseFloat(document.getElementById('itemUnitario').value);

    if(!desc || !cant || !total) {
        alert("Por favor completa Descripción, Cantidad y Total del item.");
        return;
    }

    itemsCompra.push({
        tipoCompra: tipo,
        descripcion: desc,
        cantidad: cant,
        unidadCompra: unidad,
        costoTotal: total,
        costoUnitario: unit || (total/cant)
    });

    renderTablaItems();
    
    // Limpiar campos de item para agregar otro rápidamente
    document.getElementById('itemDesc').value = "";
    document.getElementById('itemCantidad').value = "";
    document.getElementById('itemTotal').value = "";
    document.getElementById('itemUnitario').value = "";
    document.getElementById('itemUnidad').value = "";
    document.getElementById('itemDesc').focus();
}

function renderTablaItems() {
    const tbody = document.getElementById('bodyTablaItems');
    tbody.innerHTML = "";
    let granTotal = 0;

    itemsCompra.forEach((item, idx) => {
        granTotal += item.costoTotal;
        tbody.innerHTML += `
            <tr>
                <td><span class="badge bg-light text-dark border">${item.tipoCompra}</span></td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad} ${item.unidadCompra || 'und'}</td>
                <td class="text-end">${item.costoTotal.toFixed(2)}</td>
                <td class="text-center"><button type="button" class="btn btn-danger btn-sm py-0" onclick="eliminarItem(${idx})">&times;</button></td>
            </tr>
        `;
    });

    document.getElementById('lblGranTotal').innerText = granTotal.toFixed(2);
    
    // Actualizar el importe total automáticamente si está vacío o es 0
    const inputTotal = document.getElementById('txtImporteTotal');
    if(inputTotal && (!inputTotal.value || inputTotal.value == 0)) {
         inputTotal.value = granTotal.toFixed(2);
    }
}

function eliminarItem(idx) {
    itemsCompra.splice(idx, 1);
    renderTablaItems();
}

// --- NUEVA FUNCIÓN: PROCESAR ARCHIVO A BASE64 ---
/**
 * Lee el archivo seleccionado y lo convierte a una cadena Base64
 * para poder enviarlo a través de JSON a Google Apps Script.
 */
function leerArchivo(inputElement) {
    return new Promise((resolve, reject) => {
        const archivo = inputElement.files[0];
        if (!archivo) {
            resolve(null); // No hay archivo, devolvemos null sin error
            return;
        }

        // Validación de tamaño (Límite 4MB para evitar errores de timeout en GAS)
        if (archivo.size > 4 * 1024 * 1024) {
            reject("El archivo es demasiado grande. El máximo permitido es 4MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // El resultado viene como: "data:image/png;base64,CONTENIDO..."
            // Necesitamos separar el tipo (mimeType) del contenido real (base64)
            const contenido = e.target.result.split(',')[1];
            const mimeType = e.target.result.split(';')[0].split(':')[1];
            
            resolve({
                nombre: archivo.name,
                mimeType: mimeType,
                base64: contenido
            });
        };
        reader.onerror = error => reject("Error leyendo el archivo.");
        reader.readAsDataURL(archivo);
    });
}

// --- GUARDAR COMPRA ---
async function guardarCompra() {
    const btn = document.getElementById('btnGuardarCompra');
    const originalText = btn.innerText;
    
    // 1. Validaciones Previas
    const prov = document.getElementById('selectProveedorCompra').value;
    
    if(!prov) {
        alert("⚠️ Debes seleccionar un proveedor.");
        return;
    }
    if(itemsCompra.length === 0) {
        alert("⚠️ Debes agregar al menos un producto o gasto a la lista.");
        return;
    }

    try {
        // Bloquear botón e indicar proceso
        btn.disabled = true; 
        btn.innerText = "Procesando archivo...";

        // 2. Leer y procesar el archivo adjunto (si existe)
        let datosArchivo = null;
        const inputFile = document.getElementById('fileComprobante');
        if(inputFile) {
            datosArchivo = await leerArchivo(inputFile);
        }

        btn.innerText = "Enviando datos...";

        // 3. Armar el objeto de datos (Payload)
        const totalCabecera = document.getElementById('txtImporteTotal').value;
        const provSelect = document.getElementById('selectProveedorCompra');

        const cabecera = {
            proveedorId: prov,
            proveedorNombre: provSelect.options[provSelect.selectedIndex].text,
            tipoComprobante: document.getElementById('selectTipoComp').value,
            numeroComprobante: document.getElementById('txtNumComp').value,
            fechaEmision: document.getElementById('dateFecha').value,
            almacenDestino: document.getElementById('selectAlmacen').value,
            importeTotal: totalCabecera ? parseFloat(totalCabecera) : 0,
            formaPago: document.getElementById('selectFormaPagoCompra').value,
            estadoCompra: document.getElementById('selectEstadoCompra').value,
            comentario: document.getElementById('txtComentarioCompra').value
        };

        const payload = {
            datosComprobante: cabecera,
            items: itemsCompra,
            archivoAdjunto: datosArchivo // Se envía null o el objeto {nombre, mimeType, base64}
        };

        // 4. Enviar al Backend (Google Apps Script)
        const res = await callAPI('proveedores', 'guardarCompra', payload);
        
        if(res.success) {
            alert("✅ " + res.message);
            const modalEl = document.getElementById('modalNuevaCompra');
            bootstrap.Modal.getInstance(modalEl).hide();
        } else {
            throw new Error(res.error);
        }

    } catch (error) {
        console.error(error);
        alert("❌ Error al guardar: " + (error.message || error));
    } finally {
        // Restaurar botón
        btn.disabled = false; 
        btn.innerText = originalText;
    }
}