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
  const correoProfesor = normalizeText(solicitud.Email);

  if (!correoDireccion) {
    throw new Error('Falta configurar CorreoDireccion en la hoja Configuracion.');
  }

  if (!correoProfesor) {
    throw new Error('La solicitud no tiene email de profesor.');
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

  MailApp.sendEmail({
    to: correoDireccion,
    subject: subject,
    body: direccionBody,
    name: APP.NAME
  });
  MailApp.sendEmail({
    to: correoProfesor,
    subject: 'Solicitud registrada ' + solicitud.ID,
    body: profesorBody,
    name: APP.NAME
  });
}

/**
 * Notifica al profesor la resolucion administrativa de su solicitud.
 *
 * @param {Object} solicitud Solicitud actualizada.
 */
function notificarResolucionSolicitud(solicitud) {
  const correoProfesor = normalizeText(solicitud.Email);

  if (!correoProfesor) {
    throw new Error('La solicitud no tiene email de profesor.');
  }

  const estado = normalizeText(solicitud.Estado);
  const pdfUrl = getDriveViewUrl(solicitud.PDFDriveId);
  const subject = 'Resolucion de solicitud ' + solicitud.ID + ': ' + estado;
  const body = [
    'Se ha actualizado el estado de su solicitud de falta docente.',
    '',
    'ID: ' + solicitud.ID,
    'Estado: ' + estado,
    'Motivo: ' + solicitud.Motivo,
    '',
    'PDF: ' + pdfUrl
  ].join('\n');

  MailApp.sendEmail({
    to: correoProfesor,
    subject: subject,
    body: body,
    name: APP.NAME
  });
}

/**
 * Envia un correo de prueba a Direccion y al usuario actual.
 *
 * Ejecutar manualmente desde Apps Script para verificar permisos y cuota de
 * envio antes de probar el formulario completo.
 *
 * @return {Object} Resultado de la prueba.
 */
function probarEnvioCorreo() {
  const config = getConfiguracion();
  const correoDireccion = normalizeText(config[CONFIG_KEYS.CORREO_DIRECCION]);
  const user = getCurrentUser();

  if (!correoDireccion) {
    throw new Error('Falta configurar CorreoDireccion en la hoja Configuracion.');
  }

  if (!user.authorized || !user.email) {
    throw new Error('No hay usuario autorizado para enviar la prueba.');
  }

  const subject = 'Prueba de correo - ' + APP.NAME;
  const body = [
    'Prueba de envio correcta.',
    '',
    'Aplicacion: ' + APP.NAME,
    'Usuario: ' + user.nombre + ' <' + user.email + '>',
    'Fecha: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss')
  ].join('\n');

  MailApp.sendEmail({
    to: correoDireccion,
    cc: user.email,
    subject: subject,
    body: body,
    name: APP.NAME
  });

  return {
    ok: true,
    to: correoDireccion,
    cc: user.email,
    remainingDailyQuota: MailApp.getRemainingDailyQuota()
  };
}
