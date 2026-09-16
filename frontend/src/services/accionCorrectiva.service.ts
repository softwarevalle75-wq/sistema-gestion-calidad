import { apiClient } from "@/lib/api";

export interface AccionCorrectiva {
  id: string;
  noConformidadId: string;
  codigo: string;
  tipo: string;
  descripcion: string;
  analisisCausaRaiz: string;
  planAccion: string;
  responsableId?: string;
  fechaCompromiso?: string;
  fechaImplementacion?: string;
  implementadoPor?: string;
  estado: string;
  eficaciaVerificada?: number;
  verificadoPor?: string;
  fechaVerificacion?: string;
  observacion?: string;
  evidencias?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  creado_en?: string;
  actualizado_en?: string;
  responsable?: {
    id: string;
    documento?: number;
    nombre: string;
    primerApellido?: string;
    segundoApellido?: string;
    correoElectronico?: string;
  };
  implementador?: {
    id: string;
    documento?: number;
    nombre: string;
    primerApellido?: string;
  };
  verificador?: {
    id: string;
    documento?: number;
    nombre: string;
    primerApellido?: string;
  };
  comentarios?: ComentarioAccion[];
}

export interface ComentarioAccion {
  id: string;
  accionCorrectivaId?: string;
  accion_correctiva_id?: string;
  usuarioId?: string;
  usuario_id?: string;
  comentario: string;
  creadoEn: string;
  creado_en?: string;
  usuario?: {
    id: string;
    nombre: string;
    primerApellido?: string;
  };
}

const normalizeComentario = (raw: any): ComentarioAccion => ({
  ...raw,
  accionCorrectivaId: raw.accionCorrectivaId ?? raw.accion_correctiva_id,
  usuarioId: raw.usuarioId ?? raw.usuario_id,
  creadoEn: raw.creadoEn ?? raw.creado_en,
});

const normalizeAccion = (raw: any): AccionCorrectiva => ({
  ...raw,
  noConformidadId: raw.noConformidadId ?? raw.no_conformidad_id,
  analisisCausaRaiz: raw.analisisCausaRaiz ?? raw.analisis_causa_raiz,
  planAccion: raw.planAccion ?? raw.plan_accion,
  responsableId: raw.responsableId ?? raw.responsable_id,
  fechaCompromiso: raw.fechaCompromiso ?? raw.fecha_compromiso,
  fechaImplementacion: raw.fechaImplementacion ?? raw.fecha_implementacion,
  implementadoPor: raw.implementadoPor ?? raw.implementado_por,
  eficaciaVerificada: raw.eficaciaVerificada ?? raw.eficacia_verificada,
  verificadoPor: raw.verificadoPor ?? raw.verificado_por,
  fechaVerificacion: raw.fechaVerificacion ?? raw.fecha_verificacion,
  creadoEn: raw.creadoEn ?? raw.creado_en,
  actualizadoEn: raw.actualizadoEn ?? raw.actualizado_en,
  comentarios: Array.isArray(raw.comentarios)
    ? raw.comentarios.map(normalizeComentario)
    : [],
});

export const accionCorrectivaService = {
  async getAll(params?: {
    noConformidadId?: string;
    estado?: string;
    skip?: number;
    limit?: number;
  }): Promise<AccionCorrectiva[]> {
    const response = await apiClient.get("/acciones-correctivas", {
      params: {
        no_conformidad_id: params?.noConformidadId,
        estado: params?.estado,
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 1000,
      },
    });
    return Array.isArray(response.data) ? response.data.map(normalizeAccion) : [];
  },

  async getByNoConformidad(noConformidadId: string): Promise<AccionCorrectiva[]> {
    return this.getAll({ noConformidadId });
  },

  async getEnProceso(): Promise<AccionCorrectiva[]> {
    const estados = ["pendiente", "en_proceso", "en_ejecucion", "implementada"];
    const data = await Promise.all(estados.map((estado) => this.getAll({ estado })));
    return data.flat();
  },

  async getVerificadas(): Promise<AccionCorrectiva[]> {
    return this.getAll({ estado: "verificada" });
  },

  async getCerradas(): Promise<AccionCorrectiva[]> {
    return this.getAll({ estado: "cerrada" });
  },

  async getById(id: string): Promise<AccionCorrectiva> {
    const response = await apiClient.get(`/acciones-correctivas/${id}`);
    return normalizeAccion(response.data);
  },

  async create(data: Partial<AccionCorrectiva>): Promise<AccionCorrectiva> {
    const response = await apiClient.post("/acciones-correctivas", data);
    return normalizeAccion(response.data);
  },

  async update(id: string, data: Partial<AccionCorrectiva>): Promise<AccionCorrectiva> {
    const response = await apiClient.put(`/acciones-correctivas/${id}`, data);
    return normalizeAccion(response.data);
  },

  async implementar(
    id: string,
    data: { fecha_implementacion?: string; fechaImplementacion?: string; observacion?: string; evidencias?: string }
  ): Promise<AccionCorrectiva> {
    const response = await apiClient.patch(`/acciones-correctivas/${id}/implementar`, data);
    return normalizeAccion(response.data);
  },

  async verificar(
    id: string,
    data: { eficaciaVerificada?: number; observaciones?: string } | string
  ): Promise<AccionCorrectiva> {
    const payload =
      typeof data === "string"
        ? { observaciones: data }
        : data;
    const response = await apiClient.patch(`/acciones-correctivas/${id}/verificar`, payload);
    return normalizeAccion(response.data);
  },

  async cambiarEstado(id: string, estado: string): Promise<AccionCorrectiva> {
    const response = await apiClient.patch(`/acciones-correctivas/${id}/estado`, { estado });
    return normalizeAccion(response.data);
  },

  async createComentario(accionId: string, comentario: string): Promise<ComentarioAccion> {
    const response = await apiClient.post(`/acciones-correctivas/${accionId}/comentarios`, { comentario });
    return normalizeComentario(response.data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/acciones-correctivas/${id}`);
  },
};

