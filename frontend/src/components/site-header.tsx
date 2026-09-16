import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Home, Settings, Shield, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationBell } from "./notifications/NotificationBell";
import { getRouteTitle } from "@/utils/appSearch";

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [location.pathname]);

  const pageName = getRouteTitle(location.pathname);
  return (
    <header className="sticky top-0 z-50 flex min-h-12 shrink-0 flex-col border-b bg-background">
      <div className="flex w-full min-w-0 items-center gap-1 px-2 sm:px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-1 hidden sm:block data-[orientation=vertical]:h-4"
        />

        <Breadcrumb className="min-w-0 flex-1 overflow-hidden">
          <BreadcrumbList className="flex-nowrap">
            <BreadcrumbItem className="hidden xl:block">
              <BreadcrumbLink asChild>
                <Link to="/dashboard" className="flex items-center gap-1">
                  <Home className="h-3.5 w-3.5" />
                  SGC ISO 9001
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden xl:block" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="block max-w-[46vw] truncate font-medium sm:max-w-[280px] md:max-w-none">
                {pageName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground lg:hidden"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="hidden lg:block">
            <GlobalSearch compact placeholder="Buscar documentos, auditorías..." />
          </div>

          <div className="flex items-center gap-0.5 border-l pl-1 sm:gap-1 sm:pl-2 sm:ml-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                    onClick={() => navigate("/perfil")}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mi Perfil</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:inline-flex h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                    onClick={() => navigate("/configuracion")}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ajustes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:inline-flex h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl"
                    onClick={() => navigate("/seguridad")}
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Seguridad</TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={notificationOpen ? 100000 : 400}>
                <TooltipTrigger asChild>
                  <div>
                    <NotificationBell onOpenChange={setNotificationOpen} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Notificaciones</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t px-3 py-2 lg:hidden">
          <GlobalSearch
            fullWidth
            placeholder="Buscar módulos..."
            inputClassName="h-10 w-full pl-8 rounded-xl"
          />
        </div>
      )}
    </header>
  );
}
