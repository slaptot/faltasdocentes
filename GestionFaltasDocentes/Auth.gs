/**
 * Modulo Autenticacion.
 *
 * Pendiente de implementacion tras confirmacion. Responsabilidades:
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
  notImplemented('Autenticacion');
}

/**
 * Indica si el usuario actual tiene rol ADMIN.
 *
 * @return {boolean} True si es administrador.
 */
function isCurrentUserAdmin() {
  notImplemented('Autenticacion');
}
