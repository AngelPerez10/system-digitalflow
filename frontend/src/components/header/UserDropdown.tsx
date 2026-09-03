import { useMemo, useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useNavigate } from "react-router-dom";
import { fetchApi, resolveMediaUrl } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

/* --------------------------------------------------------------------------
   Mismo lenguaje que AppSidebar / AppHeader: lienzo crema (#f9f7f3), líneas
   de 1 px (#e7ded0), tinta cálida (#09090B) y azul eléctrico (#1B5CFF) como
   único acento de acción. En oscuro, la familia slate del contenedor
   (#0f172a → #111827 → #243048). Tipografía Geist / Outfit.
   -------------------------------------------------------------------------- */

const menuItemClass =
  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#3d3d3a] transition-colors hover:bg-[#f5f0e8] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#B7C1D1] dark:hover:bg-[#243048] dark:hover:text-[#F8FAFC]";

const menuIconClass =
  "h-[18px] w-[18px] shrink-0 fill-[#6E6E77] transition-colors group-hover:fill-[#1B5CFF] dark:fill-[#8EA0B8] dark:group-hover:fill-[#4B7CFF]";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { user: me, isAdmin, signOut } = useAuth();

  const displayName = useMemo(() => {
    const first = (me?.first_name || '').trim();
    const last = (me?.last_name || '').trim();
    const fullName = [first, last].filter(Boolean).join(' ');
    return fullName || me?.username || 'Usuario';
  }, [me]);

  const displayEmail = useMemo(() => me?.email || '', [me]);

  const displayRole = useMemo(() => {
    if (me?.is_superuser || me?.is_staff) return 'Administrador';
    return me?.username || 'Usuario';
  }, [me]);

  const avatarSrc = useMemo(() => {
    const u = (me?.avatar_url || '').trim();
    return u ? resolveMediaUrl(u) : '';
  }, [me?.avatar_url]);

  const avatarInitials = useMemo(() => {
    const a = ((me?.first_name || '') as string).trim().charAt(0).toUpperCase();
    const b = ((me?.last_name || '') as string).trim().charAt(0).toUpperCase();
    if (a && b) return a + b;
    if (a) return a;
    const un = ((me?.username || '') as string).trim() || 'U';
    return un.slice(0, 2).toUpperCase();
  }, [me]);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetchApi('/api/logout/', { method: 'POST' });
    } catch {
      /* ignore */
    }
    signOut();
    navigate('/signin', { replace: true });
  }

  const avatarNode = (size: string, textSize: string) =>
    avatarSrc ? (
      <img src={avatarSrc} alt={displayName} className={`${size} rounded-full object-cover`} />
    ) : (
      <span
        className={`inline-flex ${size} items-center justify-center rounded-full bg-[#1B5CFF] ${textSize} font-semibold text-white`}
        aria-hidden
      >
        {avatarInitials}
      </span>
    );

  return (
    <div className="relative [font-family:'Geist','Outfit',system-ui,sans-serif]">
      <button
        onClick={toggleDropdown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Abrir menú de la cuenta"
        className="dropdown-toggle flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 text-[#09090B] transition-colors hover:bg-[#f2ece1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/35 dark:text-[#F8FAFC] dark:hover:bg-[#243048]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white dark:ring-[#0f172a]">
          {avatarNode("h-10 w-10", "text-sm")}
        </span>

        <span className="hidden max-w-[9rem] truncate text-sm font-medium sm:block">
          {displayName}
        </span>
        <svg
          className={`shrink-0 text-[#6E6E77] transition-transform duration-200 dark:text-[#8EA0B8] ${
            isOpen ? "rotate-180" : ""
          }`}
          width="16"
          height="16"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-3 flex w-[268px] flex-col rounded-2xl border border-[#e7ded0] bg-white p-2.5 shadow-[0_18px_45px_-20px_rgba(28,25,23,0.35)] dark:border-[#273244] dark:bg-[#111827] dark:shadow-[0_18px_45px_-24px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-start gap-3 rounded-xl bg-[#f9f7f3] px-3 py-3 dark:bg-[#0f172a]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10">
            {avatarNode("h-10 w-10", "text-sm")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
              {displayName}
            </p>
            <span className="mt-1 inline-flex items-center rounded-full bg-[rgba(27,92,255,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1244D1] dark:bg-[rgba(75,124,255,0.16)] dark:text-[#4B7CFF]">
              {displayRole}
            </span>
            {displayEmail && (
              <p className="mt-1.5 break-all text-[11px] leading-[16px] text-[#8b8578] dark:text-[#8EA0B8]">
                {displayEmail}
              </p>
            )}
          </div>
        </div>

        <ul className="mt-1.5 flex flex-col gap-0.5 border-b border-[#e7ded0] pb-2 dark:border-[#273244]" role="menu">
          <li role="none">
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              baseClassName=""
              className={menuItemClass}
            >
              <svg className={menuIconClass} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 14.1526 4.3002 16.1184 5.61936 17.616C6.17279 15.3096 8.24852 13.5955 10.7246 13.5955H13.2746C15.7509 13.5955 17.8268 15.31 18.38 17.6167C19.6996 16.119 20.5 14.153 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM17.0246 18.8566V18.8455C17.0246 16.7744 15.3457 15.0955 13.2746 15.0955H10.7246C8.65354 15.0955 6.97461 16.7744 6.97461 18.8455V18.856C8.38223 19.8895 10.1198 20.5 12 20.5C13.8798 20.5 15.6171 19.8898 17.0246 18.8566ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9991 7.25C10.8847 7.25 9.98126 8.15342 9.98126 9.26784C9.98126 10.3823 10.8847 11.2857 11.9991 11.2857C13.1135 11.2857 14.0169 10.3823 14.0169 9.26784C14.0169 8.15342 13.1135 7.25 11.9991 7.25ZM8.48126 9.26784C8.48126 7.32499 10.0563 5.75 11.9991 5.75C13.9419 5.75 15.5169 7.32499 15.5169 9.26784C15.5169 11.2107 13.9419 12.7857 11.9991 12.7857C10.0563 12.7857 8.48126 11.2107 8.48126 9.26784Z" fill="" />
              </svg>
              Editar perfil
            </DropdownItem>
          </li>

          {isAdmin && (
            <li role="none">
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                to="/usuarios"
                baseClassName=""
                className={menuItemClass}
              >
                <svg className={menuIconClass} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path fillRule="evenodd" clipRule="evenodd" d="M10.4858 3.5L13.5182 3.5C13.9233 3.5 14.2518 3.82851 14.2518 4.23377C14.2518 5.9529 16.1129 7.02795 17.602 6.1682C17.9528 5.96567 18.4014 6.08586 18.6039 6.43667L20.1203 9.0631C20.3229 9.41407 20.2027 9.86286 19.8517 10.0655C18.3625 10.9253 18.3625 13.0747 19.8517 13.9345C20.2026 14.1372 20.3229 14.5859 20.1203 14.9369L18.6039 17.5634C18.4013 17.9142 17.9528 18.0344 17.602 17.8318C16.1129 16.9721 14.2518 18.0471 14.2518 19.7663C14.2518 20.1715 13.9233 20.5 13.5182 20.5H10.4858C10.0804 20.5 9.75182 20.1714 9.75182 19.766C9.75182 18.0461 7.88983 16.9717 6.40067 17.8314C6.04945 18.0342 5.60037 17.9139 5.39767 17.5628L3.88167 14.937C3.67903 14.586 3.79928 14.1372 4.15026 13.9346C5.63949 13.0748 5.63946 10.9253 4.15025 10.0655C3.79926 9.86282 3.67901 9.41401 3.88165 9.06303L5.39764 6.43725C5.60034 6.08617 6.04943 5.96581 6.40065 6.16858C7.88982 7.02836 9.75182 5.9539 9.75182 4.23399C9.75182 3.82862 10.0804 3.5 10.4858 3.5ZM11.9999 9.66493C13.2905 9.66493 14.3359 10.7103 14.3359 11.9999C14.3359 13.2895 13.2905 14.3349 11.9999 14.3349C10.7093 14.3349 9.6639 13.2895 9.6639 11.9999C9.6639 10.7103 10.7093 9.66493 11.9999 9.66493Z" fill="" />
                </svg>
                Gestión de usuarios
              </DropdownItem>
            </li>
          )}
        </ul>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="group mt-1.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#3d3d3a] transition-colors hover:bg-[rgba(194,43,43,0.08)] hover:text-[#C22B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C22B2B]/35 disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#B7C1D1] dark:hover:bg-[rgba(248,113,113,0.12)] dark:hover:text-[#F87171]"
        >
          {loggingOut ? (
            <svg className="h-[18px] w-[18px] shrink-0 animate-spin text-[#6E6E77] dark:text-[#8EA0B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="h-[18px] w-[18px] shrink-0 fill-[#6E6E77] transition-colors group-hover:fill-[#C22B2B] dark:fill-[#8EA0B8] dark:group-hover:fill-[#F87171]" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M15.1007 19.247C14.6865 19.247 14.3507 18.9112 14.3507 18.497L14.3507 14.245H12.8507V18.497C12.8507 19.7396 13.8581 20.747 15.1007 20.747H18.5007C19.7434 20.747 20.7507 19.7396 20.7507 18.497L20.7507 5.49609C20.7507 4.25345 19.7433 3.24609 18.5007 3.24609H15.1007C13.8581 3.24609 12.8507 4.25345 12.8507 5.49609V9.74501L14.3507 9.74501V5.49609C14.3507 5.08188 14.6865 4.74609 15.1007 4.74609L18.5007 4.74609C18.9149 4.74609 19.2507 5.08188 19.2507 5.49609L19.2507 18.497C19.2507 18.9112 18.9149 19.247 18.5007 19.247H15.1007ZM3.25073 11.9984C3.25073 12.2144 3.34204 12.4091 3.48817 12.546L8.09483 17.1556C8.38763 17.4485 8.86251 17.4487 9.15549 17.1559C9.44848 16.8631 9.44863 16.3882 9.15583 16.0952L5.81116 12.7484L16.0007 12.7484C16.4149 12.7484 16.7507 12.4127 16.7507 11.9984C16.7507 11.5842 16.4149 11.2484 16.0007 11.2484L5.81528 11.2484L9.15585 7.90554C9.44864 7.61255 9.44847 7.13767 9.15547 6.84488C8.86248 6.55209 8.3876 6.55226 8.09481 6.84525L3.52309 11.4202C3.35673 11.5577 3.25073 11.7657 3.25073 11.9984Z" fill="" />
            </svg>
          )}
          {loggingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </Dropdown>
    </div>
  );
}
