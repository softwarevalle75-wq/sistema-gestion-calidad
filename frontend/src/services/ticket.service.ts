import apiClient from "@/lib/api";

export interface UsuarioBasic {
    id: string;
    documento?: number;
    nombre: string;
    segundo_nombre?: string;
    primer_apellido: string;
    segundo_apellido?: string;
    correo_electronico: string;
    nombre_usuario?: string;
}

export interface Ticket {
    id: string;
    titulo: string;
    descripcion: string;
    categoria: "soporte" | "consulta" | "mejora" | "solicitud_documento";
    prioridad: "baja" | "media" | "alta" | "critica";
    estado: "abierto" | "en_progreso" | "resuelto" | "cerrado" | "aprobado" | "declinado";
    solicitante_id: string;
    asignado_a?: string;
    area_destino_id?: string;
    documento_publico_id?: string;
    archivo_adjunto_url?: string;

    // Información de usuarios (nested)
    solicitante?: UsuarioBasic;
    asignado?: UsuarioBasic;

    creado_en: string;
    actualizado_en: string;
    solucion?: string;
    fecha_resolucion?: string;
    satisfaccion_cliente?: number;
}

export interface TicketCreate {
    titulo: string;
    descripcion: string;
    categoria: string;
    prioridad?: string;
    area_destino_id?: string;
    documento_publico_id?: string;
    archivo_adjunto_url?: string;
}

export interface TicketUpdate {
    titulo?: string;
    descripcion?: string;
    categoria?: string;
    prioridad?: string;
    estado?: string;
    asignado_a?: string;
    area_destino_id?: string;
    documento_publico_id?: string;
    archivo_adjunto_url?: string;
}

export interface TicketResolver {
    solucion: string;
    satisfaccion_cliente?: number;
}

export interface TicketDecision {
    comentario?: string;
}

const ticketService = {
    getAll: async (estado?: string): Promise<Ticket[]> => {
        const params = new URLSearchParams();
        if (estado) params.append("estado", estado);
        const response = await apiClient.get<Ticket[]>("/tickets", { params });
        return response.data;
    },

    getById: async (id: string): Promise<Ticket> => {
        const response = await apiClient.get<Ticket>(`/tickets/${id}`);
        return response.data;
    },

    create: async (ticket: TicketCreate): Promise<Ticket> => {
        const response = await apiClient.post<Ticket>("/tickets", ticket);
        return response.data;
    },

    update: async (id: string, ticket: TicketUpdate): Promise<Ticket> => {
        const response = await apiClient.put<Ticket>(`/tickets/${id}`, ticket);
        return response.data;
    },

    resolver: async (id: string, data: TicketResolver): Promise<Ticket> => {
        const response = await apiClient.post<Ticket>(`/tickets/${id}/resolver`, data);
        return response.data;
    },

    aprobar: async (id: string, data: TicketDecision): Promise<Ticket> => {
        const response = await apiClient.post<Ticket>(`/tickets/${id}/aprobar`, data);
        return response.data;
    },

    declinar: async (id: string, data: TicketDecision): Promise<Ticket> => {
        const response = await apiClient.post<Ticket>(`/tickets/${id}/declinar`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/tickets/${id}`);
    },
};

export default ticketService;
