import { apiClient } from "@/lib/api";

export interface DocumentoData {
  codigo?: string;
  nombre: string;
  descripcion?: string;
  tipo_documento: string;
  ruta_archivo?: string;
  version_actual?: string;
  estado?: string;
  fecha_aprobacion?: string;
  fecha_vigencia?: string;
  creado_por?: string;
  aprobado_por?: string;
  revisado_por?: string;
}

export interface UsuarioNested {
  id: string;
  documento?: number;
  nombre: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  correoElectronico?: string;
  nombreUsuario?: string;
}

export interface DocumentoResponse {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_documento: string;
  ruta_archivo?: string;
  version_actual: string;
  estado: string;
  fecha_aprobacion?: string;
  fecha_vigencia?: string;
  creado_por?: string;  // UUID
  aprobado_por?: string;  // UUID
  revisado_por?: string;  // UUID
  creador?: UsuarioNested;  // Objeto usuario completo
  aprobador?: UsuarioNested;  // Objeto usuario completo
  revisor?: UsuarioNested;  // Objeto usuario completo
  versiones?: Array<{
    id: string;
    version: string;
    descripcion_cambios?: string;
    ruta_archivo?: string;
    creado_en: string;
    creador?: UsuarioNested;
  }>;
  creado_en: string;
  actualizado_en: string;
}

class DocumentoService {
  async create(data: DocumentoData): Promise<DocumentoResponse> {
    const response = await apiClient.post("/documentos", data);
    return response.data;
  }

  async getAll(params?: Record<string, string>): Promise<DocumentoResponse[]> {
    const response = await apiClient.get("/documentos", { params: { limit: "1000", ...params } });
    return response.data;
  }

  async getProcesosDeDocumento(documentoId: string): Promise<{ proceso_id: string }[]> {
    const response = await apiClient.get(`/documentos/${documentoId}/procesos`);
    return response.data;
  }

  async getByProceso(procesoId: string): Promise<DocumentoResponse[]> {
    const docs = await this.getAll();
    const relaciones = await Promise.all(
      docs.map(async (doc) => {
        try {
          const procesos = await this.getProcesosDeDocumento(doc.id);
          const pertenece = procesos.some((p) => p.proceso_id === procesoId);
          return pertenece ? doc : null;
        } catch {
          return null;
        }
      })
    );
    return relaciones.filter((d): d is DocumentoResponse => d !== null);
  }

  async asociarDocumentoProceso(data: {
    documento_id: string;
    proceso_id: string;
    tipo_relacion?: string;
  }): Promise<void> {
    await apiClient.post("/documentos-procesos", {
      documento_id: data.documento_id,
      proceso_id: data.proceso_id,
      tipo_relacion: data.tipo_relacion || "asociado",
    });
  }

  async getById(id: string): Promise<DocumentoResponse> {
    const response = await apiClient.get(`/documentos/${id}`);
    return response.data;
  }

  async update(id: string, data: Partial<DocumentoData>): Promise<DocumentoResponse> {
    const response = await apiClient.put(`/documentos/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/documentos/${id}`);
  }

  async getVersiones(documentoId: string): Promise<any[]> {
    const response = await apiClient.get(`/documentos/${documentoId}/versiones`);
    return response.data;
  }

  async createVersion(data: {
    documento_id: string;
    version: string;
    descripcion_cambios?: string;
    creado_por?: string;
  }): Promise<any> {
    const response = await apiClient.post('/versiones-documentos', data);
    return response.data;
  }
}

export const documentoService = new DocumentoService();
