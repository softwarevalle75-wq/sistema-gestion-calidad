import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { NoConformidad } from "@/services/noConformidad.service";
import { datosSGCDesdeNoConformidad } from "@/utils/documentosRegistrosSGC";
import type { ReactNode } from "react";

interface VerNoConformidadProps {
    noConformidad: NoConformidad | null;
    open: boolean;
    onClose: () => void;
    extraActions?: ReactNode;
}

export function VerNoConformidad({
    noConformidad,
    open,
    onClose,
    extraActions,
}: VerNoConformidadProps) {
    return (
        <VistaDocumentoSGCDialog
            open={open}
            onOpenChange={(isOpen) => {
                if (!isOpen) onClose();
            }}
            data={noConformidad ? datosSGCDesdeNoConformidad(noConformidad) : null}
            title="No conformidad"
            description="Documento controlado con el detalle de la no conformidad y su tratamiento."
            extraActions={extraActions}
        />
    );
}
