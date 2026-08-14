import { useEffect, useMemo, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { useMarca } from "../context/MarcaContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import UserDropdown from "../components/header/UserDropdown";

const SEARCH_ROUTES = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Agenda", path: "/calendar" },
  { label: "Tareas", path: "/tareas" },
  { label: "Clientes", path: "/clientes" },
  { label: "Empresas", path: "/empresas" },
  { label: "Personas", path: "/personas" },
  { label: "Proveedores", path: "/proveedores" },
  { label: "Configuración", path: "/configuracion" },
  { label: "Ajustes generales", path: "/configuracion" },
  { label: "Gestión de usuarios", path: "/usuarios" },
  { label: "Productos", path: "/productos" },
  { label: "Servicios", path: "/servicios" },
  { label: "Inventario", path: "/inventario" },
  { label: "Cotización", path: "/cotizacion" },
  { label: "Orden de trabajo", path: "/ordenes" },
  { label: "Levantamiento", path: "/levantamiento" },
  { label: "Proyectos", path: "/proyectos" },
] as const;

export default function AppHeader() {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { nombre: marcaNombre } = useMarca();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const filteredRoutes = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return SEARCH_ROUTES;
    return SEARCH_ROUTES.filter((x) => x.label.toLowerCase().includes(q));
  }, [searchValue]);

  const selectRoute = (path: string) => {
    navigate(path);
    setSearchValue("");
    setSearchOpen(false);
    setActiveIndex(0);
  };

  const goFromSearch = () => {
    const highlighted = filteredRoutes[activeIndex];
    if (highlighted) {
      selectRoute(highlighted.path);
      return;
    }
    const q = searchValue.trim().toLowerCase();
    if (!q) return;
    const exact = SEARCH_ROUTES.find((x) => x.label.toLowerCase() === q);
    const partial = SEARCH_ROUTES.find((x) => x.label.toLowerCase().includes(q));
    const target = exact || partial;
    if (!target) return;
    selectRoute(target.path);
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [searchValue]);

  useEffect(() => {
    if (!searchOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-99999 flex w-full border-b border-[#e7ded0] bg-[#f9f7f3]/90 backdrop-blur-md [font-family:'Arial','Helvetica_Neue',Helvetica,sans-serif] dark:border-[#273244] dark:bg-[#0f172a]/90">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-[#e7ded0] px-3 py-3 sm:gap-4 dark:border-[#273244] lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            className="z-99999 h-10 w-10 items-center justify-center rounded-xl border border-[#e2d9ca] text-[#57534e] transition-colors hover:bg-[#f5efe4] hover:text-[#1c1917] dark:border-[#334155] dark:text-[#aeb8c8] dark:hover:bg-[#111a2b] dark:hover:text-[#f8fafc] lg:flex lg:h-11 lg:w-11"
            onClick={handleToggle}
            aria-label={isMobileOpen ? "Cerrar menú lateral" : "Abrir menú lateral"}
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="12"
                viewBox="0 0 16 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {/* Cross Icon */}
          </button>

          <Link to="/dashboard" className="inline-flex items-center lg:hidden">
            <span className="text-sm font-semibold tracking-tight text-[#1c1917] dark:text-[#f8fafc]">
              {marcaNombre}
            </span>
          </Link>

          <button
            onClick={toggleApplicationMenu}
            aria-label="Abrir menú de aplicación"
            className="z-99999 flex h-10 w-10 items-center justify-center rounded-xl text-[#57534e] hover:bg-[#f5efe4] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-[#111a2b] dark:hover:text-[#f8fafc] lg:hidden"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div className="hidden lg:block">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goFromSearch();
              }}
            >
              <div className="relative" ref={searchWrapRef}>
                <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
                  <svg
                    className="fill-[#8b7b69] dark:fill-[#8ea0b8]"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                      fill=""
                    />
                  </svg>
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={searchOpen}
                  aria-controls="app-header-routes"
                  aria-activedescendant={
                    searchOpen && filteredRoutes[activeIndex]
                      ? `app-header-route-${activeIndex}`
                      : undefined
                  }
                  placeholder="Buscar o escribir comando..."
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSearchOpen(true);
                      setActiveIndex((i) =>
                        filteredRoutes.length ? (i + 1) % filteredRoutes.length : 0
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSearchOpen(true);
                      setActiveIndex((i) =>
                        filteredRoutes.length
                          ? (i - 1 + filteredRoutes.length) % filteredRoutes.length
                          : 0
                      );
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setSearchOpen(false);
                    }
                  }}
                  autoComplete="off"
                  className="h-11 w-full rounded-full border border-[#e2d9ca] bg-[#fffdfa] py-2.5 pl-12 pr-14 text-sm font-normal leading-[1.6] text-[#1c1917] placeholder:text-[#a8a29e] shadow-none focus:border-[#ff801f] focus:outline-hidden focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/25 xl:w-[430px]"
                />
                {searchOpen && (
                  <ul
                    id="app-header-routes"
                    role="listbox"
                    aria-label="Rutas del sistema"
                    className="absolute left-0 right-0 top-full z-[100000] mt-1 max-h-72 overflow-auto rounded-xl border border-[#e2d9ca] bg-[#fffdfa] py-1 shadow-[0_16px_40px_-18px_rgba(28,25,23,0.35)] dark:border-[#334155] dark:bg-[#111a2b]"
                  >
                    {filteredRoutes.length === 0 ? (
                      <li className="px-3 py-2.5 text-center text-xs text-[#a8a29e] dark:text-[#8ea0b8]">
                        Sin resultados
                      </li>
                    ) : (
                      filteredRoutes.map((r, idx) => (
                        <li key={r.path} role="presentation">
                          <button
                            type="button"
                            id={`app-header-route-${idx}`}
                            role="option"
                            aria-selected={idx === activeIndex}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => selectRoute(r.path)}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              idx === activeIndex
                                ? "bg-[#fff4eb] font-medium text-[#9a3412] dark:bg-[#fb923c]/15 dark:text-[#fdba74]"
                                : "text-[#1c1917] hover:bg-[#fff8f1] dark:text-[#e5e7eb] dark:hover:bg-[#1e293b]"
                            }`}
                          >
                            {r.label}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}

                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-[#e2d9ca] bg-[#fffdfa] px-[9px] py-[4.5px] [font-family:'SFMono-Regular',Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace] text-xs text-[#8b7b69] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#8ea0b8]"
                >
                  <span> ⌘ </span>
                  <span> K </span>
                </button>
              </div>
            </form>
          </div>
        </div>
        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } w-full items-center justify-between gap-4 bg-[#f9f7f3] px-5 py-4 dark:bg-[#0f172a] lg:flex lg:justify-end lg:bg-transparent lg:px-0`}
        >
          <div className="flex items-center gap-2 2xsm:gap-3">
            {/* <!-- Dark Mode Toggler --> */}
            <ThemeToggleButton />
            {/* <!-- Dark Mode Toggler --> */}
            {/* <!-- Notification Menu Area --> */}
          </div>
          {/* <!-- User Area --> */}
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
