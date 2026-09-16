import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, X, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { noConformidadService, NoConformidad } from "@/services/noConformidad.service";
import { default as procesoService, Proceso } from "@/services/proceso.service";
import { apiClient } from "@/lib/api";
import { uploadService } from "@/services/upload.service";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

interface NuevaNoConformidadFormProps {
    onSuccess: () => void;
    onCancel?: () => void;
    initialData?: NoConformidad | null;
}

interface Usuario {
    id: string;
    nombre: string;
    primerApellido?: string;
    primer_apellido?: string;
}

export function NuevaNoConformidadForm({ onSuccess, onCancel, initialData }: NuevaNoConformidadFormProps) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [procesos, setProcesos] = useState<Proceso[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const esCreacion = !initialData;
    const codigoAutomatico = useCodigoAutomatico("no_conformidad", esCreacion);

    useEffect(() => {
        if (esCreacion && codigoAutomatico) {
            setFormData((prev) => ({ ...prev, codigo: codigoAutomatico }));
        }
    }, [codigoAutomatico, esCreacion]);

    const [formData, setFormData] = useState({
        codigo: "",
        tipo: "",
        descripcion: "",
        fuente: "",
        gravedad: "",
        fecha_deteccion: new Date().toISOString().split("T")[0],
        responsable_id: "",
        proceso_id: "",
        detectado_por: "",
        analisis_causa: "",
        plan_accion: "",
        evidencias: "", // JSON string with [{name, url, date}]
    });

    useEffect(() => {
        fetchUsuarios();
        fetchProcesos();
    }, []);

    useEffect(() => {
        if (initialData) {
            // Normalize ID retrieval
            const getValidId = (obj: any, mainKey: string, nestedKey: string) => {
                const val = obj[nestedKey]?.id || obj[mainKey];
                return val ? String(val) : "";
            };

            const detectadoPorId = getValidId(initialData, "detectado_por", "detector") || getValidId(initialData, "detectadoPor", "detector");

            setFormData(prev => ({
                ...prev,
                codigo: initialData.codigo,
                tipo: initialData.tipo || prev.tipo,
                descripcion: initialData.descripcion || prev.descripcion,
                fuente: (initialData as any).fuente || prev.fuente,
                gravedad: initialData.gravedad || prev.gravedad,
                fecha_deteccion: initialData.fecha_deteccion ? new Date(initialData.fecha_deteccion).toISOString().split('T')[0] : prev.fecha_deteccion,
                responsable_id: getValidId(initialData, "responsable_id", "responsable") || prev.responsable_id,
                proceso_id: getValidId(initialData, "proceso_id", "proceso") || prev.proceso_id,
                detectado_por: detectadoPorId || prev.detectado_por,
                analisis_causa: initialData.analisis_causa || prev.analisis_causa,
                plan_accion: (initialData as any).plan_accion || prev.plan_accion,
                evidencias: (initialData as any).evidencias || prev.evidencias,
            }));
        }
    }, [initialData, usuarios]);

    const fetchProcesos = async () => {
        try {
            const data = await procesoService.listar({ limit: 1000 });
            if (Array.isArray(data)) {
                setProcesos(data);
            } else if ((data as any).data && Array.isArray((data as any).data)) {
                setProcesos((data as any).data);
            } else {
                setProcesos([]); // Fallback
            }
        } catch (error) {
            console.error("Error fetching procesos:", error);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await apiClient.get("/usuarios", { params: { limit: 1000, activo: true } });
            setUsuarios(response.data);
        } catch (error) {
            console.error("Error fetching usuarios:", error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPendingFiles([...pendingFiles, file]);
            // Clear input so same file can be selected again if needed (though unlikely)
            e.target.value = "";
        }
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(pendingFiles.filter((_, i) => i !== index));
    };

    const removeEvidence = (index: number) => {
        try {
            const currentEvidences = JSON.parse(formData.evidencias || "[]");
            const updatedEvidences = currentEvidences.filter((_: any, i: number) => i !== index);
            setFormData({ ...formData, evidencias: JSON.stringify(updatedEvidences) });
        } catch (error) {
            console.error("Error removing evidence:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.tipo || !formData.descripcion || !formData.fuente || !formData.gravedad) {
            setError("Por favor completa los campos obligatorios");
            return;
        }

        try {
            setSaving(true);
            setError(null);

            // Upload pending files first
            let finalEvidences = [];
            try {
                if (formData.evidencias) {
                    finalEvidences = JSON.parse(formData.evidencias);
                }
            } catch (e) { finalEvidences = []; }

            if (pendingFiles.length > 0) {
                setUploading(true); // Reusing state for UI feedback
                for (const file of pendingFiles) {
                    try {
                        const response = await uploadService.uploadEvidencia(file);
                        finalEvidences.push({
                            name: response.filename,
                            url: response.url,
                            date: new Date().toISOString()
                        });
                    } catch (err) {
                        console.error("Error uploading file:", file.name, err);
                        toast.error(`Error al subir ${file.name}`);
                        // Continue with other files or abort? Let's continue but warn.
                    }
                }
                setUploading(false);
                setPendingFiles([]); // Clear pending files after attempt to upload
            }

            const payload = {
                ...formData,
                fecha_deteccion: new Date(formData.fecha_deteccion).toISOString(),
                responsable_id: formData.responsable_id && formData.responsable_id !== "none" ? formData.responsable_id : null,
                proceso_id: formData.proceso_id && formData.proceso_id !== "none" ? formData.proceso_id : null,
                detectado_por: formData.detectado_por && formData.detectado_por !== "none" ? formData.detectado_por : null,
                analisis_causa: formData.analisis_causa || null,
                plan_accion: formData.plan_accion || null,
                evidencias: JSON.stringify(finalEvidences) || null,
            };

            if (initialData) {
                await noConformidadService.update(initialData.id, payload);
                toast.success("No conformidad actualizada correctamente");
            } else {
                await noConformidadService.create(payload);
                toast.success("No conformidad creada correctamente");
            }
            onSuccess();
        } catch (error: any) {
            console.error("Error saving no conformidad:", error);
            setError(error.message || "Error al guardar la no conformidad");
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            {error && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <CampoCodigoAutomatico value={formData.codigo} />

                <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select
                        value={formData.tipo}
                        onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Proceso">Proceso</SelectItem>
                            <SelectItem value="Producto">Producto</SelectItem>
                            <SelectItem value="Servicio">Servicio</SelectItem>
                            <SelectItem value="Auditoría">Auditoría</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="fuente">Fuente *</Label>
                    <Select
                        value={formData.fuente}
                        onValueChange={(value) => setFormData({ ...formData, fuente: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona fuente" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Interna">Interna</SelectItem>
                            <SelectItem value="Externa">Externa</SelectItem>
                            <SelectItem value="Cliente">Cliente</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="gravedad">Gravedad *</Label>
                    <Select
                        value={formData.gravedad}
                        onValueChange={(value) => setFormData({ ...formData, gravedad: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona gravedad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Menor">Menor</SelectItem>
                            <SelectItem value="Media">Media</SelectItem>
                            <SelectItem value="Mayor">Mayor</SelectItem>
                            <SelectItem value="Critica">Critica</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="fecha_deteccion">Fecha Detección *</Label>
                    <Input
                        id="fecha_deteccion"
                        type="date"
                        value={formData.fecha_deteccion}
                        onChange={(e) => setFormData({ ...formData, fecha_deteccion: e.target.value })}
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="responsable_id">Responsable</Label>
                    <Select
                        key={`responsable-${usuarios.length}`}
                        value={formData.responsable_id || "none"}
                        onValueChange={(value) => setFormData({ ...formData, responsable_id: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona responsable" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {usuarios.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.nombre} {u.primer_apellido || u.primerApellido}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="proceso_id">Proceso Relacionado</Label>
                    <Select
                        value={formData.proceso_id}
                        onValueChange={(value) => setFormData({ ...formData, proceso_id: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona proceso" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ninguno</SelectItem>
                            {procesos.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.nombre} {p.codigo ? `(${p.codigo})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="detectado_por">Detectado Por</Label>
                    <Select
                        key={`detector-${usuarios.length}`}
                        value={formData.detectado_por || "none"}
                        onValueChange={(value) => setFormData({ ...formData, detectado_por: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona usuario" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Sin asignar</SelectItem>
                            {usuarios.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.nombre} {u.primer_apellido || u.primerApellido}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                    id="descripcion"
                    placeholder="Describe la no conformidad..."
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    required
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="analisis_causa">Análisis de Causa</Label>
                <Textarea
                    id="analisis_causa"
                    placeholder="Análisis de la causa raíz..."
                    rows={3}
                    value={formData.analisis_causa}
                    onChange={(e) => setFormData({ ...formData, analisis_causa: e.target.value })}
                />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="plan_accion">Plan de Acción / Cronograma</Label>
                <Textarea
                    id="plan_accion"
                    placeholder="Detalles del plan de acción o referencia al plan de acciones correctivas..."
                    rows={3}
                    value={formData.plan_accion}
                    onChange={(e) => setFormData({ ...formData, plan_accion: e.target.value })}
                />
            </div>

            <div className="grid gap-2">
                <Label>Evidencias</Label>
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("evidence-upload")?.click()}
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Adjuntar Archivo
                    </Button>
                    <input
                        id="evidence-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>

                {/* Pending Files */}
                {pendingFiles.length > 0 && (
                    <div className="space-y-2 mt-2">
                        <p className="text-sm font-semibold text-gray-500">Archivos por subir:</p>
                        {pendingFiles.map((file: File, index: number) => (
                            <div key={`pending-${index}`} className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200 text-sm">
                                <span className="truncate max-w-[200px] text-gray-700">{file.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removePendingFile(index)}
                                    className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Existing Evidences */}
                {formData.evidencias && (
                    <div className="space-y-2 mt-2">
                        <p className="text-sm font-semibold text-gray-500">Evidencias guardadas:</p>
                        {(() => {
                            try {
                                const evidences = JSON.parse(formData.evidencias);
                                return evidences.map((ev: any, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm">
                                        <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">
                                            {ev.name}
                                        </a>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeEvidence(index)}
                                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ));
                            } catch (e) {
                                return null;
                            }
                        })()}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onCancel?.()}
                    disabled={saving}
                >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                    {saving ? (
                        <>Guardando...</>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Guardar
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
