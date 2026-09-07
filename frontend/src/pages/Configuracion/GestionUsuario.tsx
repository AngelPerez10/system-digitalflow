import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { Link, useNavigate } from 'react-router-dom';
import ComponentCard from '@/components/common/ComponentCard';
import Label from '@/components/form/Label';
import Input from '@/components/form/input/InputField';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from '@/components/ui/modal';
import SignaturePad from '@/components/ui/signature/SignaturePad';
import { fetchApi, resolveMediaUrl } from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { EyeCloseIcon, EyeIcon, MoreDotIcon } from '@/icons';
type Role = 'admin' | 'tecnico';

type CrudPerms = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  own_only?: boolean;
};

type UserSignaturePayload = {
  user: number;
  url: string;
  public_id: string;
  updated_at: string;
};

type PermissionsPayload = {
  ordenes?: Partial<CrudPerms>;
  proyectos?: Partial<CrudPerms>;
  inventario?: Partial<CrudPerms>;
  clientes?: Partial<CrudPerms>;
  productos?: Partial<CrudPerms>;
  servicios?: Partial<CrudPerms>;
  cotizaciones?: Partial<CrudPerms>;
  tareas?: Partial<CrudPerms>;
  usuarios?: Partial<CrudPerms>;
  reportes?: Partial<CrudPerms>;
  cuentas_antarix?: Partial<CrudPerms>;
  polizas?: Partial<CrudPerms>;
  reportes_mantenimiento?: Partial<CrudPerms>;
};

type UserAccount = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  password_enabled?: boolean;
  role?: Role;
  smtp_email?: string;
  smtp_configured?: boolean;
  avatar_url?: string;
};

type NewUserForm = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  password: string;
  password2: string;
};

type EditUserForm = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  password: string;
  password2: string;
  smtp_email: string;
  smtp_password: string;
};

const emptyForm: NewUserForm = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'tecnico',
  password: '',
  password2: '',
};

const emptyEditForm: EditUserForm = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'tecnico',
  password: '',
  password2: '',
  smtp_email: '',
  smtp_password: '',
};

/* Mismo sistema que Perfil/ProfilePage: marino + dorado sobre lienzo blanco,
   azul eléctrico como único acento de acción, líneas de 1 px. */
const searchInputClass =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white pl-10 pr-10 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors placeholder:text-[#A1A1AA] hover:border-[#D3D3D8] focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:placeholder:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

const claudeSubheadingClass =
  "text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]";

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]";

const bodyMutedClass = "text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]";

const claudeSansStyle = { fontFamily: "Geist, Outfit, system-ui, sans-serif" } as const;

const filterBtnClass =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[14px] font-medium text-[#09090B] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048]";

const primaryOrangeBtnClass =
  "inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-6 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,border-color,transform] duration-150 hover:border-[#1244D1] hover:bg-[#1244D1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0] sm:h-11 sm:w-auto";

const secondaryOutlineBtnClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-5 text-[15px] font-medium tracking-[-0.1px] text-[#09090B] transition-[background-color,border-color,transform] duration-150 hover:border-[#D3D3D8] hover:bg-[#FAFAFA] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048] sm:h-11 sm:w-auto";

/* --- Sistema de modales -------------------------------------------------
   Cascaron blanco, cabecera marina (la misma banda de la pagina), cuerpo en
   lienzo y pie hundido con las acciones ancladas. Un solo lenguaje para los
   seis dialogos. */
const modalShellClass =
  "flex max-h-[min(92vh,840px)] w-[min(94vw,44rem)] flex-col overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:max-w-2xl";

const modalSmallShellClass =
  "w-full max-w-md overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]";

const modalHeaderClass =
  "relative shrink-0 bg-[#17235B] px-6 py-5 pr-16 dark:bg-[#1B2A63]";

const modalHeaderIconClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]";

const modalEyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55";

const modalTitleClass =
  "text-[20px] font-semibold leading-[1.25] tracking-[-0.5px] text-white";

const modalSubtitleClass = "mt-1 text-[14px] leading-[20px] text-white/70";

const modalBodyClass =
  "custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-[#111827] sm:px-6";

const modalFooterClass =
  "shrink-0 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:px-6";

const modalSectionClass =
  "rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#1B2539] sm:p-5";

const dangerBtnClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#C22B2B] bg-[#C22B2B] px-5 text-[15px] font-medium tracking-[-0.1px] text-white transition-[background-color,transform] duration-150 hover:bg-[#A82424] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(194,43,43,0.22)] disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-auto";

const selectFieldClass =
  "h-11 w-full rounded-[10px] border border-[#E7E7EA] bg-white px-3 text-[15px] tracking-[-0.1px] text-[#09090B] outline-none transition-colors focus:border-[#1B5CFF] focus:ring-4 focus:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#F8FAFC] dark:focus:border-[#4B7CFF] dark:focus:ring-[rgba(75,124,255,0.28)]";

/** Usuarios que pueden asignar permisos (ver/crear/editar/eliminar) a otros, incluidos administradores. */
const PERMISSION_DELEGATION_USERNAMES = new Set(['angelperez10', 'ivancruz01']);

const isProtectedPrincipalUsername = (username: string): boolean =>
  PERMISSION_DELEGATION_USERNAMES.has((username || '').trim().toLowerCase());

const seedAdminPerms = async (userId: number) => {
  const full: Required<PermissionsPayload> = {
    ordenes: { view: true, create: true, edit: true, delete: true, own_only: false },
    proyectos: { view: true, create: true, edit: true, delete: true, own_only: false },
    inventario: { view: true, create: true, edit: true, delete: true },
    clientes: { view: true, create: true, edit: true, delete: true },
    productos: { view: true, create: true, edit: true, delete: true },
    servicios: { view: true, create: true, edit: true, delete: true },
    cotizaciones: { view: true, create: true, edit: true, delete: true, own_only: false },
    tareas: { view: true, create: true, edit: true, delete: true },
    usuarios: { view: true, create: true, edit: true, delete: true },
    reportes: { view: true, create: true, edit: true, delete: true },
    cuentas_antarix: { view: true, create: true, edit: true, delete: true },
    polizas: { view: true, create: true, edit: true, delete: true },
    reportes_mantenimiento: { view: true, create: true, edit: true, delete: true },
  };
  const res = await fetchApi(`/api/users/accounts/${userId}/permissions/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions: full }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || 'No se pudieron guardar permisos por defecto');
};

const generatePassword = (username: string, firstName: string, lastName: string) => {
  const avoid = new Set(
    [username, firstName, lastName]
      .map((s) => (s || '').toLowerCase().trim())
      .filter(Boolean)
  );

  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%*_-+=';
  const all = upper + lower + digits + symbols;

  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const shuffle = (arr: string[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  for (let attempt = 0; attempt < 10; attempt++) {
    const chars = [rand(upper), rand(lower), rand(digits), rand(symbols)];
    while (chars.length < 14) chars.push(rand(all));
    const pw = shuffle(chars).join('');

    const low = pw.toLowerCase();
    let tooSimilar = false;
    for (const a of avoid) {
      if (a.length >= 3 && low.includes(a)) {
        tooSimilar = true;
        break;
      }
    }
    if (!tooSimilar) return pw;
  }

  return 'Atr@' + Math.random().toString(36).slice(2, 10) + '9!';
};

export default function UserProfiles() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const createModalTitleId = useId();
  const permsModalTitleId = useId();
  const editModalTitleId = useId();
  const deleteSignatureModalTitleId = useId();
  const deleteSmtpModalTitleId = useId();
  const deleteUserModalTitleId = useId();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<NewUserForm>({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isAdminUser = (u: UserAccount) => {
    const explicitRole = String((u as any)?.role ?? '').trim().toLowerCase();
    return explicitRole === 'admin' || !!u.is_superuser || !!u.is_staff;
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserAccount | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({ ...emptyEditForm });
  const [editError, setEditError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditPassword2, setShowEditPassword2] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const [signatureLoading, setSignatureLoading] = useState(false);
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [signatureValue, setSignatureValue] = useState<string>('');

  const [confirmDeleteSignature, setConfirmDeleteSignature] = useState(false);
  const [confirmDeleteSmtp, setConfirmDeleteSmtp] = useState(false);
  const [clearingSmtp, setClearingSmtp] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingActiveId, setTogglingActiveId] = useState<number | null>(null);

  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [permsUser, setPermsUser] = useState<UserAccount | null>(null);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsForm, setPermsForm] = useState<PermissionsPayload>({});

  const didInitRef = useRef(false);
  const canDelegatePerms = useMemo(
    () => PERMISSION_DELEGATION_USERNAMES.has((authUser?.username || '').trim().toLowerCase()),
    [authUser?.username],
  );

  const normalizePerms = (p: any, options?: { isAdmin?: boolean }): Required<PermissionsPayload> => {
    const isAdmin = !!options?.isAdmin;
    const base: Required<PermissionsPayload> = {
      ordenes: { view: true, create: false, edit: false, delete: false, own_only: isAdmin ? false : true },
      proyectos: { view: false, create: false, edit: false, delete: false, own_only: isAdmin ? false : true },
      inventario: { view: false, create: false, edit: false, delete: false },
      clientes: { view: true, create: false, edit: false, delete: false },
      productos: { view: true, create: false, edit: false, delete: false },
      servicios: { view: true, create: false, edit: false, delete: false },
      cotizaciones: { view: true, create: false, edit: false, delete: false, own_only: false },
      tareas: { view: true, create: false, edit: false, delete: false },
      usuarios: { view: true, create: false, edit: false, delete: false },
      reportes: { view: true, create: true, edit: false, delete: false },
      cuentas_antarix: { view: false, create: false, edit: false, delete: false },
      polizas: { view: false, create: false, edit: false, delete: false },
      reportes_mantenimiento: { view: false, create: false, edit: false, delete: false },
    };
    const safe = (v: any) => (typeof v === 'boolean' ? v : undefined);
    const mergeCrud = (dst: any, src: any) => {
      if (!src || typeof src !== 'object') return dst;
      return {
        view: safe(src.view) ?? dst.view,
        create: safe(src.create) ?? dst.create,
        edit: safe(src.edit) ?? dst.edit,
        delete: safe(src.delete) ?? dst.delete,
        own_only: safe(src.own_only) ?? dst.own_only,
      };
    };
    return {
      ordenes: mergeCrud(base.ordenes, p?.ordenes),
      proyectos: mergeCrud(base.proyectos, p?.proyectos),
      inventario: mergeCrud(base.inventario, p?.inventario),
      clientes: mergeCrud(base.clientes, p?.clientes),
      productos: mergeCrud(base.productos, p?.productos),
      servicios: mergeCrud(base.servicios, p?.servicios),
      cotizaciones: mergeCrud(base.cotizaciones, p?.cotizaciones),
      tareas: mergeCrud(base.tareas, p?.tareas),
      usuarios: mergeCrud(base.usuarios, p?.usuarios),
      reportes: mergeCrud(base.reportes, p?.reportes),
      cuentas_antarix: mergeCrud(base.cuentas_antarix, p?.cuentas_antarix),
      polizas: mergeCrud(base.polizas, p?.polizas),
      reportes_mantenimiento: mergeCrud(base.reportes_mantenimiento, p?.reportes_mantenimiento),
    };
  };

  const openPerms = async (u: UserAccount) => {
    setOpenMenuId(null);
    setPermsUser(u);
    setPermsError(null);
    setSuccess(null);
    setIsPermsOpen(true);
    setPermsLoading(true);
    try {
      const res = await fetchApi(`/api/users/accounts/${u.id}/permissions/`, {
        method: 'GET',
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'No se pudieron cargar los permisos');
      setPermsForm(normalizePerms(data?.permissions || {}, { isAdmin: isAdminUser(u) }));
    } catch (e: any) {
      setPermsError(e?.message || 'Error');
      setPermsForm(normalizePerms({}, { isAdmin: isAdminUser(u) }));
    } finally {
      setPermsLoading(false);
    }
  };

  const closePerms = () => {
    if (permsSaving) return;
    setIsPermsOpen(false);
    setPermsUser(null);
    setPermsError(null);
  };

  const setPerm = (area: keyof Required<PermissionsPayload>, key: keyof CrudPerms, value: boolean) => {
    if (!canDelegatePerms) return;
    setPermsForm((prev) => {
      const cur = normalizePerms(prev, { isAdmin: !!(permsUser?.is_superuser || permsUser?.is_staff) });
      return {
        ...cur,
        [area]: {
          ...(cur[area] as any),
          [key]: value,
        },
      } as any;
    });
  };

  const savePerms = async () => {
    if (!permsUser) return;
    if (!canDelegatePerms) {
      setPermsError('Solo Angel Pérez e Ivan Cruz pueden modificar permisos de usuarios.');
      return;
    }
    setPermsError(null);
    setSuccess(null);
    setPermsSaving(true);
    try {
      const isAdmin = permsUser.is_superuser || permsUser.is_staff;
      const merged = normalizePerms(permsForm, { isAdmin });
      const payloadPerms = isAdmin
        ? permsForm
        : {
            ...permsForm,
            // Cotizaciones: los técnicos pueden tener permisos granulares (ver/crear/editar/eliminar)
            cotizaciones: merged.cotizaciones,
            productos: merged.productos,
            servicios: merged.servicios,
            cuentas_antarix: merged.cuentas_antarix,
            usuarios: { view: false, create: false, edit: false, delete: false },
            reportes: { ...merged.reportes, delete: false },
          };

      const res = await fetchApi(`/api/users/accounts/${permsUser.id}/permissions/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: payloadPerms }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'No se pudieron guardar los permisos');

      if (authUser && typeof authUser.id === 'number' && authUser.id === permsUser.id) {
        window.dispatchEvent(new Event('permissions:updated'));
      }

      if (authUser && typeof authUser.id === 'number' && authUser.id === permsUser.id) {
        const effective = isAdmin ? merged.usuarios : (payloadPerms as PermissionsPayload).usuarios;
        if (effective && effective.view === false) {
          navigate('/', { replace: true });
          setPermsSaving(false);
          return;
        }
      }

      setSuccess('Permisos actualizados');
      setIsPermsOpen(false);
      setPermsUser(null);
    } catch (e: any) {
      setPermsError(e?.message || 'Error');
    } finally {
      setPermsSaving(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchApi('/api/users/accounts/', {
        method: 'GET',
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al cargar usuarios');
      const rows = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setUsers(rows);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadUsers();
  }, []);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(id);
  }, [success]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (openMenuId != null && menuRef.current && !menuRef.current.contains(e.target as any)) {
        setOpenMenuId(null);
      }
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target as any)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenuId, filterOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => {
        const isAdmin = isAdminUser(u);
        if (roleFilter === 'admin' && !isAdmin) return false;
        if (roleFilter === 'tecnico' && isAdmin) return false;
        return true;
      })
      .filter((u) => {
        if (!q) return true;
        const full = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
        return (
          u.username.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          full.includes(q)
        );
      })
      .sort((a, b) => {
        const aAdmin = isAdminUser(a);
        const bAdmin = isAdminUser(b);
        if (aAdmin !== bAdmin) return aAdmin ? -1 : 1;
        const an = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase() || a.username.toLowerCase();
        const bn = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase() || b.username.toLowerCase();
        return an.localeCompare(bn);
      });
  }, [users, query, roleFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    let admins = 0;
    let tecnicos = 0;
    for (const u of users) {
      const isAdmin = isAdminUser(u);
      if (isAdmin) admins++;
      else tecnicos++;
    }
    return { total, admins, tecnicos };
  }, [users]);

  const openCreate = () => {
    setFormError(null);
    setSuccess(null);
    setForm({ ...emptyForm });
    setShowPassword(false);
    setShowPassword2(false);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setIsCreateOpen(false);
  };

  const openEdit = (u: UserAccount) => {
    const isAdmin = isAdminUser(u);
    setEditUser(u);
    setEditError(null);
    setSignatureError(null);
    setSignatureValue('');
    setSuccess(null);
    setEditForm({
      username: u.username,
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      role: isAdmin ? 'admin' : 'tecnico',
      password: '',
      password2: '',
      smtp_email: u.smtp_email || '',
      smtp_password: '',
    });
    setShowEditPassword(false);
    setShowEditPassword2(false);
    setShowSmtpPassword(false);
    setConfirmDeleteSmtp(false);
    setIsEditOpen(true);

    setSignatureLoading(true);
    fetchApi(`/api/users/accounts/${u.id}/signature/`, {
      method: 'GET',
      cache: 'no-store' as RequestCache,
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as UserSignaturePayload | null;
        if (!res.ok) throw new Error((data as any)?.detail || 'No se pudo cargar la firma');
        setSignatureValue(data?.url || '');
      })
      .catch((e: any) => setSignatureError(e?.message || 'Error'))
      .finally(() => setSignatureLoading(false));
  };

  const closeEdit = () => {
    if (editing) return;
    setIsEditOpen(false);
    setEditUser(null);
    setSignatureValue('');
    setSignatureError(null);
  };

  const validateClient = (): string | null => {
    const username = form.username.trim();
    if (!username) return 'Nombre de usuario es requerido';
    if (username.length > 150) return 'Nombre de usuario: máximo 150 caracteres';
    if (!/^[\w.@+-]+$/.test(username)) {
      return 'Nombre de usuario: solo letras, dígitos y @/./+/-/_';
    }

    if (!form.password) return 'Contraseña es requerida';
    if (form.password.length < 8) return 'La contraseña debe contener al menos 8 caracteres';
    if (/^\d+$/.test(form.password)) return 'La contraseña no puede ser completamente numérica';
    if (form.password !== form.password2) return 'Confirmación de contraseña no coincide';

    return null;
  };

  const validateEditClient = (): string | null => {
    const username = editForm.username.trim();
    if (!username) return 'Nombre de usuario es requerido';
    if (username.length > 150) return 'Nombre de usuario: máximo 150 caracteres';
    if (!/^[\w.@+-]+$/.test(username)) {
      return 'Nombre de usuario: solo letras, dígitos y @/./+/-/_';
    }

    if (editForm.password || editForm.password2) {
      if (!editForm.password) return 'Contraseña es requerida';
      if (editForm.password.length < 8) return 'La contraseña debe contener al menos 8 caracteres';
      if (/^\d+$/.test(editForm.password)) return 'La contraseña no puede ser completamente numérica';
      if (editForm.password !== editForm.password2) return 'Confirmación de contraseña no coincide';
    }
    return null;
  };

  const doCreate = async () => {
    setFormError(null);
    setSuccess(null);
    const v = validateClient();
    if (v) {
      setFormError(v);
      return;
    }

    setCreating(true);
    try {
      const payload = {
        username: form.username.trim(),
        first_name: (form.first_name || '').trim(),
        last_name: (form.last_name || '').trim(),
        email: (form.email || '').trim(),
        is_staff: form.role === 'admin',
        is_superuser: form.role === 'admin',
        password: form.password,
      };

      const res = await fetchApi('/api/users/accounts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al crear usuario');

      if (form.role === 'admin' && typeof (data as any)?.id === 'number' && canDelegatePerms) {
        await seedAdminPerms((data as any).id);
      }

      setUsers((prev) => [data as UserAccount, ...prev]);
      setSuccess('Usuario creado');
      setIsCreateOpen(false);
    } catch (e: any) {
      setFormError(e?.message || 'Error');
    } finally {
      setCreating(false);
    }
  };

  const doUpdate = async () => {
    if (!editUser) return;
    setEditError(null);
    setSuccess(null);
    const v = validateEditClient();
    if (v) {
      setEditError(v);
      return;
    }
    setEditing(true);
    try {
      const hasNewSignature = !!signatureValue && signatureValue.startsWith('data:') && signatureValue.includes(';base64,');

      const payload: Record<string, unknown> = {
        username: editForm.username.trim(),
        first_name: (editForm.first_name || '').trim(),
        last_name: (editForm.last_name || '').trim(),
        email: (editForm.email || '').trim(),
        is_staff: editForm.role === 'admin',
        is_superuser: editForm.role === 'admin',
        smtp_email: (editForm.smtp_email || '').trim(),
      };
      if (editForm.password || editForm.password2) {
        payload.password = editForm.password;
        payload.password2 = editForm.password2;
      }
      if ((editForm.smtp_password || '').trim()) {
        payload.smtp_password = editForm.smtp_password.trim();
      }

      const res = await fetchApi(`/api/users/accounts/${editUser.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al actualizar usuario');

      if (hasNewSignature) {
        const resSig = await fetchApi(`/api/users/accounts/${editUser.id}/signature/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signature: signatureValue }),
        });
        const dataSig = (await resSig.json().catch(() => null)) as UserSignaturePayload | null;
        if (!resSig.ok) throw new Error((dataSig as any)?.detail || 'Error al guardar la firma');
        setSignatureValue(dataSig?.url || '');
      }

      const wasAdmin = !!editUser.is_superuser || !!editUser.is_staff;
      const willBeAdmin = editForm.role === 'admin';
      if (!wasAdmin && willBeAdmin && canDelegatePerms) {
        await seedAdminPerms(editUser.id);
      }

      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? (data as UserAccount) : u)));
      setSuccess('Usuario actualizado');
      setIsEditOpen(false);
      setEditUser(null);
    } catch (e: any) {
      setEditError(e?.message || 'Error');
    } finally {
      setEditing(false);
    }
  };

  const toggleUserActive = async (u: UserAccount) => {
    const currentlyActive = u.is_active !== false;
    if (isProtectedPrincipalUsername(u.username) && currentlyActive) {
      setError('Este usuario no puede desactivarse desde aquí.');
      window.setTimeout(() => setError(null), 3500);
      return;
    }
    const next = !currentlyActive;
    setTogglingActiveId(u.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchApi(`/api/users/accounts/${u.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'No se pudo actualizar el estado');
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, ...(data as UserAccount) } : row)));
      setSuccess(next === true ? 'Usuario activado' : 'Usuario desactivado');
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setTogglingActiveId(null);
    }
  };

  const doDelete = async () => {
    if (confirmDeleteId == null) return;
    setError(null);
    setSuccess(null);
    setDeleting(true);
    try {
      const res = await fetchApi(`/api/users/accounts/${confirmDeleteId}/`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar usuario');
      setUsers((prev) => prev.filter((u) => u.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      setSuccess('Usuario eliminado');
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setDeleting(false);
    }
  };

  const roleBadge = (u: UserAccount) => {
    const isAdmin = isAdminUser(u);
    return isAdmin
      ? 'bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]'
      : 'bg-[rgba(23,35,91,0.08)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]';
  };

  return (
    <>
      <PageMeta title="Gestión de usuarios | Sistema Grupo Intrax GPS" description="Administración de cuentas, roles, permisos y firma digital" />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
        <div
          className="mx-auto w-full max-w-[min(100%,1920px)] space-y-6 px-3 pb-10 pt-6 text-sm sm:space-y-7 sm:px-5 sm:pb-12 sm:pt-7 sm:text-base md:px-6 lg:px-8 xl:px-10 2xl:max-w-[min(100%,2200px)]"
          style={claudeSansStyle}
        >
          <nav
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] font-medium text-[#6E6E77] dark:text-[#8EA0B8]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-black/[0.04] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF] dark:hover:bg-white/10 dark:hover:text-[#F8FAFC]"
            >
              Inicio
            </Link>
            <span className="text-[#D3D3D8] dark:text-[#3D3D4A]" aria-hidden>
              /
            </span>
            <span className="px-1.5 text-[#09090B] dark:text-[#F8FAFC]">Usuarios</span>
          </nav>

          <div className="flex flex-col gap-4">
            {/* Banda marina de cabecera: identidad a la izquierda, conteos a la
                derecha. Mismo corte que la cabecera de "Mi perfil". */}
            <header className="relative overflow-hidden rounded-[24px] bg-[#17235B] px-5 py-6 dark:bg-[#1B2A63] sm:px-8 sm:py-8">
              <div
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#E6A23C]/15 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                      Configuración
                    </p>
                    <h1 className="mt-1 text-[26px] font-bold leading-[1.15] tracking-[-0.9px] text-white sm:text-[32px] sm:tracking-[-1.1px]">
                      Gestión de usuarios
                    </h1>
                    <p className="mt-1.5 max-w-[58ch] text-[15px] leading-[22px] tracking-[-0.1px] text-white/70">
                      Crea cuentas, asigna roles, ajusta permisos por módulo y administra la firma digital del equipo.
                    </p>
                  </div>
                </div>

                {/* Los conteos son el filtro: en vez de tres cajas decorativas,
                    cada cifra selecciona su grupo. */}
                <div
                  className="flex shrink-0 flex-wrap items-center gap-2"
                  role="group"
                  aria-label="Filtrar por rol"
                >
                  {([
                    { value: 'all' as const, label: 'Todos', count: stats.total },
                    { value: 'admin' as const, label: 'Admins', count: stats.admins },
                    { value: 'tecnico' as const, label: 'Técnicos', count: stats.tecnicos },
                  ]).map((chip) => {
                    const activo = roleFilter === chip.value;
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => setRoleFilter(chip.value)}
                        aria-pressed={activo}
                        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                          activo
                            ? 'bg-[#E6A23C] text-[#17235B]'
                            : 'bg-white/10 text-white/80 hover:bg-white/[0.16] hover:text-white'
                        }`}
                      >
                        <span className="text-[15px] font-semibold tabular-nums">{chip.count}</span>
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E6E77] dark:text-[#64748b] sm:left-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  value={query}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  placeholder="Buscar por usuario, correo o nombre…"
                  className={searchInputClass}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-[#7c7a74] hover:bg-[#e7ded0]/60 hover:text-[#52525B] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-end gap-2 md:self-end">
                <button type="button" onClick={openCreate} className={primaryOrangeBtnClass}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Nuevo usuario
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 dark:border-[#7F1D1D] dark:bg-[#3F1518]">
                <p className="text-[15px] font-medium text-[#C22B2B] dark:text-[#F87171]">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-[14px] border border-[#BFE6D4] bg-[#E9F8F0] px-4 py-3 dark:border-[#1E5A42] dark:bg-[#0F2A1C]">
                <p className="text-[15px] font-medium text-[#04724D] dark:text-[#4ADE80]">{success}</p>
              </div>
            )}

            <div className="pt-1">
              <ComponentCard
        compact
        title="Resultados"
        desc={filtered.length > 0 ? `${filtered.length} usuario${filtered.length === 1 ? '' : 's'} encontrado${filtered.length === 1 ? '' : 's'}.` : 'Los usuarios aparecen aquí según tu búsqueda y filtros.'}
        className="!overflow-visible rounded-[24px] border-[#E7E7EA] bg-white shadow-[0_6px_20px_-10px_rgba(9,9,11,0.14)] dark:border-[#273244] dark:!bg-[#111827] dark:shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)]"
        actions={(
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen(v => !v)}
              className={`${filterBtnClass} h-11 w-full sm:w-auto`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7h13" />
                <path d="M3 12h10" />
                <path d="M3 17h7" />
                <path d="M18 7v10" />
                <path d="M21 10l-3-3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Filtrado
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-[120] mt-2 w-64 rounded-[16px] border border-[#E7E7EA] bg-white p-4 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.25)] dark:border-[#273244] dark:bg-[#151E32]">
                <div className="mb-2">
                  <label className="mb-2 block text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]">Rol</label>
                  <div className="inline-flex w-full rounded-[10px] border border-[#E7E7EA] bg-[#FAFAFA] p-1 dark:border-[#273244] dark:bg-[#1B2539]">
                    {[
                      { value: 'all', label: 'Todos' },
                      { value: 'admin', label: 'Admins' },
                      { value: 'tecnico', label: 'Técnicos' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setRoleFilter(opt.value as 'all' | Role);
                          setFilterOpen(false);
                        }}
                        className={`h-9 flex-1 rounded-[8px] px-3 text-[13px] font-semibold transition-colors ${
                          roleFilter === opt.value
                            ? 'bg-white text-[#1B5CFF] shadow-[0_1px_3px_rgba(9,9,11,0.08)] dark:bg-[#111827] dark:text-[#4B7CFF]'
                            : 'text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      >

        <div className="p-2 pt-0">
        {loading ? (
          <div className="rounded-[20px] border border-[#E7E7EA] bg-[#FAFAFA] py-14 text-center dark:border-[#273244] dark:bg-[#1B2539]">
            <div className="inline-flex items-center gap-2 text-[15px] text-[#6E6E77] dark:text-[#8EA0B8]">
              <svg className="h-4.5 w-4.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
              Cargando usuarios…
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filtered.map((u) => {
              const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
              const isAdmin = isAdminUser(u);
              const isActive = u.is_active !== false;
              const initials = (fullName || u.username)
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('');
              const switchDisabled =
                togglingActiveId === u.id || (isProtectedPrincipalUsername(u.username) && isActive);
              const avatarSrc = (u.avatar_url || '').trim() ? resolveMediaUrl(u.avatar_url as string) : '';

              return (
                <div
                  key={u.id}
                  className="group relative rounded-[20px] border border-[#E7E7EA] bg-[#FAFAFA] p-5 transition-colors hover:border-[#D3D3D8] dark:border-[#273244] dark:bg-[#1B2539] dark:hover:border-[#3A4661]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#111827]">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(140deg,rgba(230,162,60,0.22),rgba(23,35,91,0.06))] text-[15px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                            {initials || 'U'}
                          </span>
                        )}
                        {!isActive && (
                          <span
                            className="absolute inset-0 bg-white/60 dark:bg-black/55"
                            aria-hidden
                            title="Cuenta deshabilitada"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h4 className="truncate text-[15px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]">
                            {fullName || u.username}
                          </h4>
                          <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold ${roleBadge(u)}`}>
                            {isAdmin ? 'Admin' : 'Técnico'}
                          </span>
                        </div>
                        <p className="truncate font-mono text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">@{u.username}</p>
                      </div>
                    </div>

                    <div className="relative z-[80]" ref={openMenuId === u.id ? menuRef : null}>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((prev) => (prev === u.id ? null : u.id))}
                        aria-label={`Acciones para ${u.username}`}
                        className="inline-flex size-9 items-center justify-center rounded-[10px] border border-[#E7E7EA] bg-white text-[#6E6E77] transition-colors hover:border-[#D3D3D8] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:text-[#8EA0B8] dark:hover:border-[#3A4661] dark:hover:text-[#F8FAFC]"
                      >
                        <MoreDotIcon className="h-5 w-5 fill-current" />
                      </button>

                      {openMenuId === u.id && (
                        <div className="absolute right-0 top-full z-[200] mt-1.5 w-48 overflow-hidden rounded-[14px] border border-[#E7E7EA] bg-white py-1 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.28)] dark:border-[#273244] dark:bg-[#151E32]">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              openEdit(u);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[14px] font-medium text-[#09090B] transition-colors hover:bg-[#FAFAFA] dark:text-[#F8FAFC] dark:hover:bg-[#243048]"
                          >
                            <span className="flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </span>
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              openPerms(u);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[14px] font-medium text-[#09090B] transition-colors hover:bg-[#FAFAFA] dark:text-[#F8FAFC] dark:hover:bg-[#243048]"
                          >
                            <span className="flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                            </span>
                            Permisos
                          </button>
                          {!isProtectedPrincipalUsername(u.username) && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(u.id);
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[14px] font-medium text-[#C22B2B] transition-colors hover:bg-[#FEF2F2] dark:text-[#F87171] dark:hover:bg-[#3F1518]"
                            >
                              <span className="flex size-7 items-center justify-center rounded-[9px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </span>
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="flex items-start gap-2.5">
                      <svg className="mt-0.5 size-4 shrink-0 text-[#6E6E77] dark:text-[#8EA0B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="5.5" width="18" height="13" rx="2.4" />
                        <path d="m3.6 7 8.4 6 8.4-6" />
                      </svg>
                      <span className={cn("min-w-0 truncate", bodyMutedClass)} title={u.email || ''}>
                        {u.email || '—'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {u.smtp_configured ? (
                        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[rgba(4,114,77,0.10)] px-2.5 text-[12px] font-semibold text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]">
                          <span className="size-[6px] rounded-full bg-current" aria-hidden />
                          SMTP listo
                        </span>
                      ) : (
                        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[rgba(230,162,60,0.16)] px-2.5 text-[12px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                          <span className="size-[6px] rounded-full bg-current" aria-hidden />
                          Sin SMTP
                        </span>
                      )}
                      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[rgba(23,35,91,0.06)] px-2.5 text-[12px] font-medium text-[#52525B] dark:bg-white/[0.06] dark:text-[#B7C1D1]">
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Contraseña
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[#E7E7EA] bg-white px-3.5 py-3 dark:border-[#273244] dark:bg-[#111827]">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6E6E77] dark:text-[#8EA0B8]">
                          Acceso al sistema
                        </p>
                        <p className={`mt-1 text-[14px] font-medium ${isActive ? 'text-[#04724D] dark:text-[#4ADE80]' : 'text-[#6E6E77] dark:text-[#8EA0B8]'}`}>
                          {isActive ? 'Cuenta habilitada' : 'Cuenta deshabilitada'}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label={isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
                        disabled={switchDisabled}
                        onClick={() => void toggleUserActive(u)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] ${
                          switchDisabled
                            ? isActive
                              ? 'cursor-not-allowed bg-[#04724D]/45 dark:bg-[#4ADE80]/40'
                              : 'cursor-not-allowed bg-[#E7E7EA] opacity-60 dark:bg-[#273244]'
                            : isActive
                              ? 'bg-[#04724D] dark:bg-[#4ADE80]'
                              : 'bg-[#D3D3D8] dark:bg-[#3A4661]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                            isActive ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!filtered.length && (
              <div className="col-span-full rounded-[20px] border border-[#E7E7EA] bg-[#FAFAFA] py-14 text-center dark:border-[#273244] dark:bg-[#1B2539]">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                  <span className="inline-flex size-12 items-center justify-center rounded-[14px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <p className="text-[15px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">No hay usuarios para mostrar.</p>
                  <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Prueba con otra búsqueda o limpia los filtros.</p>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </ComponentCard>
            </div>
          </div>
        </div>
      </div>

      <Modal mobileBottomSheet isOpen={isCreateOpen} onClose={closeCreate} closeOnBackdropClick={false} className={modalShellClass} ariaLabelledBy={createModalTitleId}>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className={modalHeaderClass}>
            <div className="flex items-start gap-3.5">
              <span className={modalHeaderIconClass}>
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={modalEyebrowClass}>Usuarios</p>
                <h2 id={createModalTitleId} className={`mt-1 ${modalTitleClass}`}>Nuevo usuario</h2>
                <p className={modalSubtitleClass}>
                  Crea cuentas Admin o Técnico con contraseña segura.
                </p>
              </div>
            </div>
          </header>

          <div className={modalBodyClass}>
            {formError && (
              <Alert variant="error" title="Revisa" message={formError} showLink={false} />
            )}

            <div className={modalSectionClass}>
              <div className="mb-4 flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
                    <circle cx="12" cy="7.5" r="3.8" />
                  </svg>
                </span>
                <p className={sectionLabelClass}>Identidad</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="sm:col-span-1">
                  <Label>
                    Nombre de usuario <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    value={form.username}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, username: e.target.value }))}
                  />
                  <p className="mt-1 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">Máx. 150 caracteres. Letras, dígitos y @/./+/-/_</p>
                </div>
                <div>
                  <Label>
                    Rol <span className="text-error-500">*</span>
                  </Label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
                    className={selectFieldClass}
                  >
                    <option value="tecnico">Técnico</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <Label>Nombre(s)</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Apellidos</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Correo electrónico</Label>
                  <Input
                    value={form.email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className={modalSectionClass}>
              <div className="mb-4 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2Z" />
                      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
                    </svg>
                  </span>
                  <p className={sectionLabelClass}>Contraseña</p>
                </div>
                <p className="mt-2 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  8+ caracteres, no solo números, distinta al usuario.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <Label>
                    Contraseña <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>
                    Confirmación <span className="text-error-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword2 ? 'text' : 'password'}
                      value={form.password2}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, password2: e.target.value }))}
                      placeholder="Repite la contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword2(!showPassword2)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      aria-label={showPassword2 ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    >
                      {showPassword2 ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      const pw = generatePassword(form.username, form.first_name, form.last_name);
                      setForm((p) => ({ ...p, password: pw, password2: pw }));
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[14px] font-medium text-[#1B5CFF] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#4B7CFF] dark:hover:bg-[#243048]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 3v2" />
                      <path d="M12 19v2" />
                      <path d="M4.22 4.22l1.42 1.42" />
                      <path d="M18.36 18.36l1.42 1.42" />
                      <path d="M3 12h2" />
                      <path d="M19 12h2" />
                      <path d="M4.22 19.78l1.42-1.42" />
                      <path d="M18.36 5.64l1.42-1.42" />
                    </svg>
                    Sugerir contraseña segura
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={modalFooterClass}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={closeCreate} className={secondaryOutlineBtnClass} disabled={creating}>
                Cancelar
              </button>
              <button type="button" onClick={doCreate} className={primaryOrangeBtnClass} disabled={creating} aria-busy={creating}>
                {creating ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                    Creando…
                  </>
                ) : (
                  'Crear usuario'
                )}
              </button>
            </div>
          </div>
        </div>

      </Modal>

      <Modal mobileBottomSheet isOpen={isPermsOpen} onClose={closePerms} closeOnBackdropClick={false} className={modalShellClass} ariaLabelledBy={permsModalTitleId}>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className={modalHeaderClass}>
            <div className="flex items-start gap-3.5">
              <span className={modalHeaderIconClass}>
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className={modalEyebrowClass}>Permisos</p>
                <h3 id={permsModalTitleId} className={`mt-1 truncate ${modalTitleClass}`}>
                  {permsUser ? permsUser.username : 'Usuario'}
                </h3>
                <p className={modalSubtitleClass}>
                  Define qué vistas puede ver y qué acciones puede realizar.
                </p>
              </div>
            </div>
          </header>

          <div className={modalBodyClass}>
            {!canDelegatePerms && !permsLoading && (
              <div className="mb-4">
                <Alert
                  variant="info"
                  title="Solo lectura"
                  message="Solo los usuarios Angel Pérez e Ivan Cruz pueden activar o quitar permisos (ver, crear, editar, eliminar) de otros usuarios, incluidos administradores."
                  showLink={false}
                />
              </div>
            )}
            {permsError && (
              <div className="mb-4">
                <Alert variant="error" title="Error" message={permsError} />
              </div>
            )}

            {permsLoading ? (
              <div className="py-10 text-center text-sm text-[#6E6E77] dark:text-[#8EA0B8]">Cargando permisos...</div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const isAdmin = !!(permsUser?.is_superuser || permsUser?.is_staff);

                  const getIcon = (key: keyof Required<PermissionsPayload>) => {
                    if (key === 'ordenes') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M5 7h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                          <path d="M7 11h10" />
                          <path d="M7 15h6" />
                        </svg>
                      );
                    }
                    if (key === 'proyectos') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                      );
                    }
                    if (key === 'inventario') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                          <path d="M3.3 7l8.7 5 8.7-5" />
                          <path d="M12 22V12" />
                        </svg>
                      );
                    }
                    if (key === 'clientes') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      );
                    }
                    if (key === 'productos') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                          <path d="M3.3 7l8.7 5 8.7-5" />
                          <path d="M12 22V12" />
                        </svg>
                      );
                    }
                    if (key === 'servicios') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M8 6h13" />
                          <path d="M8 12h13" />
                          <path d="M8 18h13" />
                          <path d="M3 6h.01" />
                          <path d="M3 12h.01" />
                          <path d="M3 18h.01" />
                        </svg>
                      );
                    }
                    if (key === 'cotizaciones') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                          <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
                          <path d="M8 12h8" />
                          <path d="M8 16h6" />
                        </svg>
                      );
                    }
                    if (key === 'tareas') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                          <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
                          <path d="M8 12h8" />
                          <path d="M8 16h5" />
                        </svg>
                      );
                    }
                    if (key === 'usuarios') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                          <path d="M17 11.5h3" />
                          <path d="M18.5 10v3" />
                        </svg>
                      );
                    }
                    if (key === 'reportes') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M6 6h12" />
                          <path d="M6 12h12" />
                          <path d="M6 18h12" />
                        </svg>
                      );
                    }
                    if (key === 'cuentas_antarix') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                          <path d="M12 11v4" />
                          <path d="M10 13h4" />
                        </svg>
                      );
                    }
                    if (key === 'polizas' || key === 'reportes_mantenimiento') {
                      return (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z" />
                          <path d="M9 12l2 2 4-4" />
                        </svg>
                      );
                    }
                    return (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4 19V5" />
                        <path d="M20 19H4" />
                        <path d="M7 15l3-4 3 2 4-6" />
                      </svg>
                    );
                  };

                  const sections = isAdmin
                    ? ([
                        { key: 'escritorio' as const, label: 'Mi escritorio', modules: [{ key: 'tareas' as const, label: 'Tareas' }] },
                        { key: 'contactos' as const, label: 'Contacto de negocio', modules: [{ key: 'clientes' as const, label: 'Clientes' }] },
                        { key: 'productos_servicios' as const, label: 'Productos y Servicios', modules: [{ key: 'productos' as const, label: 'Productos' }, { key: 'servicios' as const, label: 'Servicios' }] },
                        { key: 'compras_gastos' as const, label: 'Compras y Gastos', modules: [] as { key: keyof Required<PermissionsPayload>; label: string }[] },
                        { key: 'ventas' as const, label: 'Ventas', modules: [{ key: 'cotizaciones' as const, label: 'Cotizaciones' }] },
                        {
                          key: 'operaciones' as const,
                          label: 'Operaciones',
                          modules: [
                            { key: 'ordenes' as const, label: 'Órdenes de Servicios' },
                            { key: 'proyectos' as const, label: 'Proyectos' },
                            { key: 'inventario' as const, label: 'Inventario' },
                            { key: 'reportes' as const, label: 'Reportes semanales' },
                            { key: 'cuentas_antarix' as const, label: 'Cuentas Antarix GPS' },
                            { key: 'polizas' as const, label: 'Póliza de mantenimiento' },
                            { key: 'reportes_mantenimiento' as const, label: 'Reporte de mantenimiento' },
                          ],
                        },
                        { key: 'configuracion' as const, label: 'Configuración', modules: [{ key: 'usuarios' as const, label: 'Usuarios' }] },
                      ] as const)
                    : ([
                        { key: 'escritorio' as const, label: 'Mi escritorio', modules: [{ key: 'tareas' as const, label: 'Tareas' }] },
                        { key: 'contactos' as const, label: 'Contacto de negocio', modules: [{ key: 'clientes' as const, label: 'Clientes' }] },
                        { key: 'productos_servicios' as const, label: 'Productos y Servicios', modules: [{ key: 'productos' as const, label: 'Productos' }, { key: 'servicios' as const, label: 'Servicios' }] },
                        { key: 'compras_gastos' as const, label: 'Compras y Gastos', modules: [] as { key: keyof Required<PermissionsPayload>; label: string }[] },
                        { key: 'ventas' as const, label: 'Ventas', modules: [{ key: 'cotizaciones' as const, label: 'Cotizaciones' }] },
                        {
                          key: 'operaciones' as const,
                          label: 'Operaciones',
                          modules: [
                            { key: 'ordenes' as const, label: 'Órdenes de Servicios' },
                            { key: 'proyectos' as const, label: 'Proyectos' },
                            { key: 'inventario' as const, label: 'Inventario' },
                            { key: 'reportes' as const, label: 'Reportes semanales' },
                            { key: 'cuentas_antarix' as const, label: 'Cuentas Antarix GPS' },
                            { key: 'polizas' as const, label: 'Póliza de mantenimiento' },
                            { key: 'reportes_mantenimiento' as const, label: 'Reporte de mantenimiento' },
                          ],
                        },
                      ] as const);

                  const ACTION_LABEL = { create: 'Crear', edit: 'Editar', delete: 'Eliminar' } as const;

                  const normalizedAll = normalizePerms(permsForm, {
                    isAdmin: !!(permsUser?.is_superuser || permsUser?.is_staff),
                  });

                  const allModuleKeys = sections.flatMap((s) => s.modules.map((mm) => mm.key));
                  const bulkSet = (
                    actions: readonly (keyof CrudPerms)[],
                    modules: readonly (keyof Required<PermissionsPayload>)[],
                    value: boolean
                  ) => {
                    modules.forEach((mk) => actions.forEach((ak) => setPerm(mk, ak, value)));
                  };
                  const applyPreset = (preset: 'full' | 'read' | 'none') => {
                    allModuleKeys.forEach((mk) => {
                      setPerm(mk, 'view', preset !== 'none');
                      setPerm(mk, 'create', preset === 'full');
                      setPerm(mk, 'edit', preset === 'full');
                      setPerm(mk, 'delete', preset === 'full');
                    });
                  };

                  // Nombre e icono del menú del panel al que pertenece cada grupo de vistas.
                  const GROUP_META: Record<string, { menu: string; icon: import('react').ReactNode }> = {
                    escritorio: {
                      menu: 'Mi escritorio',
                      icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" />,
                    },
                    contactos: {
                      menu: 'Contactos de Negocio',
                      icon: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.6-4 4.7-6 8-6s6.4 2 8 6" /></>,
                    },
                    productos_servicios: {
                      menu: 'Productos y Servicios',
                      icon: <><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></>,
                    },
                    compras_gastos: {
                      menu: 'Compras y Gastos',
                      icon: <><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" /><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z" /></>,
                    },
                    ventas: {
                      menu: 'Ventas',
                      icon: <><path d="M21.2 15.9A10 10 0 1 1 8 2.8" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>,
                    },
                    operaciones: {
                      menu: 'Operación',
                      icon: <><path d="M12 22v-5M9 8V2M15 8V2" /><path d="M5 8h14v3a7 7 0 0 1-14 0V8Z" /></>,
                    },
                    configuracion: {
                      menu: 'Configuración',
                      icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 15H4a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1A2 2 0 1 1 7.9 5.3l.1.1A1.6 1.6 0 0 0 11 4.6V4a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19.4 11H21a2 2 0 0 1 0 4h-.1Z" /></>,
                    },
                  };

                  const Toggle = ({
                    checked,
                    onToggle,
                    ariaLabel,
                  }: {
                    checked: boolean;
                    onToggle: () => void;
                    ariaLabel?: string;
                  }) => (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={ariaLabel}
                      disabled={!canDelegatePerms}
                      onClick={() => {
                        if (canDelegatePerms) onToggle();
                      }}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(27,92,255,0.30)]',
                        checked ? 'bg-[#1B5CFF] dark:bg-[#4B7CFF]' : 'bg-[#D3D3D8] dark:bg-[#3A4661]',
                        !canDelegatePerms && 'cursor-not-allowed opacity-55'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  );

                  const ActionWord = ({
                    label,
                    active,
                    onClick,
                  }: {
                    label: string;
                    active: boolean;
                    onClick: () => void;
                  }) => (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={label}
                      disabled={!canDelegatePerms}
                      onClick={() => {
                        if (canDelegatePerms) onClick();
                      }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.30)]',
                        active
                          ? 'border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]'
                          : 'border-[#E7E7EA] bg-white text-[#52525B] hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#B7C1D1]',
                        !canDelegatePerms && 'cursor-not-allowed opacity-55'
                      )}
                    >
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                        <path d={active ? 'M20 6 9 17l-5-5' : 'M12 5v14M5 12h14'} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {label}
                    </button>
                  );

                  const PresetBtn = ({
                    onClick,
                    children,
                  }: {
                    onClick: () => void;
                    children: import('react').ReactNode;
                  }) => (
                    <button
                      type="button"
                      onClick={onClick}
                      className="inline-flex items-center rounded-full border border-[#E7E7EA] bg-white px-3 py-1 text-[12px] font-medium text-[#52525B] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#B7C1D1] dark:hover:border-[#4B7CFF]/50 dark:hover:text-[#4B7CFF]"
                    >
                      {children}
                    </button>
                  );

                  const scopeIndent = 'pl-[3.375rem] sm:pl-[3.625rem]';

                  return (
                    <div className="space-y-3">
                      {canDelegatePerms ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E7E7EA] bg-[#FAFAFA] p-2.5 dark:border-[#273244] dark:bg-[#111827]/50">
                          <span className="pl-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">
                            Rápido
                          </span>
                          <PresetBtn onClick={() => applyPreset('full')}>Dar acceso a todo</PresetBtn>
                          <PresetBtn onClick={() => applyPreset('read')}>Solo ver todo</PresetBtn>
                          <PresetBtn onClick={() => applyPreset('none')}>Quitar todo</PresetBtn>
                        </div>
                      ) : null}

                      <p className="px-0.5 text-[12px] leading-snug text-[#52525B] dark:text-[#B7C1D1]">
                        Cada vista vive dentro de un menú del panel. Enciende{' '}
                        <b className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">Acceso</b> para que el usuario
                        pueda abrirla; añade <b className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">Crear</b>,{' '}
                        <b className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">Editar</b> o{' '}
                        <b className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">Eliminar</b> si además debe poder
                        cambiar la información.
                      </p>

                      {sections.map((sec) => {
                        if (sec.modules.length === 0) return null;
                        const meta = GROUP_META[sec.key];
                        const menuName = meta?.menu ?? sec.label;
                        const secKeys = sec.modules.map((mm) => mm.key);
                        const secOn = secKeys.filter(
                          (k) => !!(normalizedAll[k] as CrudPerms)?.view
                        ).length;
                        const allViewOn = secOn === secKeys.length;
                        return (
                          <section
                            key={sec.key}
                            className="overflow-hidden rounded-2xl border border-[#E7E7EA] dark:border-[#273244]"
                          >
                            <div className="flex items-center gap-2.5 border-b border-[#E7E7EA] bg-[#F4F7FC] px-3 py-2.5 dark:border-[#273244] dark:bg-[#111827]/60 sm:px-4">
                              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#1B5CFF] shadow-sm dark:bg-[#151E32] dark:text-[#4B7CFF]">
                                <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  {meta?.icon}
                                </svg>
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                                  Menú «{menuName}»
                                </div>
                                <div className="truncate text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">
                                  {secOn} de {secKeys.length} {secKeys.length === 1 ? 'vista visible' : 'vistas visibles'}
                                </div>
                              </div>
                              {canDelegatePerms ? (
                                <button
                                  type="button"
                                  onClick={() => bulkSet(['view'], secKeys, !allViewOn)}
                                  className="shrink-0 rounded-full border border-[#E7E7EA] bg-white px-2.5 py-1 text-[11px] font-medium text-[#52525B] transition-colors hover:border-[#1B5CFF]/50 hover:text-[#1B5CFF] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#B7C1D1]"
                                >
                                  {allViewOn ? 'Ocultar todo' : 'Mostrar todo'}
                                </button>
                              ) : null}
                            </div>

                            <div className="divide-y divide-[#EEF0F3] dark:divide-[#273244]">
                              {sec.modules.map((m) => {
                                const cur = normalizedAll[m.key] as CrudPerms;
                                const supportsOwnScope =
                                  m.key === 'cotizaciones' || m.key === 'ordenes' || m.key === 'proyectos';
                                const isOrdenes = m.key === 'ordenes';
                                const isProyectos = m.key === 'proyectos';
                                const ownScopeActive = supportsOwnScope
                                  ? isOrdenes || isProyectos
                                    ? !cur.own_only
                                    : !!cur.own_only
                                  : false;
                                const ownScopeText = isOrdenes
                                  ? 'Ver también las órdenes de otros técnicos'
                                  : isProyectos
                                    ? 'Ver también los proyectos de otros técnicos'
                                    : 'Ver solo lo que este usuario creó';
                                const extras = (['create', 'edit', 'delete'] as const)
                                  .filter((k) => cur[k])
                                  .map((k) => ACTION_LABEL[k]);
                                return (
                                  <div
                                    key={m.key}
                                    className={cn(!cur.view && 'bg-[#FBFCFE] dark:bg-transparent')}
                                  >
                                    <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
                                      <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#52525B] shadow-sm dark:bg-[#151E32] dark:text-[#B7C1D1]">
                                          {getIcon(m.key)}
                                        </span>
                                        <div className="min-w-0">
                                          <div className="truncate text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                                            {m.label}
                                          </div>
                                          <div
                                            className={cn(
                                              'truncate text-[11px]',
                                              cur.view
                                                ? 'text-[#1B5CFF] dark:text-[#4B7CFF]'
                                                : 'text-[#8EA0B8]'
                                            )}
                                          >
                                            {!cur.view
                                              ? 'No aparece para este usuario'
                                              : extras.length
                                                ? `Puede: ${extras.join(', ')}`
                                                : 'Solo puede ver'}
                                          </div>
                                        </div>
                                      </div>
                                      <label className="flex shrink-0 cursor-pointer items-center gap-2">
                                        <span className="text-[12px] font-medium text-[#52525B] dark:text-[#B7C1D1]">
                                          Acceso
                                        </span>
                                        <Toggle
                                          checked={cur.view}
                                          onToggle={() => setPerm(m.key, 'view', !cur.view)}
                                          ariaLabel={`Acceso a ${m.label}`}
                                        />
                                      </label>
                                    </div>

                                    {cur.view ? (
                                      <div className={cn('flex flex-wrap items-center gap-1.5 px-3 pb-3 sm:px-4', scopeIndent)}>
                                        <span className="text-[11px] text-[#6E6E77] dark:text-[#8EA0B8]">Además puede:</span>
                                        <ActionWord label="Crear" active={!!cur.create} onClick={() => setPerm(m.key, 'create', !cur.create)} />
                                        <ActionWord label="Editar" active={!!cur.edit} onClick={() => setPerm(m.key, 'edit', !cur.edit)} />
                                        <ActionWord label="Eliminar" active={!!cur.delete} onClick={() => setPerm(m.key, 'delete', !cur.delete)} />
                                      </div>
                                    ) : null}

                                    {cur.view && supportsOwnScope ? (
                                      <div className={cn('flex items-center gap-2.5 px-3 pb-3 sm:px-4', scopeIndent)}>
                                        <Toggle
                                          checked={ownScopeActive}
                                          onToggle={() => setPerm(m.key, 'own_only', !cur.own_only)}
                                          ariaLabel={`${ownScopeText}: ${ownScopeActive ? 'sí' : 'no'}`}
                                        />
                                        <span className="text-[11px] leading-tight text-[#6E6E77] dark:text-[#8EA0B8]">
                                          {ownScopeText}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="sticky -bottom-5 z-10 -mx-5 -mb-5 mt-1 sm:-mx-6">
                  <div className={modalFooterClass}>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <button type="button" onClick={closePerms} className={secondaryOutlineBtnClass}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={permsSaving || permsLoading || !permsUser || !canDelegatePerms}
                        title={!canDelegatePerms ? 'Solo Angel Pérez e Ivan Cruz pueden guardar cambios' : undefined}
                        onClick={savePerms}
                        className={primaryOrangeBtnClass}
                        aria-busy={permsSaving}
                      >
                        {permsSaving ? 'Guardando…' : 'Guardar permisos'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal mobileBottomSheet isOpen={isEditOpen} onClose={closeEdit} closeOnBackdropClick={false} className={modalShellClass} ariaLabelledBy={editModalTitleId}>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className={modalHeaderClass}>
            <div className="flex items-start gap-3.5">
              <span className={modalHeaderIconClass}>
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className={modalEyebrowClass}>Editar usuario</p>
                <h2 id={editModalTitleId} className={`mt-1 truncate ${modalTitleClass}`}>
                  {editUser ? editUser.username : 'Usuario'}
                </h2>
                <p className={modalSubtitleClass}>
                  Actualiza datos y, si aplica, la contraseña o la firma digital.
                </p>
              </div>
            </div>
          </header>

          <div className={modalBodyClass}>
            {editError && <Alert variant="error" title="Revisa" message={editError} showLink={false} />}
            {signatureError && <Alert variant="error" title="Firma" message={signatureError} showLink={false} />}

            <div className={modalSectionClass}>
              <div className="mb-4 flex items-center gap-2.5 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 21v-1.6a4.4 4.4 0 0 0-4.4-4.4H8.4A4.4 4.4 0 0 0 4 19.4V21" />
                    <circle cx="12" cy="7.5" r="3.8" />
                  </svg>
                </span>
                <p className={sectionLabelClass}>Datos de la cuenta</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <Label>
                    Nombre de usuario <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    value={editForm.username}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>
                    Rol <span className="text-error-500">*</span>
                  </Label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as Role }))}
                    className={selectFieldClass}
                  >
                    <option value="tecnico">Técnico</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <Label>Nombre(s)</Label>
                  <Input
                    value={editForm.first_name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Apellidos</Label>
                  <Input
                    value={editForm.last_name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Correo electrónico</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className={modalSectionClass}>
              <div className="mb-4 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(230,162,60,0.16)] text-[#9A6B15] dark:text-[#E6A23C]">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M19 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2Z" />
                      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
                    </svg>
                  </span>
                  <p className={sectionLabelClass}>Cambiar contraseña</p>
                </div>
                <p className="mt-1 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">Opcional · deja vacío para mantener la actual.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <Label>Nueva contraseña</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editForm.password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Deja vacío para no cambiar"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      aria-label={showEditPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showEditPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirmar nueva contraseña</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showEditPassword2 ? 'text' : 'password'}
                      value={editForm.password2}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p) => ({ ...p, password2: e.target.value }))}
                      placeholder="Repite la contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword2(!showEditPassword2)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      aria-label={showEditPassword2 ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    >
                      {showEditPassword2 ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-2xl border border-[#E7E7EA] bg-[#FAFAFA] p-4 dark:border-[#273244] dark:bg-[#151E32] sm:p-5">
              {editUser?.smtp_configured ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteSmtp(true)}
                  disabled={editing || clearingSmtp}
                  className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E7EA] bg-white text-[#52525B] shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 disabled:opacity-60 dark:border-[#273244] dark:bg-[#111827] dark:text-[#B7C1D1] dark:hover:border-rose-500/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 sm:right-4 sm:top-4"
                  aria-label="Quitar credenciales SMTP"
                  title="Quitar credenciales SMTP"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              ) : null}
              <div className={`mb-4 border-b border-[#E7E7EA]/90 pb-3 dark:border-[#273244]/80 ${editUser?.smtp_configured ? 'pr-11' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[rgba(27,92,255,0.10)] text-[#1B5CFF] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="5.5" width="18" height="13" rx="2.4" />
                        <path d="m3.6 7 8.4 6 8.4-6" />
                      </svg>
                    </span>
                    <p className={sectionLabelClass}>SMTP / Webmail</p>
                  </div>
                  <span
                    className={
                      editUser?.smtp_configured
                        ? 'inline-flex h-6 items-center rounded-full bg-[rgba(4,114,77,0.10)] px-2.5 text-[12px] font-semibold text-[#04724D] dark:bg-[rgba(74,222,128,0.14)] dark:text-[#4ADE80]'
                        : 'inline-flex h-6 items-center rounded-full bg-[rgba(230,162,60,0.16)] px-2.5 text-[12px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]'
                    }
                  >
                    {editUser?.smtp_configured ? 'Correo listo' : 'Sin configurar'}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                  Buzón Intrax con el que este usuario enviará PDF de órdenes y cotizaciones. La contraseña de webmail no se vuelve a mostrar.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-smtp-email">Correo SMTP</Label>
                  <Input
                    id="edit-smtp-email"
                    type="email"
                    value={editForm.smtp_email}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setEditForm((p) => ({ ...p, smtp_email: e.target.value }))
                    }
                    placeholder="usuario@intrax.mx"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-smtp-password">Contraseña webmail</Label>
                  <div className="relative mt-1">
                    <Input
                      id="edit-smtp-password"
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={editForm.smtp_password}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setEditForm((p) => ({ ...p, smtp_password: e.target.value }))
                      }
                      placeholder={editUser?.smtp_configured ? 'Deja vacío para mantener la actual' : 'Contraseña del webmail'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      aria-label={showSmtpPassword ? 'Ocultar contraseña SMTP' : 'Mostrar contraseña SMTP'}
                    >
                      {showSmtpPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={modalSectionClass}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-[#E7E7EA] pb-3 dark:border-[#273244]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-7 items-center justify-center rounded-[9px] bg-[rgba(23,35,91,0.10)] text-[#17235B] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M3 19c3.5 0 3-13 6.5-13S12 17 15 17s2.5-4 6-4" />
                      </svg>
                    </span>
                    <p className={sectionLabelClass}>Firma digital</p>
                  </div>
                  <p className="mt-2 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                    Se usa como &quot;Firma del Encargado&quot; en órdenes de servicio.
                  </p>
                </div>
                {!!signatureValue && !signatureValue.startsWith('data:') ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!editUser) return;
                      setConfirmDeleteSignature(true);
                    }}
                    disabled={signatureSaving || signatureLoading || !editUser}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:bg-white/5"
                    aria-label="Eliminar firma"
                    title="Eliminar firma"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                ) : null}
              </div>

              <div className="mt-1">
                {signatureLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-[13px] leading-[18px] text-[#6E6E77] dark:text-[#8EA0B8]">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
                    </svg>
                    Cargando firma…
                  </div>
                ) : !!signatureValue && !signatureValue.startsWith('data:') ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={signatureValue}
                      alt="Firma del usuario"
                      className="max-h-[180px] w-full max-w-[420px] rounded-xl border border-gray-200/80 bg-white object-contain dark:border-[#273244]"
                    />
                  </div>
                ) : (
                  <SignaturePad value={signatureValue} onChange={(sig) => setSignatureValue(sig)} width={420} height={180} />
                )}
              </div>
            </div>
          </div>

          <div className={modalFooterClass}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={closeEdit} className={secondaryOutlineBtnClass} disabled={editing}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={doUpdate}
                className={primaryOrangeBtnClass}
                disabled={editing || signatureSaving || signatureLoading}
                aria-busy={editing}
              >
                {editing ? (
                  <>
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                    Guardando…
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </div>
        </div>

      </Modal>

      <Modal mobileBottomSheet isOpen={confirmDeleteSignature} onClose={() => setConfirmDeleteSignature(false)} closeOnBackdropClick={false} className={modalSmallShellClass} ariaLabelledBy={deleteSignatureModalTitleId}>
        <div className="bg-white p-6 dark:bg-[#111827]">
          <div className="mb-5 flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4h8v2" strokeLinecap="round" />
                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 id={deleteSignatureModalTitleId} className={claudeSubheadingClass}>Eliminar firma</h3>
              <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteSignature(false)}
              className={secondaryOutlineBtnClass}
              disabled={signatureSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editUser) return;
                setSignatureError(null);
                setSignatureSaving(true);
                try {
                  const res = await fetchApi(`/api/users/accounts/${editUser.id}/signature/`, {
                    method: 'DELETE',
                  });
                  const data = (await res.json().catch(() => null)) as UserSignaturePayload | null;
                  if (!res.ok) throw new Error((data as any)?.detail || 'No se pudo borrar la firma');
                  setSignatureValue('');
                  setSuccess('Firma eliminada');
                  setConfirmDeleteSignature(false);
                } catch (e: any) {
                  setSignatureError(e?.message || 'Error');
                } finally {
                  setSignatureSaving(false);
                }
              }}
              className={dangerBtnClass}
              disabled={signatureSaving}
            >
              {signatureSaving ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>

      </Modal>

      <Modal
        mobileBottomSheet
        isOpen={confirmDeleteSmtp}
        onClose={() => {
          if (clearingSmtp) return;
          setConfirmDeleteSmtp(false);
        }}
        closeOnBackdropClick={!clearingSmtp}
        className={modalSmallShellClass}
        ariaLabelledBy={deleteSmtpModalTitleId}
      >
        <div className="bg-white p-6 dark:bg-[#111827]">
          <div className="mb-5 flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4h8v2" strokeLinecap="round" />
                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 id={deleteSmtpModalTitleId} className={claudeSubheadingClass}>Quitar credenciales SMTP</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Se eliminará el correo y la contraseña de webmail de este usuario. No podrá enviar PDF hasta que vuelvas a configurarlos.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteSmtp(false)}
              className={secondaryOutlineBtnClass}
              disabled={clearingSmtp}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!editUser) return;
                setEditError(null);
                setClearingSmtp(true);
                try {
                  const res = await fetchApi(`/api/users/accounts/${editUser.id}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ smtp_clear: true }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) throw new Error((data as { detail?: string } | null)?.detail || 'No se pudieron quitar las credenciales SMTP');
                  const updated = data as UserAccount;
                  setEditUser((prev) => (prev ? { ...prev, ...updated, smtp_configured: false, smtp_email: '' } : prev));
                  setEditForm((p) => ({ ...p, smtp_email: '', smtp_password: '' }));
                  setUsers((prev) => prev.map((u) => (u.id === editUser.id ? { ...u, ...updated, smtp_configured: false, smtp_email: '' } : u)));
                  setSuccess('Credenciales SMTP eliminadas');
                  setConfirmDeleteSmtp(false);
                } catch (e: unknown) {
                  setEditError(e instanceof Error ? e.message : 'Error');
                  setConfirmDeleteSmtp(false);
                } finally {
                  setClearingSmtp(false);
                }
              }}
              className={dangerBtnClass}
              disabled={clearingSmtp}
            >
              {clearingSmtp ? 'Eliminando…' : 'Quitar credenciales'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal mobileBottomSheet isOpen={confirmDeleteId != null} onClose={() => setConfirmDeleteId(null)} closeOnBackdropClick={false} className={modalSmallShellClass} ariaLabelledBy={deleteUserModalTitleId}>
        <div className="bg-white p-6 dark:bg-[#111827]">
          <div className="mb-5 flex items-start gap-3.5">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4h8v2" strokeLinecap="round" />
                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 id={deleteUserModalTitleId} className={claudeSubheadingClass}>Eliminar usuario</h3>
              <p className="mt-1 text-[14px] leading-[20px] text-[#52525B] dark:text-[#B7C1D1]">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className={secondaryOutlineBtnClass}
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={doDelete}
              className={dangerBtnClass}
              disabled={deleting}
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>

      </Modal>
    </>
  );
}
