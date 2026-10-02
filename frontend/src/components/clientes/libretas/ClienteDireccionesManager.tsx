/**
 * Libreta de direcciones del cliente (sucursales / domicilios): tarjetas, una
 * «Predeterminada», agregar / editar / eliminar sin salir del modal.
 */
import { useId, useState } from "react";
import { MapPin } from "lucide-react";
import { canDeleteInModule } from "@/pages/Configuracion/usuarios/usuariosModel";
import { useAuth } from "@/context/AuthContext";
import type { ClienteDireccion } from "@/types/cliente";
import { estadosPorPais, paisOptions } from "../domain/clienteCatalogos";
import { ClienteMapPickerModal } from "../map/ClienteMapPickerModal";
import { createClienteDireccion, deleteClienteDireccion, listClienteDirecciones, updateClienteDireccion } from "../api/direccionesApi";
import {
  type ClienteDireccionInput,
  direccionResumen,
  direccionToInput,
  emptyClienteDireccionInput,
} from "../domain/clienteDireccion";
import { Field, Notice, SelectInput, Switch, TextArea, TextInput } from "../ui/FormUi";
import { focusRing } from "../ui/tokens";
import { LibretaAddButton, LibretaCard, LibretaEditor, LibretaEmpty, LibretaLoadError, LibretaLoading } from "../ui/LibretaUi";
import { mapsUrlFor, mapsUrlForCoords } from "../domain/clienteLinks";
import { useLibreta, type LibretaApi } from "../hooks/useLibreta";

const DIRECCIONES_API: LibretaApi<ClienteDireccion, ClienteDireccionInput> = {
  list: listClienteDirecciones,
  create: createClienteDireccion,
  update: updateClienteDireccion,
  remove: deleteClienteDireccion,
  empty: (o) => emptyClienteDireccionInput(o),
  toInput: direccionToInput,
};

const validate = (d: ClienteDireccionInput) =>
  !d.etiqueta.trim() && !d.calle.trim() && !d.direccion.trim()
    ? "Escribe al menos el nombre, la calle o una referencia de la dirección."
    : null;

const linkClass = "inline-flex items-center gap-1 font-medium text-[#1244D1] hover:underline dark:text-[#7FA2FF]";

export function ClienteDireccionesManager({ clienteId }: { clienteId: number }) {
  const uid = useId();
  const { permissions, isAdmin } = useAuth();
  // El servidor exige `clientes.delete` para borrar direcciones: sin él no se ofrece el botón.
  const canDelete = canDeleteInModule(permissions, isAdmin, "clientes");
  const mapContainerId = `direccion-map-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const lib = useLibreta(clienteId, DIRECCIONES_API);
  const { draft, setDraft } = lib;
  const patch = (p: Partial<ClienteDireccionInput>) => setDraft((prev) => ({ ...prev, ...p }));

  const [showMap, setShowMap] = useState(false);
  const [mapError, setMapError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const estadosOptions = estadosPorPais[draft.pais] || estadosPorPais["México"] || [];
  const draftMapsUrl = mapsUrlFor(draft.direccion);

  const confirmMap = () => {
    if (selectedLocation) patch({ direccion: mapsUrlForCoords(selectedLocation) });
    setShowMap(false);
  };

  return (
    <div className="space-y-3">
      {lib.error && lib.editingId === null ? <Notice tone="error">{lib.error}</Notice> : null}

      {lib.loading ? (
        <LibretaLoading label="Cargando direcciones…" />
      ) : lib.loadError ? (
        <LibretaLoadError message={lib.loadError} onRetry={lib.reload} />
      ) : lib.items.length === 0 && lib.editingId === null ? (
        <LibretaEmpty>Este registro todavía no tiene direcciones.</LibretaEmpty>
      ) : (
        <ul className="space-y-2" aria-label="Direcciones registradas">
          {lib.items.map((d, i) => {
            const url = mapsUrlFor(d.direccion);
            return (
              <LibretaCard
                key={d.id}
                index={i}
                leading={
                  <span
                    className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] ${
                      d.is_principal
                        ? "bg-[rgba(4,114,77,0.10)] text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]"
                        : "bg-[rgba(230,162,60,0.14)] text-[#8A5D0F] dark:text-[#F0B860]"
                    }`}
                    aria-hidden
                  >
                    <MapPin className="size-4" />
                  </span>
                }
                title={d.etiqueta.trim() || "Sin nombre"}
                principal={d.is_principal}
                principalLabel="Predeterminada"
                makePrincipalLabel="Usar como predeterminada"
                details={
                  <>
                    <p>{direccionResumen(d)}</p>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        <MapPin className="size-3" aria-hidden />
                        Ver en Google Maps
                        <span className="sr-only"> (abre en una pestaña nueva)</span>
                      </a>
                    ) : null}
                  </>
                }
                busy={lib.busyId === d.id}
                canDelete={canDelete}
                confirmingDelete={lib.confirmDeleteId === d.id}
                deleteMessage="¿Eliminar esta dirección?"
                onEdit={() => lib.openEdit(d)}
                onAskDelete={() => lib.setConfirmDeleteId(d.id)}
                onCancelDelete={() => lib.setConfirmDeleteId(null)}
                onConfirmDelete={() => void lib.remove(d.id)}
                onMakePrincipal={() => void lib.makePrincipal(d)}
              />
            );
          })}
        </ul>
      )}

      {lib.editingId !== null ? (
        <LibretaEditor
          title={lib.editingId === "new" ? "Nueva dirección" : "Editar dirección"}
          icon={<MapPin className="size-4" />}
          error={lib.error || mapError}
          saving={lib.saving}
          submitLabel={lib.editingId === "new" ? "Agregar dirección" : "Guardar dirección"}
          onSubmit={() => void lib.save(validate)}
          onCancel={() => {
            setMapError("");
            lib.closeEditor();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nombre de la dirección" hint="Ej. Sucursal Centro, Bodega Norte.">
              {(ctl) => (
                <TextInput {...ctl} value={draft.etiqueta} onChange={(e) => patch({ etiqueta: e.target.value })} maxLength={100} autoFocus />
              )}
            </Field>
            <div className="md:pt-6">
              <Switch
                checked={draft.is_principal}
                onChange={(v) => patch({ is_principal: v })}
                label="Dirección predeterminada"
                description="Se propone al crear órdenes."
              />
            </div>
          </div>

          <Field
            label="Referencia o ubicación"
            hint="Dirección en texto, coordenadas o liga de Google Maps."
            labelAside={
              <span className="flex items-center gap-3">
                {draftMapsUrl ? (
                  <a href={draftMapsUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} text-[12.5px]`}>
                    Ver
                    <span className="sr-only"> en Google Maps (abre en una pestaña nueva)</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setMapError("");
                    setShowMap(true);
                  }}
                  className={`${linkClass} rounded-[6px] text-[12.5px] ${focusRing}`}
                >
                  <MapPin className="size-3.5" aria-hidden />
                  Elegir en el mapa
                </button>
              </span>
            }
          >
            {(ctl) => <TextArea {...ctl} rows={2} value={draft.direccion} onChange={(e) => patch({ direccion: e.target.value })} maxLength={500} />}
          </Field>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Calle" className="col-span-2">
              {(ctl) => <TextInput {...ctl} value={draft.calle} onChange={(e) => patch({ calle: e.target.value })} autoComplete="address-line1" />}
            </Field>
            <Field label="No. ext.">
              {(ctl) => <TextInput {...ctl} value={draft.numero_exterior} onChange={(e) => patch({ numero_exterior: e.target.value })} maxLength={20} />}
            </Field>
            <Field label="No. int.">
              {(ctl) => <TextInput {...ctl} value={draft.interior} onChange={(e) => patch({ interior: e.target.value })} maxLength={20} />}
            </Field>
            <Field label="Código postal">
              {(ctl) => (
                <TextInput
                  {...ctl}
                  value={draft.codigo_postal}
                  onChange={(e) => patch({ codigo_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                  inputMode="numeric"
                  autoComplete="postal-code"
                />
              )}
            </Field>
            <Field label="Colonia">
              {(ctl) => <TextInput {...ctl} value={draft.colonia} onChange={(e) => patch({ colonia: e.target.value })} />}
            </Field>
            <Field label="Ciudad">
              {(ctl) => <TextInput {...ctl} value={draft.ciudad} onChange={(e) => patch({ ciudad: e.target.value })} autoComplete="address-level2" />}
            </Field>
            <Field label="Localidad">
              {(ctl) => <TextInput {...ctl} value={draft.localidad} onChange={(e) => patch({ localidad: e.target.value })} />}
            </Field>
            <Field label="País" className="col-span-2">
              {(ctl) => (
                <SelectInput
                  {...ctl}
                  value={draft.pais}
                  onChange={(e) => {
                    const pais = e.target.value;
                    setDraft((prev) => {
                      const nextEstados = estadosPorPais[pais] || estadosPorPais["México"] || [];
                      return { ...prev, pais, estado: nextEstados.includes(prev.estado) ? prev.estado : "" };
                    });
                  }}
                >
                  {paisOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Field label="Estado" className="col-span-2">
              {(ctl) => (
                <SelectInput {...ctl} value={draft.estado} onChange={(e) => patch({ estado: e.target.value })}>
                  <option value="">Selecciona…</option>
                  {estadosOptions.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
          </div>
        </LibretaEditor>
      ) : (
        <LibretaAddButton label={lib.items.length === 0 ? "Agregar dirección" : "Agregar otra dirección"} onClick={lib.openNew} />
      )}

      <ClienteMapPickerModal
        isOpen={showMap}
        onClose={() => setShowMap(false)}
        mapContainerId={mapContainerId}
        direccion={draft.direccion}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        onConfirm={confirmMap}
        onMapError={(message) => {
          setMapError(message);
          setShowMap(false);
        }}
      />
    </div>
  );
}
