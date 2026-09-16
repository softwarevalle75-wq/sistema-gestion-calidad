import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentFormWithTipTap } from "@/components/documents/DocumentFormWithTipTap";
import { documentoService } from "@/services/documento.service";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, ArrowLeft, FileText } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

function siguienteVersion(version?: string): string {
  const raw = String(version || "1.0").trim().replace(",", ".") || "1.0";
  const partes = raw.split(".").filter(Boolean);
  const mayor = Number.parseInt(partes[0] || "1", 10);
  const menor = Number.parseInt(partes[1] || "0", 10);
  return `${Number.isFinite(mayor) ? mayor : 1}.${(Number.isFinite(menor) ? menor : 0) + 1}`;
}

interface DocumentoData {
  nombreArchivo?: string;
  tipoDocumento?: string;
  codigoDocumento?: string;
  version?: string;
  estado?: string;
  subidoPor?: string;
  aprobadoPor?: string;
  revisadoPor?: string;
  contenidoHtml?: string;
  rutaArchivo?: string;
}

export default function EditarDocumento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<DocumentoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDocumento = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await documentoService.getById(id);

      // Convert backend field names to form field names
      const formData: DocumentoData = {
        nombreArchivo: data.nombre,
        tipoDocumento: data.tipo_documento,
        codigoDocumento: data.codigo,
        version: data.version_actual,
        estado: data.estado,
        // Usar el UUID del creador (el select necesita el ID)
        subidoPor: data.creado_por || '',
        // Usar el UUID del aprobador (el select necesita el ID)
        aprobadoPor: data.aprobado_por || '',
        // Usar el UUID del revisor
        revisadoPor: data.revisado_por || '',
        // Agregar el contenido HTML del documento
        contenidoHtml: data.descripcion || '',
        rutaArchivo: data.ruta_archivo || '',
      };

      setInitialData(formData);
    } catch (error) {
      console.error("Error al cargar documento:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al cargar documento";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDocumento();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (formData: FormData) => {
    if (!id) return;

    try {
      setError(null);

      const nuevoContenido = formData.get("contenidoHtml") as string;
      const versionFormulario =
        (formData.get("version_actual") as string) ||
        (formData.get("version") as string) ||
        initialData?.version ||
        "1.0";
      const versionActual = siguienteVersion(versionFormulario);

      toast.info(`Nueva versión del documento: ${versionActual}`);

      const documentData: any = {
        codigo: formData.get("codigoDocumento") as string,
        nombre: formData.get("nombreArchivo") as string,
        descripcion: nuevoContenido || `Documento ${formData.get("nombreArchivo")}`,
        tipo_documento: formData.get("tipo_documento") as string,
        version_actual: versionActual,
        estado: formData.get("estado") as string,
      };

      const creado_por = formData.get("creado_por") as string || formData.get("subidoPor") as string;
      if (creado_por) {
        documentData.creado_por = creado_por;
      }

      const aprobado_por = formData.get("aprobado_por") as string;
      if (aprobado_por) {
        documentData.aprobado_por = aprobado_por;
      }

      const revisado_por = formData.get("revisado_por") as string;
      if (revisado_por) {
        documentData.revisado_por = revisado_por;
      }

      await documentoService.update(id, documentData);

      setSuccess("Documento actualizado exitosamente");
      toast.success("Documento actualizado exitosamente");
      setTimeout(() => navigate(`/documentos/${id}`), 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al actualizar documento";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner message="Cargando Documentos" />
    );
  }

  if (error && !initialData) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-20 text-center">
            <AlertCircle className="w-16 h-16 text-[#EF4444] mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-[#1E3A8A]">
              Error al cargar documento
            </h2>
            <p className="text-xs text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => navigate("/documentos")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-semibold shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Documentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/documentos")}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a documentos
        </button>

        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Editar Documento</h1>
            <p className="text-muted-foreground mt-2">
              Modifica la información del documento
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500 text-green-600 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {initialData && (
        <DocumentFormWithTipTap
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/documentos/${id}`)}
          initialData={initialData}
          mode="edit"
        />
      )}
    </div>
  );
}
