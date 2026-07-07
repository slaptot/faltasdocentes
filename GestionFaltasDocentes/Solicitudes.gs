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

    return {
      ok: true,
      id: id,
      estado: solicitud.Estado,
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
  notImplemented('Historial');
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
    const hasTramo = AUSENCIA_TRAMOS.some(function(tramo) {
      return ausencia.tramos[tramo] !== '-';
    });

    if (!hasTramo) {
      throw new Error('Cada dia de ausencia debe tener al menos un tramo marcado.');
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

  return {
    fecha: normalizeText(data.fecha),
    tramos: AUSENCIA_TRAMOS.reduce(function(result, tramo) {
      const value = normalizeText(tramos[tramo]) || '-';
      result[tramo] = AUSENCIA_VALORES.indexOf(value) === -1 ? '-' : value;
      return result;
    }, {})
  };
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
 * Agrupa ausencias y observaciones en una cadena legible hasta implementar PDF.
 *
 * @param {Object} data Datos validados.
 * @return {string} Observaciones enriquecidas.
 * @private
 */
function buildSolicitudObservaciones_(data) {
  const ausenciasText = data.ausencias.map(function(ausencia) {
    const tramosText = AUSENCIA_TRAMOS.map(function(tramo) {
      return tramo + ':' + ausencia.tramos[tramo];
    }).join(', ');

    return ausencia.fecha + ' [' + tramosText + ']';
  }).join('\n');

  return ['Ausencias:', ausenciasText, '', 'Observaciones:', data.observaciones || '-'].join('\n');
}
