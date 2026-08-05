import { useEffect, useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSubheadingClass,
  erpTextareaLikeClass,
} from "@/layout/erpPageStyles";
import {
  erpModalBodyClass,
  erpModalFooterClass,
  erpModalFormScrollClass,
  erpModalHeaderAccentClass,
  erpModalHeaderClass,
  erpModalShellClass,
} from "../../Operacion/OrdenesTrabajo/ordenTrabajoStyles";
import type { InventarioItem, InventarioItemPatch } from "../shared/inventarioTypes";

type InventarioEditModalProps = {
  open: boolean;
  item: InventarioItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (id: number, patch: InventarioItemPatch) => Promise<void>;
};

export default function InventarioEditModal({
  open,
  item,
  saving,
  onClose,
  onSave,
}: InventarioEditModalProps) {
  const titleId = useId();
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setNombre(item.nombre || "");
    setMarca(item.marca || "");
    setModelo(item.modelo || "");
    setNotas(item.notas || "");
    setError(null);
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setError(null);
    try {
      await onSave(item.id, {
        nombre: nombre.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        notas: notas.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el ítem");
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      mobileBottomSheet
      className={erpModalShellClass}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
        <header className={erpModalHeaderClass}>
          <div className={erpModalHeaderAccentClass} aria-hidden="true" />
          <h2 id={titleId} className={erpSubheadingClass}>
            Editar ítem
          </h2>
          {item ? (
            <p className="mt-1 font-mono text-xs text-[#78716c] dark:text-[#8ea0b8]">
              {item.codigo_barras}
            </p>
          ) : null}
        </header>

        <div className={erpModalBodyClass}>
          <div className={erpModalFormScrollClass}>
            <div className="space-y-4">
              <div>
                <label htmlFor={`${titleId}-nombre`} className="mb-1.5 block text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                  Nombre
                </label>
                <input
                  id={`${titleId}-nombre`}
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={erpInputLikeClass}
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor={`${titleId}-marca`} className="mb-1.5 block text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                  Marca
                </label>
                <input
                  id={`${titleId}-marca`}
                  type="text"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className={erpInputLikeClass}
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor={`${titleId}-modelo`} className="mb-1.5 block text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                  Modelo
                </label>
                <input
                  id={`${titleId}-modelo`}
                  type="text"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className={erpInputLikeClass}
                  disabled={saving}
                />
              </div>
              <div>
                <label htmlFor={`${titleId}-notas`} className="mb-1.5 block text-sm font-medium text-[#1c1917] dark:text-[#f8fafc]">
                  Notas
                </label>
                <textarea
                  id={`${titleId}-notas`}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className={erpTextareaLikeClass}
                  disabled={saving}
                  rows={4}
                />
              </div>
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <footer className={`${erpModalFooterClass} flex flex-wrap justify-end gap-2`}>
          <button type="button" className={erpSecondaryBtnClass} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className={erpPrimaryBtnClass} disabled={saving || !item}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
