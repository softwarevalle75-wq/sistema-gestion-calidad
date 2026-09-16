import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BotonesImpresionDocumentoSGCProps {
  onImprimir: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  native?: boolean;
}

const nativeClass =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 w-full sm:w-auto";

export function BotonesImpresionDocumentoSGC({
  onImprimir,
  loading = false,
  disabled = false,
  native = false,
}: BotonesImpresionDocumentoSGCProps) {
  if (native) {
    return (
      <>
        <button
          type="button"
          onClick={onImprimir}
          disabled={disabled || loading}
          className={`${nativeClass} border border-[#E5E7EB] bg-white text-[#1E3A8A] hover:bg-[#F8FAFC]`}
        >
          <Printer className="h-4 w-4" />
          {loading ? "Preparando..." : "Imprimir"}
        </button>
        <button
          type="button"
          onClick={onImprimir}
          disabled={disabled || loading}
          className={`${nativeClass} bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm`}
        >
          <Download className="h-4 w-4" />
          {loading ? "Generando PDF..." : "Exportar PDF"}
        </button>
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl w-full sm:w-auto"
        onClick={onImprimir}
        disabled={disabled || loading}
      >
        <Printer className="h-4 w-4 mr-2" />
        {loading ? "Preparando..." : "Imprimir"}
      </Button>
      <Button
        type="button"
        className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white w-full sm:w-auto"
        onClick={onImprimir}
        disabled={disabled || loading}
      >
        <Download className="h-4 w-4 mr-2" />
        {loading ? "Generando PDF..." : "Exportar PDF"}
      </Button>
    </>
  );
}
