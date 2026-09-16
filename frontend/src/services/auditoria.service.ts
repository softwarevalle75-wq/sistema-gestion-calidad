import { API_BASE_URL as API_URL } from "@/lib/api";

export interface Auditoria {
  id: string;
  codigo: string;
  nombre?: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  alcance?: string;
  objetivo?: string;
  objetivos?: string;
  normaReferencia?: string;
  auditorLiderId?: string;
  procesoId?: string;
  creadoPor?: string;
  equipoAuditor?: string[];
  areasAuditadas?: string[];
  fechaPlanificada?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  programaId?: string;
  informeFinal?: string;
  formularioChecklistId?: string;
  formularioChecklistVersion?: number;
  auditorLider?: {
    id: string;
    nombre: string;
    primerApellido?: string;
    email?: string;
  };
  creadoPorUsuario?: {
    id: string;
    nombre: string;
    email?: string;
  };
}

export interface HallazgoAuditoria {
  id: string;
  auditoriaId: string;
  auditoria_id?: string; // Compatibilidad backend legacy (Render)
  codigo: string;
  tipo: string;
  descripcion: string;
  requisito?: string;
  clausulaIso?: string;
  gravedad?: string;
  responsableId?: string;
  estado: string;
  evidencia?: string;
  etapaProcesoId?: string;
  creadoEn?: string;
  auditoria?: Auditoria;
  responsable?: {
    id: string;
    nombre: string;
    primerApellido: string;
  };
  noConformidadId?: string;
  verificadoPor?: string;
  fechaVerificacion?: string;
  resultadoVerificacion?: string;
}

export interface ProgramaAuditoria {
  id: string;
  anio: number;
  objetivo?: string;
  estado: string;
  criterioRiesgo?: string;
  aprobadoPorId?: string;
  fechaAprobacion?: string;
  creadoEn?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeAuditoria = (raw: any): Auditoria => {
  const auditorLiderRaw = raw.auditorLider || raw.auditor_lider;
  return {
    ...raw,
    codigo: raw.codigo,
    nombre: raw.nombre,
    tipo: raw.tipo || raw.tipo_auditoria,
    estado: raw.estado,
    alcance: raw.alcance,
    objetivo: raw.objetivo,
    normaReferencia: raw.normaReferencia ?? raw.norma_referencia,
    auditorLiderId: raw.auditorLiderId ?? raw.auditor_lider_id,
    procesoId: raw.procesoId ?? raw.proceso_id,
    creadoPor: raw.creadoPor ?? raw.creado_por,
    equipoAuditor: raw.equipoAuditor ?? raw.equipo_auditor,
    fechaPlanificada: raw.fechaPlanificada ?? raw.fecha_planificada,
    fechaInicio: raw.fechaInicio ?? raw.fecha_inicio,
    fechaFin: raw.fechaFin ?? raw.fecha_fin,
    creadoEn: raw.creadoEn ?? raw.creado_en,
    actualizadoEn: raw.actualizadoEn ?? raw.actualizado_en,
    programaId: raw.programaId ?? raw.programa_id,
    informeFinal: raw.informeFinal ?? raw.informe_final,
    formularioChecklistId: raw.formularioChecklistId ?? raw.formulario_checklist_id,
    formularioChecklistVersion: raw.formularioChecklistVersion ?? raw.formulario_checklist_version,
    auditorLider: auditorLiderRaw
      ? {
        id: auditorLiderRaw.id,
        nombre: auditorLiderRaw.nombre,
        primerApellido: auditorLiderRaw.primerApellido ?? auditorLiderRaw.primer_apellido,
        email: auditorLiderRaw.email ?? auditorLiderRaw.correo_electronico,
      }
      : undefined,
  };
};

export const auditoriaService = {
  // === PROGRAMAS DE AUDITORIA ===
  async getAllProgramas(anio?: number): Promise<ProgramaAuditoria[]> {
    const params = new URLSearchParams();
    if (anio) params.append("anio", anio.toString());

    const response = await fetch(`${API_URL}/programa-auditorias?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener programas de auditoría");
    return response.json();
  },

  async getProgramaById(id: string): Promise<ProgramaAuditoria> {
    const response = await fetch(`${API_URL}/programa-auditorias/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener programa de auditoría");
    return response.json();
  },

  async createPrograma(data: Partial<ProgramaAuditoria>): Promise<ProgramaAuditoria> {
    const response = await fetch(`${API_URL}/programa-auditorias`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Error al crear programa");
    }
    return response.json();
  },

  async updatePrograma(id: string, data: Partial<ProgramaAuditoria>): Promise<ProgramaAuditoria> {
    const response = await fetch(`${API_URL}/programa-auditorias/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al actualizar programa");
    return response.json();
  },

  // === AUDITORIAS ===
  // Obtener todas las auditorías
  async getAll(filters?: { tipo?: string; estado?: string }): Promise<Auditoria[]> {
    const params = new URLSearchParams();
    if (filters?.tipo) params.append("tipo", filters.tipo);
    if (filters?.estado) params.append("estado", filters.estado);

    const url = `${API_URL}/auditorias${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener auditorías");
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeAuditoria) : [];
  },

  // Obtener auditorías planificadas
  async getPlanificadas(): Promise<Auditoria[]> {
    const response = await fetch(`${API_URL}/auditorias?estado=planificada`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener auditorías planificadas");
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeAuditoria) : [];
  },

  // Obtener auditorías en curso
  async getEnCurso(): Promise<Auditoria[]> {
    const response = await fetch(`${API_URL}/auditorias?estado=en_curso`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener auditorías en curso");
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeAuditoria) : [];
  },

  // Obtener auditorías completadas
  async getCompletadas(): Promise<Auditoria[]> {
    const response = await fetch(`${API_URL}/auditorias?estado=completada`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener auditorías completadas");
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeAuditoria) : [];
  },

  // Obtener una auditoría por ID
  async getById(id: string): Promise<Auditoria> {
    const response = await fetch(`${API_URL}/auditorias/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener auditoría");
    const data = await response.json();
    return normalizeAuditoria(data);
  },

  // Crear nueva auditoría
  async create(data: Partial<Auditoria>): Promise<Auditoria> {
    const response = await fetch(`${API_URL}/auditorias`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al crear auditoría");
    const result = await response.json();
    return normalizeAuditoria(result);
  },

  // Actualizar auditoría
  async update(id: string, data: Partial<Auditoria>): Promise<Auditoria> {
    const response = await fetch(`${API_URL}/auditorias/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al actualizar auditoría");
    const result = await response.json();
    return normalizeAuditoria(result);
  },

  // Cambiar estado de auditoría (Legacy)
  async cambiarEstado(id: string, estado: string): Promise<Auditoria> {
    const response = await fetch(`${API_URL}/auditorias/${id}/estado`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ estado }),
    });
    if (!response.ok) throw new Error("Error al cambiar estado");
    const data = await response.json();
    return normalizeAuditoria(data);
  },

  // Nuevos métodos de flujo de auditoría
  async iniciar(id: string): Promise<Auditoria> {
    const response = await fetch(`${API_URL}/auditorias/${id}/iniciar`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al iniciar auditoría");
    const data = await response.json();
    return normalizeAuditoria(data);
  },

  async finalizar(id: string): Promise<Auditoria> {
    const response = await fetch(`${API_URL}/auditorias/${id}/finalizar`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al finalizar auditoría");
    const data = await response.json();
    return normalizeAuditoria(data);
  },

  async cerrar(id: string): Promise<Auditoria> {
    const response = await fetch(`${API_URL}/auditorias/${id}/cerrar`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al cerrar auditoría");
    const data = await response.json();
    return normalizeAuditoria(data);
  },

  // Eliminar auditoría
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/auditorias/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail;
      throw new Error(
        typeof detail === "string" ? detail : "Error al eliminar auditoría"
      );
    }
  },

  // Obtener hallazgos de una auditoría
  async getHallazgos(auditoriaId: string): Promise<HallazgoAuditoria[]> {
    const response = await fetch(`${API_URL}/auditorias/${auditoriaId}/hallazgos`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener hallazgos");
    return response.json();
  },

  async getAllHallazgos(filters?: { estado?: string; tipo_hallazgo?: string }): Promise<HallazgoAuditoria[]> {
    const params = new URLSearchParams();
    if (filters?.estado) params.append("estado", filters.estado);
    if (filters?.tipo_hallazgo) params.append("tipo_hallazgo", filters.tipo_hallazgo);
    const url = `${API_URL}/hallazgos-auditoria${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Error al obtener hallazgos");
    return response.json();
  },

  // Crear hallazgo
  async createHallazgo(data: Partial<HallazgoAuditoria>): Promise<HallazgoAuditoria> {
    const response = await fetch(`${API_URL}/hallazgos-auditoria`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail
        ? (Array.isArray(errorData.detail) ? errorData.detail.map((e: any) => e.msg).join(', ') : errorData.detail)
        : "Error al crear hallazgo";
      throw new Error(errorMessage);
    }
    return response.json();
  },

  // Actualizar hallazgo
  async updateHallazgo(
    id: string,
    data: Partial<HallazgoAuditoria>
  ): Promise<HallazgoAuditoria> {
    const response = await fetch(`${API_URL}/hallazgos-auditoria/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Error al actualizar hallazgo");
    return response.json();
  },

  // Generar No Conformidad desde hallazgo
  async generarNC(hallazgoId: string): Promise<any> {
    const response = await fetch(`${API_URL}/hallazgos-auditoria/${hallazgoId}/generar-nc`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al generar No Conformidad");
    return response.json();
  },

  // Verificar Hallazgo
  async verificarHallazgo(hallazgoId: string, resultado: string): Promise<HallazgoAuditoria> {
    const response = await fetch(
      `${API_URL}/hallazgos-auditoria/${hallazgoId}/verificar?resultado=${encodeURIComponent(resultado)}`,
      {
        method: "POST",
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Error al verificar hallazgo");
    return response.json();
  },

  async downloadInforme(id: string): Promise<Blob> {
    const response = await fetch(`${API_URL}/auditorias/${id}/informe`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al descargar informe");
    return response.blob();
  },

  // Eliminar Hallazgo
  async deleteHallazgo(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/hallazgos-auditoria/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al eliminar hallazgo");
  },
};
