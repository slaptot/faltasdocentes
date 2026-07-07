/**
 * Modulo Base de datos.
 *
 * Responsabilidades:
 * - Abrir el Google Sheets principal.
 * - Crear hojas obligatorias si no existen.
 * - Mantener cabeceras oficiales.
 * - Sembrar claves de configuracion y motivos oficiales.
 * - Proporcionar utilidades comunes de lectura.
 */

/**
 * Inicializa la base de datos completa de la aplicacion.
 *
 * Puede ejecutarse manualmente desde el editor de Apps Script. Si se facilita
 * un profesor administrador, lo crea o actualiza como ADMIN activo.
 *
 * @param {Object=} adminProfesor Datos opcionales del primer administrador.
 * @return {Object} Resultado de inicializacion.
 */
function inicializarBaseDatos(adminProfesor) {
  try {
    const spreadsheet = getDatabase_();

    getOrCreateSheet_(SHEETS.PROFESORES, HEADERS.PROFESORES);
    getOrCreateSheet_(SHEETS.SOLICITUDES, HEADERS.SOLICITUDES);
    seedMotivos_();
    seedConfiguracion_();

    if (adminProfesor && adminProfesor.email) {
      upsertProfesor({
        email: adminProfesor.email,
        nombre: adminProfesor.nombre,
        departamento: adminProfesor.departamento,
        rol: ROLES.ADMIN,
        activo: true
      });
    }

    return {
      ok: true,
      spreadsheetId: spreadsheet.getId(),
      sheets: Object.keys(SHEETS).map(function(key) {
        return SHEETS[key];
      })
    };
  } catch (error) {
    console.error('Error inicializando base de datos', error);
    throw error;
  }
}

/**
 * Inicializa la base de datos y crea el primer administrador del centro.
 *
 * Ejecutar manualmente una vez desde el editor de Apps Script tras vincular el
 * proyecto al Spreadsheet configurado.
 *
 * @return {Object} Resultado de inicializacion.
 */
function inicializarBaseDatosConAdminInicial() {
  return inicializarBaseDatos({
    email: 'amunozf@chabacier.es',
    nombre: 'Alberto Muñoz Fuertes',
    departamento: 'Jefatura'
  });
}

/**
 * Abre el Spreadsheet principal de la aplicacion.
 *
 * @return {Spreadsheet} Spreadsheet configurado.
 * @private
 */
function getDatabase_() {
  return SpreadsheetApp.openById(APP.SPREADSHEET_ID);
}

/**
 * Devuelve una hoja por nombre, creandola si no existe y asegurando cabeceras.
 *
 * @param {string} sheetName Nombre de la hoja.
 * @param {string[]} headers Cabeceras esperadas.
 * @return {Sheet} Hoja preparada.
 * @private
 */
function getOrCreateSheet_(sheetName, headers) {
  const spreadsheet = getDatabase_();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  ensureHeaders_(sheet, headers);
  sheet.setFrozenRows(1);
  return sheet;
}

/**
 * Asegura que una hoja tenga las cabeceras esperadas.
 *
 * @param {Sheet} sheet Hoja objetivo.
 * @param {string[]} expectedHeaders Cabeceras esperadas.
 * @private
 */
function ensureHeaders_(sheet, expectedHeaders) {
  const currentHeaders = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getValues()[0]
    .map(normalizeText);

  const hasExpectedHeaders = expectedHeaders.every(function(header, index) {
    return currentHeaders[index] === header;
  });

  if (!hasExpectedHeaders) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
  }
}

/**
 * Lee filas de una hoja como objetos usando sus cabeceras.
 *
 * @param {string} sheetName Nombre de hoja.
 * @param {string[]} headers Cabeceras esperadas.
 * @return {Object[]} Filas convertidas en objetos.
 * @private
 */
function readSheetObjects_(sheetName, headers) {
  const sheet = getOrCreateSheet_(sheetName, headers);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .map(function(row) {
      return rowToObject_(headers, row);
    });
}

/**
 * Convierte una fila de valores en objeto.
 *
 * @param {string[]} headers Cabeceras.
 * @param {Array} row Valores de fila.
 * @return {Object} Objeto con claves de cabecera.
 * @private
 */
function rowToObject_(headers, row) {
  return headers.reduce(function(result, header, index) {
    result[header] = row[index];
    return result;
  }, {});
}

/**
 * Siembra la hoja Motivos con las causas oficiales cuando esta vacia.
 *
 * @return {number} Numero de motivos disponibles.
 * @private
 */
function seedMotivos_() {
  const sheet = getOrCreateSheet_(SHEETS.MOTIVOS, HEADERS.MOTIVOS);

  if (sheet.getLastRow() < 2) {
    const values = OFFICIAL_MOTIVOS.map(function(motivo) {
      return [motivo];
    });
    sheet.getRange(2, 1, values.length, 1).setValues(values);
  }

  return sheet.getLastRow() - 1;
}

/**
 * Siembra la hoja Configuracion con las claves obligatorias si faltan.
 *
 * @return {Object} Configuracion actual.
 * @private
 */
function seedConfiguracion_() {
  const sheet = getOrCreateSheet_(SHEETS.CONFIGURACION, HEADERS.CONFIGURACION);
  const existingRows = readSheetObjects_(SHEETS.CONFIGURACION, HEADERS.CONFIGURACION);
  const existingKeys = existingRows.map(function(row) {
    return normalizeText(row.Valor);
  });
  const rowsToAppend = DEFAULT_CONFIG_ROWS.filter(function(row) {
    return existingKeys.indexOf(row[0]) === -1;
  });

  if (rowsToAppend.length) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, HEADERS.CONFIGURACION.length)
      .setValues(rowsToAppend);
  }

  return getConfiguracion();
}

/**
 * Devuelve la configuracion como objeto clave-valor.
 *
 * @return {Object} Configuracion actual.
 */
function getConfiguracion() {
  const rows = readSheetObjects_(SHEETS.CONFIGURACION, HEADERS.CONFIGURACION);

  return rows.reduce(function(config, row) {
    const key = normalizeText(row.Valor);

    if (key) {
      config[key] = row.Inicio || '';
    }

    return config;
  }, {});
}

/**
 * Devuelve los motivos oficiales desde la hoja Motivos.
 *
 * @return {string[]} Motivos disponibles.
 */
function listarMotivos() {
  return readSheetObjects_(SHEETS.MOTIVOS, HEADERS.MOTIVOS)
    .map(function(row) {
      return normalizeText(row.Motivo);
    })
    .filter(Boolean);
}

/**
 * Calcula el prefijo anual para IDs de solicitud.
 *
 * Usa CursoEscolar si existe; si no, usa el ano natural actual.
 *
 * @return {string} Ano de cuatro digitos.
 */
function getSolicitudYearPrefix() {
  const cursoEscolar = normalizeText(getConfiguracion()[CONFIG_KEYS.CURSO_ESCOLAR]);
  const match = cursoEscolar.match(/\d{4}/g);

  if (match && match.length) {
    return match[0];
  }

  return String(new Date().getFullYear());
}
