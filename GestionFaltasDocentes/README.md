# Gestion de Faltas Docentes

Aplicacion Google Apps Script para el IES Leonardo de Chabacier (Calatayud).

## Estado

Estructura inicial creada. No se ha implementado ningun modulo funcional todavia por la restriccion indicada: confirmar antes de implementar cada modulo.

## Modulos previstos

1. Autenticacion
   - `Session.getActiveUser().getEmail()`
   - Validacion contra `Profesores`
   - Control de rol `ADMIN`

2. Base de datos
   - Creacion automatica de hojas
   - Cabeceras oficiales
   - Lectura de `Motivos` desde hoja, nunca desde codigo
   - Configuracion centralizada

3. Formulario
   - Nueva solicitud
   - Tabla de ausencias por dia y tramos
   - Subida de justificante PDF/JPG/PNG
   - Persistencia de solicitud

4. PDF
   - Copia de plantilla Docs
   - Reemplazo de marcadores
   - Insercion de tabla
   - Exportacion a PDF
   - Guardado en Drive
   - Correos con Gmail

5. Administracion
   - Listado global
   - Filtros
   - Ver PDF
   - Aceptar/Rechazar

## Siguiente paso

Confirmar el modulo `Formulario` para implementarlo completo antes de pasar a `PDF`.
