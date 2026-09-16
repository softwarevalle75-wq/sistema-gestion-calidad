import { API_BASE_URL as API_URL } from "@/lib/api";

export interface Riesgo {
  id: string;
  proceso_id?: string;
  codigo: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  tipo_riesgo?: string;
  probabilidad?: number;
  fecha_identificacion?: string;
  fecha_revision?: string;
  impacto?: number;
  nivel_riesgo?: string;  // Cambiado a string para coincidir con backend
  nivel_residual?: number;
  causas?: string;
  consecuencias?: string;
  tratamiento?: string;
  responsable_id?: string;
  estado?: string;
  creado_en: string;
  actualizado_en?: string;
  proceso?: {
    id: string;
    nombre: string;
  };
  responsable?: {
    id: string;
    nombre: string;
    primerApellido: string;
  };
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const riesgoService = {
  // Obtener todos los riesgos
  async getAll(filters?: { proceso_id?: string; categoria?: string; nivelRiesgo?: string; estado?: string }): Promise<Riesgo[]> {
    const params = new URLSearchParams();
    if (filters?.proceso_id) params.append("proceso_id", filters.proceso_id);
    if (filters?.categoria) params.append("categoria", filters.categoria);
    if (filters?.nivelRiesgo) params.append("nivelRiesgo", filters.nivelRiesgo);
    if (filters?.estado) params.append("estado", filters.estado);

    const url = `${API_URL}/riesgos${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener riesgos");
    return response.json();
  },

  // Obtener un riesgo por ID
  async getById(id: string): Promise<Riesgo> {
    const response = await fetch(`${API_URL}/riesgos/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener riesgo");
    return response.json();
  },

  // Crear nuevo riesgo
  async create(data: Partial<Riesgo>): Promise<Riesgo> {
    const response = await fetch(`${API_URL}/riesgos`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al crear riesgo");
    return response.json();
  },

  // Actualizar riesgo
  async update(id: string, data: Partial<Riesgo>): Promise<Riesgo> {
    const response = await fetch(`${API_URL}/riesgos/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al actualizar riesgo");
    return response.json();
  },

  // Eliminar riesgo
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/riesgos/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al eliminar riesgo");
  },
};
