import apiClient from "@/lib/api";

export interface Competencia {
    id: string;
    nombre: string;
    descripcion?: string;
    creadoEn: string;
    actualizadoEn: string;
}

export interface EvaluacionCompetencia {
    id: string;
    usuarioId: string;
    competenciaId: string;
    nivel: 'Básico' | 'Intermedio' | 'Avanzado';
    estado: 'Pendiente' | 'En Desarrollo' | 'Reforzada' | 'Desarrollada';
    fechaEvaluacion: string;
    evaluadorId?: string;
    observaciones?: string;
    competencia?: Competencia;
    usuario?: {
        id: string;
        documento?: number;
        nombre: string;
        segundo_nombre?: string;
        segundoNombre?: string;
        primer_apellido?: string;
        primerApellido?: string;
        segundo_apellido?: string;
        segundoApellido?: string;
        correo_electronico?: string;
        correoElectronico?: string;
        nombre_usuario?: string;
        nombreUsuario?: string;
    };
    // Note: Backend might need to include usuario in response if we want to show it easily, 
    // currently `EvaluacionCompetenciaResponse` only nests `competencia`. 
    // We might need to fetch users separately or update backend. 
    // For `CapacitacionesCompetencia.tsx`, we need the user name (responsable).
}

export const competenciaService = {
    // --- Competencias (Catálogo) ---

    async getAll(): Promise<Competencia[]> {
        const response = await apiClient.get('/competencias');
        return response.data;
    },

    async create(data: { nombre: string; descripcion?: string }): Promise<Competencia> {
        const response = await apiClient.post('/competencias', data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/competencias/${id}`);
    },

    // --- Evaluaciones ---

    async getEvaluaciones(filters?: { usuarioId?: string; competenciaId?: string }): Promise<EvaluacionCompetencia[]> {
        const params = new URLSearchParams();
        if (filters?.usuarioId) params.append("usuario_id", filters.usuarioId);
        if (filters?.competenciaId) params.append("competencia_id", filters.competenciaId);

        const response = await apiClient.get('/competencias/evaluaciones/listar', {
            params: {
                usuario_id: filters?.usuarioId,
                competencia_id: filters?.competenciaId
            }
        });
        return response.data;
    },

    async evaluarUsuario(data: {
        usuario_id: string;
        competencia_id: string;
        nivel: string;
        estado: string;
        fecha_evaluacion: string;
        observaciones?: string
    }): Promise<EvaluacionCompetencia> {
        const response = await apiClient.post('/competencias/evaluar', data);
        return response.data;
    },

    async deleteEvaluacion(id: string): Promise<void> {
        await apiClient.delete(`/competencias/evaluaciones/${id}`);
    }
};
