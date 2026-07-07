/**
 * Configuracion central de la aplicacion Gestion de Faltas Docentes.
 *
 * Este archivo define constantes compartidas. La implementacion funcional
 * de lectura/escritura de configuracion se abordara en el modulo Base de datos.
 */
const APP = Object.freeze({
  NAME: 'Gestion de Faltas Docentes',
  CENTER: 'IES Leonardo de Chabacier',
  LOCATION: 'Calatayud',
  VERSION: '0.2.0-auth',
  SPREADSHEET_ID: '1Po8Cf1UQdnNQP8Z1hSnWZTlaPz97HADuK_h_407pd0I'
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
  RECHAZADA: 'RECHAZADA'
});

const CONFIG_KEYS = Object.freeze({
  CARPETA_PDF: 'CarpetaPDF',
  CARPETA_JUSTIFICANTES: 'CarpetaJustificantes',
  PLANTILLA_DOCS: 'PlantillaDocs',
  CORREO_DIRECCION: 'CorreoDireccion',
  CURSO_ESCOLAR: 'CursoEscolar'
});

const HEADERS = Object.freeze({
  PROFESORES: ['Email', 'Nombre', 'Departamento', 'Rol', 'Activo']
});
