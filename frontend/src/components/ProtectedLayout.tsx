import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "@/services/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { NotificationProvider } from "@/context/NotificationContext";

export function ProtectedLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  if (!isAuthenticated()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  return (
    <SidebarProvider className="font-sans">
      <NotificationProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 overflow-x-clip bg-[#F8FAFC] hero-gradient">
          <SiteHeader />
          <div className="flex min-w-0 flex-1 flex-col">
            <Outlet />
          </div>
        </SidebarInset>
      </NotificationProvider>
    </SidebarProvider>
  );
}
