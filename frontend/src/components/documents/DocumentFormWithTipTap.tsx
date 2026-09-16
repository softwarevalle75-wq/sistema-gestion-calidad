import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { TipTapEditor } from "./TipTapEditor";
import { FileUpload } from "./FileUpload";
import { DocumentoSGCPaper } from "./DocumentoSGCPaper";
import { usuarioService, Usuario } from "@/services/usuario.service";
import { toast } from "sonner";
import { Save, Eye, FileText, Upload as UploadIcon, Edit, AlertCircle } from "lucide-react";
import { BotonesImpresionDocumentoSGC } from "@/components/documents/BotonesImpresionDocumentoSGC";
import {
  cargarMarcaSGC,
  datosSGCDesdeDocumento,
  exportarDocumentoSGC,
  type MarcaSGC,
} from "@/utils/documentoSGC";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";
import { usuarioTienePermiso } from "@/lib/permissions";

interface InitialData {
  nombreArchivo?: string;
  tipoDocumento?: string;
  codigoDocumento?: string;
  version?: string;
  visibilidad?: string;
  estado?: string;
  proximaRevision?: string;
  subidoPor?: string;
  revisadoPor?: string;
  aprobadoPor?: string;
  contenidoHtml?: string;
  rutaArchivo?: string;
}

interface DocumentFormWithTipTapProps {
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  initialData?: InitialData;
  mode: "create" | "edit";
}

export const DocumentFormWithTipTap = ({
  onSubmit,
  onCancel,
  initialData,
  mode,
}: DocumentFormWithTipTapProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [marca, setMarca] = useState<MarcaSGC>({
    logoUrl: null,
    titulo: "Universitaria de Colombia",
    subtitulo: "Sistema de Gestión de Calidad",
  });

  // Document creation mode: 'editor' or 'upload'
  const [documentMode, setDocumentMode] = useState<'editor' | 'upload'>(
    initialData?.rutaArchivo ? 'upload' : 'editor'
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nombreArchivo: initialData?.nombreArchivo || "",
    tipoDocumento: initialData?.tipoDocumento || "formato",
    codigoDocumento: initialData?.codigoDocumento || "",
    version: initialData?.version || "1.0",
    visibilidad: initialData?.visibilidad || "privado",
    estado: initialData?.estado || "borrador",
    proximaRevision: initialData?.proximaRevision || "",
    subidoPor: initialData?.subidoPor || user?.id || "",
    revisadoPor: initialData?.revisadoPor || "",
    aprobadoPor: initialData?.aprobadoPor || "",
  });
  const [content, setContent] = useState(initialData?.contenidoHtml || "");

  const revisores = usuarios.filter((usuario) => usuarioTienePermiso(usuario, ["documentos.revisar"]));
  const aprobadores = usuarios.filter((usuario) => usuarioTienePermiso(usuario, ["documentos.aprobar"]));
  const revisoresOpciones = formData.revisadoPor && !revisores.some((u) => u.id === formData.revisadoPor)
    ? [...revisores, ...usuarios.filter((u) => u.id === formData.revisadoPor)]
    : revisores;
  const aprobadoresOpciones = formData.aprobadoPor && !aprobadores.some((u) => u.id === formData.aprobadoPor)
    ? [...aprobadores, ...usuarios.filter((u) => u.id === formData.aprobadoPor)]
    : aprobadores;

  const codigoAutomatico = useCodigoAutomatico(
    "documento",
    mode === "create",
    { tipo: formData.tipoDocumento },
  );

  useEffect(() => {
    if (mode === "create" && codigoAutomatico) {
      setFormData((prev) => ({ ...prev, codigoDocumento: codigoAutomatico }));
    }
  }, [codigoAutomatico, mode]);

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        nombreArchivo: initialData.nombreArchivo || "",
        tipoDocumento: initialData.tipoDocumento || "formato",
        codigoDocumento: initialData.codigoDocumento || "",
        version: initialData.version || "1.0",
        visibilidad: initialData.visibilidad || "privado",
        estado: initialData.estado || "borrador",
        proximaRevision: initialData.proximaRevision || "",
        subidoPor: initialData.subidoPor || user?.id || "",
        revisadoPor: initialData.revisadoPor || "",
        aprobadoPor: initialData.aprobadoPor || "",
      });
      if (initialData.contenidoHtml) {
        setContent(initialData.contenidoHtml);
      }
      if (initialData.rutaArchivo) {
        setDocumentMode('upload');
      }
    }
  }, [initialData, user?.id]);

  // Cargar usuarios activos
  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const usuarios = await usuarioService.getAllActive();
        setUsuarios(usuarios);
      } catch (error) {
        console.error("❌ Error al cargar usuarios:", error);
        toast.error("Error al cargar la lista de usuarios");
      }
    };
    fetchUsuarios();
  }, []);

  useEffect(() => {
    cargarMarcaSGC().then(setMarca);
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombreArchivo.trim()) {
      newErrors.nombreArchivo = "El nombre del archivo es requerido";
    }
    if (mode !== "create" && !formData.codigoDocumento.trim()) {
      newErrors.codigoDocumento = "El código del documento es requerido";
    }
    if (!formData.version.trim()) {
      newErrors.version = "La versión es requerida";
    }
    if (!formData.subidoPor) {
      newErrors.subidoPor = "Debe seleccionar quien creó el documento";
    }

    // Validate content based on mode
    if (documentMode === 'editor') {
      if (!content.trim() || content === "<p></p>") {
        newErrors.content = "El contenido del documento es requerido";
      }
    } else if (documentMode === 'upload') {
      if (!uploadedFile && !(mode === "edit" && initialData?.rutaArchivo)) {
        newErrors.file = "Debe seleccionar un archivo para subir";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Lógica de permisos
  const isCreator = user?.id === formData.subidoPor;
  const isReviewer = user?.id === formData.revisadoPor;
  const isApprover = user?.id === formData.aprobadoPor;

  // En modo creación, todo es editable. En edición, depende del rol.
  const canEditMetadata = mode === 'create' || isCreator;
  const canEditContent = mode === 'create' || isCreator || isReviewer;
  const canAssign = mode === 'create' || isCreator;
  const canchangeStatus = mode === 'create' || isCreator; // Permitir al creador cambiar estado (ej. enviar a revisión)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Crear FormData para enviar al backend
      const data = new FormData();
      if (formData.codigoDocumento.trim()) {
        data.append("codigo", formData.codigoDocumento);
        data.append("codigoDocumento", formData.codigoDocumento);
      }
      data.append("nombre", formData.nombreArchivo);
      data.append("descripcion", documentMode === "editor" ? content : `Documento ${formData.nombreArchivo}`);
      data.append("nombreArchivo", formData.nombreArchivo);
      data.append("tipo_documento", formData.tipoDocumento);
      data.append("version_actual", formData.version);
      data.append("visibilidad", formData.visibilidad);
      data.append("estado", formData.estado);

      // En edición, no enviar subidoPor si no se ha cambiado (aunque esté deshabilitado)
      if (formData.subidoPor) data.append("creado_por", formData.subidoPor);

      // Add content based on mode
      if (documentMode === 'editor') {
        data.append("contenidoHtml", content); // Verificar si backend espera esto o 'ruta_archivo'
      } else if (documentMode === 'upload' && uploadedFile) {
        data.append("archivo", uploadedFile);
      }

      if (formData.proximaRevision) {
        data.append("proxima_revision", formData.proximaRevision);
      }
      if (formData.revisadoPor) {
        data.append("revisado_por", formData.revisadoPor);
      }
      if (formData.aprobadoPor) {
        data.append("aprobado_por", formData.aprobadoPor);
      }

      await onSubmit(data);
    } catch (error) {
      console.error("Error al enviar formulario:", error);
    } finally {
      setLoading(false);
    }
  };

  const datosVistaSGC = () =>
    datosSGCDesdeDocumento({
      nombre: formData.nombreArchivo || "Documento sin título",
      codigo: formData.codigoDocumento,
      version_actual: formData.version,
      tipo_documento: formData.tipoDocumento,
      estado: formData.estado,
      descripcion: content,
      creado_en: new Date().toISOString(),
      fecha_vigencia: formData.proximaRevision || undefined,
      creador: usuarios.find((item) => item.id === formData.subidoPor),
      revisor: usuarios.find((item) => item.id === formData.revisadoPor),
      aprobador: usuarios.find((item) => item.id === formData.aprobadoPor),
    });

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      await exportarDocumentoSGC(datosVistaSGC(), marca);
      toast.success("Se abrió la vista de impresión. Elija Guardar como PDF y desactive encabezados y pies de página.");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.error(
        error instanceof Error ? error.message : "No se pudo generar el PDF del documento",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Información del Documento */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Información del Documento</h3>
        </div>

        {/* Nota sobre flujo de aprobación */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Flujo de aprobación:</strong> El documento debe pasar por 3
            etapas: 1️⃣ Creación (Borrador) → 2️⃣ Revisión (En Revisión) → 3️⃣
            Aprobación Final (Aprobado)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Nombre del Archivo */}
          <div className="col-span-3">
            <label className="block text-sm font-medium mb-2">
              Nombre del Documento *
            </label>
            <input
              type="text"
              name="nombreArchivo"
              value={formData.nombreArchivo}
              onChange={handleInputChange}
              disabled={!canEditMetadata}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.nombreArchivo ? "border-destructive" : "border-input"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              placeholder="Ej: Formato de Solicitud de Equipos"
            />
            {errors.nombreArchivo && (
              <p className="text-destructive text-sm mt-1">
                {errors.nombreArchivo}
              </p>
            )}
          </div>

          {/* Código del Documento */}
          <CampoCodigoAutomatico
            native
            label="Código del Documento"
            value={formData.codigoDocumento}
          />

          {/* Versión */}
          <div>
            <label className="block text-sm font-medium mb-2">Versión *</label>
            <input
              type="text"
              name="version"
              value={formData.version}
              onChange={handleInputChange}
              disabled={!canEditMetadata}
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.version ? "border-destructive" : "border-input"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              placeholder="Ej: 1.0"
            />
            {errors.version && (
              <p className="text-destructive text-sm mt-1">{errors.version}</p>
            )}
          </div>

          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de Documento *
            </label>
            <select
              name="tipoDocumento"
              value={formData.tipoDocumento}
              onChange={handleInputChange}
              disabled={!canEditMetadata}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="formato">Formato</option>
              <option value="proceso">Proceso</option>
              <option value="procedimiento">Procedimiento</option>
              <option value="instructivo">Instructivo</option>
              <option value="manual">Manual</option>
              <option value="politica">Política</option>
              <option value="registro">Registro</option>
              <option value="plan">Plan</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium mb-2">Estado *</label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              disabled={!canchangeStatus}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="borrador">Borrador (Creado)</option>
              <option value="en_revision">En Revisión</option>
              <option value="pendiente_aprobacion">Pendiente de Aprobación</option>
              <option value="aprobado">Aprobado (Final)</option>
              <option value="obsoleto">Obsoleto</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {formData.estado === "borrador" && "📝 Documento en creación"}
              {formData.estado === "en_revision" && "👁️ Documento siendo revisado"}
              {formData.estado === "pendiente_aprobacion" && "⏳ Documento esperando aprobación final"}
              {formData.estado === "aprobado" && "✅ Documento vigente"}
              {formData.estado === "obsoleto" && "❌ Documento descontinuado"}
            </p>
          </div>

          {/* Visibilidad */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Visibilidad *
            </label>
            <select
              name="visibilidad"
              value={formData.visibilidad}
              onChange={handleInputChange}
              disabled={!canEditMetadata}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="privado">Privado</option>
              <option value="publico">Público</option>
            </select>
          </div>

          {/* Próxima Revisión */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Próxima Revisión
            </label>
            <input
              type="date"
              name="proximaRevision"
              value={formData.proximaRevision}
              onChange={handleInputChange}
              disabled={!canEditMetadata}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Responsables - Flujo de Aprobación */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Flujo de Aprobación</h3>
          <p className="text-sm text-muted-foreground mt-1">
            El documento pasa por 3 etapas: Creación → Revisión → Aprobación
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Creado por */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="inline-flex items-center gap-1">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                  1
                </span>
                Creado por *
              </span>
            </label>
            <select
              name="subidoPor"
              value={formData.subidoPor}
              onChange={handleInputChange}
              disabled={mode === 'edit'} // Siempre deshabilitado en edición
              className={`w-full px-3 py-2 border rounded-md bg-background ${errors.subidoPor ? "border-destructive" : "border-input"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Seleccionar usuario</option>
              {usuarios?.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {`${usuario.nombre} ${usuario.primer_apellido}`}
                </option>
              ))}
            </select>
            {errors.subidoPor && (
              <p className="text-destructive text-sm mt-1">
                {errors.subidoPor}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Persona que crea el documento
            </p>
          </div>

          {/* 2. Revisado por */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="inline-flex items-center gap-1">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold">
                  2
                </span>
                Revisado por
              </span>
            </label>
            <select
              name="revisadoPor"
              value={formData.revisadoPor}
              onChange={handleInputChange}
              disabled={!canAssign}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar revisor con permiso</option>
              {revisoresOpciones.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {`${usuario.nombre} ${usuario.primer_apellido}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Solo usuarios con rol/permiso de revisión de documentos
            </p>
            {revisores.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay usuarios con permiso documentos.revisar.</p>
            )}
          </div>

          {/* 3. Aprobado por */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="inline-flex items-center gap-1">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold">
                  3
                </span>
                Aprobado por
              </span>
            </label>
            <select
              name="aprobadoPor"
              value={formData.aprobadoPor}
              onChange={handleInputChange}
              disabled={!canAssign}
              className="w-full px-3 py-2 border border-input rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar aprobador con permiso</option>
              {aprobadoresOpciones.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {`${usuario.nombre} ${usuario.primer_apellido}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Solo usuarios con rol/permiso de aprobación de documentos
            </p>
            {aprobadores.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No hay usuarios con permiso documentos.aprobar.</p>
            )}
          </div>
        </div>

        {/* Indicador visual del flujo */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mb-2">
                1
              </div>
              <p className="text-xs font-medium text-center">Creación</p>
              <p className="text-xs text-muted-foreground text-center">
                Borrador
              </p>
            </div>
            <div className="flex-1 h-0.5 bg-border mx-2"></div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold mb-2">
                2
              </div>
              <p className="text-xs font-medium text-center">Revisión</p>
              <p className="text-xs text-muted-foreground text-center">
                En Revisión
              </p>
            </div>
            <div className="flex-1 h-0.5 bg-border mx-2"></div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold mb-2">
                3
              </div>
              <p className="text-xs font-medium text-center">Aprobación</p>
              <p className="text-xs text-muted-foreground text-center">
                Aprobado
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section - Editor or Upload */}
      <div className="bg-card p-6 rounded-lg border border-border">
        {/* Mode Selection Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 border-b border-border">
            <button
              type="button"
              onClick={() => setDocumentMode('editor')}
              disabled={!canEditContent}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${documentMode === 'editor'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Edit className="w-4 h-4" />
              Crear con Editor
            </button>
            <button
              type="button"
              onClick={() => setDocumentMode('upload')}
              disabled={!canEditContent}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${documentMode === 'upload'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <UploadIcon className="w-4 h-4" />
              Subir Archivo
            </button>
          </div>
        </div>

        {/* Editor Mode */}
        {documentMode === 'editor' && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
              <h3 className="text-lg font-semibold">Contenido del Documento</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreview(!preview)}
                  className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  {preview ? "Editar" : "Vista Previa"}
                </button>
                <BotonesImpresionDocumentoSGC
                  onImprimir={handleExportPDF}
                  loading={exporting}
                />
              </div>
            </div>

            {preview ? (
              <div className="overflow-x-auto rounded-md border border-border bg-[#F8FAFC] p-3">
                <div className="mx-auto w-full max-w-[816px]">
                  <DocumentoSGCPaper
                    marca={marca}
                    data={datosVistaSGC()}
                  />
                </div>
              </div>
            ) : (
              <div className={!canEditContent ? "opacity-75 pointer-events-none" : ""}>
                <TipTapEditor
                  content={content}
                  onChange={setContent}
                  editable={canEditContent && !preview}
                />
              </div>
            )}

            {!canEditContent && (
              <p className="text-amber-600 text-sm mt-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Solo lectura: No tienes permisos para editar el contenido.
              </p>
            )}

            {errors.content && (
              <p className="text-destructive text-sm mt-2">{errors.content}</p>
            )}
          </>
        )}

        {/* Upload Mode */}
        {documentMode === 'upload' && (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Subir Archivo Existente</h3>
              <p className="text-sm text-muted-foreground">
                Sube un documento existente (PDF, Word, Excel, etc.) a Supabase Storage
              </p>
            </div>

            {canEditContent && (
              <FileUpload
                onFileSelect={setUploadedFile}
                selectedFile={uploadedFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                maxSize={10}
              />
            )}
            {errors.file && (
              <p className="text-destructive text-sm mt-2">{errors.file}</p>
            )}

            {initialData?.rutaArchivo && !uploadedFile && (
              <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Archivo Actual</p>
                    <a
                      href={initialData.rutaArchivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate max-w-[200px] block"
                    >
                      Ver documento actual
                    </a>
                  </div>
                </div>
                {canEditContent && (
                  <span className="text-xs text-muted-foreground">
                    Sube un nuevo archivo para reemplazarlo
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        {(canEditMetadata || canEditContent || canAssign) && (
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading
              ? "Guardando..."
              : mode === "create"
                ? "Crear Documento"
                : "Actualizar Documento"}
          </button>
        )}
      </div>
    </form>
  );
};
