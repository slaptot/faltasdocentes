/**
 * Modulo Solicitudes.
 *
 * Pendiente de implementacion completa tras confirmacion del modulo Formulario.
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
  notImplemented('Formulario');
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
