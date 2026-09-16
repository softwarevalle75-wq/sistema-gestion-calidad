import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import notificacionService, {
  type Notificacion,
} from "@/services/notificacion.service";

interface NotificationContextValue {
  notificaciones: Notificacion[];
  noLeidas: number;
  recargar: () => Promise<void>;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodas: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);

  const recargar = useCallback(async () => {
    try {
      const [lista, count] = await Promise.all([
        notificacionService.getNotificaciones(false),
        notificacionService.getNoLeidas(),
      ]);
      setNotificaciones(lista.slice(0, 10));
      setNoLeidas(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message !== "Network Error") {
        console.error("Error cargando notificaciones:", error);
      }
    }
  }, []);

  useEffect(() => {
    void recargar();
    const interval = setInterval(() => {
      void recargar();
    }, 30000);

    const onFocus = () => {
      void recargar();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [recargar]);

  const marcarLeida = useCallback(
    async (id: string) => {
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      );
      setNoLeidas((prev) => Math.max(0, prev - 1));
      try {
        await notificacionService.marcarComoLeida(id);
      } finally {
        await recargar();
      }
    },
    [recargar],
  );

  const marcarTodas = useCallback(async () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setNoLeidas(0);
    try {
      await notificacionService.marcarTodasLeidas();
    } finally {
      await recargar();
    }
  }, [recargar]);

  const value = useMemo(
    () => ({
      notificaciones,
      noLeidas,
      recargar,
      marcarLeida,
      marcarTodas,
    }),
    [notificaciones, noLeidas, recargar, marcarLeida, marcarTodas],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications debe usarse dentro de NotificationProvider");
  }
  return ctx;
}
