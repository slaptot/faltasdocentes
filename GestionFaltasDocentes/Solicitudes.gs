/**
 * Modulo Solicitudes.
 *
 * Responsabilidades:
 * - Crear y guardar solicitudes.
 * - Generar IDs con formato 2026-00001.
 * - Consultar historial propio y listado administrativo.
 * - Actualizar estados.
 */

/**
 * Crea una nueva solicitud completa.
 *
 * @param {Object} payload Datos recibidos desde el formulario.
 * @return {Object} Solicitud creada.
 */
function crearSolicitud(payload) {
  try {
    const user = getCurrentUser();

    if (!user.authorized) {
      throw new Error('No esta autorizado para utilizar esta aplicacion.');
    }

    const data = validateSolicitudPayload_(payload);
    const id = generarSiguienteSolicitudId();
    const justificanteDriveId = guardarJustificante(data.justificante, id);
    const now = new Date();
    const solicitud = {
      ID: id,
      FechaSolicitud: data.fechaSolicitud,
      Profesor: user.nombre,
      Email: user.email,
      Departamento: user.departamento,
      Motivo: data.motivo,
      Observaciones: buildSolicitudObservaciones_(data),
      Estado: ESTADOS_SOLICITUD.PENDIENTE,
      DocumentoDriveId: '',
      PDFDriveId: '',
      JustificanteDriveId: justificanteDriveId || '',
      FechaCreacion: now
    };

    appendSolicitud_(solicitud);
    const pdfResult = generarDocumentoSolicitud(solicitud);
    solicitud.DocumentoDriveId = pdfResult.documentoDriveId;
    solicitud.PDFDriveId = pdfResult.pdfDriveId;
    updateSolicitudDriveIds_(solicitud.ID, pdfResult);
    notificarNuevaSolicitud(solicitud);

    return {
      ok: true,
      id: id,
      estado: solicitud.Estado,
      pdfDriveId: solicitud.PDFDriveId,
      pdfUrl: getDriveDownloadUrl(solicitud.PDFDriveId),
      justificanteDriveId: solicitud.JustificanteDriveId
    };
  } catch (error) {
    console.error('Error creando solicitud', error);
    throw error;
  }
}

/**
 * Lista las solicitudes del usuario actual.
 *
 * @return {Object[]} Solicitudes propias.
 */
function listarMisSolicitudes() {
  const user = getCurrentUser();

  if (!user.authorized) {
    throw new Error('No esta autorizado para utilizar esta aplicacion.');
  }

  return readSheetObjects_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES)
    .filter(function(solicitud) {
      return normalizeText(solicitud.Email).toLowerCase() === user.email;
    })
    .map(mapSolicitudForClient_)
    .sort(function(a, b) {
      return String(b.fechaCreacion || '').localeCompare(String(a.fechaCreacion || ''));
    });
}

/**
 * Lista solicitudes para administracion.
 *
 * @param {Object} filtros Filtros opcionales.
 * @return {Object[]} Solicitudes filtradas.
 */
function listarSolicitudesAdmin(filtros) {
  notImplemented('Administracion');
}

/**
 * Cambia el estado de una solicitud.
 *
 * @param {string} id ID de solicitud.
 * @param {string} estado Nuevo estado.
 * @return {Object} Solicitud actualizada.
 */
function cambiarEstadoSolicitud(id, estado) {
  notImplemented('Administracion');
}

/**
 * Marca una solicitud propia como invalida.
 *
 * @param {string} id ID de solicitud.
 * @return {Object} Solicitud actualizada.
 */
function invalidarMiSolicitud(id) {
  const user = getCurrentUser();

  if (!user.authorized) {
    throw new Error('No esta autorizado para utilizar esta aplicacion.');
  }

  const solicitudId = normalizeText(id);
  const rowIndex = findSolicitudRowIndex_(solicitudId);

  if (!rowIndex) {
    throw new Error('No se ha encontrado la solicitud.');
  }

  const sheet = getOrCreateSheet_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES);
  const rowValues = sheet.getRange(rowIndex, 1, 1, HEADERS.SOLICITUDES.length).getValues()[0];
  const solicitud = rowToObject_(HEADERS.SOLICITUDES, rowValues);

  if (normalizeText(solicitud.Email).toLowerCase() !== user.email) {
    throw new Error('No puede modificar una solicitud de otro usuario.');
  }

  if (normalizeText(solicitud.Estado) === ESTADOS_SOLICITUD.INVALIDA) {
    return mapSolicitudForClient_(solicitud);
  }

  sheet
    .getRange(rowIndex, HEADERS.SOLICITUDES.indexOf('Estado') + 1)
    .setValue(ESTADOS_SOLICITUD.INVALIDA);
  solicitud.Estado = ESTADOS_SOLICITUD.INVALIDA;

  return mapSolicitudForClient_(solicitud);
}

/**
 * Genera el siguiente ID de solicitud con formato ANO-00001.
 *
 * @return {string} Nuevo ID.
 */
function generarSiguienteSolicitudId() {
  const yearPrefix = getSolicitudYearPrefix();
  const solicitudes = readSheetObjects_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES);
  const maxSequence = solicitudes.reduce(function(max, solicitud) {
    const id = normalizeText(solicitud.ID);

    if (id.indexOf(yearPrefix + '-') !== 0) {
      return max;
    }

    const sequence = parseInt(id.split('-')[1], 10);
    return isNaN(sequence) ? max : Math.max(max, sequence);
  }, 0);

  return yearPrefix + '-' + String(maxSequence + 1).padStart(5, '0');
}

/**
 * Devuelve los datos necesarios para renderizar el formulario.
 *
 * @return {Object} Datos iniciales del formulario.
 */
function getNuevaSolicitudData() {
  const user = getCurrentUser();

  if (!user.authorized) {
    throw new Error('No esta autorizado para utilizar esta aplicacion.');
  }

  return {
    profesor: {
      nombre: user.nombre,
      email: user.email,
      departamento: user.departamento
    },
    motivos: listarMotivos()
  };
}

/**
 * Valida el payload enviado desde el formulario.
 *
 * @param {Object} payload Datos del cliente.
 * @return {Object} Datos normalizados.
 * @private
 */
function validateSolicitudPayload_(payload) {
  const data = payload || {};
  const motivo = normalizeText(data.motivo);
  const observaciones = normalizeText(data.observaciones);
  const ausencias = Array.isArray(data.ausencias) ? data.ausencias : [];
  const motivos = listarMotivos();

  if (!motivo) {
    throw new Error('Debe seleccionar un motivo.');
  }

  if (motivos.indexOf(motivo) === -1) {
    throw new Error('El motivo seleccionado no existe en la hoja Motivos.');
  }

  const normalizedAusencias = ausencias
    .map(normalizeAusencia_)
    .filter(function(ausencia) {
      return Boolean(ausencia.fecha);
    });

  if (!normalizedAusencias.length) {
    throw new Error('Debe indicar al menos un dia de ausencia.');
  }

  normalizedAusencias.forEach(function(ausencia) {
    if (!ausencia.diaEntero && (!ausencia.horaSalida || !ausencia.horaVuelta)) {
      throw new Error('Indique hora de salida y hora de vuelta, o marque dia entero.');
    }
  });

  return {
    fechaSolicitud: new Date(),
    motivo: motivo,
    observaciones: observaciones,
    ausencias: normalizedAusencias,
    justificante: data.justificante || null
  };
}

const AUSENCIA_TRAMOS = Object.freeze(['1', '2', 'R1', '3', '4', 'R2', '5', '6']);
const AUSENCIA_VALORES = Object.freeze(['-', 'L', 'C']);

/**
 * Normaliza una fila de ausencia.
 *
 * @param {Object} ausencia Datos de una ausencia.
 * @return {Object} Ausencia normalizada.
 * @private
 */
function normalizeAusencia_(ausencia) {
  const data = ausencia || {};
  const tramos = data.tramos || {};
  const diaEntero = data.diaEntero === true || normalizeText(data.diaEntero).toLowerCase() === 'true';

  return {
    fecha: normalizeText(data.fecha),
    diaEntero: diaEntero,
    horaSalida: normalizeTime_(data.horaSalida),
    horaVuelta: normalizeTime_(data.horaVuelta),
    tramos: AUSENCIA_TRAMOS.reduce(function(result, tramo) {
      const value = normalizeText(tramos[tramo]) || '-';
      result[tramo] = AUSENCIA_VALORES.indexOf(value) === -1 ? '-' : value;
      return result;
    }, {})
  };
}

/**
 * Normaliza una hora HTML time HH:mm.
 *
 * @param {*} value Valor de hora.
 * @return {string} Hora normalizada o cadena vacia.
 * @private
 */
function normalizeTime_(value) {
  const time = normalizeText(value);
  return /^\d{2}:\d{2}$/.test(time) ? time : '';
}

/**
 * Persiste una solicitud en la hoja Solicitudes.
 *
 * @param {Object} solicitud Solicitud normalizada.
 * @private
 */
function appendSolicitud_(solicitud) {
  const sheet = getOrCreateSheet_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES);
  const row = HEADERS.SOLICITUDES.map(function(header) {
    return solicitud[header] || '';
  });

  sheet.appendRow(row);
}

/**
 * Actualiza los IDs de documento y PDF de una solicitud existente.
 *
 * @param {string} solicitudId ID de solicitud.
 * @param {Object} driveIds IDs generados.
 * @private
 */
function updateSolicitudDriveIds_(solicitudId, driveIds) {
  const sheet = getOrCreateSheet_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES);
  const rowIndex = findSolicitudRowIndex_(solicitudId);

  if (!rowIndex) {
    throw new Error('No se ha encontrado la solicitud ' + solicitudId + ' para actualizar PDF.');
  }

  sheet
    .getRange(rowIndex, HEADERS.SOLICITUDES.indexOf('DocumentoDriveId') + 1)
    .setValue(driveIds.documentoDriveId || '');
  sheet
    .getRange(rowIndex, HEADERS.SOLICITUDES.indexOf('PDFDriveId') + 1)
    .setValue(driveIds.pdfDriveId || '');
}

/**
 * Busca la fila real de una solicitud en la hoja.
 *
 * @param {string} solicitudId ID de solicitud.
 * @return {number|null} Numero de fila o null.
 * @private
 */
function findSolicitudRowIndex_(solicitudId) {
  const sheet = getOrCreateSheet_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const index = ids.findIndex(function(row) {
    return normalizeText(row[0]) === solicitudId;
  });

  return index === -1 ? null : index + 2;
}

/**
 * Convierte una solicitud de hoja a objeto seguro para cliente.
 *
 * @param {Object} solicitud Solicitud de hoja.
 * @return {Object} Solicitud para UI.
 * @private
 */
function mapSolicitudForClient_(solicitud) {
  const pdfDriveId = normalizeText(solicitud.PDFDriveId);

  return {
    id: normalizeText(solicitud.ID),
    fecha: formatDateForClient_(solicitud.FechaSolicitud),
    motivo: normalizeText(solicitud.Motivo),
    estado: normalizeText(solicitud.Estado),
    pdfDriveId: pdfDriveId,
    pdfUrl: getDriveViewUrl(pdfDriveId),
    fechaCreacion: formatSortableDate_(solicitud.FechaCreacion)
  };
}

/**
 * Formatea fecha para mostrar en cliente.
 *
 * @param {*} value Fecha.
 * @return {string} Fecha formateada.
 * @private
 */
function formatDateForClient_(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return normalizeText(value);
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/**
 * Formatea fecha para ordenar de forma estable.
 *
 * @param {*} value Fecha.
 * @return {string} Fecha ISO aproximada.
 * @private
 */
function formatSortableDate_(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return normalizeText(value);
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * Agrupa ausencias y observaciones en una cadena legible hasta implementar PDF.
 *
 * @param {Object} data Datos validados.
 * @return {string} Observaciones enriquecidas.
 * @private
 */
function buildSolicitudObservaciones_(data) {
  const serializedAusencias = JSON.stringify(data.ausencias);

  return [
    'Ausencias:',
    serializedAusencias,
    '',
    'Observaciones:',
    data.observaciones || '-'
  ].join('\n');
}

/**
 * Extrae las ausencias estructuradas almacenadas en Observaciones.
 *
 * @param {string} observaciones Valor de la columna Observaciones.
 * @return {Object[]} Ausencias.
 */
function extractAusenciasFromObservaciones_(observaciones) {
  const text = String(observaciones || '');
  const match = text.match(/Ausencias:\s*([\s\S]*?)\n\s*\nObservaciones:/);

  if (!match) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed.map(normalizeAusencia_) : [];
  } catch (error) {
    console.error('No se han podido leer las ausencias de la solicitud', error);
    return [];
  }
}

/**
 * Extrae solo las observaciones visibles del profesor.
 *
 * @param {string} observaciones Valor de la columna Observaciones.
 * @return {string} Observaciones visibles.
 */
function extractVisibleObservaciones_(observaciones) {
  const text = String(observaciones || '');
  const marker = '\n\nObservaciones:\n';
  const index = text.indexOf(marker);

  return index === -1 ? text : text.slice(index + marker.length);
}
