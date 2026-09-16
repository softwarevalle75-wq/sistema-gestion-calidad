import * as React from "react";
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  FolderOpen,
  BarChart3,
  LayoutDashboard,
  Shield,
  Target,
  GraduationCap,
  TrendingUp,
  FileCheck,
  BookOpen,
  LifeBuoy,
} from "lucide-react"; import { Link } from "react-router-dom";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getCurrentUser, getToken } from "@/services/auth";
import axios from "axios";

import { API_BASE_URL as API_URL } from "@/lib/api";
import { configuracionService } from "@/services/configuracion.service";
import { hasAnyPermission, getUserPermissions } from "@/lib/permissions";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState(getCurrentUser());
  const [pendingCount] = React.useState(5); // Simulado
  const { isMobile, setOpenMobile } = useSidebar();
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [systemTitle, setSystemTitle] = React.useState<string>("SGC ISO 9001");
  const [systemSubtitle, setSystemSubtitle] = React.useState<string>("Sistema de Calidad");

  // Cargar perfil completo al montar
  React.useEffect(() => {
    const cargarPerfilCompleto = async () => {
      const currentUser = getCurrentUser();
      const token = getToken();
      if (currentUser?.id && token) {
        try {
          const res = await axios.get(`${API_URL}/usuarios/${currentUser.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const updatedUser = { ...currentUser, ...res.data };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
        } catch (error) {
          console.error("Error cargando perfil completo:", error);
        }
      }
    };
    cargarPerfilCompleto();
  }, []);

  // Actualizar usuario cuando cambie en localStorage
  React.useEffect(() => {
    const handleStorageChange = () => setUser(getCurrentUser());
    window.addEventListener("storage", handleStorageChange);
    const interval = setInterval(() => {
      const updatedUser = getCurrentUser();
      if (JSON.stringify(updatedUser) !== JSON.stringify(user)) {
        setUser(updatedUser);
      }
    }, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);

  // Cargar configuraciones del sistema (logo, título, subtítulo)
  React.useEffect(() => {
    const fetchSystemConfig = async () => {
      try {
        const configs = await configuracionService.list({ categoria: "sistema", limit: 500 });
        const byKey = new Map(configs.map((cfg) => [cfg.clave, cfg.valor]));

        const logo = byKey.get("logo_universidad");
        const title = byKey.get("sistema_titulo");
        const subtitle = byKey.get("sistema_subtitulo");

        setLogoUrl(logo || null);
        if (title) setSystemTitle(title);
        if (subtitle) setSystemSubtitle(subtitle);
      } catch (error) {
        console.error("Error cargando configuración del sistema:", error);
      }
    };
    fetchSystemConfig();

    // Escuchar cambios
    window.addEventListener("system-logo-change", fetchSystemConfig);
    window.addEventListener("system-config-change", fetchSystemConfig);
    return () => {
      window.removeEventListener("system-logo-change", fetchSystemConfig);
      window.removeEventListener("system-config-change", fetchSystemConfig);
    };
  }, []);



  // Lógica de Permisos Detallada
  const userPermisos = getUserPermissions();
  const isAdmin = userPermisos.includes("sistema.admin");

  const hasPermission = (permiso?: string) => {
    if (!permiso || isAdmin) return true;
    return hasAnyPermission([permiso]);
  };

  // Definición de tipos para los elementos del menú
  interface MenuItem {
    title: string;
    url: string;
    icon?: React.ElementType;
    isActive?: boolean;
    badge?: string;
    badgeVariant?: "default" | "destructive" | "outline" | "secondary";
    permiso?: string;
    permisos?: string[];
    items?: MenuItem[];
    onClick?: () => void;
  }

  // Función para filtrar menús recursivamente
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .map((item): MenuItem | null => {
        // Generar lista de sub-items permitidos
        const filteredSubItems = item.items ? filterMenuItems(item.items) : undefined;

        // Un ítem es visible si:
        // 1. Tiene permiso directo y lo tiene el usuario (y no es un simple contenedor '#')
        // 2. O tiene hijos permitidos visibles
        // 3. O no tiene permiso requerido (público) y no es un contenedor vacío

        const hasDirectPermission = item.permisos
          ? hasAnyPermission(item.permisos)
          : item.permiso
            ? hasPermission(item.permiso)
            : true;
        const hasChildren = filteredSubItems && filteredSubItems.length > 0;

        // Si es un contenedor (#) solo es visible si tiene hijos
        if (item.url === "#") {
          if (hasChildren) {
            return { ...item, items: filteredSubItems };
          }
          return null;
        }

        // Si es un enlace directo
        if (hasDirectPermission) {
          return { ...item, items: filteredSubItems };
        }

        return null;
      })
      .filter((item): item is MenuItem => item !== null);
  };

  const data = {
    user: {
      name: user ? (user.nombre_completo || `${user.nombre || ""} ${user.primer_apellido || ""}`.trim() || "Usuario") : "Usuario",
      email: user?.correoElectronico || user?.email || "usuario@example.com",
      avatar: "/avatars/user.jpg",
      fotoUrl: user?.fotoUrl || user?.foto_url || "",
    },
    navMain: filterMenuItems([
      {
        title: "Panel de Control",
        url: "/dashboard",
        icon: LayoutDashboard,
        badge: "Nuevo",
        badgeVariant: "default" as const,
      },
      {
        title: "Áreas",
        url: "#",
        icon: Building2,
        items: [
          { title: "Gestionar Áreas", url: "/gestionar_areas", permiso: "areas.gestionar" },
          { title: "Asignar Responsables", url: "/Asignar_Responsables", permiso: "areas.gestionar" },
        ],
      },
      {
        title: "Usuarios",
        url: "#",
        icon: Users,
        items: [
          { title: "Lista de Usuarios", url: "/ListaDeUsuarios", permiso: "usuarios.ver" },
          { title: "Nuevo Usuario", url: "/NuevoUsuario", permiso: "usuarios.crear" },
          { title: "Roles y Permisos", url: "/Roles_y_Permisos", permiso: "usuarios.gestion" },
        ],
      },
      {
        title: "Documentos",
        url: "#",
        icon: FileText,
        badge: pendingCount > 0 ? pendingCount.toString() : undefined,
        badgeVariant: "destructive" as const,
        items: [
          { title: "Gestionar Documentos", url: "/documentos", permiso: "documentos.ver" },
          { title: "Documentos Publicos", url: "/Documentos_Publicos" },
          { title: "Control de Versiones", url: "/control-versiones", permiso: "documentos.revisar" },
          {
            title: "Aprobaciones Pendientes",
            url: "/Aprobaciones_Pendientes",
            permiso: "documentos.aprobar",
            badge: pendingCount > 0 ? pendingCount.toString() : undefined,
          },
          {
            title: "Revisiones Pendientes",
            url: "/Revisiones_Pendientes",
            permiso: "documentos.revisar",
          },
          { title: "Documentos Obsoletos", url: "/Documentos_Obsoletos", permiso: "documentos.anular" },
        ],
      },
      {
        title: "Procesos",
        url: "#",
        icon: FolderOpen,
        items: [
          { title: "Mapa de Procesos", url: "/procesos", permisos: ["procesos.ver", "procesos.admin"] },
          { title: "Listado de Procesos", url: "/procesos/listado", permisos: ["procesos.ver", "procesos.admin"] },
        ],
      },
    ]),
    navQuality: filterMenuItems([
      {
        title: "Acciones Correctivas",
        icon: AlertTriangle,
        url: "#",
        items: [
          { title: "Tablero", url: "/acciones-correctivas/dashboard", permiso: "noconformidades.gestion" },
          { title: "Nuevas", url: "/Acciones_correctivas_Nuevas", permiso: "noconformidades.gestion" },
          { title: "En Proceso", url: "/Acciones_correctivas_EnProceso", permiso: "noconformidades.gestion" },
          { title: "Cerradas", url: "/Acciones_correctivas_Cerradas", permisos: ["noconformidades.gestion", "noconformidades.cerrar"] },
          { title: "Verificadas", url: "/Acciones_correctivas_Verificadas", permiso: "noconformidades.cerrar" },
        ],
      },
      {
        title: "No Conformidades",
        icon: ClipboardCheck,
        url: "#",
        items: [
          { title: "Abiertas", url: "/No_conformidades_Abiertas", permisos: ["noconformidades.gestion", "noconformidades.reportar"] },
          { title: "En Tratamiento", url: "/No_conformidades_EnTratamiento", permiso: "noconformidades.gestion" },
          { title: "Cerradas", url: "/No_conformidades_Cerradas", permisos: ["noconformidades.gestion", "noconformidades.cerrar"] },
        ],
      },
      {
        title: "Auditorías",
        icon: FileCheck,
        url: "#",
        items: [
          { title: "Planificación", url: "/AuditoriasPlanificacion", permiso: "auditorias.planificar" },
          { title: "Programa Anual", url: "/auditorias/programa-anual", permiso: "auditorias.planificar" },
          { title: "Formularios", url: "/auditorias/formularios", permiso: "auditorias.planificar" },
          { title: "En Curso", url: "/AuditoriasEnCurso", permiso: "auditorias.ejecutar" },
          { title: "Completadas", url: "/AuditoriasCompletas", permisos: ["auditorias.ejecutar", "auditorias.ver"] },
          { title: "Hallazgos", url: "/AuditoriasHallazgosView", permisos: ["auditorias.ejecutar", "auditorias.ver"] },
        ],
      },
      {
        title: "Riesgos",
        icon: Shield,
        url: "#",
        items: [
          { title: "Matriz de Riesgos", url: "/riesgos/matriz", permisos: ["riesgos.ver", "riesgos.gestion"] },
          { title: "Controles", url: "/riesgos/controles", permiso: "riesgos.gestion" },
          { title: "Tratamientos", url: "/riesgos/tratamiento", permiso: "riesgos.gestion" },
        ],
      },
      {
        title: "Objetivos de Calidad",
        icon: Target,
        url: "#",
        items: [
          { title: "Objetivos Activos", url: "/Activos", permiso: "calidad.ver" },
          { title: "Seguimiento", url: "/Seguimiento", permiso: "calidad.ver" },
          { title: "Historial", url: "/Historial", permiso: "calidad.ver" },
        ],
      },
      {
        title: "Indicadores",
        icon: TrendingUp,
        url: "#",
        items: [
          { title: "Tablero", url: "/indicadores/tablero", permiso: "calidad.ver" },
          { title: "Eficacia", url: "/indicadores/eficacia", permiso: "calidad.ver" },
          { title: "Eficiencia", url: "/indicadores/eficiencia", permiso: "calidad.ver" },
          { title: "Cumplimiento", url: "/indicadores/cumplimiento", permiso: "calidad.ver" },
        ],
      },
      {
        title: "Capacitaciones",
        icon: GraduationCap,
        url: "#",
        items: [
          { title: "Programadas", url: "/capacitaciones/programadas", permiso: "capacitaciones.gestion" },
          { title: "Historial", url: "/capacitaciones/historial", permiso: "capacitaciones.gestion" },
          { title: "Asistencias", url: "/capacitaciones/asistencias", permiso: "capacitaciones.gestion" },
          { title: "Competencias", url: "/capacitaciones/competencias", permiso: "capacitaciones.gestion" },
        ],
      },
    ]),
    navSecondary: filterMenuItems([
      {
        title: "Sistema",
        url: "#",
        icon: Shield,
        items: [
          { title: "Configuración Global", url: "/configuracion", permiso: "sistema.config" },
          { title: "Seguridad", url: "/seguridad", permiso: "sistema.admin" },
          { title: "Migraciones de BD", url: "/sistema/migraciones", permiso: "sistema.admin" },
          { title: "Audit Log", url: "/sistema/audit-log", permiso: "sistema.admin" },
        ],
      },
      {
        title: "Reportes",
        url: "/reportes",
        icon: BarChart3,
        permisos: ["calidad.ver", "documentos.ver", "auditorias.ver", "riesgos.ver"],
      },
      {
        title: "Mesa de Ayuda",
        url: "/mesa-ayuda",
        icon: LifeBuoy,
      },
      {
        title: "Manual de Usuario",
        url: "/manual-usuario",
        icon: BookOpen,
      },
    ]),
  };

  return (
    <Sidebar collapsible="icon" {...props} className="border-r border-sidebar-border bg-gradient-to-b from-sidebar to-sidebar/95">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-r from-blue-600 to-cyan-600">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-white/10 data-[state=open]:bg-white/10">
              <Link to="/dashboard" onClick={() => isMobile && setOpenMobile(false)}>
                <div className="relative group flex aspect-square size-8 items-center justify-center rounded-lg bg-white text-blue-600 shadow-lg overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Universidad" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-white">{systemTitle}</span>
                  <span className="truncate text-xs text-blue-100">{systemSubtitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <div className="mb-3 px-3">
          <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">Gestión</p>
        </div>
        <NavMain items={data.navMain} />

        <div className="my-4 mx-3 border-t border-sidebar-border/50" />

        <div className="mb-3 px-3">
          <p className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">Calidad</p>
        </div>
        <NavMain items={data.navQuality} />

        <div className="mt-6">
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 bg-sidebar/50">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
