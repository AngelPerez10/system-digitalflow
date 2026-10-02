/**
 * Dominio de clientes: tipos, catálogos y reglas puras (sin React ni red).
 * Úsalo desde utilidades `.ts`, hooks y pruebas; para pantallas, el índice
 * `@/components/clientes` reexporta todo esto y además la UI y la API.
 */
export { TIPO_OPTIONS, type ClienteFormTab, type ClienteTipo } from "./clienteTipos";
export {
  estadosCA,
  estadosMX,
  estadosPorPais,
  estadosUS,
  formatPhoneE164,
  paisOptions,
  parsePhoneToForm,
  phoneCountryOptions,
} from "./clienteCatalogos";
export { buildClientePayload, emptyFormData, formDataFromCliente, type ClienteFormData } from "./clienteFormData";
export {
  CLIENTE_FIELD_TAB,
  clienteFieldErrors,
  firstInvalidField,
  parseClienteApiError,
  type ClienteFieldErrors,
  type ClienteFieldName,
  type ClienteValidationOptions,
} from "./clienteValidation";
export { isGoogleMapsLink, isValidEmail, mailHref, mapsUrlFor, mapsUrlForCoords, parseCoords, telHref } from "./clienteLinks";
export {
  direccionInputFromFormData,
  direccionParaOrden,
  direccionResumen,
  direccionToInput,
  emptyClienteDireccionInput,
  hasAnyAddressData,
  type ClienteDireccionInput,
} from "./clienteDireccion";
export {
  contactoPrincipalFromForm,
  contactoToInput,
  emptyClienteContactoInput,
  type ClienteContactoInput,
} from "./clienteContacto";
export { CLIENTE_STEP_ORDER, clienteStepState, type ClienteStepState } from "./clienteSteps";
