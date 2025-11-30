/**
 * js/compras.js
 * Lógica del módulo de Compras (V4 - Final)
 * Características: Calculadora Inversa, Historial, Sugerencias y Archivos.
 */

let itemsCompra = [];

// --- CARGA INICIAL Y APERTURA DEL MODAL ---
async function abrirModalCompra() {
    document.getElementById('formCompra').reset();
    itemsCompra = [];
    renderTablaItems();
    
    // Establecer fecha por defecto (Hoy)
    const dateInput = document.getElementById('dateFecha');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    // Resetear visuales
    updateDiferenciaVisual(0);
    const lblInfo = document.getElementById('lblUltimaCompraInfo');
    if(lblInfo) lblInfo.innerText = "";
    
    // Limpiar input file
    if(document.getElementById('fileComprobante')) document.getElementById('fileComprobante').value = "";

    // Mostrar estado "Cargando..." en selects
    const selects = ['selectProveedorCompra', 'selectAlmacen', 'selectTipoComp', 'selectFormaPagoCompra', 'selectEstadoCompra'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '<option>Cargando...</option>';
    });

    // Abrir Modal
    new bootstrap.Modal(document.getElementById('modalNuevaCompra')).show();

    // Llamar al Backend
    // NOTA: Asegúrate de que 'proveedores' apunte a la URL correcta en config.js
    const datos = await callAPI('proveedores', 'obtenerDatosCompra'); 
    
    if(datos.success) {
        poblarSelect('selectProveedorCompra', datos.proveedores, 'id', 'nombre');
        poblarSelect('selectAlmacen', datos.almacenes, 'cod', 'nombre');
        poblarSelect('selectTipoComp', datos.listas.Tipo_Comprobante);
        poblarSelect('selectFormaPagoCompra', datos.listas.Forma_Pago);
        poblarSelect('selectEstadoCompra', datos.listas.Estado_Compra);
        
        // Llenar la lista de sugerencias (Datalist)
        // Esto permite que al escribir en "Descripción" aparezcan productos anteriores
        if(datos.sugerenciasProductos) {
            const datalist = document.getElementById('listaItemsHistoricos');
            if(datalist) {
                datalist.innerHTML = '';
                datos.sugerenciasProductos.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    datalist.appendChild(option);
                });
            }
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

// --- HISTORIAL INTELIGENTE ---
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
        
        // Autocompletar datos fijos (Tipo doc, pago, almacén)
        if(cab.tipoDoc) document.getElementById('selectTipoComp').value = cab.tipoDoc;
        if(cab.formaPago) document.getElementById('selectFormaPagoCompra').value = cab.formaPago;
        if(cab.almacen) document.getElementById('selectAlmacen').value = cab.almacen;
        
        lblInfo.innerText = "✅ Historial cargado.";
        
        // Preguntar si quiere cargar los productos recurrentes
        if(res.items && res.items.length > 0) {
            if(confirm(`Este proveedor tiene ${res.items.length} productos frecuentes. ¿Deseas cargarlos a la lista?`)) {
                itemsCompra = res.items.map(i => ({
                    tipoCompra: i.tipo || 'Insumo',
                    descripcion: i.descripcion,
                    cantidad: 1, // Ponemos 1 para obligar a revisar la cantidad real
                    unidadCompra: i.unidad,
                    costoUnitario: parseFloat(i.precioUnit) || 0,
                    descuento: 0,
                    // Recalcular total inicial (1 * precio)
                    costoTotal: (parseFloat(i.precioUnit) || 0) * 1
                }));
                renderTablaItems();
            }
        }
    } else {
        lblInfo.innerText = "Proveedor nuevo (Sin historial previo).";
    }
}

// --- CALCULADORA INVERSA ---
/**
 * Esta función se ejecuta cada vez que escribes en Cantidad, Precio, Descuento o Total.
 * Decide qué calcular basándose en qué campo editaste.
 */
function recalcularItem(origen) {
    let cant = parseFloat(document.getElementById('itemCantidad').value);
    let unit = parseFloat(document.getElementById('itemPrecioUnit').value);
    let desc = parseFloat(document.getElementById('itemDescuento').value);
    let total = parseFloat(document.getElementById('itemTotal').value);

    // Sanitizar (Evitar NaN)
    if(isNaN(cant)) cant = 1;
    if(isNaN(unit)) unit = 0;
    if(isNaN(desc)) desc = 0;
    if(isNaN(total)) total = 0;

    if (origen === 'total') {
        // MODO INVERSO: Usuario escribió el TOTAL -> Calculamos UNITARIO
        // Fórmula: (Total + Descuento) / Cantidad = Unitario
        if (cant > 0) {
            unit = (total + desc) / cant;
            // Mostramos hasta 4 decimales en el unitario para mayor precisión interna
            document.getElementById('itemPrecioUnit').value = parseFloat(unit.toFixed(4));
        }
    } else {
        // MODO NORMAL: Usuario escribió CANTIDAD, PRECIO o DESCUENTO -> Calculamos TOTAL
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
        alert("⚠️ Faltan datos obligatorios: Descripción, Cantidad o Precio.");
        return;
    }

    // Agregar al array
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
    
    // Limpiar campos para el siguiente item (manteniendo el foco en descripción)
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
            <tr class="align-middle">
                <td><span class="badge bg-secondary border text-light">${item.tipoCompra.substring(0,1)}</span> <small>${item.tipoCompra}</small></td>
                <td>${item.descripcion}</td>
                <td class="text-center">${item.cantidad} ${item.unidadCompra || ''}</td>
                <td class="text-end">${item.costoUnitario.toFixed(2)}</td>
                <td class="text-end text-danger small">${item.descuento > 0 ? '-' + item.descuento.toFixed(2) : ''}</td>
                <td class="text-end fw-bold">${item.costoTotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-link text-danger p-0" onclick="eliminarItem(${idx})">
                        <i class="bi bi-x-circle-fill"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Cálculos Globales
    const descGlobal = parseFloat(document.getElementById('txtDescuentoGlobal').value) || 0;
    const granTotal = sumaSubtotales - descGlobal;

    // Actualizar etiquetas visuales (Labels)
    const lblGranTotal = document.getElementById('lblGranTotal');
    if(lblGranTotal) lblGranTotal.innerText = granTotal.toFixed(2);
    
    // Validar contra el total de la factura
    validarTotales(granTotal);
}

function eliminarItem(idx) {
    itemsCompra.splice(idx, 1);
    renderTablaItems();
}

// --- VALIDACIÓN VISUAL (ROJO / VERDE) ---
function validarTotales(totalCalculadoOverride = null) {
    const totalFactura = parseFloat(document.getElementById('txtImporteTotal').value) || 0;
    
    let totalCalculado = totalCalculadoOverride;
    if (totalCalculado === null) {
        // Si no pasamos el valor, lo leemos de la pantalla
        const lbl = document.getElementById('lblGranTotal');
        totalCalculado = lbl ? parseFloat(lbl.innerText) : 0;
    }

    const diferencia = totalFactura - totalCalculado;
    updateDiferenciaVisual(diferencia);
}

function updateDiferenciaVisual(dif) {
    const inputDif = document.getElementById('txtDiferencia');
    const msg = document.getElementById('msgValidacion');
    
    if(!inputDif) return;

    inputDif.value = dif.toFixed(2);

    // Margen de error de 0.05 céntimos para evitar falsos positivos por redondeo
    if (Math.abs(dif) < 0.05) {
        inputDif.style.backgroundColor = "#d1e7dd"; // Verde claro
        inputDif.style.color = "#0f5132";
        inputDif.style.borderColor = "#badbcc";
        if(msg) msg.innerText = "";
    } else {
        inputDif.style.backgroundColor = "#f8d7da"; // Rojo claro
        inputDif.style.color = "#842029";
        inputDif.style.borderColor = "#f5c2c7";
        if(msg) msg.innerText = "⚠️ Diferencia detectada";
    }
}

// --- PROCESAMIENTO DE ARCHIVO (Subida) ---
function leerArchivo(inputElement) {
    return new Promise((resolve, reject) => {
        const archivo = inputElement.files[0];
        if (!archivo) { resolve(null); return; }
        
        // Límite de 4MB para seguridad
        if (archivo.size > 4 * 1024 * 1024) {
            reject("El archivo es muy pesado (Máx 4MB).");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = e => {
            // e.target.result = "data:image/png;base64,..."
            resolve({
                nombre: archivo.name,
                mimeType: archivo.type,
                base64: e.target.result.split(',')[1] // Quitamos el prefijo
            });
        };
        reader.onerror = e => reject("Error leyendo archivo local.");
        reader.readAsDataURL(archivo);
    });
}

// --- GUARDAR FINAL ---
async function guardarCompra() {
    const btn = document.getElementById('btnGuardarCompra');
    const originalText = btn.innerHTML;
    
    // 1. Validaciones
    const dif = parseFloat(document.getElementById('txtDiferencia').value) || 0;
    if(Math.abs(dif) > 0.05) {
        if(!confirm("⚠️ El 'Importe Total' de la factura no coincide con la suma de los items.\n\n¿Deseas guardar de todas formas con esta diferencia?")) {
            return;
        }
    }
    if(itemsCompra.length === 0) {
        alert("⚠️ La lista de items está vacía.");
        return;
    }
    const idProv = document.getElementById('selectProveedorCompra').value;
    if(!idProv) {
        alert("⚠️ Selecciona un proveedor.");
        return;
    }

    try {
        // 2. Preparar Interfaz
        btn.disabled = true; 
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo...';

        // 3. Procesar Archivo
        let datosArchivo = null;
        const inputFile = document.getElementById('fileComprobante');
        if(inputFile) datosArchivo = await leerArchivo(inputFile);

        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        // 4. Construir Payload
        const selectProv = document.getElementById('selectProveedorCompra');
        
        const cabecera = {
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
        };

        const payload = {
            datosComprobante: cabecera,
            items: itemsCompra,
            archivoAdjunto: datosArchivo
        };

        // 5. Enviar al Backend
        const res = await callAPI('proveedores', 'guardarCompra', payload);
        
        if(res.success) {
            alert("✅ Compra registrada con éxito!\nID: " + (res.message || ""));
            bootstrap.Modal.getInstance(document.getElementById('modalNuevaCompra')).hide();
            // Opcional: Recargar dashboard o lista si existiera
        } else {
            throw new Error(res.error);
        }

    } catch (e) {
        alert("❌ Error al guardar: " + e.message);
    } finally {
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
}
