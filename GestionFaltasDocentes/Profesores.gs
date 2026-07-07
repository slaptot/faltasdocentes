/**
 * Modulo Profesores.
 *
 * Implementacion minima necesaria para Autenticacion. La creacion completa de
 * todas las hojas se abordara en el modulo Base de datos.
 *
 * Responsabilidades cubiertas aqui:
 * - Crear la hoja Profesores si no existe, con sus cabeceras oficiales.
 * - Buscar profesores por email.
 * - Mantener columnas Email, Nombre, Departamento, Rol y Activo.
 */

/**
 * Busca un profesor activo por correo electronico.
 *
 * @param {string} email Correo del profesor.
 * @return {Object|null} Profesor encontrado o null.
 */
function findProfesorByEmail(email) {
  try {
    const normalizedEmail = normalizeText(email).toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    const profesores = readProfesores_();
    return profesores.find(function(profesor) {
      return profesor.email === normalizedEmail && profesor.activo;
    }) || null;
  } catch (error) {
    console.error('Error buscando profesor por email', error);
    throw error;
  }
}

/**
 * Devuelve profesores activos para filtros administrativos.
 *
 * @return {Object[]} Lista de profesores.
 */
function listProfesoresActivos() {
  return readProfesores_().filter(function(profesor) {
    return profesor.activo;
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
 * Devuelve la hoja Profesores, creandola con cabeceras si no existe.
 *
 * @return {Sheet} Hoja Profesores.
 * @private
 */
function getProfesoresSheet_() {
  const spreadsheet = getDatabase_();
  let sheet = spreadsheet.getSheetByName(SHEETS.PROFESORES);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEETS.PROFESORES);
    sheet.getRange(1, 1, 1, HEADERS.PROFESORES.length).setValues([HEADERS.PROFESORES]);
    sheet.setFrozenRows(1);
  }

  ensureProfesoresHeaders_(sheet);
  return sheet;
}

/**
 * Asegura que la hoja Profesores tenga las cabeceras esperadas.
 *
 * @param {Sheet} sheet Hoja Profesores.
 * @private
 */
function ensureProfesoresHeaders_(sheet) {
  const expectedHeaders = HEADERS.PROFESORES;
  const currentHeaders = sheet
    .getRange(1, 1, 1, expectedHeaders.length)
    .getValues()[0]
    .map(normalizeText);

  const hasExpectedHeaders = expectedHeaders.every(function(header, index) {
    return currentHeaders[index] === header;
  });

  if (!hasExpectedHeaders) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
  }
}

/**
 * Lee profesores desde Google Sheets como objetos normalizados.
 *
 * @return {Object[]} Profesores normalizados.
 * @private
 */
function readProfesores_() {
  const sheet = getProfesoresSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.PROFESORES.length).getValues();

  return values
    .map(function(row) {
      return {
        email: normalizeText(row[0]).toLowerCase(),
        nombre: normalizeText(row[1]),
        departamento: normalizeText(row[2]),
        rol: normalizeRole_(row[3]),
        activo: parseActiveValue_(row[4])
      };
    })
    .filter(function(profesor) {
      return Boolean(profesor.email);
    });
}

/**
 * Normaliza el rol del profesor.
 *
 * @param {string} value Valor de rol.
 * @return {string} Rol normalizado.
 * @private
 */
function normalizeRole_(value) {
  const role = normalizeText(value).toUpperCase();
  return role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.PROFESOR;
}

/**
 * Interpreta valores habituales de la columna Activo.
 *
 * @param {*} value Valor de celda.
 * @return {boolean} True si el profesor esta activo.
 * @private
 */
function parseActiveValue_(value) {
  if (value === true) {
    return true;
  }

  const text = normalizeText(value).toLowerCase();
  return ['true', 'si', 's\u00ed', 's', '1', 'activo', 'x'].indexOf(text) !== -1;
}
