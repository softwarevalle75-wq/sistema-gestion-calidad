import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BotonesImpresionDocumentoSGC } from "@/components/documents/BotonesImpresionDocumentoSGC";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentoSGCPaper } from "@/components/documents/DocumentoSGCPaper";
import {
  cargarMarcaSGC,
  exportarDocumentoSGC,
  type DocumentoSGCData,
  type MarcaSGC,
} from "@/utils/documentoSGC";

interface VistaDocumentoSGCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DocumentoSGCData | null;
  title?: string;
  description?: string;
  extraActions?: ReactNode;
}

export function VistaDocumentoSGCDialog({
  open,
  onOpenChange,
  data,
  title = "Documento controlado",
  description = "Formato oficial del Sistema de Gestión de Calidad.",
  extraActions,
}: VistaDocumentoSGCDialogProps) {
  const [marca, setMarca] = useState<MarcaSGC>({
    logoUrl: null,
    titulo: "Universitaria de Colombia",
    subtitulo: "Sistema de Gestión de Calidad",
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    cargarMarcaSGC().then(setMarca);
  }, [open]);

  const handleExportPDF = async () => {
    if (!data) return;
    try {
      setExporting(true);
      await exportarDocumentoSGC(data, marca);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[calc(100%-0.75rem)] min-w-0 max-w-5xl max-h-[92dvh] flex-col overflow-hidden rounded-2xl p-0 gap-0 sm:w-[calc(100%-1.5rem)]">
        <DialogHeader className="shrink-0 border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 pr-12 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle className="text-lg font-bold text-[#1E3A8A] break-words sm:text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-sm">{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#F8FAFC] p-2 sm:p-4 md:p-6">
          {data ? (
            <div className="mx-auto w-full max-w-[816px] border border-[#E5E7EB] bg-white shadow-sm">
              <DocumentoSGCPaper data={data} marca={marca} />
            </div>
          ) : (
            <p className="py-16 text-center text-[#6B7280]">No hay información para mostrar.</p>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t border-[#E5E7EB] bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6 sm:py-4 [&_button]:w-full sm:[&_button]:w-auto">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <BotonesImpresionDocumentoSGC
            onImprimir={handleExportPDF}
            loading={exporting}
            disabled={!data}
          />
          {extraActions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
