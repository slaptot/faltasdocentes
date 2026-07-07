/**
 * Modulo Solicitudes.
 *
 * Pendiente de implementacion tras confirmacion. Responsabilidades:
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
