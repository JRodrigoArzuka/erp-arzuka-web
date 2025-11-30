/**
 * @file Compra_Code.gs
 * @description Backend para Módulo de Compras.
 * @version 19 (Alineado EXACTAMENTE a la estructura A-O y A-J del usuario)
 */

// --- CONFIGURACIÓN DE NOMBRES DE HOJAS ---
const HOJA_COMPROBANTES = "Registro_Comprobantes";
const HOJA_DETALLE = "Registro_Detalle_Compras";
const HOJA_PROVEEDORES = "Proveedores"; 
const HOJA_CONFIG = "Configuracion";

// --- ROUTER API ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    const data = JSON.parse(e.postData.contents);
    const accion = data.accion;
    let response = {};

    if (accion === 'obtenerDatosCompra') {
      response = obtenerDatosParaFormularioCompra();
    } 
    else if (accion === 'obtenerUltimaCompra') {
      response = obtenerUltimaCompraProveedor(data.payload.idProveedor);
    }
    else if (accion === 'guardarCompra') {
      response = guardarRegistroCompra(data.payload);
    } 
    else {
      response = { success: false, error: "Acción desconocida: " + accion };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Error Servidor: " + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}

// --- 1. OBTENER DATOS INICIALES ---
function obtenerDatosParaFormularioCompra() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaProv = ss.getSheetByName(HOJA_PROVEEDORES);
    const hojaDet = ss.getSheetByName(HOJA_DETALLE);
    
    // 1. Proveedores
    const dataProv = hojaProv ? hojaProv.getDataRange().getValues() : [];
    const proveedores = [];
    for(let i = 1; i < dataProv.length; i++) {
      if(dataProv[i][0]) {
        proveedores.push({ id: dataProv[i][0], nombre: dataProv[i][1] }); 
      }
    }

    // 2. Sugerencias de Productos (Historial)
    const sugerencias = [];
    if (hojaDet) {
      const dataDet = hojaDet.getDataRange().getValues();
      const unicos = new Set();
      // D: Descripcion_Compra está en índice 3
      for(let i = 1; i < dataDet.length; i++) {
        const desc = dataDet[i][3]; 
        if(desc && !unicos.has(desc)) {
          unicos.add(desc);
          sugerencias.push(desc);
        }
      }
    }

    // 3. Listas y Almacenes (Hardcoded por ahora o leer de Config)
    const listas = {
      Tipo_Comprobante: ["Factura", "Boleta", "Recibo", "Nota Venta"],
      Forma_Pago: ["Efectivo", "Transferencia", "Yape/Plin", "Crédito"],
      Estado_Compra: ["Pagado", "Pendiente", "Crédito"]
    };
    const almacenes = [
        { cod: "ALM-PRINCIPAL", nombre: "Almacén Principal" },
        { cod: "COCINA", nombre: "Cocina" },
        { cod: "BARRA", nombre: "Barra" }
    ];

    return { success: true, proveedores, almacenes, listas, sugerenciasProductos: sugerencias };

  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// --- 2. BUSCAR HISTORIAL (Corrección de Índices) ---
function obtenerUltimaCompraProveedor(idProveedor) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaComp = ss.getSheetByName(HOJA_COMPROBANTES);
    const hojaDet = ss.getSheetByName(HOJA_DETALLE);
    
    if (!hojaComp) return { success: false, error: "Falta hoja " + HOJA_COMPROBANTES };

    const dataComp = hojaComp.getDataRange().getValues();
    let ultimaCompra = null;
    
    // Buscar de abajo hacia arriba
    // B: ID_Proveedor es índice 1
    for (let i = dataComp.length - 1; i >= 1; i--) {
      if (String(dataComp[i][1]) === String(idProveedor)) { 
        ultimaCompra = {
          id: dataComp[i][0],         // A: ID_Comprobante
          tipoDoc: dataComp[i][3],    // D: Tipo_Comprobante (Indice 3)
          formaPago: dataComp[i][6],  // G: Forma_Pago (Indice 6)
          almacen: dataComp[i][12]    // M: Almacen_Destino_Cod (Indice 12)
        };
        break;
      }
    }

    if (!ultimaCompra) return { success: true, encontrado: false };

    // Buscar items
    const items = [];
    if(hojaDet) {
      const dataDet = hojaDet.getDataRange().getValues();
      // B: ID_Comprobante es índice 1 en Detalle
      for (let i = 1; i < dataDet.length; i++) {
        if (String(dataDet[i][1]) === String(ultimaCompra.id)) {
          items.push({
            tipo: dataDet[i][2],        // C: Tipo_Compra
            descripcion: dataDet[i][3], // D: Descripcion_Compra
            unidad: dataDet[i][5],      // F: Unidad_Compra
            precioUnit: dataDet[i][6]   // G: Costo_Unitario_Compra
          });
        }
      }
    }

    return { success: true, encontrado: true, cabecera: ultimaCompra, items: items };

  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// --- 3. GUARDAR COMPRA (Mapeo Exacto A-O y A-J) ---
function guardarRegistroCompra(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaComp = ss.getSheetByName(HOJA_COMPROBANTES);
    const hojaDet = ss.getSheetByName(HOJA_DETALLE);

    if (!hojaComp || !hojaDet) throw new Error("Faltan hojas de Registro.");

    const cab = payload.datosComprobante;
    const items = payload.items;
    const archivo = payload.archivoAdjunto;

    const idCompra = "COM-" + new Date().getTime();
    
    // Fecha Emisión
    let dateEmision = new Date();
    if (cab.fechaEmision) {
      const p = cab.fechaEmision.split('-'); 
      dateEmision = new Date(p[0], p[1] - 1, p[2]); 
    }

    // Archivo
    let urlArchivo = "";
    if(archivo && archivo.base64) {
       // Aquí puedes activar la subida a Drive si configuras CARPETA_ID
       urlArchivo = "Archivo Adjunto (Pendiente Config)"; 
    }

    const usuarioEmail = Session.getActiveUser().getEmail();

    // --- GUARDAR ENCABEZADO (MAPEO EXACTO A-O) ---
    hojaComp.appendRow([
      idCompra,                   // A: ID_Comprobante
      cab.proveedorId,            // B: ID_Proveedor
      cab.proveedorNombre,        // C: Nombre_Proveedor
      cab.tipoComprobante,        // D: Tipo_Comprobante
      cab.numeroComprobante,      // E: Numero_Comprobante
      dateEmision,                // F: Fecha_Emision
      cab.formaPago,              // G: Forma_Pago
      cab.importeTotal,           // H: Importe_Total_Pagado
      usuarioEmail,               // I: ID_Colaborador (Usamos email del usuario activo)
      cab.estadoCompra,           // J: Estado_Compra
      urlArchivo,                 // K: Link_Foto
      cab.comentario,             // L: Comentario
      cab.almacenDestino,         // M: Almacen_Destino_Cod
      usuarioEmail,               // N: Usuario (Email)
      cab.descuentoGlobal || 0    // O: Descuento Global
    ]);

    // --- GUARDAR DETALLE (MAPEO EXACTO A-J) ---
    const filas = items.map((item, idx) => {
      const idDet = idCompra + "-" + (idx + 1);
      return [
        idDet,               // A: ID_Detalle
        idCompra,            // B: ID_Comprobante
        item.tipoCompra,     // C: Tipo_Compra
        item.descripcion,    // D: Descripcion_Compra
        item.cantidad,       // E: Cantidad_Compra
        item.unidadCompra,   // F: Unidad_Compra
        item.costoUnitario,  // G: Costo_Unitario_Compra
        item.costoTotal,     // H: Costo_Total_Linea
        'INGRESADO',         // I: Estado_Stock
        item.descuento || 0  // J: Descuento Item
      ];
    });

    if(filas.length > 0) {
      hojaDet.getRange(hojaDet.getLastRow() + 1, 1, filas.length, filas[0].length).setValues(filas);
    }

    return { success: true, message: "Compra " + idCompra + " registrada correctamente." };

  } catch (e) {
    return { success: false, error: e.toString() };
  }
}