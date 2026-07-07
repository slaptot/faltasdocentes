/**
 * Modulo Mail.
 *
 * Responsabilidades:
 * - Enviar notificacion a Direccion.
 * - Enviar copia de confirmacion al profesor.
 * - Incluir enlaces a PDF cuando proceda.
 */

/**
 * Notifica una nueva solicitud a Direccion y al profesor.
 *
 * @param {Object} solicitud Solicitud creada.
 */
function notificarNuevaSolicitud(solicitud) {
  const config = getConfiguracion();
  const correoDireccion = normalizeText(config[CONFIG_KEYS.CORREO_DIRECCION]);

  if (!correoDireccion) {
    throw new Error('Falta configurar CorreoDireccion en la hoja Configuracion.');
  }

  const pdfUrl = getDriveDownloadUrl(solicitud.PDFDriveId);
  const subject = 'Nueva solicitud de falta docente ' + solicitud.ID;
  const direccionBody = [
    'Se ha registrado una nueva solicitud de falta docente.',
    '',
    'ID: ' + solicitud.ID,
    'Profesor: ' + solicitud.Profesor,
    'Departamento: ' + solicitud.Departamento,
    'Motivo: ' + solicitud.Motivo,
    'Estado: ' + solicitud.Estado,
    '',
    'PDF: ' + pdfUrl
  ].join('\n');
  const profesorBody = [
    'Su solicitud de falta docente se ha registrado correctamente.',
    '',
    'ID: ' + solicitud.ID,
    'Motivo: ' + solicitud.Motivo,
    'Estado: ' + solicitud.Estado,
    '',
    'PDF: ' + pdfUrl
  ].join('\n');

  GmailApp.sendEmail(correoDireccion, subject, direccionBody);
  GmailApp.sendEmail(solicitud.Email, 'Solicitud registrada ' + solicitud.ID, profesorBody);
}
