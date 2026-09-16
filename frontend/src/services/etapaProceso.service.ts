import { apiClient } from "@/lib/api";

export type TipoEtapaProceso = "entrada" | "transformacion" | "verificacion" | "decision" | "salida";
export type EtapaPhva = "planear" | "hacer" | "verificar" | "actuar";

export interface EtapaProceso {
  id: string;
  proceso_id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  responsable_id?: string;
  tiempo_estimado?: number;
  activa: boolean;
  es_critica: boolean;
  tipo_etapa?: TipoEtapaProceso;
  etapa_phva?: EtapaPhva;
  entradas?: string;
  salidas?: string;
  controles?: string;
  criterios_aceptacion?: string;
  documentos_requeridos?: string;
  registros_requeridos?: string;
  creado_en?: string;
  actualizado_en?: string;
  responsable_nombre?: string;
  hallazgos_count?: number;
}

export interface EtapaProcesoCreate
  extends Omit<EtapaProceso, "id" | "creado_en" | "actualizado_en" | "responsable_nombre" | "hallazgos_count"> {}

export interface EtapaProcesoUpdate extends Partial<EtapaProcesoCreate> {}

export const etapaProcesoService = {
  async getByProceso(procesoId: string): Promise<EtapaProceso[]> {
    const response = await apiClient.get<EtapaProceso[]>(`/procesos/${procesoId}/etapas`);
    return response.data;
  },

  async create(data: EtapaProcesoCreate): Promise<EtapaProceso> {
    const response = await apiClient.post<EtapaProceso>("/etapas", data);
    return response.data;
  },

  async update(id: string, data: EtapaProcesoUpdate): Promise<EtapaProceso> {
    const response = await apiClient.put<EtapaProceso>(`/etapas/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/etapas/${id}`);
  },

  async reordenar(procesoId: string, orden: { id: string; orden: number }[]): Promise<void> {
    await apiClient.patch(`/procesos/${procesoId}/etapas/reordenar`, orden);
  },
};

