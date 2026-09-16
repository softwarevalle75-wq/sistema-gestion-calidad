import { apiClient } from "@/lib/api";

// ==================== TIPOS ====================

export enum TipoProceso {
  ESTRATEGICO = "estrategico",
  OPERATIVO = "operativo",
  APOYO = "apoyo",
  MEDICION = "medicion"
}

export enum EtapaPHVA {
  PLANEAR = "planear",
  HACER = "hacer",
  VERIFICAR = "verificar",
  ACTUAR = "actuar"
}

export enum EstadoProceso {
  BORRADOR = "borrador",
  REVISION = "revision",
  ACTIVO = "activo",
  SUSPENDIDO = "suspendido",
  OBSOLETO = "obsoleto"
}

export interface Proceso {
  id: string;
  codigo: string;
  nombre: string;
  area_id?: string;
  objetivo?: string;
  alcance?: string;
  etapa_phva?: EtapaPHVA;
  tipo_proceso?: TipoProceso;
  responsable_id?: string;
  estado: EstadoProceso;
  version?: string;
  fecha_aprobacion?: string;
  proxima_revision?: string;
  restringido: boolean;

  // Campos ISO 9001
  entradas?: string;
  salidas?: string;
  recursos_necesarios?: string;
  criterios_desempeno?: string;
  riesgos_oportunidades?: string;

  // Metadata
  creado_por?: string;
  creado_en: string;
  actualizado_en: string;

  // Información relacionada
  area_nombre?: string;
  responsable_nombre?: string;
  total_etapas?: number;
  total_indicadores?: number;
  total_riesgos?: number;
}

export interface ProcesoCreate {
  codigo: string;
  nombre: string;
  area_id?: string;
  objetivo?: string;
  alcance?: string;
  etapa_phva?: EtapaPHVA;
  tipo_proceso?: TipoProceso;
  responsable_id?: string;
  estado?: EstadoProceso;
  version?: string;
  fecha_aprobacion?: string;
  proxima_revision?: string;
  restringido?: boolean;
  entradas?: string;
  salidas?: string;
  recursos_necesarios?: string;
  criterios_desempeno?: string;
  riesgos_oportunidades?: string;
}

export interface ProcesoUpdate extends Partial<ProcesoCreate> { }

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
  tipo_etapa?: 'entrada' | 'transformacion' | 'verificacion' | 'decision' | 'salida';
  etapa_phva?: 'planear' | 'hacer' | 'verificar' | 'actuar';
  entradas?: string;
  salidas?: string;
  controles?: string;
  criterios_aceptacion?: string;
  documentos_requeridos?: string;
  registros_requeridos?: string;
  creado_en: string;
  actualizado_en: string;
  responsable_nombre?: string;
  hallazgos_count?: number;
}

export interface ProcesoEstadisticas {
  total_procesos: number;
  por_tipo: Record<string, number>;
  por_estado: Record<string, number>;
  por_etapa_phva: Record<string, number>;
  procesos_proximos_revision: number;
  procesos_sin_responsable: number;
}

// ==================== SERVICIO ====================

class ProcesoService {
  private baseUrl = "/procesos";

  /**
   * Listar todos los procesos
   */
  async listar(params?: {
    skip?: number;
    limit?: number;
    tipo_proceso?: TipoProceso;
    estado?: EstadoProceso;
    area_id?: string;
  }): Promise<Proceso[]> {
    const response = await apiClient.get<Proceso[]>(this.baseUrl, { params });
    return response.data;
  }

  /**
   * Obtener un proceso por ID
   */
  async obtener(id: string): Promise<Proceso> {
    const response = await apiClient.get<Proceso>(`${this.baseUrl}/${id}`);
    return response.data;
  }

  /**
   * Crear un nuevo proceso
   */
  async crear(proceso: ProcesoCreate): Promise<Proceso> {
    const response = await apiClient.post<Proceso>(this.baseUrl, proceso);
    return response.data;
  }

  /**
   * Actualizar un proceso
   */
  async actualizar(id: string, proceso: ProcesoUpdate): Promise<Proceso> {
    const response = await apiClient.put<Proceso>(`${this.baseUrl}/${id}`, proceso);
    return response.data;
  }

  /**
   * Eliminar un proceso
   */
  async eliminar(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Obtener etapas de un proceso
   */
  async obtenerEtapas(procesoId: string): Promise<EtapaProceso[]> {
    const response = await apiClient.get<EtapaProceso[]>(`${this.baseUrl}/${procesoId}/etapas`);
    return response.data;
  }

  async crearEtapa(data: Omit<EtapaProceso, "id" | "creado_en" | "actualizado_en" | "responsable_nombre" | "hallazgos_count">): Promise<EtapaProceso> {
    const response = await apiClient.post<EtapaProceso>("/etapas", data);
    return response.data;
  }

  async actualizarEtapa(etapaId: string, data: Partial<Omit<EtapaProceso, "id" | "creado_en" | "actualizado_en" | "responsable_nombre" | "hallazgos_count">>): Promise<EtapaProceso> {
    const response = await apiClient.put<EtapaProceso>(`/etapas/${etapaId}`, data);
    return response.data;
  }

  async eliminarEtapa(etapaId: string): Promise<void> {
    await apiClient.delete(`/etapas/${etapaId}`);
  }

  async reordenarEtapas(procesoId: string, orden: { id: string; orden: number }[]): Promise<void> {
    await apiClient.patch(`${this.baseUrl}/${procesoId}/etapas/reordenar`, orden);
  }

  /**
   * Obtener estadísticas de procesos
   */
  async obtenerEstadisticas(): Promise<ProcesoEstadisticas> {
    const response = await apiClient.get<ProcesoEstadisticas>(`${this.baseUrl}/estadisticas`);
    return response.data;
  }

  /**
   * Obtener mapa de procesos (agrupados por tipo)
   */
  async obtenerMapaProcesos(): Promise<Record<string, Proceso[]>> {
    const procesos = await this.listar();

    const mapa: Record<string, Proceso[]> = {
      estrategico: [],
      operativo: [],
      apoyo: [],
      medicion: []
    };

    procesos.forEach(proceso => {
      const tipo = proceso.tipo_proceso || 'operativo';
      if (mapa[tipo]) {
        mapa[tipo].push(proceso);
      }
    });

    return mapa;
  }
}

export const procesoService = new ProcesoService();
export default procesoService;
