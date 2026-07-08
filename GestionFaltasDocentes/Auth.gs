/**
 * Modulo Autenticacion.
 *
 * Responsabilidades:
 * - Obtener el correo con Session.getActiveUser().getEmail().
 * - Validar que el correo pertenece al dominio corporativo.
 * - Usar Configuracion/CorreosAdmin para identificar administradores.
 * - Usar Configuracion/GrupoDocentes para identificar docentes autorizados.
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

    if (!isAdmin && !isTeacherGroupMember_(email)) {
      return buildUnauthorizedUser_(email);
    }

    const profesor = findProfesorByEmail(email);

    return {
      authorized: true,
      email: email,
      nombre: profesor && profesor.nombre ? profesor.nombre : buildNameFromEmail_(email),
      departamento: profesor ? profesor.departamento : '',
      rol: isAdmin ? ROLES.ADMIN : (profesor ? profesor.rol : ROLES.PROFESOR),
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
  const isAdmin = isAdminEmail_(activeEmail);

  return {
    activeUserEmail: activeEmail,
    effectiveUserEmail: effectiveEmail,
    temporaryActiveUserKey: Session.getTemporaryActiveUserKey(),
    isAdmin: isAdmin,
    isTeacherGroupMember: isAdmin ? true : isTeacherGroupMember_(activeEmail),
    fallbackName: buildNameFromEmail_(activeEmail),
    currentUser: getCurrentUser()
  };
}

/**
 * Fuerza la autorizacion del permiso de Google Groups.
 *
 * Ejecutar manualmente desde el editor de Apps Script con la cuenta
 * propietaria/desplegadora cuando Google no solicita el permiso al usar la
 * Web App. La llamada a GroupsApp es intencionada para activar el consentimiento.
 *
 * @return {Object} Resultado de la comprobacion del grupo docente.
 */
function autorizarPermisoGrupos() {
  const config = getConfiguracion();
  const groupEmail = normalizeText(config[CONFIG_KEYS.GRUPO_DOCENTES] || 'claustro@chabacier.es').toLowerCase();
  const email = getActiveUserEmail_();
  const group = GroupsApp.getGroupByEmail(groupEmail);

  return {
    groupEmail: groupEmail,
    activeUserEmail: email,
    hasActiveUser: group.hasUser(email)
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

/**
 * Comprueba si el correo pertenece al grupo docente configurado.
 *
 * @param {string} email Correo del usuario.
 * @return {boolean} True si pertenece al grupo.
 * @private
 */
function isTeacherGroupMember_(email) {
  const config = getConfiguracion();
  const groupEmail = normalizeText(config[CONFIG_KEYS.GRUPO_DOCENTES] || 'claustro@chabacier.es').toLowerCase();

  if (!groupEmail) {
    return true;
  }

  try {
    return GroupsApp.getGroupByEmail(groupEmail).hasUser(normalizeText(email).toLowerCase());
  } catch (error) {
    console.error('No se ha podido comprobar pertenencia al grupo docente ' + groupEmail, error);
    return false;
  }
}
