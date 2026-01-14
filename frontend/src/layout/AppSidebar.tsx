import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "@/icons";
import { useSidebar } from "@/context/SidebarContext";
import { apiUrl } from "@/config/api";

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

  const role = localStorage.getItem('role');
  const isAdmin = role === 'admin';

  const [permissions, setPermissions] = useState<any>(() => {
    try {
      const raw = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username') || sessionStorage.getItem('username'));

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const load = async () => {
      try {
        const res = await fetch(apiUrl('/api/me/permissions/'), {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.permissions) {
          const pStr = JSON.stringify(data.permissions);
          localStorage.setItem('permissions', pStr);
          setPermissions(data.permissions);
        }
      } catch { }
    };
    load();
  }, []);

  useEffect(() => {
    const sync = () => {
      try {
        const rawP = localStorage.getItem('permissions') || sessionStorage.getItem('permissions');
        setPermissions(rawP ? JSON.parse(rawP) : {});
        const rawU = localStorage.getItem('username') || sessionStorage.getItem('username');
        setUsername(rawU);
      } catch { }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const navItems: NavItem[] = useMemo(() => {
    const items: NavItem[] = [];

    if (isAdmin) {
      items.push({ icon: <GridIcon />, name: "Dashboard", path: "/" });

      items.push({
        icon: <PageIcon />,
        name: "Mi escritorio",
        subItems: [
          { name: "Agenda", path: "/", pro: false },
          { name: "Tareas", path: "/", pro: false },
          { name: "Correo", path: "/", pro: false },
        ],
      });

      items.push({
        icon: <UserCircleIcon />,
        name: "Contactos de Negocio",
        subItems: [
          { name: "Todos", path: "/clientes", pro: false },
          { name: "Empresas", path: "/", pro: false },
          { name: "Personas", path: "/", pro: false },
          { name: "Proveedores", path: "/proveedores", pro: false },
          { name: "Usuarios", path: "/profile", pro: false },
        ],
      });

      items.push({
        icon: <BoxCubeIcon />,
        name: "Productos Y Servicios",
        subItems: [
          { name: "Productos", path: "/productos", pro: false },
          { name: "Paquetes", path: "/categorias", pro: false },
          { name: "Servicios", path: "/servicios", pro: false },
        ],
      });

      items.push({
        icon: <TableIcon />,
        name: "Compras Y Gastos",
        subItems: [
          { name: "Proveedores", path: "/proveedores", pro: false },
          { name: "Orden De compra", path: "/orden-compra", pro: false },
          { name: "Gasto", path: "/gasto", pro: false },
        ],
      });

      items.push({
        icon: <PieChartIcon />,
        name: "Ventas",
        subItems: [
          { name: "Facturas", path: "/facturas", pro: false },
          { name: "Notas de crédito", path: "/notas-credito", pro: false },
          {
            name: "Suscripciones",
            subItems: [
              { name: "Rastreo", path: "/rastreo", pro: false },
              { name: "Alarmas", path: "/alarmas", pro: false },
              { name: "Internet", path: "/internet", pro: false },
              { name: "Licencias", path: "/licencias", pro: false },
            ],
          },
          { name: "Cotizaciones", path: "/cotizacion", pro: false },
        ],
      });

      items.push({
        icon: <PlugInIcon />,
        name: "Operación",
        subItems: [
          { name: "Agenda", path: "/agenda", pro: false },
          { name: "Órdenes de Servicios", path: "/ordenes", pro: false },
          { name: "Levantamiento", path: "/levantamiento", pro: false },
          { name: "Instalación", path: "/instalacion", pro: false },
          { name: "Mantenimiento", path: "/mantenimiento", pro: false },
          { name: "Tiket", path: "/tiket", pro: false },
          { name: "Vehículo", path: "/vehiculo", pro: false },
          { name: "Técnico", path: "/tecnico", pro: false },
          { name: "Rastreo", path: "/rastreo", pro: false },
          { name: "Servicios", path: "/servicios", pro: false },
          { name: "Pólizas", path: "/polizas", pro: false },
          { name: "Garantías", path: "/garantias", pro: false },
          { name: "Reparaciones", path: "/reparaciones", pro: false },
        ],
      });
    } else {
      const subItems = [];
      // Technician Dashboard
      subItems.push({ name: "Panel Principal", path: "/", pro: false });

      if (permissions?.ordenes?.view !== false) {
        subItems.push({ name: "Órdenes de Servicios", path: "/ordenes-tecnico", pro: false });
      }

      if (subItems.length > 0) {
        items.push({
          icon: <GridIcon />,
          name: "Dashboard",
          subItems,
        });
      }
    }

    // Calendar
    items.push({
      icon: <CalenderIcon />,
      name: "Calendario",
      path: "/calendar",
    });

    // KPI'S (Admin only)
    if (isAdmin) {
      items.push({
        icon: <PieChartIcon />,
        name: "KPI’S",
        subItems: [{ name: "KPI Ventas", path: "/kpis/ventas", pro: false }],
      });
    }

    if (isAdmin && username === 'AngelPerez10') {
        items.push({
          name: "Formularios",
          icon: <ListIcon />,
          subItems: [{ name: "Elementos de Formulario", path: "/form-elements", pro: false }],
        });
        items.push({
          name: "Tablas",
          icon: <TableIcon />,
          subItems: [{ name: "Tablas Básicas", path: "/basic-tables", pro: false }],
        });
        items.push({
          name: "Páginas",
          icon: <PageIcon />,
          subItems: [
            { name: "Página en Blanco", path: "/blank", pro: false },
            { name: "Error 404", path: "/error-404", pro: false },
          ],
        });
    }

    return items;
  }, [isAdmin, permissions, username]);

  const othersItems: NavItem[] = useMemo(() => {
    if (!isAdmin) return [];
    if (username !== 'AngelPerez10') return [];

    return [
      {
        icon: <PieChartIcon />,
        name: "Gráficos",
        subItems: [
          { name: "Gráfico de Línea", path: "/line-chart", pro: false },
          { name: "Gráfico de Barras", path: "/bar-chart", pro: false },
        ],
      },
      {
        icon: <BoxCubeIcon />,
        name: "Elementos UI",
        subItems: [
          { name: "Alertas", path: "/alerts", pro: false },
          { name: "Avatares", path: "/avatars", pro: false },
          { name: "Insignias", path: "/badge", pro: false },
          { name: "Botones", path: "/buttons", pro: false },
          { name: "Imágenes", path: "/images", pro: false },
          { name: "Videos", path: "/videos", pro: false },
        ],
      },
      {
        icon: <PlugInIcon />,
        name: "Autenticación",
        subItems: [
          { name: "Iniciar Sesión", path: "/signin", pro: false },
          { name: "Registrarse", path: "/signup", pro: false },
        ],
      },
    ];
  }, [isAdmin, username]);

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;
  const isActive = useCallback(
    (path: string) => location.pathname === path,
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

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
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

                  return (
                    <li key={subItem.name}>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {subItem.name}
                      </div>
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
      className={`fixed flex flex-col top-16 lg:top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-[calc(100vh-4rem)] lg:h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
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
        <Link to="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <img
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto overscroll-contain duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
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
            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
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
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;