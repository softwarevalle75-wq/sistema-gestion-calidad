import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNotifications } from "@/context/NotificationContext";
import type { Notificacion } from "@/services/notificacion.service";

interface NotificationBellProps {
  onOpenChange?: (open: boolean) => void;
}

export function NotificationBell({ onOpenChange }: NotificationBellProps) {
  const { notificaciones, noLeidas, marcarLeida, marcarTodas } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleMarcarLeida = async (notificacion: Notificacion) => {
    try {
      if (!notificacion.leida) {
        await marcarLeida(notificacion.id);
      }

      if (notificacion.referencia_tipo && notificacion.referencia_id) {
        const id = notificacion.referencia_id;
        const rutas: Record<string, string> = {
          ticket: `/mesa-ayuda?ticket_id=${id}`,
          documento: `/documentos/${id}`,
          auditoria: `/AuditoriasPlanificacion`,
          hallazgo: `/AuditoriasHallazgosView`,
          accion_correctiva: `/acciones-correctivas/${id}/solucionar`,
          no_conformidad: `/No_conformidades_Abiertas`,
          proceso: `/procesos/${id}`,
          riesgo: `/riesgos/matriz`,
          control_riesgo: `/riesgos/controles`,
          capacitacion: `/capacitaciones/programadas`,
          objetivo: `/Activos`,
          indicador: `/indicadores/tablero`,
          competencia: `/capacitaciones/competencias`,
        };

        const ruta = rutas[notificacion.referencia_tipo];
        if (ruta) {
          navigate(ruta);
          setOpen(false);
          onOpenChange?.(false);
        }
      }
    } catch (error: unknown) {
      console.error("Error marcando notificación:", error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) {
        return;
      }
      const mensaje = error instanceof Error ? error.message : "Error al marcar notificación";
      toast.error(mensaje);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await marcarTodas();
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      console.error("Error marcando todas como leídas:", error);
      const mensaje = error instanceof Error ? error.message : "Error al marcar notificaciones";
      toast.error(mensaje);
    }
  };

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      asignacion: "📋",
      revision: "📝",
      aprobacion: "✅",
    };
    return icons[tipo] || "🔔";
  };

  return (
    <DropdownMenu open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      onOpenChange?.(isOpen);
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" type="button">
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {noLeidas > 9 ? "9+" : noLeidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))]">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notificaciones</span>
          {noLeidas > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void handleMarcarTodasLeidas();
              }}
              className="h-auto p-1 text-xs"
            >
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="h-[400px] overflow-y-auto">
          {notificaciones.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </div>
          ) : (
            notificaciones.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${!notif.leida ? "bg-accent/50" : ""
                  }`}
                onSelect={() => {
                  void handleMarcarLeida(notif);
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">{getTipoIcon(notif.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{notif.titulo}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.mensaje}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notif.creado_en), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                  {!notif.leida && (
                    <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
