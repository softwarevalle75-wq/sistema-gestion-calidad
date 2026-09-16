import apiClient from "@/lib/api";

export interface Area {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  asignaciones?: {
    id: string;
    usuario_id: string;
    es_principal: boolean;
    usuario?: {
      id: string;
      documento?: number;
      nombre: string;
      segundo_nombre?: string;
      primer_apellido?: string;
      segundo_apellido?: string;
      correo_electronico?: string;
      nombre_usuario?: string;
    };
  }[];
  creado_en?: string;      // Cambiado de creadoEn a creado_en (snake_case)
  actualizado_en?: string; // Cambiado de actualizadoEn a actualizado_en
}

export const areaService = {
  // Obtener todas las áreas
  async getAll(): Promise<Area[]> {
    const response = await apiClient.get("/areas");
    return response.data;
  },

  // Obtener un área por ID
  async getById(id: string): Promise<Area> {
    const response = await apiClient.get(`/areas/${id}`);
    return response.data;
  },

  // Crear nueva área
  async create(data: Partial<Area>): Promise<Area> {
    const response = await apiClient.post("/areas", data);
    return response.data;
  },

  // Actualizar área
  async update(id: string, data: Partial<Area>): Promise<Area> {
    const response = await apiClient.put(`/areas/${id}`, data);
    return response.data;
  },

  // Eliminar área
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/areas/${id}`);
  },
};
