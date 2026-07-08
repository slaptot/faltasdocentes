/**
 * Modulo Autenticacion.
 *
 * Responsabilidades:
 * - Obtener el correo con Session.getActiveUser().getEmail().
 * - Validar que el correo pertenece al dominio corporativo.
 * - Usar Configuracion/CorreosAdmin para identificar administradores.
 * - Exponer el perfil autorizado al cliente.
 * - Ocultar Administracion si el Rol no es ADMIN.
 */

/**
 * Devuelve el usuario autenticado y autorizado.
 *
 * @return {Object} Perfil del usuario.
 */
function getCurrentUser() {
  try {
    const email = getActiveUserEmail_();

    if (!isAllowedDomain_(email)) {
      return buildUnauthorizedUser_(email);
    }

    const isAdmin = isAdminEmail_(email);

    return {
      authorized: true,
      email: email,
      nombre: buildNameFromEmail_(email),
      departamento: '',
      rol: isAdmin ? ROLES.ADMIN : ROLES.PROFESOR,
      isAdmin: isAdmin
    };
  } catch (error) {
    console.error('Error obteniendo usuario actual', error);
    return {
      authorized: false,
      email: '',
      message: 'No está autorizado para utilizar esta aplicación.',
      error: 'No se ha podido comprobar el usuario.'
    };
  }
}

/**
 * Indica si el usuario actual tiene rol ADMIN.
 *
 * @return {boolean} True si es administrador.
 */
function isCurrentUserAdmin() {
  const user = getCurrentUser();
  return Boolean(user.authorized && user.isAdmin);
}

/**
 * Devuelve el estado de autenticacion consumido por el frontend.
 *
 * @return {Object} Estado de sesion.
 */
function getAuthState() {
  return getCurrentUser();
}

/**
 * Devuelve informacion de diagnostico sobre la identidad detectada.
 *
 * Ejecutar desde la Web App para comprobar que datos esta entregando Google en
 * esa sesion concreta.
 *
 * @return {Object} Diagnostico de identidad.
 */
function diagnosticarLoginActual() {
  const activeEmail = normalizeText(Session.getActiveUser().getEmail()).toLowerCase();
  const effectiveEmail = normalizeText(Session.getEffectiveUser().getEmail()).toLowerCase();

  return {
    activeUserEmail: activeEmail,
    effectiveUserEmail: effectiveEmail,
    temporaryActiveUserKey: Session.getTemporaryActiveUserKey(),
    fallbackName: buildNameFromEmail_(activeEmail),
    currentUser: getCurrentUser()
  };
}

/**
 * Obtiene el correo activo desde Google Workspace.
 *
 * @return {string} Correo normalizado en minusculas.
 * @private
 */
function getActiveUserEmail_() {
  const email = normalizeText(Session.getActiveUser().getEmail()).toLowerCase();

  if (!email) {
    throw new Error('Session.getActiveUser().getEmail() no ha devuelto correo.');
  }

  return email;
}

/**
 * Construye una respuesta segura para usuarios sin permiso.
 *
 * @param {string} email Correo detectado.
 * @return {Object} Estado no autorizado.
 * @private
 */
function buildUnauthorizedUser_(email) {
  return {
    authorized: false,
    email: email || '',
    message: 'No está autorizado para utilizar esta aplicación.'
  };
}

/**
 * Comprueba que el correo pertenece al dominio corporativo permitido.
 *
 * @param {string} email Correo del usuario.
 * @return {boolean} True si pertenece al dominio configurado.
 * @private
 */
function isAllowedDomain_(email) {
  const domain = normalizeText(APP.ALLOWED_EMAIL_DOMAIN).toLowerCase();

  if (!domain) {
    return true;
  }

  return normalizeText(email).toLowerCase().endsWith('@' + domain);
}

/**
 * Crea un nombre legible a partir del correo cuando no hay ficha interna.
 *
 * @param {string} email Correo del usuario.
 * @return {string} Nombre aproximado.
 * @private
 */
function buildNameFromEmail_(email) {
  const localPart = normalizeText(email).split('@')[0];

  if (!localPart) {
    return email;
  }

  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, function(letter) {
      return letter.toUpperCase();
    });
}

/**
 * Comprueba si el correo esta incluido en Configuracion/CorreosAdmin.
 *
 * Admite varios correos separados por coma.
 *
 * @param {string} email Correo del usuario.
 * @return {boolean} True si tiene acceso a Administracion.
 * @private
 */
function isAdminEmail_(email) {
  const config = getConfiguracion();
  const adminEmails = normalizeText(config[CONFIG_KEYS.CORREOS_ADMIN])
    .split(',')
    .map(function(adminEmail) {
      return normalizeText(adminEmail).toLowerCase();
    })
    .filter(Boolean);

  return adminEmails.indexOf(normalizeText(email).toLowerCase()) !== -1;
}
