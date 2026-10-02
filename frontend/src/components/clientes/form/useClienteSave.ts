/**
 * Guardado del formulario de cliente: validación, fases visibles, errores del
 * backend por campo y reintentos seguros.
 *
 * - Editar usa PATCH y no toca contactos/direcciones (viven en sus libretas).
 * - Alta: cliente → contacto principal → dirección. Si el contacto falla, el
 *   cliente ya existe: el reintento lo actualiza (no lo duplica) y, si se cierra
 *   así, `takeUnreported()` lo entrega para avisar a la vista.
 * - Candado síncrono contra doble envío.
 */
import { useCallback, useRef, useState } from "react";
import type { Cliente } from "@/types/cliente";
import { saveCliente } from "../api/clientesApi";
import { upsertContactoPrincipal } from "../api/contactosApi";
import { seedPrincipalDireccion } from "../api/direccionesApi";
import { buildClientePayload, type ClienteFormData } from "../domain/clienteFormData";
import type { ClienteFormTab, ClienteTipo } from "../domain/clienteTipos";
import {
  CLIENTE_FIELD_TAB,
  type ClienteFieldErrors,
  type ClienteFieldName,
  clienteFieldErrors,
  firstInvalidField,
  parseClienteApiError,
} from "../domain/clienteValidation";
import { SAVED_PAUSE_MS, apiFailureMessage, type SavePhase } from "./clienteFormCopy";

/** Error del backend en un campo, válido mientras el campo no cambie. */
type ServerFieldError = { message: string; value: string };

export type ClienteSaveMeta = {
  /** El contacto principal no se guardó (se cerró tras el fallo). */
  contactoPendiente?: boolean;
  /** La dirección no se pudo copiar a la libreta. */
  direccionPendiente?: boolean;
};

type Options = {
  formData: ClienteFormData;
  initialData: ClienteFormData;
  editingCliente: Cliente | null;
  fixedTipo?: ClienteTipo;
  canSave: boolean;
  dirty: boolean;
  /** Lleva al usuario a un campo (cambia de paso y lo enfoca). */
  goToField: (tab: ClienteFormTab, field?: string) => void;
  /** Se llama tras «¡Guardado!» con el registro final. */
  onSaved: (cliente: Cliente, meta?: ClienteSaveMeta) => void;
};

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export function useClienteSave({ formData, initialData, editingCliente, fixedTipo, canSave, dirty, goToField, onSaved }: Options) {
  const savingRef = useRef(false);
  /** Cliente creado cuyo guardado quedó a medias y aún no se reportó a la vista. */
  const unreportedRef = useRef<Cliente | null>(null);

  const [phase, setPhase] = useState<SavePhase>("idle");
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState("");
  const [serverErrors, setServerErrors] = useState<Partial<Record<ClienteFieldName, ServerFieldError>>>({});
  /** Cliente ya creado en un intento anterior (el contacto falló): se actualiza, no se recrea. */
  const [createdId, setCreatedId] = useState<number | null>(null);

  const isEditing = editingCliente !== null;
  const validationOpts = { initial: isEditing ? initialData : undefined, editingSaved: Boolean(editingCliente?.id) };

  // Errores visibles: los del navegador (tras el primer intento) + los del
  // backend en campos que no se han vuelto a tocar.
  const errors: ClienteFieldErrors = submitted ? clienteFieldErrors(formData, validationOpts) : {};
  for (const [key, err] of Object.entries(serverErrors) as [ClienteFieldName, ServerFieldError][]) {
    if (!errors[key] && String(formData[key] ?? "") === err.value) errors[key] = err.message;
  }

  const goToFirstError = (fieldErrors: ClienteFieldErrors) => {
    const first = firstInvalidField(fieldErrors);
    if (!first) return false;
    goToField(CLIENTE_FIELD_TAB[first], first);
    return true;
  };

  const fail = (message: string) => {
    setApiError(message);
    setPhase("idle");
  };

  /** Estable (solo setters y refs): se puede usar en efectos de apertura. */
  const reset = useCallback(() => {
    setPhase("idle");
    setSubmitted(false);
    setApiError("");
    setServerErrors({});
    setCreatedId(null);
    unreportedRef.current = null;
    savingRef.current = false;
  }, []);

  /** Entrega (una vez) el cliente creado que quedó sin reportar. */
  const takeUnreported = () => {
    const pending = unreportedRef.current;
    unreportedRef.current = null;
    return pending;
  };

  const submit = async () => {
    if (savingRef.current) return;
    if (!canSave) {
      fail(`No tienes permiso para ${isEditing ? "editar" : "crear"} registros de contactos.`);
      return;
    }
    if (isEditing && !dirty) return;

    setSubmitted(true);
    setApiError("");
    if (goToFirstError(clienteFieldErrors(formData, validationOpts))) return;

    savingRef.current = true;
    setPhase("cliente");
    try {
      const result = await saveCliente(
        editingCliente?.id ?? createdId,
        buildClientePayload(formData, fixedTipo, isEditing),
      );

      if (!result.ok) {
        const parsed = parseClienteApiError(result.body);
        const fieldEntries = Object.entries(parsed.fields) as [ClienteFieldName, string][];
        setServerErrors(Object.fromEntries(fieldEntries.map(([k, message]) => [k, { message, value: String(formData[k] ?? "") }])));
        fail(apiFailureMessage(result.status, parsed.message, isEditing));
        goToFirstError(parsed.fields);
        return;
      }

      const saved = result.cliente;
      setServerErrors({});

      let direccionPendiente = false;
      if (!isEditing) {
        const firstCreate = createdId === null;
        setCreatedId(saved.id);
        unreportedRef.current = saved;

        setPhase("contacto");
        try {
          await upsertContactoPrincipal(saved.id, formData);
        } catch (contactError) {
          goToField("contacto");
          fail(
            `El registro se guardó, pero no su contacto principal: ${
              contactError instanceof Error ? contactError.message : "error desconocido"
            }. Corrige el contacto y vuelve a guardar.`,
          );
          return;
        }

        if (firstCreate) {
          setPhase("direccion");
          direccionPendiente = !(await seedPrincipalDireccion(saved.id, formData));
        }
      }

      setPhase("done");
      unreportedRef.current = null;
      await wait(SAVED_PAUSE_MS);
      onSaved(saved, direccionPendiente ? { direccionPendiente } : undefined);
    } catch {
      fail("Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.");
    } finally {
      savingRef.current = false;
    }
  };

  return {
    phase,
    saving: phase !== "idle",
    /** Para bloquear acciones de forma síncrona (antes de que llegue el render). */
    isSavingNow: () => savingRef.current,
    apiError,
    errors,
    errorCount: Object.keys(errors).length,
    createdId,
    submit,
    reset,
    takeUnreported,
  };
}
