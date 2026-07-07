/**
 * Modulo Mail.
 *
 * Responsabilidades:
 * - Enviar notificación a Dirección.
 * - Enviar copia de confirmación al docente.
 * - Incluir enlaces a PDF cuando proceda.
 */

/**
 * Notifica una nueva solicitud a Dirección y al docente.
 *
 * @param {Object} solicitud Solicitud creada.
 */
function notificarNuevaSolicitud(solicitud) {
  const config = getConfiguracion();
  const correoDireccion = normalizeText(config[CONFIG_KEYS.CORREO_DIRECCION]);
  const correoProfesor = normalizeText(solicitud.Email);

  if (!correoDireccion) {
    throw new Error('Falta configurar CorreoDireccion en la hoja Configuración.');
  }

  if (!correoProfesor) {
    throw new Error('La solicitud no tiene email de docente.');
  }

  const pdfUrl = getDriveDownloadUrl(solicitud.PDFDriveId);
  const subject = 'Nueva solicitud de falta docente ' + solicitud.ID;
  const direccionLines = [
    'Se ha registrado una nueva solicitud de falta docente.',
    '',
    'ID: ' + solicitud.ID,
    'Docente: ' + solicitud.Profesor,
    'Motivo: ' + solicitud.Motivo,
    'Estado: ' + solicitud.Estado,
    '',
    'PDF: ' + pdfUrl
  ];

  if (solicitud.AvisoLimite && solicitud.AvisoLimite.warning) {
    direccionLines.push(
      '',
      'AVISO:',
      solicitud.AvisoLimite.message
    );
  }

  const direccionBody = direccionLines.join('\n');
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
 * Notifica al docente la resolución administrativa de su solicitud.
 *
 * @param {Object} solicitud Solicitud actualizada.
 */
function notificarResolucionSolicitud(solicitud) {
  const correoProfesor = normalizeText(solicitud.Email);

  if (!correoProfesor) {
    throw new Error('La solicitud no tiene email de docente.');
  }

  const estado = normalizeText(solicitud.Estado);
  const razon = normalizeText(solicitud.RazonResolucion);
  const pdfUrl = getDriveViewUrl(solicitud.PDFDriveId);
  const subject = 'Resolución de solicitud ' + solicitud.ID + ': ' + estado;
  const body = [
    'Se ha actualizado el estado de su solicitud de falta docente.',
    '',
    'ID: ' + solicitud.ID,
    'Estado: ' + estado,
    'Motivo: ' + solicitud.Motivo,
    'Razón: ' + (razon || '-'),
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
 * Envía un correo de prueba a Dirección y al usuario actual.
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
    throw new Error('Falta configurar CorreoDireccion en la hoja Configuración.');
  }

  if (!user.authorized || !user.email) {
    throw new Error('No hay usuario autorizado para enviar la prueba.');
  }

  const subject = 'Prueba de correo - ' + APP.NAME;
  const body = [
    'Prueba de envío correcta.',
    '',
    'Aplicación: ' + APP.NAME,
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
