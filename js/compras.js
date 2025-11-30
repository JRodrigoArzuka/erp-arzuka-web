/**
 * js/compras.js
 * Lógica del módulo de Compras (V4 - Final)
 * Incluye: Calculadora Inversa, Sugerencias, Historial y Archivos.
 */

let itemsCompra = [];

// --- CARGA INICIAL ---
async function abrirModalCompra() {
    document.getElementById('formCompra').reset();
    itemsCompra = [];
    renderTablaItems();
    
    // Resetear campos visuales
    const dateInput = document.getElementById('dateFecha');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    updateDiferenciaVisual(0);
    document.getElementById('lblUltimaCompraInfo').innerText = "";
    
    // Limpiar input file
    if(document.getElementById('fileComprobante')) document.getElementById('fileComprobante').value = "";

    // Mostrar carga en selects
    const selects = ['selectProveedorCompra', 'selectAlmacen', 'selectTipoComp', 'selectFormaPagoCompra', 'selectEstadoCompra'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '<option>Cargando...</option>';
    });

    new bootstrap.Modal(document.getElementById('modalNuevaCompra')).show();

    // Cargar Datos desde Backend
    const datos = await callAPI('proveedores', 'obtenerDatosCompra'); 
    
    if(datos.success) {
        poblarSelect('selectProveedorCompra', datos.proveedores, 'id', 'nombre');
        poblarSelect('selectAlmacen', datos.almacenes, 'cod', 'nombre');
        poblarSelect('selectTipoComp', datos.listas.Tipo_Comprobante);
        poblarSelect('selectFormaPagoCompra', datos.listas.Forma_Pago);
        poblarSelect('selectEstadoCompra', datos.listas.Estado_Compra);
        
        // Llenar Sugerencias (Datalist)
        if(datos.sugerenciasProductos) {
            const datalist = document.getElementById('listaItemsHistoricos');
            datalist.innerHTML = '';
            datos.sugerenciasProductos.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                datalist.appendChild(option);
            });
        }
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

// --- HISTORIAL DEL PROVEEDOR ---
async function cargarUltimaCompraProveedor() {
    const idProv = document.getElementById('selectProveedorCompra').value;
    const lblInfo = document.getElementById('lblUltimaCompraInfo');
    
    if(!idProv) {
        lblInfo.innerText = "";
        return;
    }

    lblInfo.innerText = "⏳ Buscando historial...";
    
    const res = await callAPI('proveedores', 'obtenerUltimaCompra', { idProveedor: idProv });

    if (res.success && res.encontrado) {
        const cab = res.cabecera;
        
        // Autocompletar Cabecera
        if(cab.tipoDoc) document.getElementById('selectTipoComp').value = cab.tipoDoc;
        if(cab.formaPago) document.getElementById('selectFormaPagoCompra').value = cab.formaPago;
        if(cab.almacen) document.getElementById('selectAlmacen').value = cab.almacen;
        
        lblInfo.innerText = "✅ Datos cargados. (Items disponibles)";
        
        // Preguntar por Items
        if(res.items.length > 0) {
            if(confirm("¿Cargar la lista de productos de la última compra?")) {
                itemsCompra = res.items.map(i => ({
                    tipoCompra: i.tipo,
                    descripcion: i.descripcion,
                    cantidad: 1, // Reset a 1 para obligar conteo
                    unidadCompra: i.unidad,
                    costoUnitario: parseFloat(i.precioUnit) || 0,
                    descuento: 0,
                    costoTotal: (parseFloat(i.precioUnit) || 0) * 1
                }));
                renderTablaItems();
            }
        }
    } else {
        lblInfo.innerText = "Nueva relación comercial (Sin historial).";
    }
}

// --- CALCULADORA INVERSA (MAGIA MATEMÁTICA) ---
function recalcularItem(origen) {
    // Obtener valores actuales
    let cant = parseFloat(document.getElementById('itemCantidad').value);
    let unit = parseFloat(document.getElementById('itemPrecioUnit').value);
    let desc = parseFloat(document.getElementById('itemDescuento').value);
    let total = parseFloat(document.getElementById('itemTotal').value);

    // Sanitizar NaN
    if(isNaN(cant)) cant = 1;
    if(isNaN(unit)) unit = 0;
    if(isNaN(desc)) desc = 0;
    if(isNaN(total)) total = 0;

    // Lógica según qué campo se editó
    if (origen === 'total') {
        // Si edito TOTAL -> Calculo UNITARIO
        // Fórmula: (Total + Descuento) / Cantidad = Unitario
        if (cant > 0) {
            unit = (total + desc) / cant;
            document.getElementById('itemPrecioUnit').value = unit.toFixed(4); // Más decimales para precisión
        }
    } else {
        // Si edito CANTIDAD, UNITARIO o DESCUENTO -> Calculo TOTAL
        // Fórmula: (Cantidad * Unitario) - Descuento = Total
        total = (cant * unit) - desc;
        document.getElementById('itemTotal').value = total.toFixed(2);
    }
}

function agregarItem() {
    const tipo = document.getElementById('itemTipo').value;
    const desc = document.getElementById('itemDesc').value;
    const cant = parseFloat(document.getElementById('itemCantidad').value);
    const unidad = document.getElementById('itemUnidad').value;
    const precio = parseFloat(document.getElementById('itemPrecioUnit').value);
    const descuento = parseFloat(document.getElementById('itemDescuento').value) || 0;
    const total = parseFloat(document.getElementById('itemTotal').value);

    if(!desc || !cant || isNaN(total)) {
        alert("⚠️ Faltan datos: Descripción, Cantidad o Precio.");
        return;
    }

    itemsCompra.push({
        tipoCompra: tipo,
        descripcion: desc,
        cantidad: cant,
        unidadCompra: unidad,
        costoUnitario: precio,
        descuento: descuento,
        costoTotal: total
    });

    renderTablaItems();
    
    // Limpiar para siguiente registro
    document.getElementById('itemDesc').value = "";
    document.getElementById('itemCantidad').value = "1";
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
                <td><span class="badge bg-secondary">${item.tipoCompra.substring(0,3)}</span></td>
                <td>${item.descripcion}</td>
                <td class="text-center">${item.cantidad} ${item.unidadCompra || ''}</td>
                <td class="text-end">${item.costoUnitario.toFixed(2)}</td>
                <td class="text-end text-danger">${item.descuento > 0 ? item.descuento.toFixed(2) : '-'}</td>
                <td class="text-end fw-bold">${item.costoTotal.toFixed(2)}</td>
                <td class="text-center"><i class="bi bi-x-circle text-danger" style="cursor:pointer" onclick="eliminarItem(${idx})"></i></td>
            </tr>
        `;
    });

    // Cálculos globales
    const descGlobal = parseFloat(document.getElementById('txtDescuentoGlobal').value) || 0;
    const granTotal = sumaSubtotales - descGlobal;

    document.getElementById('lblSumaItems').innerText = sumaSubtotales.toFixed(2);
    document.getElementById('lblGranTotal').innerText = granTotal.toFixed(2);
    
    validarTotales(granTotal);
}

function eliminarItem(idx) {
    itemsCompra.splice(idx, 1);
    renderTablaItems();
}

// --- VALIDACIÓN VISUAL ---
function validarTotales(totalCalculadoOverride = null) {
    const totalFactura = parseFloat(document.getElementById('txtImporteTotal').value) || 0;
    
    let totalCalculado = totalCalculadoOverride;
    if (totalCalculado === null) {
        totalCalculado = parseFloat(document.getElementById('lblGranTotal').innerText) || 0;
    }

    const diferencia = totalFactura - totalCalculado;
    updateDiferenciaVisual(diferencia);
}

function updateDiferenciaVisual(dif) {
    const inputDif = document.getElementById('txtDiferencia');
    const msg = document.getElementById('msgValidacion');
    
    inputDif.value = dif.toFixed(2);

    if (Math.abs(dif) < 0.05) { // Margen de error 5 céntimos
        inputDif.style.backgroundColor = "#198754"; // Verde
        inputDif.style.color = "white";
        if(msg) msg.innerText = "";
    } else {
        inputDif.style.backgroundColor = "#dc3545"; // Rojo
        inputDif.style.color = "white";
        if(msg) msg.innerText = "⚠️ Montos no cuadran";
    }
}

// --- ARCHIVOS ---
function leerArchivo(inputElement) {
    return new Promise((resolve, reject) => {
        const archivo = inputElement.files[0];
        if (!archivo) { resolve(null); return; }
        if (archivo.size > 4 * 1024 * 1024) {
            reject("Archivo > 4MB.");
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
        reader.onerror = e => reject("Error lectura");
        reader.readAsDataURL(archivo);
    });
}

// --- GUARDAR ---
async function guardarCompra() {
    const btn = document.getElementById('btnGuardarCompra');
    const originalText = btn.innerHTML;
    
    // Validar diferencia
    const dif = parseFloat(document.getElementById('txtDiferencia').value);
    if(Math.abs(dif) > 0.05) {
        if(!confirm("⚠️ El Total Factura no coincide con el Total Calculado. ¿Guardar de todas formas?")) return;
    }
    if(itemsCompra.length === 0) { alert("Agrega items."); return; }

    try {
        btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo...';

        let datosArchivo = null;
        const inputFile = document.getElementById('fileComprobante');
        if(inputFile) datosArchivo = await leerArchivo(inputFile);

        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        // Armar Payload
        const selectProv = document.getElementById('selectProveedorCompra');
        const payload = {
            datosComprobante: {
                proveedorId: selectProv.value,
                proveedorNombre: selectProv.options[selectProv.selectedIndex].text,
                tipoComprobante: document.getElementById('selectTipoComp').value,
                numeroComprobante: document.getElementById('txtNumComp').value,
                fechaEmision: document.getElementById('dateFecha').value,
                almacenDestino: document.getElementById('selectAlmacen').value,
                importeTotal: parseFloat(document.getElementById('txtImporteTotal').value) || 0,
                descuentoGlobal: parseFloat(document.getElementById('txtDescuentoGlobal').value) || 0,
                formaPago: document.getElementById('selectFormaPagoCompra').value,
                estadoCompra: document.getElementById('selectEstadoCompra').value,
                comentario: document.getElementById('txtComentarioCompra').value
            },
            items: itemsCompra,
            archivoAdjunto: datosArchivo
        };

        const res = await callAPI('proveedores', 'guardarCompra', payload);
        
        if(res.success) {
            alert("✅ Éxito: " + res.message);
            bootstrap.Modal.getInstance(document.getElementById('modalNuevaCompra')).hide();
        } else {
            throw new Error(res.error);
        }
    } catch (e) {
        alert("❌ Error: " + e.message);
    } finally {
        btn.disabled = false; btn.innerHTML = originalText;
    }
}