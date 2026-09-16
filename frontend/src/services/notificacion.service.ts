import api from "@/lib/api";

export interface Notificacion {
    id: string;
    usuario_id: string;
    titulo: string;
    mensaje: string;
    tipo: string;
    leida: boolean;
    fecha_lectura: string | null;
    referencia_tipo: string | null;
    referencia_id: string | null;
    creado_en: string;
}

function statusDe(error: unknown): number | undefined {
    return (error as { response?: { status?: number } })?.response?.status;
}

class NotificacionService {
    /**
     * Obtener lista de notificaciones del usuario actual
     */
    async getNotificaciones(soloNoLeidas: boolean = false): Promise<Notificacion[]> {
        const params = soloNoLeidas ? { solo_no_leidas: true } : {};
        try {
            const response = await api.get<Notificacion[]>("/notificaciones", { params });
            return Array.isArray(response.data) ? response.data : [];
        } catch (error: unknown) {
            const status = statusDe(error);
            if (status === 403) {
                const response = await api.get<Notificacion[]>("/notificaciones/", { params });
                return Array.isArray(response.data) ? response.data : [];
            }
            if ((error as { message?: string })?.message === "Network Error") return [];
            throw error;
        }
    }

    /**
     * Obtener contador de notificaciones no leídas
     */
    async getNoLeidas(): Promise<number> {
        try {
            const response = await api.get<{ count: number }>("/notificaciones/no-leidas/count");
            return Number(response.data?.count ?? 0);
        } catch (error: unknown) {
            if ((error as { message?: string })?.message === "Network Error") return 0;
            throw error;
        }
    }

    /**
     * Marcar una notificación como leída
     */
    async marcarComoLeida(id: string): Promise<Notificacion | null> {
        try {
            const response = await api.put<Notificacion>(`/notificaciones/${id}/marcar-leida`, {});
            return response.data;
        } catch (error: unknown) {
            const status = statusDe(error);
            if (status === 404 || status === 405 || status === 422 || status === 500) {
                try {
                    const response = await api.put<Notificacion>(`/notificaciones/${id}`, {
                        leida: true,
                        fecha_lectura: new Date().toISOString(),
                    });
                    return response.data;
                } catch (fallbackError: unknown) {
                    if (statusDe(fallbackError) === 404) {
                        console.warn(`Notificación ${id} no encontrada, posiblemente ya fue eliminada`);
                        return null;
                    }
                    throw fallbackError;
                }
            }
            throw error;
        }
    }

    /**
     * Marcar todas las notificaciones como leídas
     */
    async marcarTodasLeidas(): Promise<void> {
        const intentos = [
            () => api.post("/notificaciones/marcar-todas-leidas", {}),
            () => api.put("/notificaciones/marcar-todas-leidas", {}),
        ];

        for (const intento of intentos) {
            try {
                await intento();
                return;
            } catch (error: unknown) {
                const status = statusDe(error);
                if (status !== 404 && status !== 405 && status !== 422) {
                    throw error;
                }
            }
        }

        const pendientes = await this.getNotificaciones(true);
        await Promise.all(pendientes.map((n) => this.marcarComoLeida(n.id)));
    }

    /**
     * Eliminar una notificación
     */
    async eliminarNotificacion(id: string): Promise<void> {
        await api.delete(`/notificaciones/${id}`);
    }
}

export default new NotificacionService();
