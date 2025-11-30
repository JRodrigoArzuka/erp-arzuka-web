/**
 * js/compras.js
 * Lógica del módulo de Compras (V3 - Final)
 * Incluye: Historial, Descuentos, Validación de Totales y Archivos.
 */

let itemsCompra = [];

// --- CARGA INICIAL ---
async function abrirModalCompra() {
    document.getElementById('formCompra').reset();
    itemsCompra = [];
    renderTablaItems();
    
    // Resetear campos visuales
    document.getElementById('dateFecha').valueAsDate = new Date();
    document.getElementById('txtDiferencia').value = "0.00";
    document.getElementById('txtDiferencia').className = "form-control fw-bold text-center";
    document.getElementById('lblUltimaCompraInfo').innerText = "";
    
    // Limpiar input file
    if(document.getElementById('fileComprobante')) document.getElementById('fileComprobante').value = "";

    // Mostrar carga
    const selects = ['selectProveedorCompra', 'selectAlmacen', 'selectTipoComp', 'selectFormaPagoCompra', 'selectEstadoCompra'];
    selects.forEach(id => document.getElementById(id).innerHTML = '<option>Cargando...</option>');

    new bootstrap.Modal(document.getElementById('modalNuevaCompra')).show();

    // Cargar Listas desde Backend
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
            let val = keyVal ? d[keyVal] : d;
            let txt = keyText ? d[keyText] : d;
            sel.innerHTML += `<option value="${val}">${txt}</option>`;
        });
    }
}

// --- HISTORIAL DEL PROVEEDOR (NUEVO) ---
async function cargarUltimaCompraProveedor() {
    const idProv = document.getElementById('selectProveedorCompra').value;
    const lblInfo = document.getElementById('lblUltimaCompraInfo');
    
    if(!idProv) {
        lblInfo.innerText = "";
        return;
    }

    lblInfo.innerText = "Buscando historial...";
    
    // Llamada a la nueva función del Backend
    const res = await callAPI('proveedores', 'obtenerUltimaCompra', { idProveedor: idProv });

    if (res.success && res.encontrado) {
        const cab = res.cabecera;
        
        // Autocompletar Cabecera (Configuración recurrente)
        if(cab.tipoDoc) document.getElementById('selectTipoComp').value = cab.tipoDoc;
        if(cab.formaPago) document.getElementById('selectFormaPagoCompra').value = cab.formaPago;
        if(cab.almacen) document.getElementById('selectAlmacen').value = cab.almacen;
        
        // Autocompletar Items (Catálogo recurrente)
        // Preguntamos al usuario si quiere cargar los items anteriores
        if(res.items.length > 0 && confirm("¿Deseas cargar la lista de productos de la última compra de este proveedor?")) {
            itemsCompra = res.items.map(i => ({
                tipoCompra: i.tipo,
                descripcion: i.descripcion,
                cantidad: 1, // Resetear cantidad a 1 para obligar a verificar
                unidadCompra: i.unidad,
                precioUnit: parseFloat(i.precioUnit) || 0,
                descuento: 0,
                // Recalcular total inicial
                costoTotal: (parseFloat(i.precioUnit) || 0) * 1
            }));
            renderTablaItems();
        }
        lblInfo.innerText = "✅ Datos de última compra cargados.";
    } else {
        lblInfo.innerText = "No hay historial reciente.";
    }
}

// --- CÁLCULOS DE ITEMS ---
function calcularCostoItem() {
    const cant = parseFloat(document.getElementById('itemCantidad').value) || 0;
    const precio = parseFloat(document.getElementById('itemPrecioUnit').value) || 0;
    const desc = parseFloat(document.getElementById('itemDescuento').value) || 0;
    
    // Fórmula: (Cantidad * Precio Unitario) - Descuento
    const subtotal = (cant * precio) - desc;
    
    document.getElementById('itemTotal').value = subtotal.toFixed(2);
}

function agregarItem() {
    const tipo = document.getElementById('itemTipo').value;
    const desc = document.getElementById('itemDesc').value;
    const cant = parseFloat(document.getElementById('itemCantidad').value);
    const unidad = document.getElementById('itemUnidad').value;
    const precio = parseFloat(document.getElementById('itemPrecioUnit').value);
    const descuento = parseFloat(document.getElementById('itemDescuento').value) || 0;
    const total = parseFloat(document.getElementById('itemTotal').value);

    if(!desc || !cant || !precio) {
        alert("Completa: Descripción, Cantidad y Precio Unitario.");
        return;
    }

    itemsCompra.push({
        tipoCompra: tipo,
        descripcion: desc,
        cantidad: cant,
        unidadCompra: unidad,
        costoUnitario: precio,
        descuento: descuento,
        costoTotal: total // Ya calculado en input
    });

    renderTablaItems();
    
    // Limpiar y enfocar para siguiente item
    document.getElementById('itemDesc').value = "";
    document.getElementById('itemCantidad').value = "";
    document.getElementById('itemPrecioUnit').value = "";
    document.getElementById('itemDescuento').value = "0";
    document.getElementById('itemTotal').value = "";
    document.getElementById('itemDesc').focus();
}

function renderTablaItems() {
    const tbody = document.getElementById('bodyTablaItems');
    tbody.innerHTML = "";
    
    let sumaSubtotales = 0;

    itemsCompra.forEach((item, idx) => {
        sumaSubtotales += item.costoTotal;
        tbody.innerHTML += `
            <tr>
                <td><span class="badge bg-light text-dark border">${item.tipoCompra}</span></td>
                <td>${item.descripcion}</td>
                <td>${item.cantidad} ${item.unidadCompra || ''}</td>
                <td class="text-end">${item.costoUnitario.toFixed(2)}</td>
                <td class="text-end text-danger">${item.descuento > 0 ? '-' + item.descuento.toFixed(2) : ''}</td>
                <td class="text-end fw-bold">${item.costoTotal.toFixed(2)}</td>
                <td class="text-center"><button class="btn btn-outline-danger btn-sm py-0 border-0" onclick="eliminarItem(${idx})">&times;</button></td>
            </tr>
        `;
    });

    // Cálculos finales
    const descGlobal = parseFloat(document.getElementById('txtDescuentoGlobal').value) || 0;
    const granTotal = sumaSubtotales - descGlobal;

    document.getElementById('lblSumaItems').innerText = sumaSubtotales.toFixed(2);
    document.getElementById('lblGranTotal').innerText = granTotal.toFixed(2);
    
    // Validar contra cabecera
    validarTotales(granTotal);
}

function eliminarItem(idx) {
    itemsCompra.splice(idx, 1);
    renderTablaItems();
}

// --- VALIDACIÓN DE TOTALES (IMPORTANTE) ---
function validarTotales(totalCalculadoOverride = null) {
    const totalFactura = parseFloat(document.getElementById('txtImporteTotal').value) || 0;
    
    // Obtener total calculado (del label o del argumento)
    let totalCalculado = totalCalculadoOverride;
    if (totalCalculado === null) {
        totalCalculado = parseFloat(document.getElementById('lblGranTotal').innerText) || 0;
    }

    const diferencia = totalFactura - totalCalculado;
    const inputDif = document.getElementById('txtDiferencia');
    const msg = document.getElementById('msgValidacion');

    inputDif.value = diferencia.toFixed(2);

    // Lógica de Colores
    // Usamos un margen de error pequeño (0.05) por redondeo
    if (Math.abs(diferencia) < 0.05) {
        inputDif.className = "form-control fw-bold text-center bg-success text-white"; // Verde
        msg.innerText = "";
        return true;
    } else {
        inputDif.className = "form-control fw-bold text-center bg-danger text-white"; // Rojo
        msg.innerText = "⚠️ Los montos no cuadran";
        return false;
    }
}

// --- PROCESAMIENTO DE ARCHIVO (BASE64) ---
function leerArchivo(inputElement) {
    return new Promise((resolve, reject) => {
        const archivo = inputElement.files[0];
        if (!archivo) { resolve(null); return; }
        if (archivo.size > 4 * 1024 * 1024) {
            reject("El archivo es muy pesado (Máx 4MB).");
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            resolve({
                nombre: archivo.name,
                mimeType: archivo.type,
                base64: e.target.result.split(',')[1]
            });
        };
        reader.onerror = e => reject("Error leyendo archivo");
        reader.readAsDataURL(archivo);
    });
}

// --- GUARDAR FINAL ---
async function guardarCompra() {
    const btn = document.getElementById('btnGuardarCompra');
    const originalText = btn.innerText;

    // 1. Validaciones
    if(!validarTotales()) {
        if(!confirm("⚠️ Los totales no coinciden exactamente (Diferencia vs Calculado). ¿Deseas guardar de todas formas?")) {
            return;
        }
    }
    if(itemsCompra.length === 0) {
        alert("Debes agregar items.");
        return;
    }

    try {
        btn.disabled = true; 
        btn.innerText = "Subiendo...";

        // 2. Archivo
        let datosArchivo = null;
        const inputFile = document.getElementById('fileComprobante');
        if(inputFile) datosArchivo = await leerArchivo(inputFile);

        btn.innerText = "Guardando...";

        // 3. Payload
        const cabecera = {
            proveedorId: document.getElementById('selectProveedorCompra').value,
            proveedorNombre: document.getElementById('selectProveedorCompra').selectedOptions[0].text,
            tipoComprobante: document.getElementById('selectTipoComp').value,
            numeroComprobante: document.getElementById('txtNumComp').value,
            fechaEmision: document.getElementById('dateFecha').value,
            almacenDestino: document.getElementById('selectAlmacen').value,
            importeTotal: parseFloat(document.getElementById('txtImporteTotal').value) || 0,
            descuentoGlobal: parseFloat(document.getElementById('txtDescuentoGlobal').value) || 0,
            formaPago: document.getElementById('selectFormaPagoCompra').value,
            estadoCompra: document.getElementById('selectEstadoCompra').value,
            comentario: document.getElementById('txtComentarioCompra').value
        };

        const payload = {
            datosComprobante: cabecera,
            items: itemsCompra,
            archivoAdjunto: datosArchivo
        };

        const res = await callAPI('proveedores', 'guardarCompra', payload);
        
        if(res.success) {
            alert("✅ Guardado Correctamente: " + res.message);
            bootstrap.Modal.getInstance(document.getElementById('modalNuevaCompra')).hide();
        } else {
            throw new Error(res.error);
        }

    } catch (e) {
        alert("❌ Error: " + e.message);
    } finally {
        btn.disabled = false; 
        btn.innerText = originalText;
    }
}