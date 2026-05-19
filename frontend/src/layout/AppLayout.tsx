import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex overflow-x-hidden bg-[#f9f7f3] dark:bg-[#0f172a]">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <main
        id="main-content"
        className={`flex-1 min-w-0 min-h-screen bg-[#f9f7f3] text-[#1c1917] transition-all duration-300 ease-in-out dark:bg-[#0f172a] dark:text-[#f8fafc] ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 min-w-0 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
