/**
 * Utilidades transversales.
 *
 * Las funciones definitivas se implementaran modulo a modulo para mantener
 * cada entrega cerrada y verificable.
 */

/**
 * Incluye un archivo HTML parcial dentro de una plantilla de HTML Service.
 *
 * @param {string} filename Nombre del archivo sin extension.
 * @return {string} Contenido HTML evaluado.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Devuelve un error controlado para modulos no implementados todavia.
 *
 * @param {string} moduleName Nombre del modulo pendiente.
 * @throws {Error} Error explicito de modulo pendiente.
 */
function notImplemented(moduleName) {
  throw new Error('Modulo pendiente de implementacion: ' + moduleName);
}

/**
 * Normaliza cadenas sencillas para comparaciones.
 *
 * @param {string} value Valor de entrada.
 * @return {string} Valor limpio.
 */
function normalizeText(value) {
  return String(value || '').trim();
}
