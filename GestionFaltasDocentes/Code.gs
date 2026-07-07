/**
 * Punto de entrada Web App.
 *
 * Este archivo renderiza HTML Service y expone APIs ligeras de aplicacion.
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
    modules: {
      autenticacion: 'COMPLETO',
      baseDatos: 'COMPLETO',
      formulario: 'COMPLETO',
      pdf: 'PENDIENTE',
      administracion: 'PENDIENTE'
    }
  };
}
