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
      nombre: getGoogleDirectoryProfile_(email).fullName || buildNameFromEmail_(email),
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
  const directoryProfile = getGoogleDirectoryProfile_(activeEmail);

  return {
    activeUserEmail: activeEmail,
    effectiveUserEmail: effectiveEmail,
    temporaryActiveUserKey: Session.getTemporaryActiveUserKey(),
    directoryAvailable: directoryProfile.available,
    directoryFullName: directoryProfile.fullName,
    directoryPrimaryEmail: directoryProfile.primaryEmail,
    directoryError: directoryProfile.error,
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
 * Obtiene el nombre completo del usuario desde Google Workspace Directory.
 *
 * Requiere el servicio avanzado AdminDirectory. Si no esta disponible o el
 * desplegador no tiene permisos de lectura del directorio, devuelve cadena
 * vacia para mantener la aplicacion operativa.
 *
 * @param {string} email Correo del usuario.
 * @return {string} Nombre completo o cadena vacia.
 * @private
 */
function getGoogleDirectoryFullName_(email) {
  return getGoogleDirectoryProfile_(email).fullName;
}

/**
 * Obtiene el perfil basico del usuario desde Google Workspace Directory.
 *
 * @param {string} email Correo del usuario.
 * @return {Object} Perfil de directorio o error controlado.
 * @private
 */
function getGoogleDirectoryProfile_(email) {
  if (typeof AdminDirectory === 'undefined') {
    return {
      available: false,
      fullName: '',
      primaryEmail: '',
      error: 'Servicio avanzado AdminDirectory no disponible.'
    };
  }

  try {
    const user = AdminDirectory.Users.get(email, {
      projection: 'basic'
    });

    return {
      available: true,
      fullName: normalizeText(user && user.name && user.name.fullName),
      primaryEmail: normalizeText(user && user.primaryEmail).toLowerCase(),
      error: ''
    };
  } catch (error) {
    console.warn('No se ha podido obtener el nombre completo desde Google Directory', error);
    return {
      available: true,
      fullName: '',
      primaryEmail: '',
      error: error && error.message ? error.message : String(error)
    };
  }
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
