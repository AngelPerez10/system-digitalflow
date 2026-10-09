/**
 * Módulo de clientes — API pública.
 *
 * Las demás vistas (Contactos, Órdenes, Facturas CFDI, Pólizas…) importan solo
 * desde aquí (o desde `@/components/clientes/domain` si no necesitan React).
 * Lo que no se exporta es interno y puede cambiar sin avisar.
 *
 *   domain/    reglas puras: tipos, catálogos, datos del formulario, validación, ligas
 *   api/       llamadas HTTP (`/api/clientes/`, contactos, direcciones)
 *   hooks/     estado reutilizable (duplicados, libretas)
 *   ui/        kit visual del módulo (tokens, campos, tarjetas de libreta)
 *   form/      modal de alta/edición, pasos, guardado y pestañas de campos
 *   libretas/  contactos y direcciones de un cliente guardado
 *   map/       selector de ubicación (Leaflet bajo demanda)
 *   search/    opciones de cliente para buscadores
 */
export * from "./domain";

// API
export { formatApiErrors } from "./api/apiErrors";
export { deleteCliente, fetchClientesCatalog, fetchClientesPage, saveCliente, searchClientes, type SaveClienteResult } from "./api/clientesApi";

// Componentes
export { ClienteFormModal, type ClienteFormModalProps, type ClienteSaveMeta } from "./form/ClienteFormModal";
export { ClienteSimplifiedFormFields } from "./form/fields/ClienteSimplifiedFormFields";
export { ClienteMapPickerModal } from "./map/ClienteMapPickerModal";

// Buscadores
export { buildClienteSearchActions, type ClienteSearchAction } from "./search/clienteSearchActions";
