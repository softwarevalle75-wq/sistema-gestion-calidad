import { API_BASE_URL as API_URL } from "@/lib/api";

export interface Capacitacion {
  id: string;                      // UUID from backend
  codigo: string;                  // Required, unique identifier
  nombre: string;                  // Required, training name
  descripcion?: string;
  tipoCapacitacion: string;        // interna, externa, online
  modalidad: string;               // Virtual, Presencial
  duracionHoras?: number;          // Duration in hours
  instructor?: string;
  fechaProgramada?: string;        // ISO date string
  fechaInicio?: string;
  fechaFin?: string;
  fechaCierreAsistencia?: string;
  fechaRealizacion?: string;       // ISO date string
  lugar?: string;
  estado: "programada" | "en_curso" | "completada" | "cancelada";
  objetivo?: string;
  contenido?: string;
  areaId?: string;
  aplicaTodasAreas?: boolean;
  usuariosConvocadosIds?: string[];
  responsableId?: string;          // UUID
  procesoId?: string;
  relacionadaConHallazgoId?: string;
  relacionadaConRiesgoId?: string;
  archivoEvidencia?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  // Populated from relations
  responsable?: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string;
    email: string;
  };
}

export interface AsistenciaCapacitacion {
  id: string;
  capacitacionId: string;
  usuarioId: string;
  asistio: boolean;
  observaciones?: string;
  calificacion?: number;
  fechaAsistencia?: string;
  evaluacionAprobada?: boolean;
  capacitacion?: Capacitacion;
  usuario?: {
    nombre: string;
    primerApellido: string;
  };
}

export interface ResumenAsistenciaCapacitacion {
  capacitacion_id: string;
  total_participantes: number;
  asistieron: number;
  no_asistieron: number;
  porcentaje_asistencia: number;
  evaluados: number;
  evaluacion_aprobada: number;
  porcentaje_aprobacion: number;
}

export interface UsuarioSinCapacitacionObligatoria {
  usuario_id: string;
  nombre: string;
  primer_apellido: string;
  capacitaciones_obligatorias_pendientes: number;
  capacitaciones_ids: string[];
}

export interface ReporteCapacitacionAuditoria {
  total_capacitaciones: number;
  capacitaciones_programadas: number;
  capacitaciones_ejecutadas: number;
  total_registros_asistencia: number;
  porcentaje_asistencia_promedio: number;
  capacitaciones_sin_evidencia: number;
  capacitaciones_obligatorias_sin_cobertura: number;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 15000, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Por favor verifique su conexión o intente nuevamente.');
    }
    throw error;
  }
};

export const capacitacionService = {
  // Helper para convertir de Backend (snake_case) a Frontend (camelCase)
  mapToFrontend(data: any): Capacitacion {
    return {
      ...data,
      tipoCapacitacion: data.tipo_capacitacion,
      duracionHoras: data.duracion_horas,
      fechaProgramada: data.fecha_programada,
      fechaInicio: data.fecha_inicio,
      fechaFin: data.fecha_fin,
      fechaCierreAsistencia: data.fecha_cierre_asistencia,
      fechaRealizacion: data.fecha_realizacion,
      creadoEn: data.creado_en,
      actualizadoEn: data.actualizado_en,
      areaId: data.area_id,
      aplicaTodasAreas: data.aplica_todas_areas,
      responsableId: data.responsable_id,
      procesoId: data.proceso_id,
      relacionadaConHallazgoId: data.relacionada_con_hallazgo_id,
      relacionadaConRiesgoId: data.relacionada_con_riesgo_id,
      archivoEvidencia: data.archivo_evidencia,
    };
  },

  // Helper para convertir de Frontend (camelCase) a Backend (snake_case)
  mapToBackend(data: Partial<Capacitacion>): any {
    const mapped: any = { ...data };

    if (data.tipoCapacitacion) mapped.tipo_capacitacion = data.tipoCapacitacion;
    if (data.duracionHoras) mapped.duracion_horas = Number(data.duracionHoras);

    // Ensure dates are compatible with PostgreSQL DateTime (ISO 8601)
    if (data.fechaProgramada) {
      // If it's just a date YYYY-MM-DD, append time to make it a valid ISO datetime
      mapped.fecha_programada = data.fechaProgramada.includes('T')
        ? data.fechaProgramada
        : `${data.fechaProgramada}T09:00:00`;
    }

    if (data.fechaRealizacion) {
      mapped.fecha_realizacion = data.fechaRealizacion.includes('T')
        ? data.fechaRealizacion
        : `${data.fechaRealizacion}T09:00:00`;
    }

    if (data.fechaInicio) mapped.fecha_inicio = data.fechaInicio;
    if (data.fechaFin) mapped.fecha_fin = data.fechaFin;
    if (data.fechaCierreAsistencia) mapped.fecha_cierre_asistencia = data.fechaCierreAsistencia;

    if (data.areaId) mapped.area_id = data.areaId;
    if (data.aplicaTodasAreas !== undefined) mapped.aplica_todas_areas = data.aplicaTodasAreas;
    if (data.usuariosConvocadosIds) mapped.usuarios_convocados_ids = data.usuariosConvocadosIds;
    if (data.responsableId) mapped.responsable_id = data.responsableId;
    if (data.procesoId) mapped.proceso_id = data.procesoId;
    if (data.relacionadaConHallazgoId) mapped.relacionada_con_hallazgo_id = data.relacionadaConHallazgoId;
    if (data.relacionadaConRiesgoId) mapped.relacionada_con_riesgo_id = data.relacionadaConRiesgoId;
    if (data.archivoEvidencia) mapped.archivo_evidencia = data.archivoEvidencia;

    // Limpiar claves camelCase para no enviarlas extra
    delete mapped.tipoCapacitacion;
    delete mapped.duracionHoras;
    delete mapped.fechaProgramada;
    delete mapped.fechaInicio;
    delete mapped.fechaFin;
    delete mapped.fechaCierreAsistencia;
    delete mapped.fechaRealizacion;
    delete mapped.areaId;
    delete mapped.aplicaTodasAreas;
    delete mapped.usuariosConvocadosIds;
    delete mapped.responsableId;
    delete mapped.procesoId;
    delete mapped.relacionadaConHallazgoId;
    delete mapped.relacionadaConRiesgoId;
    delete mapped.archivoEvidencia;
    delete mapped.creadoEn;
    delete mapped.actualizadoEn;
    delete mapped.responsable; // Si existe
    delete mapped.asistencias; // Don't send relations back

    return mapped;
  },

  mapAsistenciaToFrontend(data: any): AsistenciaCapacitacion {
    return {
      ...data,
      capacitacionId: data.capacitacion_id ?? data.capacitacionId,
      usuarioId: data.usuario_id ?? data.usuarioId,
      fechaAsistencia: data.fecha_asistencia ?? data.fechaAsistencia,
      evaluacionAprobada: data.evaluacion_aprobada ?? data.evaluacionAprobada,
    };
  },

  mapAsistenciaToBackend(data: Partial<AsistenciaCapacitacion>): any {
    const mapped: any = { ...data };
    if (data.capacitacionId) mapped.capacitacion_id = data.capacitacionId;
    if (data.usuarioId) mapped.usuario_id = data.usuarioId;
    if (data.fechaAsistencia) mapped.fecha_asistencia = data.fechaAsistencia;
    if (data.evaluacionAprobada !== undefined) mapped.evaluacion_aprobada = data.evaluacionAprobada;

    delete mapped.capacitacionId;
    delete mapped.usuarioId;
    delete mapped.fechaAsistencia;
    delete mapped.evaluacionAprobada;
    return mapped;
  },

  // Obtener todas las capacitaciones
  async getAll(): Promise<Capacitacion[]> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener capacitaciones");
    const data = await response.json();
    return data.map((item: any) => this.mapToFrontend(item));
  },

  // Obtener capacitaciones programadas (pendientes)
  async getProgramadas(): Promise<Capacitacion[]> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener capacitaciones programadas");
    const data = await response.json();
    const mapped = data.map((item: any) => this.mapToFrontend(item));
    return mapped.filter((cap: Capacitacion) => cap.estado !== "cancelada");
  },

  // Obtener historial de capacitaciones (completadas)
  async getHistorial(): Promise<Capacitacion[]> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones?estado=completada`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener historial");
    const data = await response.json();
    return data.map((item: any) => this.mapToFrontend(item));
  },

  // Obtener una capacitación por ID
  async getById(id: string): Promise<Capacitacion> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener capacitación");
    const data = await response.json();
    return this.mapToFrontend(data);
  },

  // Crear nueva capacitación
  async create(data: Partial<Capacitacion>): Promise<Capacitacion> {
    const payload = this.mapToBackend(data);
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Handle FastAPI validation error array
      if (Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map((err: any) => `${err.loc[1] || 'Field'}: ${err.msg}`).join(', ');
        throw new Error(messages);
      }
      throw new Error(errorData.detail || "Error al crear capacitación");
    }

    const responseData = await response.json();
    return this.mapToFrontend(responseData);
  },

  // Actualizar capacitación
  async update(id: string, data: Partial<Capacitacion>): Promise<Capacitacion> {
    const payload = this.mapToBackend(data);
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Handle FastAPI validation error array
      if (Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map((err: any) => `${err.loc[1] || 'Field'}: ${err.msg}`).join(', ');
        throw new Error(messages);
      }
      throw new Error(errorData.detail || "Error al actualizar capacitación");
    }

    const responseData = await response.json();
    return this.mapToFrontend(responseData);
  },

  // Marcar como completada
  async iniciarCapacitacion(id: string): Promise<Capacitacion> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/${id}/iniciar`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al iniciar capacitación");
    const data = await response.json();
    return this.mapToFrontend(data);
  },

  async finalizarCapacitacion(id: string): Promise<Capacitacion> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/${id}/finalizar`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al finalizar capacitación");
    const data = await response.json();
    return this.mapToFrontend(data);
  },

  async marcarMiAsistencia(id: string): Promise<AsistenciaCapacitacion> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/${id}/marcar-mi-asistencia`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Error al marcar asistencia");
    }
    const data = await response.json();
    return this.mapAsistenciaToFrontend(data);
  },

  // Eliminar capacitación
  async delete(id: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al eliminar capacitación");
  },

  // Obtener asistencias de una capacitación
  async getAsistencias(capacitacionId: string): Promise<AsistenciaCapacitacion[]> {
    const response = await fetchWithTimeout(
      `${API_URL}/capacitaciones/${capacitacionId}/asistencias`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Error al obtener asistencias");
    const data = await response.json();
    return (Array.isArray(data) ? data : []).map((item: any) => this.mapAsistenciaToFrontend(item));
  },

  // Registrar asistencia
  async registrarAsistencia(
    data: Partial<AsistenciaCapacitacion>
  ): Promise<AsistenciaCapacitacion> {
    const payload = this.mapAsistenciaToBackend(data);
    const response = await fetchWithTimeout(`${API_URL}/asistencias-capacitacion`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Error al registrar asistencia");
    const responseData = await response.json();
    return this.mapAsistenciaToFrontend(responseData);
  },

  async actualizarAsistencia(
    asistenciaId: string,
    data: Partial<AsistenciaCapacitacion>
  ): Promise<AsistenciaCapacitacion> {
    const payload = this.mapAsistenciaToBackend(data);
    const response = await fetchWithTimeout(`${API_URL}/asistencias-capacitacion/${asistenciaId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Error al actualizar asistencia");
    const responseData = await response.json();
    return this.mapAsistenciaToFrontend(responseData);
  },

  async getResumenAsistencia(capacitacionId: string): Promise<ResumenAsistenciaCapacitacion> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/${capacitacionId}/resumen-asistencia`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener resumen de asistencia");
    return response.json();
  },

  async getReporteAuditoria(): Promise<ReporteCapacitacionAuditoria> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones/reportes/auditoria`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener reporte de auditoría de capacitación");
    return response.json();
  },

  async getUsuariosPendientesObligatoria(): Promise<UsuarioSinCapacitacionObligatoria[]> {
    const response = await fetchWithTimeout(`${API_URL}/capacitaciones-obligatorias/usuarios-pendientes`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Error al obtener usuarios pendientes de capacitación obligatoria");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },
};
