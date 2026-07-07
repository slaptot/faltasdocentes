/**
 * Configuracion central de la aplicacion Gestion de Faltas Docentes.
 *
 * Este archivo define constantes compartidas por todos los modulos.
 */
const APP = Object.freeze({
  NAME: 'Gestion de Faltas Docentes',
  CENTER: 'IES Leonardo de Chabacier',
  LOCATION: 'Calatayud',
  VERSION: '0.4.0-pdf',
  SPREADSHEET_ID: '1Po8Cf1UQdnNQP8Z1hSnWZTlaPz97HADuK_h_407pd0I',
  ALLOWED_EMAIL_DOMAIN: 'chabacier.es'
});

const SHEETS = Object.freeze({
  PROFESORES: 'Profesores',
  SOLICITUDES: 'Solicitudes',
  MOTIVOS: 'Motivos',
  CONFIGURACION: 'Configuracion'
});

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  PROFESOR: 'PROFESOR'
});

const ESTADOS_SOLICITUD = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  ACEPTADA: 'ACEPTADA',
  RECHAZADA: 'RECHAZADA',
  INVALIDA: 'INVALIDA'
});

const CONFIG_KEYS = Object.freeze({
  CARPETA_PDF: 'CarpetaPDF',
  CARPETA_JUSTIFICANTES: 'CarpetaJustificantes',
  PLANTILLA_DOCS: 'PlantillaDocs',
  CORREO_DIRECCION: 'CorreoDireccion',
  CORREOS_ADMIN: 'CorreosAdmin',
  CURSO_ESCOLAR: 'CursoEscolar'
});

const PDF_MARKERS = Object.freeze({
  PROFESOR: '<<PROFESOR>>',
  EMAIL: '<<EMAIL>>',
  DEPARTAMENTO: '<<DEPARTAMENTO>>',
  MOTIVO: '<<MOTIVO>>',
  OBSERVACIONES: '<<OBSERVACIONES>>',
  FECHA: '<<FECHA>>',
  FECHA_DOCUMENTO: '<<FECHADOCUMENTO>>',
  DOCUMENTO_ID: '<<DocumentoID>>',
  TABLA: '<<TABLA>>'
});

const HEADERS = Object.freeze({
  PROFESORES: ['Email', 'Nombre', 'Departamento', 'Rol', 'Activo'],
  SOLICITUDES: [
    'ID',
    'FechaSolicitud',
    'Profesor',
    'Email',
    'Departamento',
    'Motivo',
    'Observaciones',
    'Estado',
    'DocumentoDriveId',
    'PDFDriveId',
    'JustificanteDriveId',
    'FechaCreacion'
  ],
  MOTIVOS: ['Motivo'],
  CONFIGURACION: ['Valor', 'Inicio']
});

const DEFAULT_CONFIG_ROWS = Object.freeze([
  [CONFIG_KEYS.CARPETA_PDF, ''],
  [CONFIG_KEYS.CARPETA_JUSTIFICANTES, ''],
  [CONFIG_KEYS.PLANTILLA_DOCS, ''],
  [CONFIG_KEYS.CORREO_DIRECCION, ''],
  [CONFIG_KEYS.CORREOS_ADMIN, ''],
  [CONFIG_KEYS.CURSO_ESCOLAR, '']
]);

const OFFICIAL_MOTIVOS = Object.freeze([
  'Acompañamiento al médico de hijos y parientes primer grado',
  'Fallecimiento de un familiar hasta 2º grado',
  'Adaptación progresiva de la jornada de trabajo tras tratamiento oncológico o enfermedad grave (art. 9)',
  'Funciones sindicales o de representación',
  'Adopción internacional',
  'Libre disposición por conciliación',
  'Asistencia a clases preparación al parto',
  'Licencia por enfermedad',
  'Asistencia a cursos de selección, formación',
  'Licencia por estudios',
  'Asistencia a exámenes prenatales (art. 2 k,o)',
  'Licencia por lactancia',
  'Asistencia a reuniones de coordinación del Centro de Atención Temprana del hijo o hija (art. 2 n)',
  'Licencia por matrimonio',
  'Asistencia a reuniones de coordinación del Centro de Educación Especial del hijo o hija (art. 2 m)',
  'Otros motivos (debidamente justificados)',
  'Asistencia a reuniones en centros de Educación Especial por hijo discapacitado',
  'Parto, adopción o acogimiento múltiple',
  'Asistencia a tutorías del hijo o hija en el centro educativo (art. 2 ñ)',
  'Permiso del progenitor diferente de la madre biológica por nacimiento, adopción, guarda o acogimiento',
  'Ausencia injustificada',
  'Permiso por nacimiento para la madre biológica, adopción, guarda o acogimiento',
  'Baja por enfermedad de 1 a 3 días',
  'Permiso por situaciones críticas',
  'Boda de un pariente de hasta 3º grado de consanguinidad o 2º grado de afinidad',
  'Permiso sin retribución',
  'Cumplimiento de un deber inexcusable de carácter público o personal',
  'Prórroga licencia enfermedad',
  'Derecho a ausentarse por hijos prematuros u hospitalizados',
  'Reducción de jornada por atención familiar de 1º grado por enfermedad grave',
  'Disfrute de vacaciones por incapacidad temporal',
  'Reducción de jornada por guarda legal',
  'Disfrute de vacaciones tras permiso por nacimiento, adopción, guarda o acogimiento (art. 6)',
  'Reducción de jornada por nacimientos de hijos prematuros',
  'Divorcio, separación legal o nulidad',
  'Reducción de jornada por violencia de género',
  'Enfermedad grave del resto de parientes hasta primer grado de afinidad',
  'Técnicas de fecundación asistida (art. 2)',
  'Enfermedad grave del resto de parientes hasta segundo grado',
  'Traslado de domicilio',
  'Enfermedad grave o intervención quirúrgica del cónyuge, pareja de hecho, hijos, padres y hermanos',
  'Visita médica',
  'Exámenes y pruebas en centros oficiales'
]);
