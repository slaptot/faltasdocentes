/**
 * Modulo Drive.
 *
 * Pendiente de implementacion tras confirmacion. Responsabilidades:
 * - Resolver carpetas configuradas.
 * - Guardar justificantes PDF/JPG/PNG.
 * - Guardar documentos y PDFs generados.
 */

/**
 * Guarda un justificante subido desde el formulario.
 *
 * @param {Object} filePayload Datos del archivo.
 * @param {string} solicitudId ID de solicitud.
 * @return {string|null} ID del archivo en Drive.
 */
function guardarJustificante(filePayload, solicitudId) {
  notImplemented('Formulario');
}

/**
 * Devuelve una URL de descarga para un archivo de Drive.
 *
 * @param {string} fileId ID de archivo.
 * @return {string} URL de descarga.
 */
function getDriveDownloadUrl(fileId) {
  notImplemented('Drive');
}
