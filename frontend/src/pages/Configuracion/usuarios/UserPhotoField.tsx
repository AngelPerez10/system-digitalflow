/**
 * Foto de perfil del usuario (pestaña Cuenta al editar).
 *
 * Tarjeta tipo credencial: banda marina, avatar grande con anillo y nombre.
 * La foto nueva queda como vista previa y se sube con «Guardar cambios»
 * (igual que la firma); quitar la foto guardada es inmediato, con
 * confirmación en el mismo lugar.
 */
import { useId, useRef, useState, type DragEvent } from 'react';
import { Camera, ImageUp, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { resolveMediaUrl } from '@/config/api';
import { cn } from '@/lib/utils';
import { PROFILE_PHOTO_ACCEPT, prepareProfilePhoto } from './profilePhoto';
import { RoleBadge } from './usuariosUi';
import { btn, btnSm, focusRing } from './usuariosStyles';

type Props = {
  /** URL guardada en el servidor ('' si no tiene). */
  storedUrl: string;
  /** Foto nueva sin guardar (data URL) o ''. */
  pending: string;
  onPendingChange: (dataUrl: string) => void;
  /** Quita la foto guardada (DELETE inmediato). */
  onRemoveStored: () => Promise<void>;
  name: string;
  username: string;
  initials: string;
  admin: boolean;
  disabled?: boolean;
};

export function UserPhotoField({
  storedUrl,
  pending,
  onPendingChange,
  onRemoveStored,
  name,
  username,
  initials,
  admin,
  disabled = false,
}: Props) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const stored = storedUrl.trim() && !broken ? resolveMediaUrl(storedUrl) : '';
  const src = pending || stored;
  const busy = disabled || processing || removing;

  const pickFile = async (file: File | undefined) => {
    if (!file || busy) return;
    setError(null);
    setConfirmRemove(false);
    setProcessing(true);
    try {
      onPendingChange(await prepareProfilePhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo usar esa imagen.');
    } finally {
      setProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    void pickFile(e.dataTransfer.files?.[0]);
  };

  const removeStored = async () => {
    setRemoving(true);
    setError(null);
    try {
      await onRemoveStored();
      setBroken(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar la foto.');
    } finally {
      setRemoving(false);
      setConfirmRemove(false);
    }
  };

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="overflow-hidden rounded-[18px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]"
    >
      {/* Banda marina con destello dorado: misma identidad que las cabeceras del ERP. */}
      <div className="relative h-[72px] overflow-hidden bg-[#17235B] dark:bg-[#1B2A63]" aria-hidden>
        <div className="absolute -right-10 -top-16 size-44 rounded-full bg-[#E6A23C]/20 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 size-40 rounded-full bg-[#4B7CFF]/25 blur-2xl" />
      </div>

      <div className="relative flex flex-col gap-3 px-5 pb-4 sm:flex-row sm:items-end sm:gap-4">
        <div className="-mt-12 shrink-0">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            disabled={busy}
            aria-describedby={hintId}
            aria-label={src ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
            className={cn(
              'group relative block size-24 rounded-full bg-white p-1 shadow-[0_10px_24px_-12px_rgba(9,9,11,0.45)] transition-transform duration-200 dark:bg-[#111827] motion-reduce:transition-none',
              !busy && 'hover:-translate-y-0.5',
              dragging && 'scale-[1.03]',
              focusRing,
            )}
          >
            <span
              className={cn(
                'relative flex size-full items-center justify-center overflow-hidden rounded-full ring-1 ring-inset',
                admin
                  ? 'bg-[#FFF6E6] text-[#9A6B15] ring-[#F0D7A3] dark:bg-[rgba(230,162,60,0.14)] dark:text-[#E6A23C] dark:ring-[rgba(230,162,60,0.28)]'
                  : 'bg-[#EEF3FF] text-[#17235B] ring-[#D7E3FF] dark:bg-[#1B2A63] dark:text-[#9BB6FF] dark:ring-[#3A4A6B]',
                dragging && 'ring-2 ring-[#1B5CFF] dark:ring-[#4B7CFF]',
              )}
            >
              {src ? (
                <img
                  key={src}
                  src={src}
                  alt={`Foto de ${name}`}
                  className="cot-fade size-full object-cover"
                  onError={() => !pending && setBroken(true)}
                />
              ) : (
                <span className="text-[28px] font-semibold tracking-[-0.5px]">{initials}</span>
              )}
              {/* Capa al pasar el cursor / al arrastrar */}
              <span
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-[#09090B]/55 text-[11px] font-semibold text-white opacity-0 transition-opacity duration-200',
                  !busy && 'group-hover:opacity-100 group-focus-visible:opacity-100',
                  dragging && 'opacity-100',
                )}
                aria-hidden
              >
                <Camera className="size-5" />
                {dragging ? 'Suelta aquí' : src ? 'Cambiar' : 'Subir'}
              </span>
              {processing || removing ? (
                <span className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50" aria-hidden>
                  <Loader2 className="size-6 animate-spin text-[#1B5CFF]" />
                </span>
              ) : null}
            </span>
            <span
              className="absolute bottom-1 right-1 inline-flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#1B5CFF] text-white shadow-sm dark:border-[#111827] dark:bg-[#4B7CFF]"
              aria-hidden
            >
              <Camera className="size-3.5" />
            </span>
          </button>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={PROFILE_PHOTO_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => void pickFile(e.target.files?.[0])}
          />
        </div>

        <div className="min-w-0 flex-1 sm:pb-1">
          <h3 id={`${inputId}-title`} className="truncate text-[17px] font-semibold tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
            {name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">@{username}</span>
            <RoleBadge admin={admin} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#F0F0F2] bg-[#FAFAFA] px-5 py-3.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0" aria-live="polite">
          {error ? (
            <p className="text-[13px] font-medium text-[#C22B2B] dark:text-[#F87171]" role="alert">
              {error}
            </p>
          ) : pending ? (
            <p className="cot-fade inline-flex items-center gap-2 text-[13px] font-medium text-[#1244D1] dark:text-[#9BB6FF]">
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              Foto nueva: se guardará al pulsar «Guardar cambios».
            </p>
          ) : (
            <p id={hintId} className="text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
              Aparece en órdenes, proyectos y el portal del cliente. JPG, PNG o WebP; se recorta cuadrada.
            </p>
          )}
        </div>

        {confirmRemove ? (
          <div role="alertdialog" aria-label="Quitar foto de perfil" className="cot-pop flex shrink-0 items-center gap-2">
            <span className="text-[13px] text-[#9F1F1F] dark:text-[#FCA5A5]">¿Quitar la foto?</span>
            <button type="button" onClick={() => setConfirmRemove(false)} disabled={removing} className={cn(btn.secondary, btnSm)}>
              No
            </button>
            <button type="button" onClick={() => void removeStored()} disabled={removing} autoFocus className={cn(btn.danger, btnSm)}>
              {removing ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Quitar
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {pending ? (
              <button type="button" onClick={() => onPendingChange('')} disabled={busy} className={cn(btn.ghost, btnSm, 'px-3 text-[#52525B] dark:text-[#B7C1D1]')}>
                <RotateCcw aria-hidden />
                Deshacer
              </button>
            ) : stored ? (
              <button type="button" onClick={() => setConfirmRemove(true)} disabled={busy} className={cn(btn.dangerGhost, btnSm, 'px-3')}>
                <Trash2 aria-hidden />
                Quitar
              </button>
            ) : null}
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={cn(btn.secondary, btnSm)}>
              {processing ? <Loader2 className="animate-spin" aria-hidden /> : <ImageUp aria-hidden />}
              {src ? 'Cambiar foto' : 'Subir foto'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
