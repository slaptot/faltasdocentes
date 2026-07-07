/**
 * Modulo Drive.
 *
 * Responsabilidades:
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
  if (!filePayload || !filePayload.data) {
    return null;
  }

  const mimeType = normalizeText(filePayload.mimeType);
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];

  if (allowedMimeTypes.indexOf(mimeType) === -1) {
    throw new Error('El justificante debe ser PDF, JPG o PNG.');
  }

  const folder = getConfiguredFolder_(CONFIG_KEYS.CARPETA_JUSTIFICANTES);
  const extension = getExtensionFromMimeType_(mimeType);
  const safeName = buildSafeFileName_(solicitudId, filePayload.name, extension);
  const bytes = Utilities.base64Decode(filePayload.data);
  const blob = Utilities.newBlob(bytes, mimeType, safeName);
  const file = folder.createFile(blob);

  return file.getId();
}

/**
 * Devuelve una URL de visualizacion para un archivo de Drive.
 *
 * @param {string} fileId ID de archivo.
 * @return {string} URL de visualizacion.
 */
function getDriveDownloadUrl(fileId) {
  return getDriveViewUrl(fileId);
}

/**
 * Devuelve una URL de visualizacion para un archivo de Drive.
 *
 * @param {string} fileId ID de archivo.
 * @return {string} URL de visualizacion.
 */
function getDriveViewUrl(fileId) {
  const id = normalizeText(fileId);

  if (!id) {
    return '';
  }

  return 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view?usp=drivesdk';
}

/**
 * Obtiene una carpeta de Drive desde la hoja Configuracion.
 *
 * @param {string} configKey Clave de configuracion.
 * @return {Folder} Carpeta de Drive.
 * @private
 */
function getConfiguredFolder_(configKey) {
  const folderId = normalizeText(getConfiguracion()[configKey]);

  if (!folderId) {
    throw new Error('Falta configurar ' + configKey + ' en la hoja Configuracion.');
  }

  return DriveApp.getFolderById(folderId);
}

/**
 * Devuelve una extension segura para un MIME soportado.
 *
 * @param {string} mimeType Tipo MIME.
 * @return {string} Extension de archivo.
 * @private
 */
function getExtensionFromMimeType_(mimeType) {
  const extensions = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png'
  };

  return extensions[mimeType] || 'bin';
}

/**
 * Construye un nombre de archivo estable para Drive.
 *
 * @param {string} solicitudId ID de solicitud.
 * @param {string} originalName Nombre original.
 * @param {string} extension Extension obligatoria.
 * @return {string} Nombre seguro.
 * @private
 */
function buildSafeFileName_(solicitudId, originalName, extension) {
  const rawName = normalizeText(originalName).replace(/\.[^.]+$/, '');
  const baseName = rawName || 'justificante';
  const safeBaseName = baseName.replace(/[^\w.-]+/g, '_');

  return solicitudId + '_' + safeBaseName + '.' + extension;
}

/**
 * Guarda un blob PDF en la carpeta configurada.
 *
 * @param {Blob} blob PDF generado.
 * @param {string} solicitudId ID de solicitud.
 * @return {string} ID del archivo PDF.
 */
function guardarPdfSolicitud(blob, solicitudId) {
  const folder = getConfiguredFolder_(CONFIG_KEYS.CARPETA_PDF);
  const file = folder.createFile(blob.setName('Solicitud_' + solicitudId + '.pdf'));

  applyPdfSharing_(file);

  return file.getId();
}

/**
 * Aplica permisos de lectura al PDF generado sin bloquear el tramite si la
 * politica del dominio no permite compartir por enlace.
 *
 * @param {File} file Archivo PDF.
 * @private
 */
function applyPdfSharing_(file) {
  try {
    file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    console.warn('No se han podido aplicar permisos de dominio al PDF', error);
  }
}
