/**
 * js/compras.js
 * Lógica del módulo de Compras (V5 - Final Completa)
 * Incluye: Calculadora Inversa, Historial Inteligente, Sugerencias, Validación de Totales y Archivos Base64.
 */

let itemsCompra = [];

// --- 1. CARGA INICIAL Y APERTURA DEL MODAL ---
async function abrirModalCompra() {
    console.log("🔍 INICIANDO DEBUG DE CONEXIÓN...");
    
    // 1. Verificar que las URLs están correctas
    console.log("URL Proveedores:", Config.URL_PROVEEDORES);
    console.log("URL Usuarios:", Config.URL_USUARIOS);
    
    // 2. Test de conexión básico
    try {
        console.log("🧪 Testeando conexión con proveedores...");
        const testResult = await callAPI('proveedores', 'testConexion');
        console.log("Resultado test:", testResult);
        
        if (!testResult.success) {
            alert("❌ Error de conexión: " + testResult.error);
            return;
        }
    } catch (e) {
        console.error("❌ Error en test:", e);
        alert("Error crítico: " + e.message);
        return;
    }

    // ... el resto de tu código original continúa aquí
    document.getElementById('formCompra').reset();
    itemsCompra = [];
    renderTablaItems();
    
    // ... etc
}
    // Limpiar formulario previo
    document.getElementById('formCompra').reset();
    itemsCompra = [];
    renderTablaItems();
    
    // Establecer fecha por defecto (Hoy)
    const dateInput = document.getElementById('dateFecha');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    // Resetear visuales de validación
    updateDiferenciaVisual(0);
    const lblInfo = document.getElementById('lblUltimaCompraInfo');
    if(lblInfo) lblInfo.innerText = "";
    
    // Limpiar input file manualmente
    if(document.getElementById('fileComprobante')) document.getElementById('fileComprobante').value = "";

    // Mostrar estado "Cargando..." en selects
    const selects = ['selectProveedorCompra', 'selectAlmacen', 'selectTipoComp', 'selectFormaPagoCompra', 'selectEstadoCompra'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = '<option>Cargando...</option>';
    });

    // Abrir Modal
    new bootstrap.Modal(document.getElementById('modalNuevaCompra')).show();

    // Llamar al Backend para llenar listas
    // Usamos el servicio 'proveedores' (definido en config.js)
    try {
        const datos = await callAPI('proveedores', 'obtenerDatosCompra'); 
        
        if(datos.success) {
            poblarSelect('selectProveedorCompra', datos.proveedores, 'id', 'nombre');
            poblarSelect('selectAlmacen', datos.almacenes, 'cod', 'nombre');
            poblarSelect('selectTipoComp', datos.listas.Tipo_Comprobante);
            poblarSelect('selectFormaPagoCompra', datos.listas.Forma_Pago);
            poblarSelect('selectEstadoCompra', datos.listas.Estado_Compra);
            
            // Llenar la lista de sugerencias (Datalist)
            const datalist = document.getElementById('listaItemsHistoricos');
            if(datalist && datos.sugerenciasProductos) {
                datalist.innerHTML = '';
                datos.sugerenciasProductos.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    datalist.appendChild(option);
                });
            }
        } else {
            alert("Error cargando datos del servidor: " + datos.error);
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al cargar datos iniciales.");
    }
}

function poblarSelect(id, datos, keyVal = null, keyText = null) {
    const sel = document.getElementById(id);
    if(!sel) return;
    sel.innerHTML = '<option value="">Seleccione...</option>';
    
    if(Array.isArray(datos)) {
        datos.forEach(d => {
            // Si el dato es objeto usamos las keys, si es string simple usamos el valor directo
            let val = keyVal ? d[keyVal] : d;
            let txt = keyText ? d[keyText] : d;
            sel.innerHTML += `<option value="${val}">${txt}</option>`;
        });
    }
}

// --- 2. HISTORIAL INTELIGENTE DEL PROVEEDOR ---
async function cargarUltimaCompraProveedor() {
    const idProv = document.getElementById('selectProveedorCompra').value;
    const lblInfo = document.getElementById('lblUltimaCompraInfo');
    
    if(!idProv) {
        lblInfo.innerText = "";
        return;
    }

    lblInfo.innerText = "⏳ Buscando historial...";
    
    try {
        const res = await callAPI('proveedores', 'obtenerUltimaCompra', { idProveedor: idProv });

        if (res.success && res.encontrado) {
            const cab = res.cabecera;
            
            // Autocompletar Cabecera (Configuración recurrente)
            if(cab.tipoDoc) document.getElementById('selectTipoComp').value = cab.tipoDoc;
            if(cab.formaPago) document.getElementById('selectFormaPagoCompra').value = cab.formaPago;
            if(cab.almacen) document.getElementById('selectAlmacen').value = cab.almacen;
            
            lblInfo.innerText = "✅ Datos cargados. (Items disponibles)";
            
            // Preguntar si quiere cargar los productos de la última vez
            if(res.items && res.items.length > 0) {
                if(confirm(`Este proveedor tiene ${res.items.length} productos frecuentes en su historial.\n¿Deseas cargarlos a la lista para agilizar?`)) {
                    itemsCompra = res.items.map(i => ({
                        tipoCompra: i.tipo || 'Insumo',
                        descripcion: i.descripcion,
                        cantidad: 1, // Resetear cantidad a 1 para obligar al usuario a verificar
                        unidadCompra: i.unidad,
                        costoUnitario: parseFloat(i.precioUnit) || 0,
                        descuento: 0,
                        // Recalcular total inicial basado en cantidad 1
                        costoTotal: (parseFloat(i.precioUnit) || 0) * 1
                    }));
                    renderTablaItems();
                }
            }
        } else {
            lblInfo.innerText = "Proveedor nuevo o sin historial reciente.";
        }
    } catch (e) {
        lblInfo.innerText = "Error consultando historial.";
        console.error(e);
    }
}

// --- 3. CALCULADORA INVERSA Y GESTIÓN DE ITEMS ---
/**
 * Lógica de cálculo bidireccional.
 * @param {string} origen - 'total' si se editó el total, cualquier otra cosa si se editó unitario/cant/desc
 */
function recalcularItem(origen) {
    // Obtener valores actuales
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
            // Mostramos hasta 4 decimales en el unitario para precisión, aunque en tabla se muestren 2
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

    // Validaciones de línea
    if(!desc) { alert("Falta la descripción del producto."); return; }
    if(!cant) { alert("Falta la cantidad."); return; }
    if(isNaN(total)) { alert("El total no es válido."); return; }

    // Agregar al array local
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
    
    // Limpiar campos para ingreso rápido del siguiente item
    document.getElementById('itemDesc').value = "";
    document.getElementById('itemCantidad').value = "1";
    document.getElementById('itemPrecioUnit').value = "";
    document.getElementById('itemDescuento').value = "0";
    document.getElementById('itemTotal').value = "";
    document.getElementById('itemDesc').focus(); // Foco para seguir escribiendo
}

function renderTablaItems() {
    const tbody = document.getElementById('bodyTablaItems');
    tbody.innerHTML = "";
    
    let sumaSubtotales = 0;

    itemsCompra.forEach((item, idx) => {
        sumaSubtotales += item.costoTotal;
        tbody.innerHTML += `
            <tr class="align-middle">
                <td>
                    <span class="badge bg-secondary border text-light" title="${item.tipoCompra}">${item.tipoCompra.substring(0,1)}</span> 
                    <span class="d-none d-md-inline small ms-1">${item.tipoCompra}</span>
                </td>
                <td>${item.descripcion}</td>
                <td class="text-center">${item.cantidad} ${item.unidadCompra || ''}</td>
                <td class="text-end">${item.costoUnitario.toFixed(2)}</td>
                <td class="text-end text-danger small">${item.descuento > 0 ? '-' + item.descuento.toFixed(2) : ''}</td>
                <td class="text-end fw-bold">${item.costoTotal.toFixed(2)}</td>
                <td class="text-center">
                    <button class="btn btn-link text-danger p-0" onclick="eliminarItem(${idx})" title="Eliminar línea">
                        <i class="bi bi-x-circle-fill"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Cálculos Globales (Pie de página)
    const descGlobal = parseFloat(document.getElementById('txtDescuentoGlobal').value) || 0;
    const granTotal = sumaSubtotales - descGlobal;

    // Actualizar etiquetas
    const lblGranTotal = document.getElementById('lblGranTotal');
    if(lblGranTotal) lblGranTotal.innerText = granTotal.toFixed(2);
    
    // Validar contra el total de la factura (Cabecera)
    validarTotales(granTotal);
}

function eliminarItem(idx) {
    itemsCompra.splice(idx, 1);
    renderTablaItems();
}

// --- 4. VALIDACIÓN VISUAL DE TOTALES ---
function validarTotales(totalCalculadoOverride = null) {
    const totalFactura = parseFloat(document.getElementById('txtImporteTotal').value) || 0;
    
    // Obtener total calculado (del argumento o del label si no se pasa)
    let totalCalculado = totalCalculadoOverride;
    if (totalCalculado === null) {
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

    // Usamos un margen de error de 0.05 para evitar falsos positivos por redondeo de decimales
    if (Math.abs(dif) < 0.05) {
        // CUADRA (Verde)
        inputDif.style.backgroundColor = "#d1e7dd"; 
        inputDif.style.color = "#0f5132";
        inputDif.style.borderColor = "#badbcc";
        if(msg) msg.innerText = "";
    } else {
        // NO CUADRA (Rojo)
        inputDif.style.backgroundColor = "#f8d7da"; 
        inputDif.style.color = "#842029";
        inputDif.style.borderColor = "#f5c2c7";
        if(msg) msg.innerText = "⚠️ Diferencia: Revisa los montos";
    }
}

// --- 5. PROCESAMIENTO DE ARCHIVO (Base64) ---
function leerArchivo(inputElement) {
    return new Promise((resolve, reject) => {
        const archivo = inputElement.files[0];
        if (!archivo) { resolve(null); return; }
        
        // Límite de 4MB para no saturar Google Apps Script
        if (archivo.size > 4 * 1024 * 1024) {
            reject("El archivo es muy pesado (Máx 4MB). Comprímelo antes de subir.");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = e => {
            resolve({
                nombre: archivo.name,
                mimeType: archivo.type,
                // Quitamos el prefijo "data:image/png;base64," para enviar solo el string
                base64: e.target.result.split(',')[1] 
            });
        };
        reader.onerror = e => reject("Error al leer el archivo local.");
        reader.readAsDataURL(archivo);
    });
}

// --- 6. GUARDAR COMPRA FINAL ---
async function guardarCompra() {
    const btn = document.getElementById('btnGuardarCompra');
    const originalText = btn.innerHTML;
    
    // Validaciones Finales
    const idProv = document.getElementById('selectProveedorCompra').value;
    if(!idProv) { alert("⚠️ Debes seleccionar un Proveedor."); return; }
    
    if(itemsCompra.length === 0) { alert("⚠️ La lista de items está vacía."); return; }

    // Validación de diferencia
    const dif = parseFloat(document.getElementById('txtDiferencia').value) || 0;
    if(Math.abs(dif) > 0.05) {
        if(!confirm(`⚠️ ATENCIÓN:\n\nHay una diferencia de ${dif.toFixed(2)} entre el 'Total Factura' y la suma de los items.\n\n¿Estás seguro de que deseas guardar así?`)) {
            return;
        }
    }

    try {
        // Bloquear botón y mostrar carga
        btn.disabled = true; 
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo archivo...';

        // Procesar Archivo
        let datosArchivo = null;
        const inputFile = document.getElementById('fileComprobante');
        if(inputFile) datosArchivo = await leerArchivo(inputFile);

        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando datos...';

        // Armar Payload Completo
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

        // Enviar al Backend
        const res = await callAPI('proveedores', 'guardarCompra', payload);
        
        if(res.success) {
            alert("✅ Compra registrada con éxito!\n\n" + (res.message || ""));
            bootstrap.Modal.getInstance(document.getElementById('modalNuevaCompra')).hide();
            // Opcional: Aquí podrías llamar a una función para recargar una tabla de historial de compras si la tuvieras
        } else {
            throw new Error(res.error);
        }

    } catch (e) {
        console.error(e);
        alert("❌ Error al guardar: " + e.message);
    } finally {
        // Restaurar botón
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
}