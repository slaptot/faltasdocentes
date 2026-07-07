/**
 * Modulo Autenticacion.
 *
 * Responsabilidades:
 * - Obtener el correo con Session.getActiveUser().getEmail().
 * - Validar el correo contra la hoja Profesores.
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

    const profesor = findProfesorByEmail(email);

    if (!profesor) {
      return buildUnauthorizedUser_(email);
    }

    return {
      authorized: true,
      email: profesor.email,
      nombre: profesor.nombre,
      departamento: profesor.departamento,
      rol: profesor.rol,
      isAdmin: profesor.rol === ROLES.ADMIN
    };
  } catch (error) {
    console.error('Error obteniendo usuario actual', error);
    return {
      authorized: false,
      email: '',
      message: 'No esta autorizado para utilizar esta aplicacion.',
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
    message: 'No esta autorizado para utilizar esta aplicacion.'
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
