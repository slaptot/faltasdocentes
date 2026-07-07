/**
 * Punto de entrada Web App.
 *
 * En esta fase solo se define la estructura del proyecto. El control real de
 * autenticacion se implementara en el modulo Autenticacion.
 */

/**
 * Renderiza la pagina principal de la aplicacion.
 *
 * @param {Object} e Parametros de la peticion.
 * @return {HtmlOutput} Salida HTML.
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  template.appName = APP.NAME;
  template.centerName = APP.CENTER;
  template.version = APP.VERSION;

  return template
    .evaluate()
    .setTitle(APP.NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * API temporal de salud para confirmar que el despliegue carga.
 *
 * @return {Object} Estado basico de la aplicacion.
 */
function getAppStatus() {
  return {
    name: APP.NAME,
    center: APP.CENTER,
    version: APP.VERSION,
    modules: ['Autenticacion', 'Base de datos', 'Formulario', 'PDF', 'Administracion']
  };
}
