/**
 * js/compras.js
 * Lógica del módulo de Compras
 */

let itemsCompra = [];

// --- CARGA INICIAL ---
async function abrirModalCompra() {
    // Limpiar formulario previo
    document.getElementById('formCompra').reset();
    itemsCompra = [];
    renderTablaItems();
    document.getElementById('dateFecha').valueAsDate = new Date();
    
    // Mostrar estado de carga en los selects
    const selects = ['selectProveedorCompra', 'selectAlmacen', 'selectTipoComp', 'selectFormaPagoCompra', 'selectEstadoCompra'];
    selects.forEach(id => document.getElementById(id).innerHTML = '<option>Cargando...</option>');

    new bootstrap.Modal(document.getElementById('modalNuevaCompra')).show();

    // Llamar a la API
    // Nota: Usamos 'proveedores' como servicio porque está en el mismo script del backend por ahora.
    // Si separaste el script de compras en otro proyecto de Apps Script, crea una entrada en config.js
    const datos = await callAPI('proveedores', 'obtenerDatosCompra'); 
    
    if(datos.success) {
        poblarSelect('selectProveedorCompra', datos.proveedores, 'id', 'nombre');
        poblarSelect('selectAlmacen', datos.almacenes, 'cod', 'nombre');
        poblarSelect('selectTipoComp', datos.listas.Tipo_Comprobante);
        poblarSelect('selectFormaPagoCompra', datos.listas.Forma_Pago); // Nota: Ajusta si la clave en GAS es "Forma de Pago" o "Forma_Pago"
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
            // Si el dato es objeto (como proveedores) usamos keys, si es string simple (listas) usamos el valor directo
            let val = keyVal ? d[keyVal] : d;
            let txt = keyText ? d[keyText] : d;
            sel.innerHTML += `<option value="${val}">${txt}</option>`;
        });
    }
}

// --- CÁLCULOS ---
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
    
    // Limpiar campos de item
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
                <td class="text-center"><button class="btn btn-danger btn-sm py-0" onclick="eliminarItem(${idx})">&times;</button></td>
            </tr>
        `;
    });

    document.getElementById('lblGranTotal').innerText = granTotal.toFixed(2);
    // Opcional: Actualizar el importe total de cabecera automáticamente
    // document.getElementById('txtImporteTotal').value = granTotal.toFixed(2);
}

function eliminarItem(idx) {
    itemsCompra.splice(idx, 1);
    renderTablaItems();
}

// --- GUARDAR ---
async function guardarCompra() {
    const btn = document.getElementById('btnGuardarCompra');
    const originalText = btn.innerText;
    btn.disabled = true; btn.innerText = "Enviando...";

    // 1. Validaciones
    const prov = document.getElementById('selectProveedorCompra').value;
    const totalCabecera = document.getElementById('txtImporteTotal').value;
    
    if(!prov) {
        alert("Debes seleccionar un proveedor.");
        btn.disabled = false; btn.innerText = originalText;
        return;
    }
    if(itemsCompra.length === 0) {
        alert("Debes agregar al menos un producto.");
        btn.disabled = false; btn.innerText = originalText;
        return;
    }

    // 2. Armar Payload
    const cabecera = {
        proveedorId: prov,
        proveedorNombre: document.getElementById('selectProveedorCompra').selectedOptions[0].text,
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
        items: itemsCompra
    };

    // 3. Enviar
    const res = await callAPI('proveedores', 'guardarCompra', payload);
    
    if(res.success) {
        alert("✅ " + res.message);
        bootstrap.Modal.getInstance(document.getElementById('modalNuevaCompra')).hide();
    } else {
        alert("❌ Error: " + res.error);
    }
    
    btn.disabled = false; btn.innerText = originalText;
}