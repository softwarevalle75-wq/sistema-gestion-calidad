import { apiClient } from "@/lib/api";

export interface NoConformidad {
  id: string;
  codigo: string;
  tipo?: string;
  descripcion: string;
  estado: string;
  gravedad?: string;
  fuente?: string;
  fecha_deteccion: string;
  responsable_id?: string | null;
  area_id?: string;
  documento_id?: string;
  proceso_id?: string | null;
  detectado_por?: string | null;
  analisis_causa?: string | null;
  plan_accion?: string | null;
  acciones_correctivas?: any[]; // To be typed properly with AccionCorrectiva
  evidencias?: string | null; // URL o JSON string
  creado_en?: string;
  actualizado_en?: string;
  responsable?: {
    id: string;
    nombre: string;
    primerApellido: string;
  };
  area?: {
    id: string;
    nombre: string;
  };
  proceso?: {
    id: string;
    nombre: string;
    codigo: string;
  };
  detector?: {
    id: string;
    nombre: string;
    primerApellido: string;
  };
}

export const noConformidadService = {
  // Obtener todas las no conformidades
  async getAll(): Promise<NoConformidad[]> {
    const response = await apiClient.get("/no-conformidades");
    return response.data;
  },

  // Obtener no conformidades abiertas
  async getAbiertas(): Promise<NoConformidad[]> {
    const response = await apiClient.get("/no-conformidades", {
      params: { estado: "abierta" }
    });
    return response.data;
  },

  // Obtener no conformidades en tratamiento
  async getEnTratamiento(): Promise<NoConformidad[]> {
    const response = await apiClient.get("/no-conformidades", {
      params: { estado: "en_tratamiento" }
    });
    return response.data;
  },

  // Obtener no conformidades cerradas
  async getCerradas(): Promise<NoConformidad[]> {
    const response = await apiClient.get("/no-conformidades", {
      params: { estado: "cerrada" }
    });
    return response.data;
  },

  // Obtener no conformidades por estado
  async getByEstado(estado: string): Promise<NoConformidad[]> {
    const response = await apiClient.get("/no-conformidades", {
      params: { estado }
    });
    return response.data;
  },

  // Obtener una no conformidad por ID
  async getById(id: string): Promise<NoConformidad> {
    const response = await apiClient.get(`/no-conformidades/${id}`);
    return response.data;
  },

  // Crear nueva no conformidad
  async create(data: Partial<NoConformidad>): Promise<NoConformidad> {
    const response = await apiClient.post("/no-conformidades", data);
    return response.data;
  },

  // Actualizar no conformidad
  async update(id: string, data: Partial<NoConformidad>): Promise<NoConformidad> {
    const response = await apiClient.put(`/no-conformidades/${id}`, data);
    return response.data;
  },

  // Iniciar tratamiento de no conformidad
  // Note: Backend might not have this specific custom endpoint yet, assuming standard update or future impl
  // For now leaving as is but using PATCH if backend supports it, or generic update
  async iniciarTratamiento(id: string): Promise<NoConformidad> {
    // Check if backend has this specific endpoint or if we just update state
    // Inspecting backend api/calidad.py... it has standard Update.
    // It does NOT have /iniciar-tratamiento.
    // We should probably just update the state to "en_tratamiento"
    const response = await apiClient.put(`/no-conformidades/${id}`, { estado: "en_tratamiento" });
    return response.data;
  },

  // Cerrar no conformidad
  async cerrar(id: string, observaciones?: string): Promise<NoConformidad> {
    // Similarly, backend doesn't have /cerrar.
    // We update state to "cerrada" and maybe add closing details if schema supports it
    const response = await apiClient.put(`/no-conformidades/${id}`, {
      estado: "cerrada",
      // analisis_causa: observaciones // if we map observations to something
    });
    return response.data;
  },

  // Eliminar no conformidad
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/no-conformidades/${id}`);
  },
};
