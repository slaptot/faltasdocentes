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
      throw new Error('No está autorizado para utilizar esta aplicación.');
    }

    const data = validateSolicitudPayload_(payload);
    const avisoLimite = buildAvisoLibreDisposicion_(user.email, data);
    const id = generarSiguienteSolicitudId();
    const justificanteDriveId = guardarJustificante(data.justificante, id);
    const now = new Date();
    const solicitud = {
      ID: id,
      FechaSolicitud: data.fechaSolicitud,
      Profesor: data.docente,
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
    solicitud.AvisoLimite = avisoLimite;

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
    throw new Error('No está autorizado para utilizar esta aplicación.');
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
  const user = getCurrentUser();

  if (!user.authorized || !user.isAdmin) {
    throw new Error('No tiene permisos de administración.');
  }

  const normalizedFilters = normalizeAdminFilters_(filtros);

  return readSheetObjects_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES)
    .filter(function(solicitud) {
      return matchesAdminFilters_(solicitud, normalizedFilters);
    })
    .map(mapSolicitudForAdminClient_)
    .sort(function(a, b) {
      return String(b.fechaCreacion || '').localeCompare(String(a.fechaCreacion || ''));
    });
}

/**
 * Evalua avisos no bloqueantes antes de registrar una solicitud.
 *
 * @param {Object} payload Datos recibidos desde el formulario.
 * @return {Object} Aviso a mostrar, si procede.
 */
function evaluarAvisoSolicitud(payload) {
  const user = getCurrentUser();

  if (!user.authorized) {
    throw new Error('No está autorizado para utilizar esta aplicación.');
  }

  const data = validateSolicitudPayload_(payload);
  return buildAvisoLibreDisposicion_(user.email, data);
}

/**
 * Cambia el estado de una solicitud.
 *
 * @param {string} id ID de solicitud.
 * @param {string} estado Nuevo estado.
 * @param {string=} razon Razon indicada por Administracion.
 * @return {Object} Solicitud actualizada.
 */
function cambiarEstadoSolicitud(id, estado, razon) {
  const user = getCurrentUser();

  if (!user.authorized || !user.isAdmin) {
    throw new Error('No tiene permisos de administración.');
  }

  const solicitudId = normalizeText(id);
  const normalizedEstado = normalizeText(estado).toUpperCase();
  const razonResolucion = normalizeText(razon);
  const allowedEstados = [
    ESTADOS_SOLICITUD.PENDIENTE,
    ESTADOS_SOLICITUD.ACEPTADA,
    ESTADOS_SOLICITUD.RECHAZADA,
    ESTADOS_SOLICITUD.INVALIDA
  ];

  if (allowedEstados.indexOf(normalizedEstado) === -1) {
    throw new Error('Estado no válido.');
  }

  if (normalizedEstado === ESTADOS_SOLICITUD.RECHAZADA && !razonResolucion) {
    throw new Error('Debe indicar la razon del rechazo.');
  }

  const rowIndex = findSolicitudRowIndex_(solicitudId);

  if (!rowIndex) {
    throw new Error('No se ha encontrado la solicitud.');
  }

  const sheet = getOrCreateSheet_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES);
  sheet
    .getRange(rowIndex, HEADERS.SOLICITUDES.indexOf('Estado') + 1)
    .setValue(normalizedEstado);
  sheet
    .getRange(rowIndex, HEADERS.SOLICITUDES.indexOf('RazonResolucion') + 1)
    .setValue(razonResolucion);

  const rowValues = sheet.getRange(rowIndex, 1, 1, HEADERS.SOLICITUDES.length).getValues()[0];
  const solicitud = rowToObject_(HEADERS.SOLICITUDES, rowValues);

  if (normalizedEstado === ESTADOS_SOLICITUD.ACEPTADA || normalizedEstado === ESTADOS_SOLICITUD.RECHAZADA) {
    try {
      notificarResolucionSolicitud(solicitud);
    } catch (error) {
      console.error('No se ha podido notificar la resolucion de la solicitud ' + solicitudId, error);
    }
  }

  return mapSolicitudForAdminClient_(solicitud);
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
    throw new Error('No está autorizado para utilizar esta aplicación.');
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
    throw new Error('No está autorizado para utilizar esta aplicación.');
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
  const docente = normalizeText(data.docente);
  const motivo = normalizeText(data.motivo);
  const observaciones = normalizeText(data.observaciones);
  const ausencias = Array.isArray(data.ausencias) ? data.ausencias : [];
  const motivos = listarMotivos();

  if (!docente) {
    throw new Error('Debe indicar el nombre completo del docente.');
  }

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
      throw new Error('Indique hora de salida y hora de vuelta, o marque día entero.');
    }
  });

  return {
    fechaSolicitud: new Date(),
    docente: docente,
    motivo: motivo,
    observaciones: observaciones,
    ausencias: normalizedAusencias,
    justificante: data.justificante || null
  };
}

/**
 * Construye el aviso de limite para libre disposicion por conciliacion.
 *
 * @param {string} email Email del profesor.
 * @param {Object} data Datos validados de la nueva solicitud.
 * @return {Object} Aviso no bloqueante.
 * @private
 */
function buildAvisoLibreDisposicion_(email, data) {
  if (data.motivo !== MOTIVOS_ESPECIALES.LIBRE_DISPOSICION_CONCILIACION) {
    return {
      warning: false
    };
  }

  const diasPrevios = countDiasLibreDisposicion_(email);
  const diasNuevaSolicitud = data.ausencias.length;
  const total = diasPrevios + diasNuevaSolicitud;
  const limite = LIMITES_MOTIVOS.LIBRE_DISPOSICION_CONCILIACION_DIAS;

  if (total <= limite) {
    return {
      warning: false,
      diasPrevios: diasPrevios,
      diasNuevaSolicitud: diasNuevaSolicitud,
      total: total,
      limite: limite
    };
  }

  return {
    warning: true,
    diasPrevios: diasPrevios,
    diasNuevaSolicitud: diasNuevaSolicitud,
    total: total,
    limite: limite,
    message: 'Este profesor ya tiene ' + diasPrevios + ' día(s) registrados de Libre disposición por conciliación. Con esta solicitud llegaría a ' + total + ' día(s), por encima del máximo de ' + limite + '. Es posible que la solicitud no sea correcta.'
  };
}

/**
 * Cuenta dias registrados para libre disposicion por conciliacion.
 *
 * Solo se tienen en cuenta solicitudes pendientes o aceptadas.
 *
 * @param {string} email Email del profesor.
 * @return {number} Numero de dias registrados.
 * @private
 */
function countDiasLibreDisposicion_(email) {
  const normalizedEmail = normalizeText(email).toLowerCase();
  const estadosComputables = [
    ESTADOS_SOLICITUD.PENDIENTE,
    ESTADOS_SOLICITUD.ACEPTADA
  ];

  return readSheetObjects_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES)
    .filter(function(solicitud) {
      return normalizeText(solicitud.Email).toLowerCase() === normalizedEmail &&
        normalizeText(solicitud.Motivo) === MOTIVOS_ESPECIALES.LIBRE_DISPOSICION_CONCILIACION &&
        estadosComputables.indexOf(normalizeText(solicitud.Estado)) !== -1;
    })
    .reduce(function(total, solicitud) {
      return total + extractAusenciasFromObservaciones_(solicitud.Observaciones).length;
    }, 0);
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
 * Convierte una solicitud de hoja a objeto para Administracion.
 *
 * @param {Object} solicitud Solicitud de hoja.
 * @return {Object} Solicitud para UI admin.
 * @private
 */
function mapSolicitudForAdminClient_(solicitud) {
  const base = mapSolicitudForClient_(solicitud);

  base.profesor = normalizeText(solicitud.Profesor);
  base.email = normalizeText(solicitud.Email);
  base.departamento = normalizeText(solicitud.Departamento);
  base.justificanteUrl = getDriveViewUrl(solicitud.JustificanteDriveId);
  base.horario = formatAusenciasForAdmin_(solicitud.Observaciones);
  base.razonResolucion = normalizeText(solicitud.RazonResolucion);

  return base;
}

/**
 * Formatea las ausencias para la tabla de administracion.
 *
 * @param {string} observaciones Observaciones de la solicitud.
 * @return {string} Resumen de fechas y horario.
 * @private
 */
function formatAusenciasForAdmin_(observaciones) {
  const ausencias = extractAusenciasFromObservaciones_(observaciones);

  if (!ausencias.length) {
    return '';
  }

  return ausencias.map(function(ausencia) {
    const fecha = formatDateForClient_(ausencia.fecha);
    const horario = ausencia.diaEntero ? 'Día entero' : ausencia.horaSalida + ' - ' + ausencia.horaVuelta;
    return fecha + ': ' + horario;
  }).join('\n');
}

/**
 * Normaliza filtros de administracion.
 *
 * @param {Object} filtros Filtros recibidos.
 * @return {Object} Filtros normalizados.
 * @private
 */
function normalizeAdminFilters_(filtros) {
  const data = filtros || {};

  return {
    mes: normalizeText(data.mes),
    profesor: normalizeText(data.profesor).toLowerCase(),
    tipo: normalizeText(data.tipo).toLowerCase()
  };
}

/**
 * Comprueba si una solicitud cumple filtros de administracion.
 *
 * @param {Object} solicitud Solicitud.
 * @param {Object} filtros Filtros normalizados.
 * @return {boolean} True si cumple.
 * @private
 */
function matchesAdminFilters_(solicitud, filtros) {
  if (filtros.mes && formatMonthFilter_(solicitud.FechaSolicitud) !== filtros.mes) {
    return false;
  }

  if (filtros.profesor) {
    const haystack = [
      solicitud.Profesor,
      solicitud.Email
    ].map(function(value) {
      return normalizeText(value).toLowerCase();
    }).join(' ');

    if (haystack.indexOf(filtros.profesor) === -1) {
      return false;
    }
  }

  if (filtros.tipo && normalizeText(solicitud.Motivo).toLowerCase().indexOf(filtros.tipo) === -1) {
    return false;
  }

  return true;
}

/**
 * Formatea una fecha como YYYY-MM para filtro mensual.
 *
 * @param {*} value Fecha.
 * @return {string} Mes normalizado.
 * @private
 */
function formatMonthFilter_(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return '';
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
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
