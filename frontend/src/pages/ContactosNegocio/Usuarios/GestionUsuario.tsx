import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import PageMeta from '@/components/common/PageMeta';
import { Link, useNavigate } from 'react-router-dom';
import ComponentCard from '@/components/common/ComponentCard';
import Label from '@/components/form/Label';
import Input from '@/components/form/input/InputField';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from '@/components/ui/modal';
import SignaturePad from '@/components/ui/signature/SignaturePad';
import { fetchApi } from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { EyeCloseIcon, EyeIcon, MoreDotIcon } from '@/icons';
import { AnimatePresence, motion } from 'motion/react';

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
  clientes?: Partial<CrudPerms>;
  productos?: Partial<CrudPerms>;
  servicios?: Partial<CrudPerms>;
  cotizaciones?: Partial<CrudPerms>;
  tareas?: Partial<CrudPerms>;
  usuarios?: Partial<CrudPerms>;
  reportes?: Partial<CrudPerms>;
  cuentas_antarix?: Partial<CrudPerms>;
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
};

const cardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const searchInputClass =
  "min-h-[44px] w-full rounded-2xl border border-[#e2d9ca] bg-[#fffdf8] py-2 pl-10 pr-10 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#7c7a74] focus:border-[#ff801f]/60 focus:ring-4 focus:ring-[#ff801f]/12 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c]/70 dark:focus:ring-[#fb923c]/20 sm:min-h-[46px] sm:pl-11";

const claudeHeroHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]";

const claudeSectionHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.25rem,1.8vw,1.75rem)] font-medium leading-[1.2] text-[#1c1917] dark:text-[#f8fafc]";

const claudeSubheadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.1rem,1.3vw,1.25rem)] font-medium leading-[1.2] text-[#1c1917] dark:text-[#f8fafc]";

const claudeBodyClass = "text-base font-normal leading-[1.6] text-[#57534e] dark:text-[#b7c1d1]";

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const statLabelClass =
  "text-[9px] font-semibold uppercase tracking-wide text-[#78716c] dark:text-[#8ea0b8] sm:text-[10px]";

const statValueClass =
  "mt-0.5 text-base font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc] sm:text-lg";

const bodyMutedClass = "text-sm text-[#57534e] dark:text-[#cbd5e1]";

const permsModalHeaderClass =
  "px-5 py-4 border-b border-[#e7ded0] bg-[#fffdfa]/70 backdrop-blur dark:border-[#334155] dark:bg-[#111827]/80";

const permsAccordionClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fffdfa] shadow-theme-xs overflow-hidden dark:border-[#273244] dark:bg-[#111827]/80";

const permsAccordionBtnClass =
  "w-full px-4 py-3 flex items-center justify-between gap-3 bg-[#fffdfa]/70 backdrop-blur dark:bg-[#111827]/70";

const permsModuleRowClass =
  "rounded-xl border border-[#e7ded0] bg-[#fcfaf6]/60 px-3 py-3 dark:border-[#334155] dark:bg-[#0f172a]/50";

const claudeSansStyle = { fontFamily: "Outfit, sans-serif" } as const;

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const cardEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

const primaryOrangeBtnClass =
  "inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 py-2.5 text-sm font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:brightness-95 sm:w-auto sm:min-h-0";

const secondaryOutlineBtnClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#e7ded0] bg-white px-4 py-2.5 text-sm font-medium text-[#57534e] shadow-none transition-colors hover:bg-[#fffdf8] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]/80 sm:w-auto sm:min-h-0";

const selectFieldClass =
  "h-11 w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 text-sm text-[#1c1917] shadow-none outline-none transition-colors focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/20";

/** Usuarios que pueden asignar permisos (ver/crear/editar/eliminar) a otros, incluidos administradores. */
const PERMISSION_DELEGATION_USERNAMES = new Set(['angelperez10', 'ivancruz01']);

const isProtectedPrincipalUsername = (username: string): boolean =>
  PERMISSION_DELEGATION_USERNAMES.has((username || '').trim().toLowerCase());

const seedAdminPerms = async (userId: number) => {
  const full: Required<PermissionsPayload> = {
    ordenes: { view: true, create: true, edit: true, delete: true, own_only: false },
    clientes: { view: true, create: true, edit: true, delete: true },
    productos: { view: true, create: true, edit: true, delete: true },
    servicios: { view: true, create: true, edit: true, delete: true },
    cotizaciones: { view: true, create: true, edit: true, delete: true, own_only: false },
    tareas: { view: true, create: true, edit: true, delete: true },
    usuarios: { view: true, create: true, edit: true, delete: true },
    reportes: { view: true, create: true, edit: true, delete: true },
    cuentas_antarix: { view: true, create: true, edit: true, delete: true },
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

  const [signatureLoading, setSignatureLoading] = useState(false);
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [signatureValue, setSignatureValue] = useState<string>('');

  const [confirmDeleteSignature, setConfirmDeleteSignature] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingActiveId, setTogglingActiveId] = useState<number | null>(null);

  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [permsUser, setPermsUser] = useState<UserAccount | null>(null);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsForm, setPermsForm] = useState<PermissionsPayload>({});
  const [permsOpenSections, setPermsOpenSections] = useState<Record<string, boolean>>({});

  const didInitRef = useRef(false);
  const canDelegatePerms = useMemo(
    () => PERMISSION_DELEGATION_USERNAMES.has((authUser?.username || '').trim().toLowerCase()),
    [authUser?.username],
  );

  const normalizePerms = (p: any): Required<PermissionsPayload> => {
    const base: Required<PermissionsPayload> = {
      ordenes: { view: true, create: false, edit: false, delete: false, own_only: false },
      clientes: { view: true, create: false, edit: false, delete: false },
      productos: { view: true, create: false, edit: false, delete: false },
      servicios: { view: true, create: false, edit: false, delete: false },
      cotizaciones: { view: true, create: false, edit: false, delete: false, own_only: false },
      tareas: { view: true, create: false, edit: false, delete: false },
      usuarios: { view: true, create: false, edit: false, delete: false },
      reportes: { view: true, create: true, edit: false, delete: false },
      cuentas_antarix: { view: false, create: false, edit: false, delete: false },
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
      clientes: mergeCrud(base.clientes, p?.clientes),
      productos: mergeCrud(base.productos, p?.productos),
      servicios: mergeCrud(base.servicios, p?.servicios),
      cotizaciones: mergeCrud(base.cotizaciones, p?.cotizaciones),
      tareas: mergeCrud(base.tareas, p?.tareas),
      usuarios: mergeCrud(base.usuarios, p?.usuarios),
      reportes: mergeCrud(base.reportes, p?.reportes),
      cuentas_antarix: mergeCrud(base.cuentas_antarix, p?.cuentas_antarix),
    };
  };

  const openPerms = async (u: UserAccount) => {
    setOpenMenuId(null);
    setPermsUser(u);
    setPermsError(null);
    setSuccess(null);
    setIsPermsOpen(true);
    setPermsLoading(true);
    setPermsOpenSections({});
    try {
      const res = await fetchApi(`/api/users/accounts/${u.id}/permissions/`, {
        method: 'GET',
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'No se pudieron cargar los permisos');
      setPermsForm(normalizePerms(data?.permissions || {}));
    } catch (e: any) {
      setPermsError(e?.message || 'Error');
      setPermsForm(normalizePerms({}));
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
      const cur = normalizePerms(prev);
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
      const merged = normalizePerms(permsForm);
      const payloadPerms = isAdmin
        ? permsForm
        : {
            ...permsForm,
            // Cotizaciones: los técnicos pueden tener permisos granulares (ver/crear/editar/eliminar)
            cotizaciones: merged.cotizaciones,
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
    });
    setShowEditPassword(false);
    setShowEditPassword2(false);
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

      const payload: any = {
        username: editForm.username.trim(),
        first_name: (editForm.first_name || '').trim(),
        last_name: (editForm.last_name || '').trim(),
        email: (editForm.email || '').trim(),
        is_staff: editForm.role === 'admin',
        is_superuser: editForm.role === 'admin',
      };
      if (editForm.password || editForm.password2) {
        payload.password = editForm.password;
        payload.password2 = editForm.password2;
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
      ? 'border border-[#ff801f]/35 bg-[#ff801f]/10 text-[#ff801f] dark:border-[#ffa057]/40 dark:bg-[#ff801f]/12 dark:text-[#ffa057]'
      : 'border border-[#ff801f]/22 bg-[#ff801f]/[0.07] text-[#b45309] dark:border-[#ffa057]/28 dark:bg-[#ff801f]/10 dark:text-[#ffb174]';
  };

  return (
    <>
      <PageMeta title="Gestión de usuarios | Sistema Grupo Intrax GPS" description="Administración de cuentas, roles, permisos y firma digital" />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
        <motion.div
          className="relative mx-auto w-full max-w-[min(100%,88rem)] space-y-6 px-4 pb-10 pt-6 sm:space-y-8 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 xl:px-10"
          style={claudeSansStyle}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >

          <motion.nav
            variants={fadeInUp}
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1.5 py-1 text-[#57534e] transition-all duration-200 hover:bg-black/[0.05] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              Inicio
            </Link>
            <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
              /
            </span>
            <span className="text-[#44403c] dark:text-[#cbd5e1]">Usuarios</span>
          </motion.nav>

          <motion.header variants={fadeInUp} className={`${cardShellClass} dark:bg-[#111827]/80 dark:border-[#273244]`}>
            <div className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-[#e7ded0] dark:bg-[#334155]" />
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6 lg:p-8">
                <div className="flex min-w-0 gap-3.5 sm:gap-4">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2d9ca] bg-white text-[#1c1917] sm:h-12 sm:w-12 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f8fafc]">
                    <svg className="h-5 w-5 sm:h-[18px] sm:w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#11ff99] dark:border-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={sectionLabelClass}>Contactos de negocio</p>
                    <h1 className={`mt-1 ${claudeHeroHeadingClass}`}>Gestión de usuarios</h1>
                    <p className={`mt-2 max-w-xl ${claudeBodyClass}`}>
                      Crea cuentas, asigna <span className="font-medium text-[#ea580c] dark:text-[#fb923c]">roles</span>, ajusta permisos por módulo y administra la firma digital.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.header>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <Alert variant="error" title="Error" message={error} showLink={false} />
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <Alert variant="success" title="Listo" message={success} showLink={false} />
              </motion.div>
            )}
          </AnimatePresence>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <div data-anim="user-stat" className={`${cardShellClass} p-3 transition-colors hover:border-[#e2d9ca] dark:hover:border-[#334155] sm:p-4`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e7ded0] bg-[#fcfaf6]/80 text-[#ff801f] dark:border-[#334155] dark:bg-[#1e293b]/80 dark:text-[#fb923c] sm:h-10 sm:w-10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className={statLabelClass}>Total usuarios</p>
              <p className={statValueClass}>{stats.total}</p>
            </div>
          </div>
        </div>

        <div data-anim="user-stat" className={`${cardShellClass} p-3 transition-colors hover:border-[#e2d9ca] dark:hover:border-[#334155] sm:p-4`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] dark:border-[#9a3412]/40 dark:bg-[#7c2d12]/20 dark:text-[#fdba74] sm:h-10 sm:w-10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor">
                <path d="M12 3l2.5 6L21 10l-5 4 1.5 7L12 18l-5.5 3 1.5-7-5-4 6.5-1L12 3z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className={statLabelClass}>Admins</p>
              <p className={statValueClass}>{stats.admins}</p>
            </div>
          </div>
        </div>

        <div data-anim="user-stat" className={`${cardShellClass} p-3 transition-colors hover:border-[#e2d9ca] dark:hover:border-[#334155] sm:p-4`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e7ded0]/70 bg-[#f5f0e8] text-[#44403c] dark:border-[#334155] dark:bg-[#1e293b] dark:text-[#cbd5e1] sm:h-10 sm:w-10">
              <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className={statLabelClass}>Técnicos</p>
              <p className={statValueClass}>{stats.tecnicos}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
        <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7c7a74] sm:left-3 sm:h-4 sm:w-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            placeholder="Usuario, correo o nombre…"
            className={searchInputClass}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-8 min-w-[40px] items-center justify-center rounded-md text-[#7c7a74] hover:bg-[#e7ded0]/60 hover:text-[#57534e] sm:h-9 sm:min-w-[44px] sm:rounded-lg"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={openCreate}
          className={primaryOrangeBtnClass}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      <ComponentCard
        compact
        title="Listado de usuarios"
        desc="Filtra por rol con el botón Filtros, busca en tiempo real y abre el menú de cada tarjeta para editar, permisos o firma."
        className="!overflow-visible border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)]"
        actions={(
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen(v => !v)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e2d9ca] bg-[#fcfaf6]/90 px-3 py-2 text-xs font-semibold text-[#44403c] transition-colors hover:border-[#e2d9ca] hover:bg-[#fffdfa] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]/80 sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M14.6537 5.90414C14.6537 4.48433 13.5027 3.33331 12.0829 3.33331C10.6631 3.33331 9.51206 4.48433 9.51204 5.90415M14.6537 5.90414C14.6537 7.32398 13.5027 8.47498 12.0829 8.47498C10.663 8.47498 9.51204 7.32398 9.51204 5.90415M14.6537 5.90414L17.7087 5.90411M9.51204 5.90415L2.29199 5.90411M5.34694 14.0958C5.34694 12.676 6.49794 11.525 7.91777 11.525C9.33761 11.525 10.4886 12.676 10.4886 14.0958M5.34694 14.0958C5.34694 15.5156 6.49794 16.6666 7.91778 16.6666C9.33761 16.6666 10.4886 15.5156 10.4886 14.0958M5.34694 14.0958L2.29199 14.0958M10.4886 14.0958L17.7087 14.0958" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Filtros
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-4 shadow-lg dark:border-[#334155] dark:bg-[#111827] dark:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]">
                <div className="mb-2">
                  <label className="mb-2 block text-xs font-medium text-[#44403c] dark:text-[#cbd5e1]">Rol</label>
                  <div className="inline-flex w-full rounded-xl border border-[#e2d9ca] bg-[#fcfaf6]/90 p-1 dark:border-[#334155] dark:bg-[#0f172a]/90">
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
                        className={`h-8 flex-1 rounded-lg text-xs font-semibold transition ${
                          roleFilter === opt.value
                            ? 'border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] dark:border-[#9a3412]/40 dark:bg-[#7c2d12]/20 dark:text-[#fdba74]'
                            : 'text-[#44403c] hover:bg-[#e7ded0]/80 dark:text-[#cbd5e1] dark:hover:bg-[#334155]/80'
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

        {loading ? (
          <div className="py-10 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]">Cargando...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
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

              return (
                <motion.div
                  key={u.id}
                  variants={cardEnter}
                  initial="initial"
                  animate="animate"
                  layout
                  className="group relative overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/95 p-4 shadow-[0_12px_32px_-28px_rgba(28,25,23,0.2)] transition-all hover:border-[#ff801f]/35 dark:border-[#273244] dark:bg-[#111827]/75 dark:hover:border-[#fb923c]/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-[#fcfaf6]/90 text-sm font-semibold text-[#44403c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb]">
                        {initials || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h4 className="truncate font-semibold text-[#1c1917] dark:text-[#f8fafc]">{u.username}</h4>
                          <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadge(u)}`}>
                            {isAdmin ? 'Admin' : 'Técnico'}
                          </span>
                        </div>
                        <p className="text-sm text-[#78716c] dark:text-[#8ea0b8] truncate">{fullName || '—'}</p>
                      </div>
                    </div>

                    <div className="relative z-[80]" ref={openMenuId === u.id ? menuRef : null}>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((prev) => (prev === u.id ? null : u.id))}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9ca] bg-[#fcfaf6]/90 text-[#78716c] hover:border-[#e2d9ca] hover:bg-[#fffdfa] hover:text-[#44403c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#8ea0b8] dark:hover:bg-[#1e293b] dark:hover:text-[#f8fafc]"
                      >
                        <MoreDotIcon className="h-5 w-5 fill-current" />
                      </button>

                      {openMenuId === u.id && (
                        <div className="absolute right-0 top-full z-[200] mt-1.5 w-44 overflow-hidden rounded-xl border border-[#e2d9ca] bg-[#fffdfa] py-1 shadow-lg ring-1 ring-black/5 dark:border-[#334155] dark:bg-[#111827] dark:ring-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              openEdit(u);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-[#44403c] transition-colors hover:bg-[#fcfaf6] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]/80"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5f0e8] text-[#57534e] dark:bg-[#1e293b] dark:text-[#cbd5e1]">
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
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-[#44403c] transition-colors hover:bg-[#fcfaf6] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]/80"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f5f0e8] text-[#57534e] dark:bg-[#1e293b] dark:text-[#cbd5e1]">
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
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
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

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <div className={cn("truncate", bodyMutedClass)}>
                      <span className="text-[#78716c] dark:text-[#8ea0b8]">Correo:</span>{' '}
                      {u.email || '—'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md border border-[#e7ded0] bg-[#fcfaf6]/90 px-2 py-0.5 text-[11px] font-semibold text-[#44403c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#cbd5e1]">
                        <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Acceso con contraseña
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#e2d9ca] bg-[#fcfaf6]/90 px-3 py-2.5 dark:border-[#334155] dark:bg-[#0f172a]/80">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#78716c] dark:text-[#8ea0b8]">Acceso al sistema</p>
                        <p className="mt-0.5 text-sm text-[#1c1917] dark:text-[#f8fafc]">
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
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcfaf6] dark:focus-visible:ring-offset-[#111827] ${
                          switchDisabled
                            ? 'cursor-not-allowed border border-[#e7ded0] bg-[#e7ded0]/90 opacity-60 dark:border-[#334155] dark:bg-[#334155]/90'
                            : isActive
                              ? 'bg-[#5db872]'
                              : 'bg-[#e7ded0] dark:bg-[#334155]'
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
                </motion.div>
              );
            })}

            </AnimatePresence>

            {!filtered.length && (
              <div className="col-span-full py-10 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]">
                No hay usuarios.
              </div>
            )}
          </div>
        )}
      </ComponentCard>

      <Modal mobileBottomSheet isOpen={isCreateOpen} onClose={closeCreate} closeOnBackdropClick={false} className="flex max-h-[min(92vh,780px)] w-[min(94vw,42rem)] flex-col overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b] sm:max-w-2xl">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-6 py-5 pr-14 dark:border-[#334155] dark:bg-[#111827] sm:pr-16">
            <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f] text-black shadow-sm">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className={sectionLabelClass}>Contactos · Usuarios</p>
                <h2 className={`mt-1 ${claudeSectionHeadingClass}`}>Nuevo usuario</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Crea cuentas Admin o Técnico con contraseña segura.
                </p>
              </div>
            </div>
          </header>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#fffdfa] px-4 py-4 pb-5 dark:bg-[#111a2b] sm:px-5">
            {formError && (
              <Alert variant="error" title="Revisa" message={formError} showLink={false} />
            )}

            <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5">
              <div className="mb-4 border-b border-[#e7ded0]/90 pb-3 dark:border-[#334155]/80">
                <p className={sectionLabelClass}>Identidad</p>
                <p className={`mt-0.5 ${claudeSubheadingClass}`}>Acceso al sistema</p>
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
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Máx. 150 caracteres. Letras, dígitos y @/./+/-/_</p>
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

            <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5">
              <div className="mb-4 border-b border-[#e7ded0]/90 pb-3 dark:border-[#334155]/80">
                <p className={sectionLabelClass}>Seguridad</p>
                <p className={`mt-0.5 ${claudeSubheadingClass}`}>Contraseña</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">8+ caracteres, no solo números, distinta al usuario.</p>
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
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
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

          <div className="shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/70 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
              <button type="button" onClick={closeCreate} className={secondaryOutlineBtnClass} disabled={creating}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={doCreate}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#ff801f] px-4 text-sm font-medium text-black transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:brightness-95 disabled:opacity-60 sm:w-auto"
                disabled={creating}
              >
                {creating ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>

      </Modal>

      <Modal mobileBottomSheet isOpen={isPermsOpen} onClose={closePerms} closeOnBackdropClick={false} className="flex max-h-[min(92vh,880px)] w-[min(94vw,42rem)] flex-col overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b] sm:max-w-2xl">
        <div className="overflow-hidden rounded-2xl">
          <div className={permsModalHeaderClass}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] dark:border-[#9a3412]/40 dark:bg-[#7c2d12]/20 dark:text-[#fdba74]">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#1c1917] dark:text-[#f8fafc] truncate [font-family:Georgia,'Times_New_Roman',serif]">
                  Permisos{permsUser ? `: ${permsUser.username}` : ''}
                </h3>
                <p className="mt-0.5 text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
                  Define qué vistas puede ver y qué acciones puede realizar este usuario.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 max-h-[76vh] overflow-y-auto custom-scrollbar">
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
              <div className="py-10 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]">Cargando permisos...</div>
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
                        { key: 'contactos' as const, label: 'Contacto de negocio', modules: [{ key: 'clientes' as const, label: 'Clientes' }, { key: 'usuarios' as const, label: 'Usuarios' }] },
                        { key: 'productos_servicios' as const, label: 'Productos y Servicios', modules: [{ key: 'productos' as const, label: 'Productos' }, { key: 'servicios' as const, label: 'Servicios' }] },
                        { key: 'compras_gastos' as const, label: 'Compras y Gastos', modules: [] as { key: keyof Required<PermissionsPayload>; label: string }[] },
                        { key: 'ventas' as const, label: 'Ventas', modules: [{ key: 'cotizaciones' as const, label: 'Cotizaciones' }] },
                        {
                          key: 'operaciones' as const,
                          label: 'Operaciones',
                          modules: [
                            { key: 'ordenes' as const, label: 'Órdenes de Servicios' },
                            { key: 'reportes' as const, label: 'Reportes semanales' },
                            { key: 'cuentas_antarix' as const, label: 'Cuentas Antarix GPS' },
                          ],
                        },
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
                            { key: 'reportes' as const, label: 'Reportes semanales' },
                            { key: 'cuentas_antarix' as const, label: 'Cuentas Antarix GPS' },
                          ],
                        },
                      ] as const);

                  const actionLabels: { key: keyof CrudPerms; label: string }[] = [
                    { key: 'view', label: 'Ver' },
                    { key: 'create', label: 'Crear' },
                    { key: 'edit', label: 'Editar' },
                    { key: 'delete', label: 'Eliminar' },
                  ];

                  return (
                    <div className="space-y-3">
                      {sections.map((sec) => {
                        const isOpen = !!permsOpenSections[sec.key];
                        return (
                          <div key={sec.key} className={permsAccordionClass}>
                            <button
                              type="button"
                              onClick={() => setPermsOpenSections(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                              className={permsAccordionBtnClass}
                              aria-expanded={isOpen}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f0e8] text-[#57534e] dark:bg-[#1e293b] dark:text-[#cbd5e1]">
                                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                  </svg>
                                </span>
                                <div className="min-w-0 text-left">
                                  <div className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc] truncate">{sec.label}</div>
                                  <div className="text-[11px] text-[#78716c] dark:text-[#8ea0b8] truncate">
                                    {sec.modules.length > 0 ? `${sec.modules.length} módulo(s)` : 'Sin módulos configurados'}
                                  </div>
                                </div>
                              </div>
                              <svg className={`w-4 h-4 text-[#78716c] dark:text-[#8ea0b8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none">
                                <path d="M5.25 7.5 10 12.25 14.75 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            <div
                              className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                            >
                              <div className="overflow-hidden">
                                <div className="p-4 border-t border-[#e7ded0] dark:border-[#334155]">
                                  <div className="hidden sm:grid grid-cols-12 gap-3 pb-2 text-[11px] font-semibold text-[#78716c] dark:text-[#8ea0b8]">
                                    <div className="col-span-5">Módulo</div>
                                    <div className="col-span-7 grid grid-cols-4 gap-3 text-center">
                                      {actionLabels.map(a => (
                                        <div key={a.key}>{a.label}</div>
                                      ))}
                                    </div>
                                  </div>

                                  {sec.modules.length > 0 ? (
                                    <div className="space-y-2">
                                      {sec.modules.map((m) => {
                                        const cur = normalizePerms(permsForm)[m.key] as CrudPerms;
                                        const supportsOwnScope = m.key === 'cotizaciones' || m.key === 'ordenes';
                                        const Switch = ({ k }: { k: keyof CrudPerms }) => {
                                          const checked = !!cur[k];
                                          return (
                                            <button
                                              type="button"
                                              role="switch"
                                              aria-checked={checked}
                                              disabled={!canDelegatePerms}
                                              title={!canDelegatePerms ? 'Sin permiso para cambiar' : undefined}
                                              onClick={() => {
                                                if (!canDelegatePerms) return;
                                                setPerm(m.key, k, !checked);
                                              }}
                                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#ff801f]/40 active:scale-[0.98] ${checked ? 'bg-[#ff801f]' : 'bg-[#e7ded0] dark:bg-[#334155]'} ${!canDelegatePerms ? 'cursor-not-allowed opacity-55' : ''}`}
                                            >
                                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
                                            </button>
                                          );
                                        };

                                        return (
                                          <div key={m.key} className={permsModuleRowClass}>
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                              <div className="sm:col-span-5">
                                                <div className="flex items-center gap-2">
                                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#fffdfa] text-[#57534e] shadow-sm dark:bg-[#111a2b] dark:text-[#cbd5e1]">
                                                    {getIcon(m.key)}
                                                  </span>
                                                  <div className="min-w-0">
                                                    <div className="text-sm font-medium text-[#1c1917] dark:text-[#f8fafc] truncate">{m.label}</div>
                                                    {supportsOwnScope && (
                                                      <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={!!cur.own_only}
                                                        disabled={!canDelegatePerms}
                                                        title={!canDelegatePerms ? 'Sin permiso para cambiar' : undefined}
                                                        onClick={() => {
                                                          if (!canDelegatePerms) return;
                                                          setPerm(m.key, 'own_only', !cur.own_only);
                                                        }}
                                                        className={`mt-1 inline-flex items-center gap-2 rounded-xl border px-2.5 py-1 text-[10px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-all ${
                                                          cur.own_only
                                                            ? 'border-[#ff801f]/80 bg-[#ff801f]/10 text-[#9a3412] dark:border-[#ffa057]/80 dark:bg-[#ff801f]/15 dark:text-[#ffa057]'
                                                            : 'border-[#e2d9ca] bg-[#fffdfa] text-[#57534e] hover:border-[#e2d9ca] hover:bg-[#fcfaf6] dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#cbd5e1] dark:hover:bg-[#1e293b]/80'
                                                        } ${!canDelegatePerms ? 'cursor-not-allowed opacity-55' : ''}`}
                                                      >
                                                        <span
                                                          className={`relative inline-flex h-4 w-7 items-center rounded-full border transition-colors ${
                                                            cur.own_only
                                                              ? 'border-[#ff801f]/80 bg-[#ff801f]'
                                                              : 'border-[#e7ded0] bg-[#e7ded0] dark:border-[#334155] dark:bg-[#334155]'
                                                          }`}
                                                          aria-hidden
                                                        >
                                                          <span
                                                            className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                                                              cur.own_only ? 'translate-x-[14px]' : 'translate-x-[2px]'
                                                            }`}
                                                          />
                                                        </span>
                                                        <span className="tracking-wide">
                                                          {cur.own_only ? 'Solo propios: Activo' : 'Solo propios: Inactivo'}
                                                        </span>
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="sm:col-span-7 grid grid-cols-4 gap-3 items-center justify-items-center">
                                                <Switch k="view" />
                                                <Switch k="create" />
                                                <Switch k="edit" />
                                                <Switch k="delete" />
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-dashed border-[#e7ded0] dark:border-[#334155] p-4 text-center text-sm text-[#78716c] dark:text-[#8ea0b8]">
                                      Esta sección todavía no tiene módulos conectados a permisos.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePerms}
                    className={secondaryOutlineBtnClass}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={permsSaving || permsLoading || !permsUser || !canDelegatePerms}
                    title={!canDelegatePerms ? 'Solo Angel Pérez e Ivan Cruz pueden guardar cambios' : undefined}
                    onClick={savePerms}
                    className="inline-flex items-center justify-center rounded-xl bg-[#ff801f] px-4 py-2.5 text-xs font-medium text-black shadow-theme-xs hover:bg-[#ff6a00] disabled:opacity-60"
                  >
                    {permsSaving ? 'Guardando...' : 'Guardar permisos'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal mobileBottomSheet isOpen={isEditOpen} onClose={closeEdit} closeOnBackdropClick={false} className="flex max-h-[min(92vh,860px)] w-[min(94vw,42rem)] flex-col overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b] sm:max-w-2xl">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <header className="relative shrink-0 border-b border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 pr-14 dark:border-[#273244] dark:bg-[#0f172a]/70 sm:pr-16">
            <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff801f] text-black">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className={sectionLabelClass}>Contactos · Usuarios</p>
                <h2 className={`mt-1 ${claudeSectionHeadingClass}`}>Editar usuario</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Actualiza datos y, si aplica, la contraseña o la firma digital.
                </p>
              </div>
            </div>
          </header>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#fffdfa] px-4 py-4 pb-5 dark:bg-[#111a2b] sm:px-5">
            {editError && <Alert variant="error" title="Revisa" message={editError} showLink={false} />}
            {signatureError && <Alert variant="error" title="Firma" message={signatureError} showLink={false} />}

            <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5">
              <div className="mb-4 border-b border-[#e7ded0]/90 pb-3 dark:border-[#334155]/80">
                <p className={sectionLabelClass}>Identidad</p>
                <p className={`mt-0.5 ${claudeSubheadingClass}`}>Datos de la cuenta</p>
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

            <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5">
              <div className="mb-4 border-b border-[#e7ded0]/90 pb-3 dark:border-[#334155]/80">
                <p className={sectionLabelClass}>Seguridad</p>
                <p className={`mt-0.5 ${claudeSubheadingClass}`}>Cambiar contraseña</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Opcional · deja vacío para mantener la actual.</p>
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

            <div className="rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#273244] dark:bg-[#111a2b] sm:p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100/90 pb-3 dark:border-white/[0.06]">
                <div>
                  <p className={sectionLabelClass}>Documento</p>
                  <p className={`mt-0.5 ${claudeSubheadingClass}`}>Firma digital</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/5"
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
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-gray-500 dark:text-gray-400">
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
                      className="max-h-[180px] w-full max-w-[420px] rounded-xl border border-gray-200/80 bg-white object-contain dark:border-[#334155]"
                    />
                  </div>
                ) : (
                  <SignaturePad value={signatureValue} onChange={(sig) => setSignatureValue(sig)} width={420} height={180} />
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-3 dark:border-[#273244] dark:bg-[#0f172a]/70 sm:px-5">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
              <button type="button" onClick={closeEdit} className={secondaryOutlineBtnClass} disabled={editing}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={doUpdate}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#ff801f] px-4 text-sm font-medium text-black transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:brightness-95 disabled:opacity-60 sm:w-auto"
                disabled={editing || signatureSaving || signatureLoading}
              >
                {editing ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>

      </Modal>

      <Modal mobileBottomSheet isOpen={confirmDeleteSignature} onClose={() => setConfirmDeleteSignature(false)} closeOnBackdropClick={false} className="w-full max-w-sm overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl dark:border-[#273244] dark:bg-[#111a2b]">
        <div className="bg-[#fffdfa] p-5 dark:bg-[#111a2b]">
          <div className="mb-4 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/10 text-[#ff801f] dark:text-[#ffa057]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4h8v2" strokeLinecap="round" />
                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className={claudeSubheadingClass}>Eliminar firma</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteSignature(false)}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06] sm:w-auto"
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
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 sm:w-auto"
              disabled={signatureSaving}
            >
              {signatureSaving ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>

      </Modal>

      <Modal mobileBottomSheet isOpen={confirmDeleteId != null} onClose={() => setConfirmDeleteId(null)} closeOnBackdropClick={false} className="w-full max-w-sm overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] shadow-xl dark:border-[#273244] dark:bg-[#111a2b]">
        <div className="bg-[#fffdfa] p-5 dark:bg-[#111a2b]">
          <div className="mb-4 flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff801f]/10 text-[#ff801f] dark:text-[#ffa057]">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 6h18" strokeLinecap="round" />
                <path d="M8 6V4h8v2" strokeLinecap="round" />
                <path d="M6 6l1 16h10l1-16" strokeLinejoin="round" />
                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className={claudeSubheadingClass}>Eliminar usuario</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06] sm:w-auto"
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={doDelete}
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60 sm:w-auto"
              disabled={deleting}
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>

      </Modal>
        </motion.div>
      </div>
    </>
  );
}
