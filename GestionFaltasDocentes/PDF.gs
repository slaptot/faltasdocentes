/**
 * Modulo PDF.
 *
 * Responsabilidades:
 * - Copiar la plantilla oficial de Google Docs.
 * - Reemplazar marcadores.
 * - Insertar la tabla de ausencias.
 * - Exportar y guardar el PDF.
 */

/**
 * Genera el documento y PDF de una solicitud.
 *
 * @param {Object} solicitud Solicitud guardada.
 * @return {{documentoDriveId: string, pdfDriveId: string}} IDs generados.
 */
function generarDocumentoSolicitud(solicitud) {
  const config = getConfiguracion();
  const templateId = normalizeText(config[CONFIG_KEYS.PLANTILLA_DOCS]);

  if (!templateId) {
    throw new Error('Falta configurar PlantillaDocs en la hoja Configuracion.');
  }

  const pdfFolder = getYearFolder_(CONFIG_KEYS.CARPETA_PDF, solicitud.ID);
  const templateFile = getGoogleDocsTemplateFile_(templateId);
  const documentFile = templateFile.makeCopy('Solicitud_' + solicitud.ID, pdfFolder);
  const documentId = documentFile.getId();
  const document = DocumentApp.openById(documentId);

  replaceTextMarkers_(document, solicitud);
  replaceTablaMarker_(document.getBody(), solicitud);
  document.saveAndClose();

  const pdfBlob = DriveApp.getFileById(documentId)
    .getBlob()
    .getAs(MimeType.PDF)
    .setName('Solicitud_' + solicitud.ID + '.pdf');
  const pdfDriveId = guardarPdfSolicitud(pdfBlob, solicitud.ID);

  return {
    documentoDriveId: documentId,
    pdfDriveId: pdfDriveId
  };
}

/**
 * Comprueba que PlantillaDocs apunte a un documento nativo de Google Docs.
 *
 * Ejecutar manualmente desde Apps Script si falla la generacion de PDF.
 *
 * @return {Object} Datos de diagnostico de la plantilla.
 */
function probarPlantillaDocs() {
  const config = getConfiguracion();
  const templateId = normalizeText(config[CONFIG_KEYS.PLANTILLA_DOCS]);

  if (!templateId) {
    throw new Error('Falta configurar PlantillaDocs en la hoja Configuracion.');
  }

  const templateFile = getGoogleDocsTemplateFile_(templateId);
  const document = DocumentApp.openById(templateFile.getId());

  return {
    ok: true,
    id: templateFile.getId(),
    name: templateFile.getName(),
    mimeType: templateFile.getMimeType(),
    bodyLength: document.getBody().getText().length
  };
}

/**
 * Devuelve la plantilla, verificando que sea Google Docs nativo.
 *
 * @param {string} templateId ID configurado en PlantillaDocs.
 * @return {File} Archivo de plantilla.
 * @private
 */
function getGoogleDocsTemplateFile_(templateId) {
  const templateFile = DriveApp.getFileById(templateId);
  const mimeType = templateFile.getMimeType();

  if (mimeType !== MimeType.GOOGLE_DOCS) {
    throw new Error(
      'PlantillaDocs debe ser un documento nativo de Google Docs. ' +
      'El archivo configurado es "' + templateFile.getName() + '" con tipo "' + mimeType + '". ' +
      'Abra el DOCX con Google Docs, conviertalo/guardelo como Google Docs y ponga ese ID en Configuracion.'
    );
  }

  return templateFile;
}

/**
 * Reemplaza marcadores simples de texto en el documento.
 *
 * @param {Document} document Documento completo.
 * @param {Object} solicitud Solicitud.
 * @private
 */
function replaceTextMarkers_(document, solicitud) {
  const replacements = buildTextReplacements_(solicitud);

  Object.keys(replacements).forEach(function(marker) {
    replaceMarkerEverywhere_(document, marker, replacements[marker]);
  });
}

/**
 * Construye los reemplazos de texto de una solicitud.
 *
 * @param {Object} solicitud Solicitud.
 * @return {Object} Mapa marcador-valor.
 * @private
 */
function buildTextReplacements_(solicitud) {
  const observaciones = extractVisibleObservaciones_(solicitud.Observaciones);
  const replacements = {};

  replacements[PDF_MARKERS.PROFESOR] = solicitud.Profesor;
  replacements[PDF_MARKERS.EMAIL] = solicitud.Email;
  replacements[PDF_MARKERS.DEPARTAMENTO] = solicitud.Departamento;
  replacements[PDF_MARKERS.MOTIVO] = solicitud.Motivo;
  replacements[PDF_MARKERS.OBSERVACIONES] = observaciones || '-';
  replacements[PDF_MARKERS.FECHA] = formatDateForPdf_(solicitud.FechaSolicitud || new Date());
  replacements[PDF_MARKERS.FECHA_DOCUMENTO] = formatLongDateForPdf_(solicitud.FechaSolicitud || new Date());
  replacements[PDF_MARKERS.DOCUMENTO_ID] = getDriveViewUrl(solicitud.JustificanteDriveId) || '-';

  return replacements;
}

/**
 * Reemplaza un marcador en cuerpo, cabecera y pie del documento.
 *
 * @param {Document} document Documento Google Docs.
 * @param {string} marker Marcador literal.
 * @param {*} value Valor de reemplazo.
 * @private
 */
function replaceMarkerEverywhere_(document, marker, value) {
  const escapedMarker = escapeForReplaceText_(marker);
  const safeValue = sanitizeDocumentText_(value);
  const containers = [document.getBody()];
  const header = document.getHeader();
  const footer = document.getFooter();

  if (header) {
    containers.push(header);
  }

  if (footer) {
    containers.push(footer);
  }

  containers.forEach(function(container) {
    container.replaceText(escapedMarker, safeValue);
  });
}

/**
 * Sustituye el marcador de tabla por una tabla de ausencias.
 *
 * @param {Body} body Cuerpo del documento.
 * @param {Object} solicitud Solicitud.
 * @private
 */
function replaceTablaMarker_(body, solicitud) {
  const found = body.findText(escapeForReplaceText_(PDF_MARKERS.TABLA));
  const tableRows = buildAusenciasTableRows_(solicitud);

  if (!found) {
    body.appendParagraph('');
    const table = body.appendTable(tableRows);
    formatAusenciasTable_(table);
    return;
  }

  const markerElement = found.getElement();
  const paragraph = markerElement.getParent();
  const childIndex = body.getChildIndex(paragraph);
  markerElement.asText().deleteText(found.getStartOffset(), found.getEndOffsetInclusive());
  const table = body.insertTable(childIndex + 1, tableRows);
  formatAusenciasTable_(table);
}

/**
 * Crea las filas de tabla para Google Docs.
 *
 * @param {Object} solicitud Solicitud.
 * @return {string[][]} Filas de tabla.
 * @private
 */
function buildAusenciasTableRows_(solicitud) {
  const ausencias = extractAusenciasFromObservaciones_(solicitud.Observaciones);
  const rows = ausencias.map(function(ausencia) {
    return [
      formatDateForPdf_(ausencia.fecha),
      ausencia.diaEntero ? 'Día entero' : 'Parcial',
      ausencia.diaEntero ? '-' : ausencia.horaSalida + ' - ' + ausencia.horaVuelta
    ];
  });

  return rows.length ? rows : [['-', '-', '-']];
}

/**
 * Aplica formato compacto a la tabla de ausencias insertada.
 *
 * @param {Table} table Tabla insertada.
 * @private
 */
function formatAusenciasTable_(table) {
  for (let rowIndex = 0; rowIndex < table.getNumRows(); rowIndex++) {
    const row = table.getRow(rowIndex);

    for (let cellIndex = 0; cellIndex < row.getNumCells(); cellIndex++) {
      const cell = row.getCell(cellIndex);
      const text = cell.editAsText();

      text.setFontSize(8);
      text.setFontFamily('Times New Roman');
      text.setBold(false);
    }
  }
}

/**
 * Escapa marcadores para Body.replaceText, que usa expresiones regulares.
 *
 * @param {string} value Texto literal.
 * @return {string} Texto escapado.
 * @private
 */
function escapeForReplaceText_(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Limpia texto para insertar en Google Docs.
 *
 * @param {*} value Valor.
 * @return {string} Texto seguro.
 * @private
 */
function sanitizeDocumentText_(value) {
  return normalizeText(value).replace(/\$/g, '$$$$');
}

/**
 * Formatea fechas para documento oficial.
 *
 * @param {*} value Fecha o cadena ISO.
 * @return {string} Fecha formateada.
 * @private
 */
function formatDateForPdf_(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return normalizeText(value);
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

/**
 * Formatea la fecha para la linea final del documento.
 *
 * @param {*} value Fecha o cadena ISO.
 * @return {string} Fecha en formato "7 de julio de 2026".
 * @private
 */
function formatLongDateForPdf_(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return normalizeText(value);
  }

  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ];

  return date.getDate() + ' de ' + months[date.getMonth()] + ' de ' + date.getFullYear();
}
