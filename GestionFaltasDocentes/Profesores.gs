/**
 * Modulo Profesores.
 *
 * Responsabilidades:
 * - Crear o actualizar profesores.
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
 * Crea o actualiza un profesor por correo electronico.
 *
 * @param {Object} profesor Datos del profesor.
 * @return {Object} Profesor normalizado.
 */
function upsertProfesor(profesor) {
  const normalizedProfesor = normalizeProfesor_(profesor);

  if (!normalizedProfesor.email) {
    throw new Error('El email del profesor es obligatorio.');
  }

  const sheet = getProfesoresSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const emails = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const existingIndex = emails.findIndex(function(row) {
      return normalizeText(row[0]).toLowerCase() === normalizedProfesor.email;
    });

    if (existingIndex !== -1) {
      sheet.getRange(existingIndex + 2, 1, 1, HEADERS.PROFESORES.length).setValues([
        profesorToRow_(normalizedProfesor)
      ]);
      return normalizedProfesor;
    }
  }

  sheet.appendRow(profesorToRow_(normalizedProfesor));
  return normalizedProfesor;
}

/**
 * Devuelve la hoja Profesores preparada.
 *
 * @return {Sheet} Hoja Profesores.
 * @private
 */
function getProfesoresSheet_() {
  return getOrCreateSheet_(SHEETS.PROFESORES, HEADERS.PROFESORES);
}

/**
 * Normaliza un profesor recibido.
 *
 * @param {Object} profesor Datos de entrada.
 * @return {Object} Profesor normalizado.
 * @private
 */
function normalizeProfesor_(profesor) {
  const data = profesor || {};

  return {
    email: normalizeText(data.email).toLowerCase(),
    nombre: normalizeText(data.nombre),
    departamento: normalizeText(data.departamento),
    rol: normalizeRole_(data.rol),
    activo: parseActiveValue_(data.activo)
  };
}

/**
 * Convierte un profesor normalizado en fila de hoja.
 *
 * @param {Object} profesor Profesor normalizado.
 * @return {Array} Fila para Google Sheets.
 * @private
 */
function profesorToRow_(profesor) {
  return [
    profesor.email,
    profesor.nombre,
    profesor.departamento,
    profesor.rol,
    profesor.activo
  ];
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

/**
 * Lee profesores desde Google Sheets como objetos normalizados.
 *
 * @return {Object[]} Profesores normalizados.
 * @private
 */
function readProfesores_() {
  return readSheetObjects_(SHEETS.PROFESORES, HEADERS.PROFESORES)
    .map(function(row) {
      return normalizeProfesor_({
        email: row.Email,
        nombre: row.Nombre,
        departamento: row.Departamento,
        rol: row.Rol,
        activo: row.Activo
      });
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
