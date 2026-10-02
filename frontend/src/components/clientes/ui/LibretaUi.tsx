/**
 * Piezas visuales compartidas por las libretas de contactos y direcciones
 * del cliente: tarjeta, editor en línea, estados de carga/vacío/error.
 */
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { BadgeCheck, CloudOff, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { InlineConfirm, Notice, Spinner } from "./FormUi";
import { btnLink, btnSmPrimary, btnSmSecondary, focusRing, iconBtn, iconDangerBtn } from "./tokens";

export function LibretaLoading({ label }: { label: string }) {
  const bar = "rounded-full bg-[#F1F1F3] dark:bg-white/[0.06]";
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{label}</span>
      {[0, 1].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-[14px] border border-[#EDEDF0] p-3.5 dark:border-[#1F2A3C]" aria-hidden>
          <span className={`size-9 ${bar}`} />
          <div className="flex-1 space-y-2">
            <span className={`block h-3 w-1/3 ${bar}`} />
            <span className={`block h-2.5 w-1/2 ${bar}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LibretaLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="cot-fade flex flex-col items-start gap-2 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] p-3.5 dark:border-[#7F1D1D] dark:bg-[#3F1518] sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-[13px] font-medium text-[#9F1F1F] dark:text-[#FCA5A5]">
        <CloudOff className="size-4 shrink-0" aria-hidden />
        {message}
      </p>
      <button type="button" onClick={onRetry} className={btnSmSecondary}>
        Reintentar
      </button>
    </div>
  );
}

export function LibretaEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="cot-fade rounded-[14px] border border-dashed border-[#D3D3D8] bg-[#FAFAFA] px-4 py-5 text-center text-[13px] text-[#6E6E77] dark:border-[#3A4661] dark:bg-white/[0.02] dark:text-[#8EA0B8]">
      {children}
    </p>
  );
}

export function LibretaAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cot-press flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#1B5CFF]/40 bg-white text-[13.5px] font-semibold text-[#1244D1] hover:border-[#1B5CFF]/70 hover:bg-[rgba(27,92,255,0.04)] dark:border-[#4B7CFF]/40 dark:bg-transparent dark:text-[#9BB6FF] dark:hover:bg-[rgba(75,124,255,0.08)] ${focusRing}`}
    >
      <Plus className="size-4" strokeWidth={2.4} aria-hidden />
      {label}
    </button>
  );
}

export function PrincipalBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-[rgba(4,114,77,0.10)] px-2 text-[11px] font-semibold text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
      <BadgeCheck className="size-3" aria-hidden />
      {label}
    </span>
  );
}

export function LibretaCard({
  index,
  leading,
  title,
  principal,
  principalLabel,
  makePrincipalLabel,
  details,
  busy,
  canDelete,
  confirmingDelete,
  deleteMessage,
  onEdit,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onMakePrincipal,
}: {
  index: number;
  leading: ReactNode;
  title: string;
  principal: boolean;
  principalLabel: string;
  makePrincipalLabel: string;
  details: ReactNode;
  busy: boolean;
  canDelete: boolean;
  confirmingDelete: boolean;
  deleteMessage: string;
  onEdit: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onMakePrincipal: () => void;
}) {
  return (
    <li
      className={`cot-rise rounded-[14px] border p-3.5 transition-colors duration-200 ${
        principal
          ? "border-[#BFE6D4] bg-[rgba(4,114,77,0.03)] dark:border-[#1E5A42] dark:bg-[rgba(74,222,128,0.04)]"
          : "border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]"
      }`}
      style={{ "--cot-i": Math.min(index, 4) } as CSSProperties}
    >
      <div className="flex items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{title}</p>
            {principal ? <PrincipalBadge label={principalLabel} /> : null}
          </div>
          <div className="mt-0.5 space-y-0.5 text-[12.5px] leading-[18px] text-[#52525B] dark:text-[#B7C1D1]">{details}</div>
          {!principal ? (
            <button type="button" onClick={onMakePrincipal} disabled={busy} className={`${btnLink} -ml-1.5 mt-1 inline-flex items-center gap-1`}>
              {busy ? <Spinner className="size-3" /> : <Star className="size-3" aria-hidden />}
              {makePrincipalLabel}
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={onEdit} className={iconBtn} aria-label={`Editar ${title}`} title="Editar">
            <Pencil className="size-4" aria-hidden />
          </button>
          {canDelete ? (
            <button type="button" onClick={onAskDelete} className={iconDangerBtn} aria-label={`Eliminar ${title}`} title="Eliminar">
              <Trash2 className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      {confirmingDelete ? (
        <InlineConfirm message={deleteMessage} confirmLabel="Eliminar" busy={busy} onCancel={onCancelDelete} onConfirm={onConfirmDelete} />
      ) : null}
    </li>
  );
}

/**
 * Editor en línea. Vive dentro del `<form>` del cliente, así que Enter se
 * intercepta aquí (guarda esta tarjeta, no envía al cliente) y Escape cierra
 * solo el editor (no el modal).
 */
export function LibretaEditor({
  title,
  icon,
  error,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
  children,
}: {
  title: string;
  icon: ReactNode;
  error: string;
  saving: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (e.key === "Enter" && target.tagName === "INPUT") {
      e.preventDefault();
      onSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };
  return (
    <div
      role="group"
      aria-label={title}
      aria-busy={saving}
      onKeyDown={onKeyDown}
      className="cot-pop overflow-hidden rounded-[14px] border border-[#1B5CFF]/30 bg-white shadow-[0_8px_24px_-16px_rgba(27,92,255,0.45)] dark:border-[#4B7CFF]/35 dark:bg-[#111827]"
    >
      <div className="flex items-center gap-2.5 border-b border-[#EDEDF0] bg-[#F7F9FF] px-4 py-2.5 dark:border-[#1F2A3C] dark:bg-[rgba(75,124,255,0.06)]">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#9BB6FF]" aria-hidden>
          {icon}
        </span>
        <p className="text-[13.5px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{title}</p>
      </div>
      <div className="space-y-4 p-4">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {children}
        <div className="flex flex-col-reverse gap-2 border-t border-[#F0F0F2] pt-3 dark:border-[#1F2A3C] sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={saving} className={btnSmSecondary}>
            Cancelar
          </button>
          <button type="button" onClick={onSubmit} disabled={saving} className={btnSmPrimary}>
            {saving ? <Spinner className="size-3.5" /> : null}
            {saving ? "Guardando…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
