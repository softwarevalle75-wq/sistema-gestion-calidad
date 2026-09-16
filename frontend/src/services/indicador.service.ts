import apiClient from "@/lib/api";

export type TipoIndicador = "eficacia" | "eficiencia" | "cumplimiento";
export type EstadoIndicador = "borrador" | "pendiente_aprobacion" | "aprobado" | "rechazado" | string;

export interface UsuarioIndicador {
  id: string;
  nombre: string;
  segundoNombre?: string;
  segundo_nombre?: string;
  primerApellido?: string;
  primer_apellido?: string;
  segundoApellido?: string;
  segundo_apellido?: string;
}

export interface MedicionIndicador {
  id: string;
  indicador_id: string;
  periodo: string;
  valor: number;
  meta?: number | null;
  cumple_meta?: boolean | null;
  observaciones?: string | null;
  registrado_por?: string | null;
  creado_en: string;
  actualizado_en: string;
  registrador?: UsuarioIndicador | null;
}

export interface Indicador {
  id: string;
  proceso_id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  formula?: string;
  unidad_medida?: string;
  meta?: number;
  frecuencia_medicion: string;
  responsable_medicion_id?: string;
  tipo_indicador?: TipoIndicador | string;
  estado?: EstadoIndicador;
  activo: boolean;
  creado_por?: string;
  revisado_por?: string | null;
  fecha_revision?: string | null;
  aprobado_por?: string | null;
  fecha_aprobacion?: string | null;
  observacion_aprobacion?: string | null;
  creado_en: string;
  actualizado_en: string;
  proceso?: {
    id: string;
    codigo?: string;
    nombre: string;
  };
  responsable?: UsuarioIndicador | null;
  creador?: UsuarioIndicador | null;
  revisador?: UsuarioIndicador | null;
  aprobador?: UsuarioIndicador | null;
  ultima_medicion?: MedicionIndicador | null;
}

export interface TendenciaIndicador {
  indicador_id: string;
  total_mediciones: number;
  promedio: number;
  ultimo_valor?: number | null;
  ultimo_periodo?: string | null;
  tendencia: "subiendo" | "bajando" | "estable" | "sin_datos" | string;
}

export const indicadorService = {
  async getAll(filters?: {
    proceso_id?: string;
    activo?: boolean;
    tipo_indicador?: TipoIndicador | string;
  }): Promise<Indicador[]> {
    const response = await apiClient.get("/indicadores", {
      params: {
        proceso_id: filters?.proceso_id,
        activo: filters?.activo,
        tipo_indicador: filters?.tipo_indicador,
      },
    });
    return response.data;
  },

  async getActivos(): Promise<Indicador[]> {
    return this.getAll({ activo: true });
  },

  async getById(id: string): Promise<Indicador> {
    const response = await apiClient.get(`/indicadores/${id}`);
    return response.data;
  },

  async create(data: Partial<Indicador>): Promise<Indicador> {
    const response = await apiClient.post("/indicadores", data);
    return response.data;
  },

  async update(id: string, data: Partial<Indicador>): Promise<Indicador> {
    const response = await apiClient.put(`/indicadores/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/indicadores/${id}`);
  },

  async registrarMedicion(id: string, data: {
    periodo: string;
    valor: number;
    meta?: number;
    observaciones?: string;
  }): Promise<MedicionIndicador> {
    const response = await apiClient.post(`/indicadores/${id}/mediciones`, data);
    return response.data;
  },

  async getMediciones(id: string): Promise<MedicionIndicador[]> {
    const response = await apiClient.get(`/indicadores/${id}/mediciones`);
    return response.data;
  },

  async getTendencia(id: string): Promise<TendenciaIndicador> {
    const response = await apiClient.get(`/indicadores/${id}/tendencia`);
    return response.data;
  },

  async solicitarAprobacion(id: string): Promise<Indicador> {
    const response = await apiClient.post(`/indicadores/${id}/solicitar-aprobacion`);
    return response.data;
  },

  async aprobar(id: string, observacion?: string): Promise<Indicador> {
    const response = await apiClient.post(`/indicadores/${id}/aprobar`, { observacion: observacion || null });
    return response.data;
  },

  async rechazar(id: string, observacion: string): Promise<Indicador> {
    const response = await apiClient.post(`/indicadores/${id}/rechazar`, { observacion });
    return response.data;
  },
};
