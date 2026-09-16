import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DocumentFormWithTipTap } from "@/components/documents/DocumentFormWithTipTap";
import { documentoService } from "@/services/documento.service";
import { codigoParaGuardar } from "@/services/codigo.service";
import { uploadFileToSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function CreateDocument() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      setError(null);

      // Convert FormData to JSON object with backend field names
      const contenidoHtml = (formData.get("contenidoHtml") as string) || "";
      const tipoDocumento = (formData.get("tipo_documento") as string) || "formato";
      const documentData: any = {
        codigo: codigoParaGuardar(
          String(formData.get("codigoDocumento") || formData.get("codigo") || ""),
          "documento",
          { tipo: tipoDocumento },
        ),
        nombre: formData.get("nombreArchivo") as string,
        descripcion: contenidoHtml || (formData.get("descripcion") as string) || `Documento ${formData.get("nombreArchivo")}`,
        tipo_documento: tipoDocumento,
        version_actual: formData.get("version_actual") as string || "1.0",
        estado: formData.get("estado") as string || "borrador",
      };

      // Add optional fields
      const creado_por = formData.get("creado_por") as string || formData.get("subidoPor") as string;
      if (creado_por) {
        documentData.creado_por = creado_por;
      }

      // Asignar Aprobador (snake_case from form)
      const aprobado_por = formData.get("aprobado_por") as string;
      if (aprobado_por) {
        documentData.aprobado_por = aprobado_por;
      }

      // Asignar Revisor (snake_case from form)
      const revisado_por = formData.get("revisado_por") as string;
      if (revisado_por) {
        documentData.revisado_por = revisado_por;
      }

      // Handle file upload if present
      const file = formData.get("archivo") as File | null;
      if (file) {
        setUploading(true);
        toast.info("Subiendo archivo a Supabase...");

        const timestamp = Date.now();
        const filename = `documentos/${timestamp}-${file.name}`;

        const { url } = await uploadFileToSupabase(file, filename, "documentos");
        documentData.ruta_archivo = url;

        toast.success("Archivo subido correctamente");
        setUploading(false);
      }

      await documentoService.create(documentData);

      setSuccess("Documento creado exitosamente");
      toast.success("Documento creado exitosamente");
      setTimeout(() => navigate("/documentos"), 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      setError(errorMessage);
      toast.error(errorMessage);
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Crear Nuevo Documento</h1>
        <p className="text-muted-foreground mt-2">
          Complete el formulario para crear un documento
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500 text-green-600 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      {uploading && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500 text-blue-600 rounded-md flex items-start gap-3">
          <div className="w-5 h-5 mt-0.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <p>Subiendo archivo a Supabase Storage...</p>
        </div>
      )}

      <DocumentFormWithTipTap
        onSubmit={handleSubmit}
        onCancel={() => navigate("/documentos")}
        mode="create"
      />
    </div>
  );
}
