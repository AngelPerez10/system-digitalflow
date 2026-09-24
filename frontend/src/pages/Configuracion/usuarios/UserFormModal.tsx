/**
 * Alta y edición de usuarios.
 *
 * Alta: un solo formulario (rol → identidad → contraseña).
 * Edición: pestañas Cuenta (con foto de perfil) · Seguridad · Correo · Firma. Los paneles quedan
 * montados y se ocultan con `hidden`, así el trazo de la firma y lo capturado
 * no se pierden al cambiar de pestaña, y la entrada `cot-fade` se repite
 * al mostrarse.
 *
 * Las confirmaciones (quitar SMTP, borrar firma) son en línea, no modales
 * apilados: evitan dos trampas de foco y dos manejadores de Escape a la vez.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Check,
  Copy,
  Crown,
  HardHat,
  KeyRound,
  Loader2,
  Mail,
  PenLine,
  Trash2,
  UserPlus,
  UserRound,
  UserRoundPen,
  Wand2,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { AppModalFooter, AppModalHeader } from '@/components/ui/modal-kit/ModalKit';
import SignaturePad from '@/components/ui/signature/SignaturePad';
import { fetchApi } from '@/config/api';
import { cn } from '@/lib/utils';
import {
  displayName,
  emptyUserForm,
  initialsOf,
  errorMessage,
  generatePassword,
  isAdminUser,
  passwordScore,
  seedAdminPerms,
  validateUserForm,
  type FormTab,
  type Role,
  type UserAccount,
  type UserFormValues,
  type UserSignaturePayload,
} from './usuariosModel';
import { Field, InlineAlert, PasswordField, StatusPill } from './usuariosUi';
import { UserPhotoField } from './UserPhotoField';
import { btn, eyebrowClass, focusRing, formModalShellClass, hintClass } from './usuariosStyles';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  user: UserAccount | null;
  canDelegatePerms: boolean;
  onClose: () => void;
  onSaved: (user: UserAccount, message: string) => void;
  /** Cambios parciales ya persistidos (p. ej. quitar SMTP) sin cerrar el diálogo. */
  onPatched: (id: number, patch: Partial<UserAccount>, message: string) => void;
};

const TABS: { key: FormTab; label: string; icon: ReactNode }[] = [
  { key: 'cuenta', label: 'Cuenta', icon: <UserRound aria-hidden /> },
  { key: 'seguridad', label: 'Seguridad', icon: <KeyRound aria-hidden /> },
  { key: 'correo', label: 'Correo', icon: <Mail aria-hidden /> },
  { key: 'firma', label: 'Firma', icon: <PenLine aria-hidden /> },
];

export default function UserFormModal({ open, mode, user, canDelegatePerms, onClose, onSaved, onPatched }: Props) {
  const isEdit = mode === 'edit' && !!user;
  const titleId = useId();
  const descId = useId();
  const tabsId = useId();

  const [form, setForm] = useState<UserFormValues>(() =>
    isEdit && user
      ? {
          ...emptyUserForm,
          username: user.username,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          role: isAdminUser(user) ? 'admin' : 'tecnico',
          smtp_email: user.smtp_email || '',
        }
      : { ...emptyUserForm },
  );
  const [tab, setTab] = useState<FormTab>('cuenta');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [showSmtpPw, setShowSmtpPw] = useState(false);
  const [copied, setCopied] = useState(false);

  const [smtpConfigured, setSmtpConfigured] = useState(!!user?.smtp_configured);
  const [confirmSmtp, setConfirmSmtp] = useState(false);
  const [clearingSmtp, setClearingSmtp] = useState(false);

  const [signature, setSignature] = useState('');
  const [sigLoading, setSigLoading] = useState(isEdit);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [confirmSig, setConfirmSig] = useState(false);

  /** Foto guardada en el servidor y foto nueva pendiente de subir (data URL). */
  const [photoUrl, setPhotoUrl] = useState(user?.avatar_url || '');
  const [photoPending, setPhotoPending] = useState('');

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const busy = saving || clearingSmtp || sigSaving;
  const set = <K extends keyof UserFormValues>(k: K, v: UserFormValues[K]) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open || !isEdit || !user) return;
    let alive = true;
    fetchApi(`/api/users/accounts/${user.id}/signature/`, { method: 'GET', cache: 'no-store' as RequestCache })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as UserSignaturePayload | null;
        if (!res.ok) throw new Error((data as { detail?: string } | null)?.detail || 'No se pudo cargar la firma');
        if (alive) setSignature(data?.url || '');
      })
      .catch((e: unknown) => alive && setSigError(errorMessage(e)))
      .finally(() => alive && setSigLoading(false));
    return () => {
      alive = false;
    };
    // Solo al abrir: el componente se re-monta (key) en cada apertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const showError = (message: string, where?: FormTab) => {
    setError(message);
    if (where && isEdit) setTab(where);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    setError(null);
    const invalid = validateUserForm(form, isEdit ? 'edit' : 'create');
    if (invalid) {
      showError(invalid.message, invalid.tab);
      return;
    }
    setSaving(true);
    try {
      if (!isEdit || !user) {
        const res = await fetchApi('/api/users/accounts/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username.trim(),
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim(),
            is_staff: form.role === 'admin',
            is_superuser: form.role === 'admin',
            password: form.password,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.detail || 'Error al crear usuario');
        const createdId = (data as { id?: unknown } | null)?.id;
        if (form.role === 'admin' && typeof createdId === 'number' && canDelegatePerms) {
          await seedAdminPerms(createdId);
        }
        onSaved(data as UserAccount, 'Usuario creado');
        return;
      }

      const hasNewSignature = !!signature && signature.startsWith('data:') && signature.includes(';base64,');
      const payload: Record<string, unknown> = {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        is_staff: form.role === 'admin',
        is_superuser: form.role === 'admin',
        smtp_email: form.smtp_email.trim(),
      };
      if (form.password || form.password2) {
        payload.password = form.password;
        payload.password2 = form.password2;
      }
      if (form.smtp_password.trim()) payload.smtp_password = form.smtp_password.trim();

      const res = await fetchApi(`/api/users/accounts/${user.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al actualizar usuario');

      if (hasNewSignature) {
        const resSig = await fetchApi(`/api/users/accounts/${user.id}/signature/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature }),
        });
        const dataSig = (await resSig.json().catch(() => null)) as UserSignaturePayload | null;
        if (!resSig.ok) throw new Error((dataSig as { detail?: string } | null)?.detail || 'Error al guardar la firma');
        setSignature(dataSig?.url || '');
      }

      let avatarUrl = photoUrl;
      if (photoPending) {
        const resPhoto = await fetchApi(`/api/users/accounts/${user.id}/avatar/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: photoPending }),
        });
        const dataPhoto = (await resPhoto.json().catch(() => null)) as { avatar_url?: string; detail?: string } | null;
        if (!resPhoto.ok) throw new Error(dataPhoto?.detail || 'Error al guardar la foto de perfil');
        avatarUrl = dataPhoto?.avatar_url || '';
        setPhotoUrl(avatarUrl);
        setPhotoPending('');
      }

      const wasAdmin = !!user.is_superuser || !!user.is_staff;
      if (!wasAdmin && form.role === 'admin' && canDelegatePerms) {
        await seedAdminPerms(user.id);
      }
      onSaved({ ...(data as UserAccount), avatar_url: avatarUrl }, 'Usuario actualizado');
    } catch (e) {
      showError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const clearSmtp = async () => {
    if (!user) return;
    setError(null);
    setClearingSmtp(true);
    try {
      const res = await fetchApi(`/api/users/accounts/${user.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smtp_clear: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as { detail?: string } | null)?.detail || 'No se pudieron quitar las credenciales SMTP');
      setSmtpConfigured(false);
      setForm((p) => ({ ...p, smtp_email: '', smtp_password: '' }));
      onPatched(user.id, { ...(data as UserAccount), smtp_configured: false, smtp_email: '' }, 'Credenciales SMTP eliminadas');
    } catch (e) {
      showError(errorMessage(e));
    } finally {
      setClearingSmtp(false);
      setConfirmSmtp(false);
    }
  };

  const deleteSignature = async () => {
    if (!user) return;
    setSigError(null);
    setSigSaving(true);
    try {
      const res = await fetchApi(`/api/users/accounts/${user.id}/signature/`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as UserSignaturePayload | null;
      if (!res.ok) throw new Error((data as { detail?: string } | null)?.detail || 'No se pudo borrar la firma');
      setSignature('');
      onPatched(user.id, {}, 'Firma eliminada');
    } catch (e) {
      setSigError(errorMessage(e));
    } finally {
      setSigSaving(false);
      setConfirmSig(false);
    }
  };

  const removeStoredPhoto = async () => {
    if (!user) return;
    const res = await fetchApi(`/api/users/accounts/${user.id}/avatar/`, { method: 'DELETE' });
    const data = (await res.json().catch(() => null)) as { detail?: string } | null;
    if (!res.ok) throw new Error(data?.detail || 'No se pudo quitar la foto');
    setPhotoUrl('');
    onPatched(user.id, { avatar_url: '' }, 'Foto de perfil eliminada');
  };

  const suggestPassword = () => {
    const pw = generatePassword(form.username, form.first_name, form.last_name);
    setForm((p) => ({ ...p, password: pw, password2: pw }));
    setShowPw(true);
    setShowPw2(false);
  };

  const copyPassword = () => {
    if (!form.password || !navigator.clipboard) return;
    void navigator.clipboard.writeText(form.password).then(() => setCopied(true), () => {});
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.key === tab);
    const next =
      e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setTab(TABS[next].key);
    document.getElementById(`${tabsId}-tab-${TABS[next].key}`)?.focus();
  };

  const hasStoredSignature = !!signature && !signature.startsWith('data:');
  const tabDot: Partial<Record<FormTab, boolean>> = { correo: smtpConfigured, firma: !!signature };

  /* ---------------------------------------------------------------------- */

  const rolePicker = (
    <fieldset>
      <legend className={cn(eyebrowClass, 'mb-3')}>Rol en el sistema</legend>
      <div role="radiogroup" aria-label="Rol" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {(
          [
            { value: 'tecnico', title: 'Técnico', desc: 'Trabaja sus propias órdenes, proyectos y reportes.', icon: <HardHat aria-hidden /> },
            { value: 'admin', title: 'Administrador', desc: 'Gestiona la operación, el equipo y la configuración.', icon: <Crown aria-hidden /> },
          ] as { value: Role; title: string; desc: string; icon: ReactNode }[]
        ).map((o) => {
          const on = form.role === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => set('role', o.value)}
              className={cn(
                'cot-press relative flex items-start gap-3 rounded-[14px] border p-3.5 text-left',
                on
                  ? 'border-[#1B5CFF] bg-[rgba(27,92,255,0.04)] shadow-[0_0_0_3px_rgba(27,92,255,0.12)] dark:border-[#4B7CFF] dark:bg-[rgba(75,124,255,0.08)]'
                  : 'border-[#E4E4E7] bg-white hover:border-[#D4D4D8] dark:border-[#273244] dark:bg-[#0F172A] dark:hover:border-[#3A4661]',
                focusRing,
              )}
            >
              <span
                className={cn(
                  'inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-200 [&_svg]:size-[18px]',
                  on
                    ? o.value === 'admin'
                      ? 'bg-[rgba(230,162,60,0.18)] text-[#9A6B15] dark:text-[#E6A23C]'
                      : 'bg-[rgba(27,92,255,0.12)] text-[#1B5CFF] dark:text-[#9BB6FF]'
                    : 'bg-[#F4F4F5] text-[#71717A] dark:bg-[#1B2539] dark:text-[#8EA0B8]',
                )}
              >
                {o.icon}
              </span>
              <span className="min-w-0 flex-1 pr-6">
                <span className="block text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] leading-[18px] text-[#71717A] dark:text-[#8EA0B8]">{o.desc}</span>
              </span>
              <span
                className={cn(
                  'absolute right-3.5 top-3.5 inline-flex size-5 items-center justify-center rounded-full border transition-colors duration-200',
                  on ? 'border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]' : 'border-[#D4D4D8] dark:border-[#3A4661]',
                )}
                aria-hidden
              >
                {on ? <Check className="cot-tick size-3" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
      {form.role === 'admin' ? (
        <p className={cn(hintClass, 'cot-fade')}>
          {canDelegatePerms
            ? 'Se le otorgará acceso completo a todos los módulos. Puedes ajustarlo después en Permisos.'
            : 'Tendrá los permisos predeterminados; solo Angel Pérez o Ivan Cruz pueden ampliarlos.'}
        </p>
      ) : null}
    </fieldset>
  );

  const identity = (
    <fieldset className="space-y-4">
      <legend className={cn(eyebrowClass, 'mb-3')}>Identidad</legend>
      <Field
        label="Nombre de usuario"
        required
        value={form.username}
        onValue={(v) => set('username', v)}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={150}
        hint="Con él inicia sesión. Letras, dígitos y @ . + - _"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre(s)" value={form.first_name} onValue={(v) => set('first_name', v)} autoComplete="off" />
        <Field label="Apellidos" value={form.last_name} onValue={(v) => set('last_name', v)} autoComplete="off" />
      </div>
      <Field
        label="Correo electrónico"
        type="email"
        inputMode="email"
        value={form.email}
        onValue={(v) => set('email', v)}
        autoComplete="off"
        placeholder="nombre@empresa.com"
      />
    </fieldset>
  );

  const score = passwordScore(form.password);
  const scoreMeta = [
    { label: 'Sin contraseña', color: '' },
    { label: 'Débil', color: 'bg-[#C22B2B]' },
    { label: 'Aceptable', color: 'bg-[#E6A23C]' },
    { label: 'Buena', color: 'bg-[#22A06B]' },
    { label: 'Fuerte', color: 'bg-[#04724D]' },
  ][score];
  const checks = [
    { ok: form.password.length >= 8, label: 'Mínimo 8 caracteres' },
    { ok: !!form.password && !/^\d+$/.test(form.password), label: 'No solo números' },
    { ok: !!form.password && form.password === form.password2, label: 'Las contraseñas coinciden' },
  ];
  const showPwFeedback = !isEdit || !!form.password || !!form.password2;

  const passwordBlock = (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className={eyebrowClass}>{isEdit ? 'Cambiar contraseña' : 'Contraseña de acceso'}</h3>
          {isEdit ? <p className={hintClass}>Opcional: déjala vacía para conservar la actual.</p> : null}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={suggestPassword} className={cn(btn.ghost, 'h-10 px-3 text-[14px]')}>
            <Wand2 aria-hidden />
            Sugerir segura
          </button>
          {form.password ? (
            <button
              type="button"
              onClick={copyPassword}
              className={cn(btn.ghost, 'h-10 px-3 text-[14px] text-[#52525B] dark:text-[#B7C1D1]')}
              aria-live="polite"
            >
              {copied ? <Check className="cot-tick text-[#04724D] dark:text-[#4ADE80]" aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Copiada' : 'Copiar'}
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PasswordField
          label={isEdit ? 'Nueva contraseña' : 'Contraseña'}
          required={!isEdit}
          value={form.password}
          onValue={(v) => set('password', v)}
          visible={showPw}
          onToggleVisible={() => setShowPw((v) => !v)}
          placeholder={isEdit ? 'Sin cambios' : 'Mínimo 8 caracteres'}
        />
        <PasswordField
          label="Confirmación"
          required={!isEdit}
          value={form.password2}
          onValue={(v) => set('password2', v)}
          visible={showPw2}
          onToggleVisible={() => setShowPw2((v) => !v)}
          placeholder="Repite la contraseña"
        />
      </div>
      {showPwFeedback ? (
        <div className="rounded-[14px] border border-[#F0F0F2] bg-[#FAFAFA] p-3.5 dark:border-[#1F2A3C] dark:bg-[#0F172A]/60">
          <div className="flex items-center justify-between gap-3 text-[12px]">
            <span className="font-medium text-[#52525B] dark:text-[#B7C1D1]">Seguridad</span>
            <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]" aria-live="polite">
              {scoreMeta.label}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={cn(
                  'h-1.5 rounded-full transition-colors duration-300',
                  n <= score ? scoreMeta.color : 'bg-[#E4E4E7] dark:bg-[#273244]',
                )}
              />
            ))}
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {checks.map((c) => (
              <li
                key={c.label}
                className={cn(
                  'flex items-center gap-1.5 text-[12.5px] transition-colors duration-200',
                  c.ok ? 'text-[#04724D] dark:text-[#4ADE80]' : 'text-[#71717A] dark:text-[#8EA0B8]',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                    c.ok ? 'bg-[#04724D] text-white dark:bg-[#22A06B]' : 'border border-[#D4D4D8] dark:border-[#3A4661]',
                  )}
                  aria-hidden
                >
                  {c.ok ? <Check className="cot-tick size-2.5" strokeWidth={3.5} /> : null}
                </span>
                {c.label}
                <span className="sr-only">{c.ok ? '(cumple)' : '(pendiente)'}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );

  const smtpBlock = (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={eyebrowClass}>Correo de envío (SMTP)</h3>
          <p className={cn(hintClass, 'max-w-[52ch]')}>
            Buzón Intrax con el que este usuario envía los PDF de órdenes y cotizaciones. La contraseña del webmail no se
            vuelve a mostrar.
          </p>
        </div>
        <StatusPill ok={smtpConfigured} okLabel="Correo listo" offLabel="Sin configurar" />
      </div>
      <Field
        label="Correo SMTP"
        type="email"
        inputMode="email"
        value={form.smtp_email}
        onValue={(v) => set('smtp_email', v)}
        placeholder="usuario@intrax.mx"
        autoComplete="off"
      />
      <PasswordField
        label="Contraseña del webmail"
        value={form.smtp_password}
        onValue={(v) => set('smtp_password', v)}
        visible={showSmtpPw}
        onToggleVisible={() => setShowSmtpPw((v) => !v)}
        placeholder={smtpConfigured ? 'Déjala vacía para conservar la actual' : 'Contraseña del webmail'}
      />
      {smtpConfigured ? (
        <InlineConfirm
          open={confirmSmtp}
          busy={clearingSmtp}
          triggerLabel="Quitar credenciales SMTP"
          question="Se borrarán el correo y la contraseña. No podrá enviar PDF hasta configurarlos de nuevo."
          confirmLabel="Quitar credenciales"
          onOpen={() => setConfirmSmtp(true)}
          onCancel={() => setConfirmSmtp(false)}
          onConfirm={() => void clearSmtp()}
        />
      ) : null}
    </section>
  );

  const signatureBlock = (
    <section className="space-y-4">
      <div>
        <h3 className={eyebrowClass}>Firma digital</h3>
        <p className={hintClass}>Se imprime como «Firma del encargado» en las órdenes de servicio.</p>
      </div>
      {sigError ? <InlineAlert title="Firma">{sigError}</InlineAlert> : null}
      {sigLoading ? (
        <div className="flex h-[196px] items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#E4E4E7] text-[13px] text-[#71717A] dark:border-[#273244] dark:text-[#8EA0B8]">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Cargando firma…
        </div>
      ) : hasStoredSignature ? (
        <div className="cot-fade space-y-3">
          <div className="flex items-center justify-center rounded-[14px] border border-[#E4E4E7] bg-white p-3 dark:border-[#273244]">
            <img src={signature} alt="Firma registrada del usuario" className="max-h-[180px] w-full max-w-[420px] object-contain" />
          </div>
          <InlineConfirm
            open={confirmSig}
            busy={sigSaving}
            triggerLabel="Borrar firma"
            question="La firma se eliminará de inmediato. Esta acción no se puede deshacer."
            confirmLabel="Borrar firma"
            onOpen={() => setConfirmSig(true)}
            onCancel={() => setConfirmSig(false)}
            onConfirm={() => void deleteSignature()}
          />
        </div>
      ) : (
        <div className="cot-fade space-y-2">
          <SignaturePad value={signature} onChange={setSignature} width={420} height={180} />
          {signature ? <p className={hintClass}>La nueva firma se guardará al pulsar «Guardar cambios».</p> : null}
        </div>
      )}
    </section>
  );

  const panels: Record<FormTab, ReactNode> = {
    cuenta: (
      <div className="space-y-7">
        {user ? (
          <UserPhotoField
            storedUrl={photoUrl}
            pending={photoPending}
            onPendingChange={setPhotoPending}
            onRemoveStored={removeStoredPhoto}
            name={`${form.first_name} ${form.last_name}`.trim() || displayName(user)}
            username={form.username.trim() || user.username}
            initials={initialsOf({ ...user, first_name: form.first_name, last_name: form.last_name, username: form.username })}
            admin={form.role === 'admin'}
            disabled={saving}
          />
        ) : null}
        {rolePicker}
        {identity}
      </div>
    ),
    seguridad: passwordBlock,
    correo: smtpBlock,
    firma: signatureBlock,
  };

  return (
    <Modal
      mobileBottomSheet
      isOpen={open}
      onClose={() => !busy && onClose()}
      closeOnBackdropClick={false}
      closeOnEscape={!busy}
      showCloseButton={false}
      className={formModalShellClass}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
      >
        <AppModalHeader
          tone={isEdit ? 'info' : 'success'}
          icon={isEdit ? <UserRoundPen className="size-5" /> : <UserPlus className="size-5" />}
          eyebrow={isEdit ? 'Editar usuario' : 'Usuarios'}
          title={isEdit && user ? displayName(user) : 'Nuevo usuario'}
          titleId={titleId}
          description={
            isEdit && user
              ? `@${user.username} · Actualiza su foto, datos, acceso, correo de envío o firma.`
              : 'Crea una cuenta de Técnico o Administrador con una contraseña segura.'
          }
          descriptionId={descId}
          onClose={onClose}
          closeDisabled={busy}
          divided={!isEdit}
        />

        {isEdit ? (
          <div
            role="tablist"
            aria-label="Secciones del usuario"
            onKeyDown={onTabKey}
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#F0F0F2] px-4 [scrollbar-width:none] dark:border-[#1F2A3C] sm:px-5"
          >
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  id={`${tabsId}-tab-${t.key}`}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={`${tabsId}-panel-${t.key}`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-[14px] font-medium transition-colors duration-150 [&_svg]:size-4',
                    on
                      ? 'text-[#09090B] dark:text-[#F8FAFC]'
                      : 'text-[#71717A] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40',
                  )}
                >
                  {t.icon}
                  {t.label}
                  {tabDot[t.key] ? (
                    <>
                      <span className="size-1.5 rounded-full bg-[#22A06B]" aria-hidden />
                      <span className="sr-only">(configurado)</span>
                    </>
                  ) : null}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-x-2 -bottom-px h-0.5 origin-center rounded-full bg-[#1B5CFF] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#4B7CFF]',
                      on ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          ref={bodyRef}
          className={cn(
            'custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6',
            isEdit && 'sm:min-h-[27rem]',
          )}
        >
          {error ? (
            <div className="mb-5">
              <InlineAlert title="Revisa la información">{error}</InlineAlert>
            </div>
          ) : null}

          {isEdit ? (
            TABS.map((t) => (
              <section
                key={t.key}
                id={`${tabsId}-panel-${t.key}`}
                role="tabpanel"
                aria-labelledby={`${tabsId}-tab-${t.key}`}
                hidden={tab !== t.key}
                className="cot-fade"
              >
                {panels[t.key]}
              </section>
            ))
          ) : (
            <div className="space-y-7">
              {rolePicker}
              {identity}
              {passwordBlock}
            </div>
          )}
        </div>

        <AppModalFooter
          note={isEdit ? 'Los cambios de todas las pestañas se guardan juntos.' : 'Podrá iniciar sesión en cuanto se cree la cuenta.'}
        >
          <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>
            Cancelar
          </button>
          <button type="submit" disabled={busy || sigLoading} aria-busy={saving} className={btn.primary}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {saving ? (isEdit ? 'Guardando…' : 'Creando…') : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </AppModalFooter>
      </form>
    </Modal>
  );
}

/** Acción destructiva con confirmación en el mismo lugar. */
function InlineConfirm({
  open,
  busy,
  triggerLabel,
  question,
  confirmLabel,
  onOpen,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  triggerLabel: string;
  question: string;
  confirmLabel: string;
  onOpen: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return (
      <button type="button" onClick={onOpen} className={cn(btn.dangerGhost, '-ml-3 h-10 px-3 text-[14px]')}>
        <Trash2 aria-hidden />
        {triggerLabel}
      </button>
    );
  }
  return (
    <div
      role="alertdialog"
      aria-label={triggerLabel}
      className="cot-pop flex flex-col gap-3 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] p-3.5 dark:border-[#7F1D1D] dark:bg-[#3F1518] sm:flex-row sm:items-center"
    >
      <p className="min-w-0 flex-1 text-[13px] leading-[19px] text-[#9F1F1F] dark:text-[#FCA5A5]">{question}</p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className={cn(btn.secondary, 'h-10 flex-1 px-4 text-[14px] sm:flex-none')}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          autoFocus
          className={cn(btn.danger, 'h-10 flex-1 px-4 text-[14px] sm:flex-none')}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {busy ? 'Eliminando…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}
