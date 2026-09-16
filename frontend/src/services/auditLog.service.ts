import apiClient from "@/lib/api";

export interface AuditLogEntry {
  id: string;
  tabla: string;
  registro_id: string;
  accion: string;
  usuario_id?: string | null;
  cambios_json?: Record<string, unknown> | null;
  fecha: string;
  creado_en: string;
  actualizado_en: string;
}

export interface AuditLogFilters {
  skip?: number;
  limit?: number;
  tabla?: string;
  accion?: string;
  usuario_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export const auditLogService = {
  async getAll(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
    const response = await apiClient.get("/audit-log", { params: filters || {} });
    return response.data;
  },
};
