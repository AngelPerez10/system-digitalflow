import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  UserCircleIcon,
} from "@/icons";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { fetchApi } from "@/config/api";

let appSidebarPermissionsInFlight: Promise<any> | null = null;
let appSidebarPermissionsLastFetchAt = 0;
const APP_SIDEBAR_PERMS_TTL_MS = 2 * 60 * 1000;

/** Entradas ocultas temporalmente; pon la clave en `true` para volver a mostrarlas. */
const SIDEBAR_FUTURE = {
  ia: false,
  correo: false,
  productosYServicios: false,
  comprasYGastos: false,
  ventasAdmin: false,
  reportesOperator: false,
  /** Submenú Operación: ítem "Agenda" (/agenda) */
  operacionAgenda: false,
  /** Submenú Operación: desde Levantamiento hasta Reparaciones */
  operacionExtended: false,
} as const;

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SidebarSubItem[];
};

type SidebarSubItem =
  | { name: string; path: string; pro?: boolean; new?: boolean }
  | { name: string; subItems: { name: string; path: string; pro?: boolean; new?: boolean }[] };

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();
  const { isAdmin, permissions: authPermissions } = useAuth();

  const [permissions, setPermissions] = useState<any>(authPermissions || {});

  const companyName = useMemo(() => {
    try {
      const fromStorage =
        localStorage.getItem("company_name") ||
        sessionStorage.getItem("company_name") ||
        localStorage.getItem("empresa") ||
        sessionStorage.getItem("empresa");
      if (typeof fromStorage === "string" && fromStorage.trim()) return fromStorage.trim();
    } catch { }
    return "Workspace";
  }, []);

  useEffect(() => {
    // Admins don't need to fetch permissions
    if (isAdmin) return;

    const now = Date.now();
    if (now - appSidebarPermissionsLastFetchAt < APP_SIDEBAR_PERMS_TTL_MS) return;

    const load = async () => {
      try {
        if (appSidebarPermissionsInFlight) {
          await appSidebarPermissionsInFlight;
          return;
        }

        appSidebarPermissionsLastFetchAt = Date.now();
        appSidebarPermissionsInFlight = (async () => {
          const res = await fetchApi('/api/me/permissions/', {
            method: 'GET',
            cache: 'no-store' as RequestCache,
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.permissions) {
            setPermissions(data.permissions);
            window.dispatchEvent(new Event('permissions:updated'));
          }
          return data;
        })();

        await appSidebarPermissionsInFlight;
      } catch { }
      finally {
        appSidebarPermissionsInFlight = null;
      }
    };
    load();
  }, [isAdmin]);

  useEffect(() => {
    const sync = () => {
      try {
        setPermissions(authPermissions || {});
      } catch { }
    };
    window.addEventListener('permissions:updated', sync);
    return () => {
      window.removeEventListener('permissions:updated', sync);
    };
  }, [authPermissions]);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];

    if (isAdmin) {
      items.push({ icon: <GridIcon />, name: "Dashboard", path: "/dashboard" });

      if (SIDEBAR_FUTURE.ia) {
        items.push({
          icon: <PlugInIcon />,
          name: "IA",
          path: "/ia",
        });
      }

      items.push({
        icon: <PageIcon />,
        name: "Mi escritorio",
        subItems: [
          { name: "Agenda", path: "/calendar", pro: false },
          { name: "Tareas", path: "/tareas", pro: false },
          ...(SIDEBAR_FUTURE.correo
            ? [{ name: "Correo", path: "/correo", pro: false } as const]
            : []),
        ],
      });

      {
        const contactosSub: SidebarSubItem[] = [
          { name: "Todos", path: "/clientes", pro: false },
          { name: "Empresas", path: "/empresas", pro: false },
          { name: "Personas", path: "/personas", pro: false },
          { name: "Proveedores", path: "/proveedores", pro: false },
        ];
        if (permissions?.usuarios?.view === true) {
          contactosSub.push({ name: "Gestión de Usuarios", path: "/usuarios", pro: false });
        } 
        items.push({
          icon: <UserCircleIcon />,
          name: "Contactos de Negocio",
          subItems: contactosSub,
        });
      }

      if (true) {
        items.push({
          icon: <BoxCubeIcon />,
          name: "Productos Y Servicios",
          subItems: [
            { name: "Productos", path: "/productos", pro: false },
            { name: "Servicios", path: "/servicios", pro: false },
          ],
        });
      }

      if (permissions?.cotizaciones?.view === true) {
        items.push({
          icon: <PieChartIcon />,
          name: "Ventas",
          subItems: [{ name: "Cotizaciones", path: "/cotizacion", pro: false }],
        });
      }

      const operacionSub: SidebarSubItem[] = [
          ...(SIDEBAR_FUTURE.operacionAgenda
            ? [{ name: "Agenda", path: "/agenda", pro: false } as const]
            : []),
          ...(permissions?.ordenes?.view === true
            ? [{ name: "Órdenes de Trabajo", path: "/ordenes", pro: false } as const]
            : []),
          ...(permissions?.cuentas_antarix?.view === true || isAdmin
            ? [{ name: "Antarix GPS", path: "/cuentas", pro: false } as const]
            : []),
          ...(SIDEBAR_FUTURE.operacionExtended && permissions?.ordenes?.view === true
            ? ([
                { name: "Levantamiento", path: "/levantamiento", pro: false },
                { name: "Órdenes del Tecnico", path: "/ordenes-tecnico", pro: false },
              ] as const)
            : []),
          ...(SIDEBAR_FUTURE.operacionExtended && permissions?.reportes?.view === true
            ? [{ name: "Reportes", path: "/reportes", pro: false } as const]
            : []),
      ];
      if (operacionSub.length > 0) {
        items.push({
          icon: <PlugInIcon />,
          name: "Operación",
          subItems: operacionSub,
        });
      }
    } else {
      const subItems = [];
      if (permissions?.ordenes?.view === true) {
        subItems.push({ name: "Agenda", path: "/calendar", pro: false });
      }
      
      if (permissions?.ordenes?.view === true) {
        subItems.push({ name: "Órdenes de Servicios", path: "/ordenes-tecnico", pro: false });
      }

      if (
        SIDEBAR_FUTURE.reportesOperator &&
        permissions?.reportes?.view === true
      ) {
        subItems.push({ name: "Reportes", path: "/reportes", pro: false });
      }

      if (permissions?.tareas?.view === true) {
        subItems.push({ name: "Tareas", path: "/tareas-tecnico", pro: false });
      }

      if (permissions?.cuentas_antarix?.view === true) {
        subItems.push({ name: "Cuentas de Antarix GPS", path: "/cuentas", pro: false });
      }

      if (subItems.length > 0) {
        items.push({
          icon: <GridIcon />,
          name: "Dashboard",
          subItems,
        });
      }

      if (permissions?.clientes?.view === true) {
        items.push({
          icon: <UserCircleIcon />,
          name: "Contactos de Negocio",
          subItems: [
            { name: "Todos", path: "/clientes", pro: false },
            { name: "Empresas", path: "/empresas", pro: false },
            { name: "Personas", path: "/personas", pro: false },
            { name: "Proveedores", path: "/proveedores", pro: false },
          ],
        });
      }

      if (permissions?.cotizaciones?.view === true) {
        items.push({
          icon: <PieChartIcon />,
          name: "Ventas",
          subItems: [{ name: "Cotizaciones", path: "/cotizacion", pro: false }],
        });
      }
    }

    return items;
  }, [isAdmin, permissions]);

  const othersItems: NavItem[] = useMemo(() => [], []);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);

  const [openNestedSubmenus, setOpenNestedSubmenus] = useState<Record<string, boolean>>({});
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => {
      if (path === "/dashboard") {
        return location.pathname === "/" || location.pathname === "/dashboard";
      }
      return location.pathname === path;
    },
    [location.pathname]
  );

  const hasActivePath = useCallback(
    (sub: SidebarSubItem) => {
      if ('path' in sub) return isActive(sub.path);
      return sub.subItems.some((s) => isActive(s.path));
    },
    [isActive]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (hasActivePath(subItem)) {
              setOpenSubmenu({ type: menuType as "main" | "others", index });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive, navItems, othersItems, hasActivePath]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  const toggleNestedSubmenu = (key: string) => {
    setOpenNestedSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));

    // Recalcular la altura del submenu abierto (overflow-hidden) para que
    // el contenido anidado no quede recortado.
    if (openSubmenu) {
      window.requestAnimationFrame(() => {
        const submenuKey = `${openSubmenu.type}-${openSubmenu.index}`;
        const el = subMenuRefs.current[submenuKey];
        if (!el) return;
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [submenuKey]: el.scrollHeight || 0,
        }));
      });
    }
  };

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              aria-expanded={openSubmenu?.type === menuType && openSubmenu?.index === index}
              aria-label={`${nav.name} submenu`}
              className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                ? "menu-item-active"
                : "menu-item-inactive"
                } cursor-pointer ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
                }`}
            >
              <span
                className={`menu-item-icon-size  ${openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-icon-active"
                  : "menu-item-icon-inactive"
                  }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                    ? "rotate-180 text-brand-500"
                    : ""
                    }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                aria-current={isActive(nav.path) ? "page" : undefined}
                className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
              >
                <span
                  className={`menu-item-icon-size ${isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => {
                  if ('path' in subItem) {
                    return (
                      <li key={subItem.name}>
                        <Link
                          to={subItem.path}
                          aria-current={isActive(subItem.path) ? "page" : undefined}
                          className={`menu-dropdown-item ${isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                            }`}
                        >
                          {subItem.name}
                          <span className="flex items-center gap-1 ml-auto">
                            {subItem.new && (
                              <span
                                className={`ml-auto ${isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                                  } menu-dropdown-badge`}
                              >
                                new
                              </span>
                            )}
                            {subItem.pro && (
                              <span
                                className={`ml-auto ${isActive(subItem.path)
                                  ? "menu-dropdown-badge-active"
                                  : "menu-dropdown-badge-inactive"
                                  } menu-dropdown-badge`}
                              >
                                pro
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  }

                  const nestedKey = `${menuType}-${index}-${subItem.name}`;
                  const isOpen = !!openNestedSubmenus[nestedKey];

                  return (
                    <li key={subItem.name}>
                      <button
                        type="button"
                        onClick={() => toggleNestedSubmenu(nestedKey)}
                        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium tracking-[0.12px] text-[#a1a4a5] hover:text-[#f0f0f0]"
                        aria-expanded={isOpen}
                      >
                        <span className="truncate">{subItem.name}</span>
                        <ChevronDownIcon
                          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180 text-[#3b9eff]" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <ul className="space-y-1 ml-4">
                          {subItem.subItems.map((child) => (
                            <li key={child.name}>
                              <Link
                                to={child.path}
                                className={`menu-dropdown-item ${isActive(child.path)
                                  ? "menu-dropdown-item-active"
                                  : "menu-dropdown-item-inactive"
                                  }`}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed bottom-0 left-0 top-16 z-50 flex flex-col border-r border-[#e7ded0] bg-[#f9f7f3] px-5 text-[#1c1917] shadow-[0_18px_45px_-34px_rgba(28,25,23,0.35)] transition-all duration-300 ease-in-out dark:border-[#273244] dark:bg-[#0f172a] dark:text-[#f8fafc] dark:shadow-[0_18px_45px_-34px_rgba(0,0,0,0.8)] lg:top-0 [font-family:'Arial','Helvetica_Neue',Helvetica,sans-serif]
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link to="/dashboard" className="group inline-flex items-center gap-2.5">
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="inline-flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#465FFF] text-xs font-bold tracking-wide text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                SN
              </span>
              <span className="flex flex-col leading-none">
                <span className="text-base font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc]">
                  Sistema Intrax
                </span>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#8b7b69] dark:text-[#8ea0b8]">
                  {companyName}
                </span>
              </span>
            </span>
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#465FFF] text-[11px] font-bold tracking-[0.08em] text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              SN
            </span>
          )}
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-6 duration-300 ease-linear no-scrollbar">
        <nav aria-label="Main navigation" className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs font-medium uppercase leading-[20px] tracking-[0.14em] text-[#8b7b69] dark:text-[#8ea0b8] ${!isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menú"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            {othersItems.length > 0 && (
              <div className="">
                <h2
                  className={`mb-4 flex text-xs font-medium uppercase leading-[20px] tracking-[0.14em] text-[#8b7b69] dark:text-[#8ea0b8] ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                    }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    ""
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;