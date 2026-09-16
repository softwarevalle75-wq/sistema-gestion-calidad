import apiClient from "@/lib/api";

export interface Usuario {
  id: string;
  documento: number;
  nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  correo_electronico: string;
  nombre_usuario: string;
  area_id?: string;
  activo: boolean;
  foto_url?: string;
  area?: {
    id: string;
    codigo: string;
    nombre: string;
    descripcion?: string;
  };
  roles?: Array<{
    id?: string;
    rol_id?: string;
    rol?: {
      id: string;
      nombre: string;
      clave: string;
      descripcion?: string;
    };
  }>;
  permisos?: string[];
  requiere_otp?: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface UsuariosListResponse {
  usuarios: Usuario[];
  total?: number;
  page?: number;
  totalPages?: number;
}

class UsuarioService {
  async getAll(params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
  }): Promise<Usuario[]> {
    const queryParams = new URLSearchParams();

    if (params?.skip) queryParams.append("skip", params.skip.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.activo !== undefined)
      queryParams.append("activo", params.activo.toString());

    const response = await apiClient.get<Usuario[]>(
      `/usuarios?${queryParams.toString()}`
    );

    return response.data;
  }

  async getById(id: string): Promise<Usuario> {
    const response = await apiClient.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  }

  async create(userData: Partial<Usuario> & { password: string }): Promise<Usuario> {
    const response = await apiClient.post<Usuario>("/usuarios", userData);
    return response.data;
  }

  async update(id: string, userData: Partial<Usuario>): Promise<Usuario> {
    const response = await apiClient.put<Usuario>(`/usuarios/${id}`, userData);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/usuarios/${id}`);
  }

  /**
   * Obtiene todos los usuarios activos para selects
   */
  async getAllActive(): Promise<Usuario[]> {
    console.log("🔍 getAllActive - calling getAll...");
    const response = await this.getAll({ activo: true, limit: 1000 });
    console.log("✅ getAllActive - response:", response);

    return Array.isArray(response) ? response : [];
  }
}

export const usuarioService = new UsuarioService();
