import { useEffect, useMemo, useRef, useState } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import PageMeta from '@/components/common/PageMeta';
import ComponentCard from '@/components/common/ComponentCard';
import Label from '@/components/form/Label';
import Input from '@/components/form/input/InputField';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from '@/components/ui/modal';
import SignaturePad from '@/components/ui/signature/SignaturePad';
import { apiUrl } from '@/config/api';
import { EyeCloseIcon, EyeIcon, MoreDotIcon } from '@/icons';

type Role = 'admin' | 'tecnico';

type CrudPerms = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
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
  kpis?: Partial<CrudPerms>;
  productos?: Partial<CrudPerms>;
  cotizaciones?: Partial<CrudPerms>;
};

type UserAccount = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
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

const getCsrfToken = (): string | null => {
  try {
    const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
};

const ensureCsrfCookie = async () => {
  let csrf = getCsrfToken();
  if (csrf) return csrf;
  try {
    await fetch(apiUrl('/api/csrf/'), {
      method: 'GET',
      credentials: 'include',
    });
  } catch {
    // ignore
  }
  csrf = getCsrfToken();
  return csrf;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = (
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    ''
  ).trim();
  const csrf = getCsrfToken();

  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (csrf) h['X-CSRFToken'] = csrf;
  return h;
};

const seedAdminPerms = async (userId: number) => {
  const full: Required<PermissionsPayload> = {
    ordenes: { view: true, create: true, edit: true, delete: true },
    clientes: { view: true, create: true, edit: true, delete: true },
    productos: { view: true, create: true, edit: true, delete: true },
    cotizaciones: { view: true, create: true, edit: true, delete: true },
    kpis: { view: true, create: true, edit: true, delete: true },
  };

  await ensureCsrfCookie();
  const res = await fetch(apiUrl(`/api/users/accounts/${userId}/permissions/`), {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
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
  const API = apiUrl('/api/users/accounts/');

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

  const [isPermsOpen, setIsPermsOpen] = useState(false);
  const [permsUser, setPermsUser] = useState<UserAccount | null>(null);
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsError, setPermsError] = useState<string | null>(null);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsForm, setPermsForm] = useState<PermissionsPayload>({});

  const didInitRef = useRef(false);

  const normalizePerms = (p: any): Required<PermissionsPayload> => {
    const base: Required<PermissionsPayload> = {
      ordenes: { view: true, create: false, edit: false, delete: false },
      clientes: { view: true, create: false, edit: false, delete: false },
      productos: { view: true, create: false, edit: false, delete: false },
      cotizaciones: { view: true, create: false, edit: false, delete: false },
      kpis: { view: true, create: false, edit: false, delete: false },
    };
    const safe = (v: any) => (typeof v === 'boolean' ? v : undefined);
    const mergeCrud = (dst: any, src: any) => {
      if (!src || typeof src !== 'object') return dst;
      return {
        view: safe(src.view) ?? dst.view,
        create: safe(src.create) ?? dst.create,
        edit: safe(src.edit) ?? dst.edit,
        delete: safe(src.delete) ?? dst.delete,
      };
    };
    return {
      ordenes: mergeCrud(base.ordenes, p?.ordenes),
      clientes: mergeCrud(base.clientes, p?.clientes),
      productos: mergeCrud(base.productos, p?.productos),
      cotizaciones: mergeCrud(base.cotizaciones, p?.cotizaciones),
      kpis: mergeCrud(base.kpis, p?.kpis),
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
      const res = await fetch(apiUrl(`/api/users/accounts/${u.id}/permissions/`), {
        method: 'GET',
        credentials: 'include',
        headers: { ...getAuthHeaders() },
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
    setPermsError(null);
    setSuccess(null);
    setPermsSaving(true);
    try {
      await ensureCsrfCookie();

      const isAdmin = permsUser.is_superuser || permsUser.is_staff;
      const payloadPerms = isAdmin
        ? permsForm
        : {
            ...permsForm,
            productos: { view: false, create: false, edit: false, delete: false },
            cotizaciones: { view: false, create: false, edit: false, delete: false },
            kpis: { view: false, create: false, edit: false, delete: false },
          };

      const res = await fetch(apiUrl(`/api/users/accounts/${permsUser.id}/permissions/`), {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ permissions: payloadPerms }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'No se pudieron guardar los permisos');

      try {
        const rawMe = localStorage.getItem('user') || sessionStorage.getItem('user');
        const me = rawMe ? JSON.parse(rawMe) : null;
        if (me && typeof me?.id === 'number' && me.id === permsUser.id) {
          const pStr = JSON.stringify(payloadPerms || {});
          localStorage.setItem('permissions', pStr);
          sessionStorage.setItem('permissions', pStr);
        }
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event('permissions:updated'));

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
      const res = await fetch(API, {
        method: 'GET',
        credentials: 'include',
        headers: { ...getAuthHeaders() },
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
        const isAdmin = u.is_superuser || u.is_staff;
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
        const aAdmin = a.is_superuser || a.is_staff;
        const bAdmin = b.is_superuser || b.is_staff;
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
      const isAdmin = u.is_superuser || u.is_staff;
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
    const isAdmin = u.is_superuser || u.is_staff;
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
    fetch(apiUrl(`/api/users/accounts/${u.id}/signature/`), {
      method: 'GET',
      credentials: 'include',
      headers: { ...getAuthHeaders() },
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
      await ensureCsrfCookie();
      const payload = {
        username: form.username.trim(),
        first_name: (form.first_name || '').trim(),
        last_name: (form.last_name || '').trim(),
        email: (form.email || '').trim(),
        is_staff: form.role === 'admin',
        is_superuser: form.role === 'admin',
        password: form.password,
      };

      const res = await fetch(API, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al crear usuario');

      if (form.role === 'admin' && typeof (data as any)?.id === 'number') {
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
      await ensureCsrfCookie();
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

      const res = await fetch(apiUrl(`/api/users/accounts/${editUser.id}/`), {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || 'Error al actualizar usuario');

      if (hasNewSignature) {
        await ensureCsrfCookie();
        const resSig = await fetch(apiUrl(`/api/users/accounts/${editUser.id}/signature/`), {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ signature: signatureValue }),
        });
        const dataSig = (await resSig.json().catch(() => null)) as UserSignaturePayload | null;
        if (!resSig.ok) throw new Error((dataSig as any)?.detail || 'Error al guardar la firma');
        setSignatureValue(dataSig?.url || '');
      }

      const wasAdmin = !!editUser.is_superuser || !!editUser.is_staff;
      const willBeAdmin = editForm.role === 'admin';
      if (!wasAdmin && willBeAdmin) {
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

  const doDelete = async () => {
    if (confirmDeleteId == null) return;
    setError(null);
    setSuccess(null);
    setDeleting(true);
    try {
      await ensureCsrfCookie();
      const res = await fetch(apiUrl(`/api/users/accounts/${confirmDeleteId}/`), {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...getAuthHeaders(),
        },
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
    const isAdmin = u.is_superuser || u.is_staff;
    return isAdmin
      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
      : 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
  };

  return (
    <div className="p-4 sm:p-6">
      <PageMeta title="Gestión de Usuarios" description="Administración de usuarios" />
      <PageBreadcrumb pageTitle="Gestión de Usuarios" />

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success" title="Listo" message={success} />
        </div>
      )}

      <div className="grid gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7" fill="currentColor">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Usuarios</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7" fill="currentColor">
                <path d="M12 3l2.5 6L21 10l-5 4 1.5 7L12 18l-5.5 3 1.5-7-5-4 6.5-1L12 3z" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Admins</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{stats.admins}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-7 sm:h-7" fill="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Técnicos</p>
              <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-gray-100">{stats.tecnicos}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Usuarios</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-1 sm:min-w-[260px] sm:justify-end">
          <div className="relative w-full sm:max-w-xs md:max-w-sm">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none">
              <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              value={query}
              onChange={(e: any) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 pr-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/60"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={openCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo usuario
          </button>
        </div>
      </div>

      <ComponentCard
        title="Listado"
        actions={(
          <div className="relative w-full sm:w-auto" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen(v => !v)}
              className="shadow-theme-xs flex h-9 w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 sm:min-w-[80px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M14.6537 5.90414C14.6537 4.48433 13.5027 3.33331 12.0829 3.33331C10.6631 3.33331 9.51206 4.48433 9.51204 5.90415M14.6537 5.90414C14.6537 7.32398 13.5027 8.47498 12.0829 8.47498C10.663 8.47498 9.51204 7.32398 9.51204 5.90415M14.6537 5.90414L17.7087 5.90411M9.51204 5.90415L2.29199 5.90411M5.34694 14.0958C5.34694 12.676 6.49794 11.525 7.91777 11.525C9.33761 11.525 10.4886 12.676 10.4886 14.0958M5.34694 14.0958C5.34694 15.5156 6.49794 16.6666 7.91778 16.6666C9.33761 16.6666 10.4886 15.5156 10.4886 14.0958M5.34694 14.0958L2.29199 14.0958M10.4886 14.0958L17.7087 14.0958" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Filtros
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-2">
                  <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Rol</label>
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      setRoleFilter(e.target.value as any);
                      setFilterOpen(false);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <option value="all">Todos</option>
                    <option value="admin">Admins</option>
                    <option value="tecnico">Técnicos</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      >

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Cargando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((u) => {
              const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
              const isAdmin = u.is_superuser || u.is_staff;
              const initials = (fullName || u.username)
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('');

              return (
                <div
                  key={u.id}
                  className="group relative rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/3"
                >
                  <div className={`pointer-events-none absolute inset-0 z-0 bg-linear-to-r ${isAdmin
                    ? 'from-indigo-50/80 to-transparent dark:from-indigo-500/10'
                    : 'from-sky-50/80 to-transparent dark:from-sky-500/10'
                    }`} />

                  <div className="relative z-20 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-2xl bg-white/80 backdrop-blur border border-gray-200 text-gray-700 dark:bg-gray-900/60 dark:border-white/10 dark:text-gray-200 flex items-center justify-center font-semibold">
                        {initials || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-semibold text-gray-800 dark:text-white/90 truncate">{u.username}</h4>
                          <span className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadge(u)}`}>
                            {isAdmin ? 'Admin' : 'Técnico'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{fullName || '—'}</p>
                      </div>
                    </div>

                    <div className="relative z-20" ref={openMenuId === u.id ? menuRef : null}>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((prev) => (prev === u.id ? null : u.id))}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white/80 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-white/10 dark:bg-gray-900/60 dark:text-gray-300 dark:hover:bg-white/5"
                      >
                        <MoreDotIcon className="h-5 w-5 fill-current" />
                      </button>

                      {openMenuId === u.id && (
                        <div className="shadow-theme-lg dark:bg-gray-dark absolute top-full right-0 z-50 w-40 space-y-1 rounded-2xl border border-gray-200 bg-white p-2 dark:border-gray-800">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              openEdit(u);
                            }}
                            className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              openPerms(u);
                            }}
                            className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                          >
                            Permisos
                          </button>
                          {u.username !== 'AngelPerez10' && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(u.id);
                              }}
                              className="text-theme-xs flex w-full rounded-lg px-3 py-2 text-left font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 mt-4 grid grid-cols-1 gap-2">
                    <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      <span className="text-gray-500 dark:text-gray-400">Correo:</span>{' '}
                      {u.email || '—'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Z" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Acceso con contraseña
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {!filtered.length && (
              <div className="col-span-full py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay usuarios.
              </div>
            )}
          </div>
        )}
      </ComponentCard>

      <Modal isOpen={isCreateOpen} onClose={closeCreate} className="max-w-2xl">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Nuevo usuario</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Crea usuarios Admin o Técnico.
          </p>
        </div>

        <div className="p-5">
          {formError && (
            <div className="mb-4">
              <Alert variant="error" title="Revisa" message={formError} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre de usuario <span className="text-error-500">*</span></Label>
              <Input value={form.username} onChange={(e: any) => setForm((p) => ({ ...p, username: e.target.value }))} />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Máx. 150 caracteres. Letras, dígitos y @/./+/-/_</p>
            </div>

            <div>
              <Label>Rol <span className="text-error-500">*</span></Label>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 shadow-theme-xs transition-colors focus:border-ring-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="tecnico">Técnico</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <Label>Nombre(s)</Label>
              <Input value={form.first_name} onChange={(e: any) => setForm((p) => ({ ...p, first_name: e.target.value }))} />
            </div>
            <div>
              <Label>Apellidos</Label>
              <Input value={form.last_name} onChange={(e: any) => setForm((p) => ({ ...p, last_name: e.target.value }))} />
            </div>

            <div className="sm:col-span-2">
              <Label>Correo electrónico</Label>
              <Input value={form.email} onChange={(e: any) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <Label>Contraseña <span className="text-error-500">*</span></Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e: any) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                  {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirmación de contraseña <span className="text-error-500">*</span></Label>
              <div className="relative">
                <Input type={showPassword2 ? 'text' : 'password'} value={form.password2} onChange={(e: any) => setForm((p) => ({ ...p, password2: e.target.value }))} placeholder="Repite la contraseña" />
                <button type="button" onClick={() => setShowPassword2(!showPassword2)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                  {showPassword2 ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
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
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200"
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
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">Debe cumplir reglas de contraseña (8+ caracteres, no común, no completamente numérica, no similar al usuario).</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" onClick={closeCreate} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200" disabled={creating}>
              Cancelar
            </button>
            <button type="button" onClick={doCreate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60" disabled={creating}>
              {creating ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isPermsOpen} onClose={closePerms} className="max-w-2xl p-0 overflow-hidden">
        <div className="overflow-hidden rounded-2xl">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 bg-white/70 dark:bg-gray-900/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4Z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 truncate">
                  Permisos{permsUser ? `: ${permsUser.username}` : ''}
                </h3>
                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                  Define qué vistas puede ver y qué acciones puede realizar este usuario.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {permsError && (
              <div className="mb-4">
                <Alert variant="error" title="Error" message={permsError} />
              </div>
            )}

            {permsLoading ? (
              <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Cargando permisos...</div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300">Módulo</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">Ver</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">Crear</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">Editar</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300">Eliminar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(
                        (permsUser?.is_superuser || permsUser?.is_staff)
                          ? ([
                              { key: 'ordenes' as const, label: 'Órdenes' },
                              { key: 'clientes' as const, label: 'Clientes' },
                              { key: 'productos' as const, label: 'Productos' },
                              { key: 'cotizaciones' as const, label: 'Cotizaciones' },
                              { key: 'kpis' as const, label: 'KPI Ventas' },
                            ] as const)
                          : ([{ key: 'ordenes' as const, label: 'Órdenes' }] as const)
                      ).map((row) => {
                          const cur = normalizePerms(permsForm)[row.key] as CrudPerms;
                          const cell = (k: keyof CrudPerms) => (
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={!!cur[k]}
                                onChange={(e) => setPerm(row.key, k, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                              />
                            </td>
                          );
                          const icon = row.key === 'ordenes' ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M5 7h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                              <path d="M7 11h10" />
                              <path d="M7 15h6" />
                            </svg>
                          ) : row.key === 'clientes' ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          ) : row.key === 'productos' ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                              <path d="M3.3 7l8.7 5 8.7-5" />
                              <path d="M12 22V12" />
                            </svg>
                          ) : row.key === 'cotizaciones' ? (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                              <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2" />
                              <path d="M8 12h8" />
                              <path d="M8 16h6" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M4 19V5" />
                              <path d="M20 19H4" />
                              <path d="M7 15l3-4 3 2 4-6" />
                            </svg>
                          );

                          return (
                            <tr key={row.key}>
                              <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-200">
                                    {icon}
                                  </span>
                                  <span>{row.label}</span>
                                </div>
                              </td>
                              {cell('view')}
                              {cell('create')}
                              {cell('edit')}
                              {cell('delete')}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePerms}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={permsSaving || permsLoading || !permsUser}
                    onClick={savePerms}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-brand-700 disabled:opacity-60"
                  >
                    {permsSaving ? 'Guardando...' : 'Guardar permisos'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isEditOpen} onClose={closeEdit} className="w-[94vw] max-w-2xl">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Editar usuario</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Actualiza datos del usuario y (opcional) cambia la contraseña.</p>
        </div>

        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {editError && (
            <div className="mb-4">
              <Alert variant="error" title="Revisa" message={editError} />
            </div>
          )}

          {signatureError && (
            <div className="mb-4">
              <Alert variant="error" title="Firma" message={signatureError} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre de usuario <span className="text-error-500">*</span></Label>
              <Input value={editForm.username} onChange={(e: any) => setEditForm((p) => ({ ...p, username: e.target.value }))} />
            </div>

            <div>
              <Label>Rol <span className="text-error-500">*</span></Label>
              <select value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as Role }))} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 shadow-theme-xs transition-colors focus:border-ring-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
                <option value="tecnico">Técnico</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <Label>Nombre(s)</Label>
              <Input value={editForm.first_name} onChange={(e: any) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} />
            </div>

            <div>
              <Label>Apellidos</Label>
              <Input value={editForm.last_name} onChange={(e: any) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} />
            </div>

            <div className="sm:col-span-2">
              <Label>Correo electrónico</Label>
              <Input value={editForm.email} onChange={(e: any) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <Label>Nueva contraseña</Label>
              <div className="relative">
                <Input type={showEditPassword ? 'text' : 'password'} value={editForm.password} onChange={(e: any) => setEditForm((p) => ({ ...p, password: e.target.value }))} placeholder="Deja vacío para no cambiar" />
                <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                  {showEditPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Confirmar nueva contraseña</Label>
              <div className="relative">
                <Input type={showEditPassword2 ? 'text' : 'password'} value={editForm.password2} onChange={(e: any) => setEditForm((p) => ({ ...p, password2: e.target.value }))} placeholder="Repite la contraseña" />
                <button type="button" onClick={() => setShowEditPassword2(!showEditPassword2)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                  {showEditPassword2 ? <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Firma</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Esta firma se guardará y se usará como "Firma del Encargado" en Órdenes.</p>
              </div>
              {!!signatureValue && !signatureValue.startsWith('data:') ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!editUser) return;
                    setConfirmDeleteSignature(true);
                  }}
                  disabled={signatureSaving || signatureLoading || !editUser}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-white/5"
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

            <div className="mt-3">
              {signatureLoading ? (
                <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">Cargando firma...</div>
              ) : !!signatureValue && !signatureValue.startsWith('data:') ? (
                <div className="flex items-center justify-center">
                  <img
                    src={signatureValue}
                    alt="Firma del usuario"
                    className="max-h-[180px] w-full max-w-[420px] rounded-lg border border-gray-200 bg-white object-contain dark:border-white/10"
                  />
                </div>
              ) : (
                <SignaturePad
                  value={signatureValue}
                  onChange={(sig) => setSignatureValue(sig)}
                  width={420}
                  height={180}
                />
              )}
            </div>

          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button type="button" onClick={closeEdit} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:bg-gray-900/40 dark:border-white/10 dark:text-gray-200" disabled={editing}>
              Cancelar
            </button>
            <button type="button" onClick={doUpdate} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60" disabled={editing || signatureSaving || signatureLoading}>
              {editing ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmDeleteSignature} onClose={() => setConfirmDeleteSignature(false)} className="max-w-sm p-6">
        <div className='flex flex-col gap-4'>
          <div className='text-center'>
            <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30'>
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h5 className='mt-4 font-semibold text-gray-800 text-theme-lg dark:text-white/90'>Confirmar eliminación</h5>
            <p className='mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400'>Esta acción no se puede deshacer. ¿Eliminar la firma seleccionada?</p>
          </div>
          <div className='flex justify-center gap-3 pt-2'>
            <button
              type="button"
              onClick={() => setConfirmDeleteSignature(false)}
              className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 center dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3'
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
                  const res = await fetch(apiUrl(`/api/users/accounts/${editUser.id}/signature/`), {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: { ...getAuthHeaders() },
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
              className='rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-500 disabled:opacity-60'
              disabled={signatureSaving}
            >
              {signatureSaving ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmDeleteId != null} onClose={() => setConfirmDeleteId(null)} className="max-w-sm p-6">
        <div className='flex flex-col gap-4'>
          <div className='text-center'>
            <div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30'>
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h5 className='mt-4 font-semibold text-gray-800 text-theme-lg dark:text-white/90'>Confirmar eliminación</h5>
            <p className='mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400'>Esta acción no se puede deshacer. ¿Eliminar el usuario seleccionado?</p>
          </div>
          <div className='flex justify-center gap-3 pt-2'>
            <button type="button" onClick={() => setConfirmDeleteId(null)} className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 center dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3' disabled={deleting}>
              Cancelar
            </button>
            <button type="button" onClick={doDelete} className='rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-500 disabled:opacity-60' disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
