/**
 * Contactos de negocio: listado de empresas, personas físicas y proveedores.
 *
 * - Búsqueda, filtro por tipo, orden y página viven en la URL (se pueden
 *   compartir y respetan «Atrás»).
 * - Crear / editar usa el `ClienteFormModal` compartido (con aviso de
 *   posibles duplicados); eliminar pide confirmación.
 * - Movimiento sutil (solo `transform`/`opacity`, desactivado con
 *   `prefers-reduced-motion`): entrada del encabezado, renglones escalonados
 *   y atenuado del contenido mientras recarga, sin saltos de diseño.
 *
 * Organización del módulo:
 * - `components/` encabezado, barra, tabla, lista móvil, paginación, diálogos.
 * - `hooks/`      estado en la URL, carga del listado, permisos, atajos.
 * - `shared/`     lógica pura (con pruebas) y tokens visuales.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import Alert, { type AlertVariant } from "@/components/ui/alert/Alert";
import { ClienteFormModal, deleteCliente, formatApiErrors, type ClienteSaveMeta } from "@/components/clientes";
import {
  erpBreadcrumbLinkClass,
  erpBreadcrumbNavClass,
  erpSansStyle,
} from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenServicioStyles";
import type { Cliente } from "@/types/cliente";
import "@/components/ui/modal-kit/motion.css";
import "./clientes.css";
import { ClienteDeleteDialog } from "./components/ClienteDeleteDialog";
import { ClientesHero } from "./components/ClientesHero";
import { ClientesMobileList } from "./components/ClientesMobileList";
import { ClientesPagination } from "./components/ClientesPagination";
import { ClientesTable, type ClienteRowHandlers } from "./components/ClientesTable";
import { ClientesToolbar } from "./components/ClientesToolbar";
import { ClientesEmptyState, ClientesErrorState, ClientesListSkeleton } from "./components/ClientesUi";
import { useClientesList } from "./hooks/useClientesList";
import { useClientesPermissions } from "./hooks/useClientesPermissions";
import { useClientesQueryState } from "./hooks/useClientesQueryState";
import { useListShortcuts } from "./hooks/useListShortcuts";
import type { ClientesListQuery } from "./shared/clientesListQuery";
import { mutedText, panelClass, strongText } from "./shared/clientesTokens";

type Toast = { id: number; variant: AlertVariant; title: string; message: string };
type DialogState = { open: boolean; cliente: Cliente | null };

const CLOSED: DialogState = { open: false, cliente: null };

export default function ClientesPage() {
  const perms = useClientesPermissions();
  const { query, update, setPage } = useClientesQueryState();
  const list = useClientesList(query, perms.canView);
  const searchRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<DialogState>(CLOSED);
  const [del, setDel] = useState<DialogState>(CLOSED);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((variant: AlertVariant, title: string, message: string) => {
    setToast({ id: Date.now(), variant, title, message });
  }, []);

  const filtered = query.q !== "" || query.tipos.length > 0;

  // Página que dejó de existir (se eliminó su último renglón o un enlace viejo).
  const { redirectPage } = list;
  useEffect(() => {
    if (redirectPage !== null) update({ page: redirectPage });
  }, [redirectPage, update]);

  /* ---------------- Acciones ---------------- */

  const openCreate = useCallback(() => {
    if (perms.canCreate) setForm({ open: true, cliente: null });
  }, [perms.canCreate]);

  const openEdit = useCallback(
    (cliente: Cliente) => {
      if (perms.canEdit) setForm({ open: true, cliente });
    },
    [perms.canEdit],
  );

  // Renglón recién guardado: se resalta un momento al volver al listado.
  const [savedId, setSavedId] = useState<number | null>(null);
  useEffect(() => {
    if (savedId === null) return;
    const t = window.setTimeout(() => setSavedId(null), 2400);
    return () => window.clearTimeout(t);
  }, [savedId]);

  const handleSaved = (saved: Cliente, meta?: ClienteSaveMeta) => {
    const editing = form.cliente !== null;
    setSavedId(saved.id);
    if (meta?.contactoPendiente) {
      notify("warning", "Contacto creado sin contacto principal", `«${saved.nombre}» se registró, pero falta su contacto. Ábrelo para agregarlo.`);
    } else if (meta?.direccionPendiente) {
      notify("warning", "Contacto creado", `«${saved.nombre}» se registró, pero su dirección no se copió a la libreta. Ábrelo para agregarla.`);
    } else {
      notify(
        "success",
        editing ? "Cambios guardados" : "Contacto creado",
        `«${saved.nombre}» se ${editing ? "actualizó" : "registró"} correctamente.`,
      );
    }
    list.reload();
  };

  const closeForm = () => {
    // Al editar, contactos y direcciones se guardan desde sus libretas: refresca la fila.
    if (form.cliente) list.reload();
    setForm((f) => ({ ...f, open: false }));
  };

  const confirmDelete = async (cliente: Cliente): Promise<string | null> => {
    try {
      const res = await deleteCliente(cliente.id);
      if (!res.ok) {
        if (res.status === 403) return "No tienes permiso para eliminar contactos.";
        return formatApiErrors(res.body) || "No se pudo eliminar el contacto. Inténtalo de nuevo.";
      }
    } catch {
      return "Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.";
    }
    setDel((d) => ({ ...d, open: false }));
    notify("success", "Contacto eliminado", `«${cliente.nombre}» se eliminó correctamente.`);
    list.reload();
    return null;
  };

  const handlers: ClienteRowHandlers = useMemo(
    () => ({
      canEdit: perms.canEdit,
      canDelete: perms.canDelete,
      highlightId: savedId,
      onEdit: openEdit,
      onDelete: (cliente) => {
        if (perms.canDelete) setDel({ open: true, cliente });
      },
    }),
    [perms.canEdit, perms.canDelete, openEdit, savedId],
  );

  const onQueryChange = useCallback((patch: Partial<ClientesListQuery>) => update(patch), [update]);
  const clearFilters = useCallback(() => update({ q: "", tipos: [] }), [update]);

  const formPermissions = useMemo(
    () => ({ clientes: { create: perms.canCreate, edit: perms.canEdit } }),
    [perms.canCreate, perms.canEdit],
  );

  useListShortcuts(
    { onFocusSearch: () => searchRef.current?.focus(), onCreate: perms.canCreate ? openCreate : undefined },
    perms.canView,
  );

  /* ---------------- Render ---------------- */

  const renderList = () => {
    if (list.initialLoading) return <ClientesListSkeleton />;
    if (list.error) return <ClientesErrorState message={list.error} onRetry={list.reload} />;
    if (list.rows.length === 0) {
      return (
        <ClientesEmptyState filtered={filtered} canCreate={perms.canCreate} onClearFilters={clearFilters} onCreate={openCreate} />
      );
    }
    return (
      <div className="cl-stale" data-stale={list.refreshing}>
        <div className="md:hidden">
          <ClientesMobileList rows={list.rows} handlers={handlers} />
        </div>
        <div className="hidden md:block">
          <ClientesTable rows={list.rows} orden={query.orden} onSort={(orden) => update({ orden })} handlers={handlers} />
        </div>
        <ClientesPagination page={query.page} count={list.count} onPage={setPage} />
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <div className="mx-auto w-full max-w-350 space-y-5" style={erpSansStyle}>
        <PageMeta
          title="Contactos | Sistema Grupo Intrax GPS"
          description="Gestión de contactos de negocio: empresas, personas físicas y proveedores."
        />

        <nav className={erpBreadcrumbNavClass} aria-label="Migas de pan">
          <Link to="/" className={erpBreadcrumbLinkClass}>
            Inicio
          </Link>
          <span aria-hidden className="text-[#D3D3D8] dark:text-[#3A4661]">
            /
          </span>
          <span aria-current="page" className={`px-1.5 ${strongText}`}>
            Contactos
          </span>
        </nav>

        {toast ? (
          <Alert key={toast.id} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
        ) : null}

        {!perms.canView ? (
          <div className={`${panelClass} cot-fade flex flex-col items-center px-6 py-16 text-center`}>
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-[14px] bg-[#FAFAFB] text-[#A1A1AA] dark:bg-white/[0.04] dark:text-[#64748B]" aria-hidden>
              <Lock className="size-5" />
            </span>
            <p className={`text-[15px] font-semibold ${strongText}`}>Sin acceso a Contactos</p>
            <p className={`mt-1 max-w-sm text-[13.5px] ${mutedText}`}>
              Tu usuario no tiene permiso para ver este módulo. Pide acceso a un administrador.
            </p>
          </div>
        ) : (
          <>
            <ClientesHero
              total={list.count}
              filtered={filtered}
              loading={list.initialLoading}
              canCreate={perms.canCreate}
              onCreate={openCreate}
            />

            <ClientesToolbar query={query} busy={list.refreshing} onChange={onQueryChange} searchRef={searchRef} />

            <section
              aria-label="Listado de contactos"
              aria-busy={list.initialLoading || list.refreshing}
              className={`${panelClass} cot-rise`}
              style={{ "--cot-i": 2 } as CSSProperties}
            >
              {renderList()}
            </section>
          </>
        )}
      </div>

      <ClienteFormModal
        isOpen={form.open}
        editingCliente={form.cliente}
        permissions={formPermissions}
        onClose={closeForm}
        onSuccess={handleSaved}
        onEditExisting={openEdit}
      />

      <ClienteDeleteDialog
        open={del.open}
        cliente={del.cliente}
        onCancel={() => setDel((d) => ({ ...d, open: false }))}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
