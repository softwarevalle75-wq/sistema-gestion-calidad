import { apiClient } from "@/lib/api";

// ==================== TIPOS ====================

export type RolResponsableProceso =
    | "responsable"
    | "ejecutor"
    | "supervisor"
    | "apoyo"
    | "auditor_interno";

export interface ResponsableProceso {
    id: string;
    proceso_id: string;
    usuario_id: string;
    rol: RolResponsableProceso;
    es_principal: boolean;
    fecha_asignacion: string;
    vigente_hasta?: string | null;
    observaciones?: string;
    creado_en: string;
    actualizado_en: string;
    // Campos enriquecidos
    usuario_nombre?: string;
    usuario_correo?: string;
    proceso_nombre?: string;
    proceso_codigo?: string;
}

export interface ResponsableProcesoCreate {
    proceso_id: string;
    usuario_id: string;
    rol: RolResponsableProceso;
    es_principal?: boolean;
    fecha_asignacion?: string;
    vigente_hasta?: string | null;
    observaciones?: string;
}

export interface ResponsableProcesoUpdate {
    rol?: RolResponsableProceso;
    es_principal?: boolean;
    vigente_hasta?: string | null;
    observaciones?: string;
}

// ==================== CONSTANTES ====================

export const ROLES_PROCESO: Record<
    RolResponsableProceso,
    { label: string; color: string; bgColor: string; descripcion: string }
> = {
    responsable: {
        label: "Responsable",
        color: "text-blue-800",
        bgColor: "bg-blue-100 border-blue-200",
        descripcion: "Dueño del proceso. Rinde cuentas por el desempeño.",
    },
    ejecutor: {
        label: "Ejecutor",
        color: "text-green-800",
        bgColor: "bg-green-100 border-green-200",
        descripcion: "Realiza las actividades operativas del proceso.",
    },
    supervisor: {
        label: "Supervisor",
        color: "text-yellow-800",
        bgColor: "bg-yellow-100 border-yellow-200",
        descripcion: "Monitorea y supervisa la ejecución del proceso.",
    },
    apoyo: {
        label: "Apoyo",
        color: "text-gray-800",
        bgColor: "bg-gray-100 border-gray-200",
        descripcion: "Brinda soporte técnico o administrativo.",
    },
    auditor_interno: {
        label: "Auditor Interno",
        color: "text-purple-800",
        bgColor: "bg-purple-100 border-purple-200",
        descripcion: "Auditor asignado para evaluaciones internas.",
    },
};

// ==================== SERVICIO ====================

class ResponsableProcesoService {
    /**
     * Listar responsables formales de un proceso
     */
    async getByProceso(
        procesoId: string,
        options?: { rol?: string; solo_vigentes?: boolean }
    ): Promise<ResponsableProceso[]> {
        const params: Record<string, unknown> = {};
        if (options?.rol) params.rol = options.rol;
        if (options?.solo_vigentes !== undefined)
            params.solo_vigentes = options.solo_vigentes;

        const response = await apiClient.get<ResponsableProceso[]>(
            `/procesos/${procesoId}/responsables`,
            { params }
        );
        return response.data;
    }

    /**
     * Asignar un responsable formal a un proceso
     */
    async asignar(
        procesoId: string,
        data: ResponsableProcesoCreate
    ): Promise<ResponsableProceso> {
        const response = await apiClient.post<ResponsableProceso>(
            `/procesos/${procesoId}/responsables`,
            data
        );
        return response.data;
    }

    /**
     * Actualizar una asignación
     */
    async actualizar(
        responsableId: string,
        data: ResponsableProcesoUpdate
    ): Promise<ResponsableProceso> {
        const response = await apiClient.put<ResponsableProceso>(
            `/responsables-proceso/${responsableId}`,
            data
        );
        return response.data;
    }

    /**
     * Eliminar una asignación
     */
    async eliminar(responsableId: string): Promise<void> {
        await apiClient.delete(`/responsables-proceso/${responsableId}`);
    }

    /**
     * Obtener procesos asignados a un usuario
     */
    async getByUsuario(usuarioId: string): Promise<ResponsableProceso[]> {
        const response = await apiClient.get<ResponsableProceso[]>(
            `/usuarios/${usuarioId}/procesos-asignados`
        );
        return response.data;
    }
}

export const responsableProcesoService = new ResponsableProcesoService();
export default responsableProcesoService;
