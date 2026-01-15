import { useState, useEffect } from "react";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import Alert from "@/components/ui/alert/Alert";
import { apiUrl } from "@/config/api";
import { PencilIcon, TrashBinIcon } from "@/icons";



import { ClienteFormModal } from "@/components/clientes/ClienteFormModal";
import { Cliente } from "@/types/cliente";



export default function Clientes() {
  const getPermissionsFromStorage = () => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [permissions, setPermissions] = useState<any>(() => getPermissionsFromStorage());

  const canClientesView = permissions?.clientes?.view !== false;
  const canClientesCreate = !!permissions?.clientes?.create;
  const canClientesEdit = !!permissions?.clientes?.edit;
  const canClientesDelete = !!permissions?.clientes?.delete;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "success", title: "", message: "" });

  const getToken = () => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  };

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/me/permissions/'), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store' as RequestCache,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const p = JSON.stringify(data?.permissions || {});
        localStorage.setItem('permissions', p);
        sessionStorage.setItem('permissions', p);
        setPermissions(data?.permissions || {});
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const fetchClientes = async (page = 1, search = "") => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        search: search.trim(),
        ordering: 'idx',
      });
      const res = await fetch(apiUrl(`/api/clientes/?${query.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store' as RequestCache,
      });
      const data = await res.json().catch(() => ({ results: [], count: 0 }));
      if (!res.ok) {
        setClientes([]);
        setTotalCount(0);
        return;
      }
      if (data && data.results) {
        setClientes(data.results || []);
        setTotalCount(data.count || 0);
      } else {
        setClientes([]);
        setTotalCount(0);
      }
    } catch {
      setClientes([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canClientesView) {
      setLoading(false);
      return;
    }
    fetchClientes(currentPage, debouncedSearch);
  }, [canClientesView, currentPage, debouncedSearch]);

  const handleSuccess = (cliente: Cliente) => {
    const isEditing = !!editingCliente;
    fetchClientes();
    setShowModal(false);
    setAlert({
      show: true,
      variant: 'success',
      title: isEditing ? 'Cliente Actualizado' : 'Cliente Creado',
      message: isEditing
        ? `El cliente "${cliente.nombre}" ha sido actualizado exitosamente.`
        : `El cliente "${cliente.nombre}" ha sido creado exitosamente.`,
    });
    setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
  };

  const handleDeleteClick = (cliente: Cliente) => {
    if (!canClientesDelete) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para eliminar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setClienteToDelete(cliente);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete) return;
    const token = getToken();
    try {
      const response = await fetch(apiUrl(`/api/clientes/${clienteToDelete.id}/`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchClientes();
        setShowDeleteModal(false);
        setAlert({
          show: true,
          variant: "success",
          title: "Cliente Eliminado",
          message: `El cliente "${clienteToDelete?.nombre}" ha sido eliminado exitosamente.`
        });
        setClienteToDelete(null);
        setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 3000);
      }
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setClienteToDelete(null);
  };

  const handleEdit = (cliente: Cliente) => {
    if (!canClientesEdit) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para editar clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingCliente(cliente);
    setShowModal(true);
  };

  const openCreate = () => {
    if (!canClientesCreate) {
      setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear clientes.' });
      setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
      return;
    }
    setEditingCliente(null);
    setShowModal(true);
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const currentClientes = clientes;

  const isGoogleMapsLink = (value: string | null | undefined) => {
    if (!value) return false;
    const s = String(value).trim();
    if (!s) return false;
    if (!(s.startsWith('http://') || s.startsWith('https://'))) return false;
    try {
      const u = new URL(s);
      const host = (u.hostname || '').toLowerCase();
      const href = u.href.toLowerCase();
      if (host === 'maps.app.goo.gl') return true;
      if (host.endsWith('google.com') && href.includes('/maps')) return true;
      return false;
    } catch {
      return false;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta
        title="Clientes | Sistema Grupo Intrax GPS"
        description="Gestión de clientes para el sistema de administración Grupo Intrax GPS"
      />
      <PageBreadcrumb pageTitle="Clientes" />

      {/* Alert */}
      {alert.show && (
        <Alert
          variant={alert.variant}
          title={alert.title}
          message={alert.message}
          showLink={false}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/60 backdrop-blur-sm transition-colors">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                <path d="M20 22a8 8 0 1 0-16 0" />
              </svg>
            </span>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Clientes</p>
              <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">{totalCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Listado de Clientes</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:flex-1 sm:min-w-[260px] sm:justify-end">
          <div className="relative w-full sm:max-w-xs md:max-w-sm">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 pl-8 pr-3 py-2 text-[13px] text-gray-800 dark:text-gray-200 shadow-theme-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200/70"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
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
            onClick={() => {
              if (!canClientesCreate) {
                setAlert({ show: true, variant: 'warning', title: 'Sin permiso', message: 'No tienes permiso para crear clientes.' });
                setTimeout(() => setAlert(prev => ({ ...prev, show: false })), 2500);
                return;
              }
              openCreate();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white shadow-theme-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Nuevo Cliente
          </button>
        </div>
      </div>

      <ComponentCard title="Listado">
        <div className="p-2">

          {/* Table - Responsive */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-linear-to-r from-brand-50 to-transparent dark:from-gray-800 dark:to-gray-800/60 sticky top-0 z-10 text-[11px] font-medium text-gray-900 dark:text-white">
                <TableRow>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">ID</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/4 text-gray-700 dark:text-gray-300">Empresa</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Ciudad</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/6 text-gray-700 dark:text-gray-300">Teléfono</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/4 text-gray-700 dark:text-gray-300">Contacto</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-left w-1/3 text-gray-700 dark:text-gray-300">Dirección</TableCell>
                  <TableCell isHeader className="px-2 py-2 text-center w-1/6 text-gray-700 dark:text-gray-300">Acciones</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/10 text-[12px] text-gray-700 dark:text-gray-200">
                {currentClientes.map((cliente, idx) => (
                  <TableRow key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">{startIndex + idx + 1000}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/4 text-gray-900 dark:text-white">{cliente.nombre}</TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">
                      {(() => {
                        const ciudad = cliente.ciudad || '';
                        const estado = cliente.estado || '';
                        if (!ciudad && !estado) return <span className="text-gray-500">-</span>;
                        return (
                          <div className="leading-tight">
                            <div className="text-gray-900 dark:text-white truncate" title={ciudad || ''}>{ciudad || '-'}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={estado || ''}>{estado || '-'}</div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 w-1/6 whitespace-nowrap">
                      <a href={`tel:${cliente.telefono}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline">
                        {cliente.telefono}
                      </a>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 w-1/4">
                      {(() => {
                        const principal = (cliente.contactos || []).find((c: any) => !!(c as any)?.is_principal) || (cliente.contactos || [])[0];
                        const nombre = (principal as any)?.nombre_apellido || '';
                        const correo = (principal as any)?.correo || '';
                        if (!nombre && !correo) return <span className="text-gray-500">-</span>;
                        return (
                          <div className="leading-tight">
                            <div className="text-gray-900 dark:text-white truncate" title={nombre || ''}>{nombre || '-'}</div>
                            {correo ? (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate" title={correo}>{correo}</div>
                            ) : (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">-</div>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 w-1/3">
                      {isGoogleMapsLink(cliente.direccion) ? (
                        <a
                          href={cliente.direccion}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-brand-600 hover:underline"
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          Ver ubicación
                        </a>
                      ) : (
                        <span className="block truncate" title={cliente.direccion}>{cliente.direccion}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-center w-1/6">
                      <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/10 px-1.5 py-1">
                        {canClientesEdit && (
                          <button
                            onClick={() => handleEdit(cliente)}
                            className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition"
                            title="Editar"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canClientesDelete && (
                          <button
                            onClick={() => handleDeleteClick(cliente)}
                            className="group inline-flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 hover:border-error-400 hover:text-error-600 dark:hover:border-error-500 transition"
                            title="Eliminar"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!clientes.length && (
                  <TableRow>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2 text-center text-sm text-gray-500">Sin clientes</TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                    <TableCell className="px-2 py-2"> </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {!loading && totalCount > 0 && currentClientes.length > 0 && (
            <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-medium text-gray-900 dark:text-white">{startIndex + 1}</span> a{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{Math.min(endIndex, totalCount)}</span> de{" "}
                  <span className="font-medium text-gray-900 dark:text-white">{totalCount}</span> clientes
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          1
                        </button>
                        {currentPage > 4 && <span className="px-1 text-gray-400">...</span>}
                      </>
                    )}

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 5) return true;
                        return Math.abs(page - currentPage) <= 2;
                      })
                      .map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === page
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                          {page}
                        </button>
                      ))}

                    {/* Last Page */}
                    {currentPage < totalPages - 2 && (
                      <>
                        {currentPage < totalPages - 3 && <span className="px-1 text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ComponentCard>

      <ClienteFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        editingCliente={editingCliente}
        permissions={permissions}
      />

      {/* Modal de Confirmación de Eliminación */}
      {
        clienteToDelete && (
          <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="w-[94vw] max-w-md p-0 overflow-hidden">
            <div>
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Eliminar Cliente
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Esta acción no se puede deshacer
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ¿Estás seguro de que deseas eliminar al cliente{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {clienteToDelete.nombre}
                  </span>
                  ?
                </p>
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20">
                  <p className="text-xs text-red-800 dark:text-red-300">
                    <strong>Advertencia:</strong> Todos los datos asociados a este cliente serán eliminados permanentemente.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-end gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
                >
                  <TrashBinIcon className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </Modal>
        )
      }
    </div >
  );
}