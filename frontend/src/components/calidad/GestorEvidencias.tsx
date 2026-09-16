import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Link as LinkIcon, ExternalLink, FileText, AlertCircle, Upload, Loader2, File as FileIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import apiClient from "@/lib/api"; // Asumiendo que existe, o axios directo
import { toast } from "sonner";
import { hasAnyPermission } from "@/lib/permissions";

interface Evidencia {
    id: string;
    url: string;
    descripcion: string;
    tipo: 'link' | 'file' | 'text';
    nombreArchivo?: string;
}

interface GestorEvidenciasProps {
    value?: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
}

export default function GestorEvidencias({ value, onChange, readOnly = false }: GestorEvidenciasProps) {
    const canManageEvidencias = hasAnyPermission([
        "noconformidades.gestion",
        "noconformidades.reportar",
        "auditorias.ejecutar",
        "riesgos.gestion",
        "capacitaciones.gestion",
        "documentos.crear",
    ]);
    const isEditable = !readOnly && canManageEvidencias;
    const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
    const [nuevaUrl, setNuevaUrl] = useState("");
    const [nuevaDescripcion, setNuevaDescripcion] = useState("");
    const [error, setError] = useState("");

    // Upload states
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar evidencias iniciales
    useEffect(() => {
        if (!value) {
            setEvidencias([]);
            return;
        }

        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                setEvidencias(parsed);
            } else {
                throw new Error("Formato no array");
            }
        } catch (e) {
            if (value.trim()) {
                setEvidencias([{
                    id: 'legacy-1',
                    url: '',
                    descripcion: value,
                    tipo: 'text'
                }]);
            }
        }
    }, [value]);

    const actualizarEvidencias = (nuevasEvidencias: Evidencia[]) => {
        setEvidencias(nuevasEvidencias);
        onChange(JSON.stringify(nuevasEvidencias));
    };

    const handleAgregarLink = () => {
        setError("");
        if (!nuevaDescripcion.trim()) {
            setError("La descripción es obligatoria");
            return;
        }

        const nuevaEvidencia: Evidencia = {
            id: crypto.randomUUID(),
            url: nuevaUrl,
            descripcion: nuevaDescripcion,
            tipo: nuevaUrl ? 'link' : 'text'
        };

        const nuevas = [...evidencias, nuevaEvidencia];
        actualizarEvidencias(nuevas);
        setNuevaUrl("");
        setNuevaDescripcion("");
    };

    const handleEliminar = (id: string) => {
        const nuevas = evidencias.filter(e => e.id !== id);
        actualizarEvidencias(nuevas);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!nuevaDescripcion.trim()) {
            setError("Ingresa una descripción antes de subir el archivo");
            // Limpia el input para permitir reintentar con el mismo archivo
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUploading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await apiClient.post("/uploads/evidencia", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const { url, filename } = response.data;

            const nuevaEvidencia: Evidencia = {
                id: crypto.randomUUID(),
                url: url,
                descripcion: nuevaDescripcion,
                tipo: 'file',
                nombreArchivo: filename || file.name
            };

            const nuevas = [...evidencias, nuevaEvidencia];
            actualizarEvidencias(nuevas);

            setNuevaDescripcion("");
            toast.success("Archivo subido correctamente");

        } catch (err: any) {
            console.error("Error subiendo archivo:", err);
            setError("Error al subir el archivo. Intenta de nuevo.");
            toast.error("Error al subir archivo");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const abrirEnlace = (url: string) => {
        if (!url) return;
        const href = url.match(/^https?:\/\//) ? url : `https://${url}`;
        window.open(href, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {evidencias.map((evidencia) => (
                    <div
                        key={evidencia.id}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-blue-200 transition-colors"
                    >
                        <div className={`mt-0.5 p-1.5 rounded-md ${evidencia.tipo === 'link' ? 'bg-blue-50 text-blue-600' :
                                evidencia.tipo === 'file' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {evidencia.tipo === 'link' && <LinkIcon className="h-4 w-4" />}
                            {evidencia.tipo === 'file' && <FileIcon className="h-4 w-4" />}
                            {evidencia.tipo === 'text' && <FileText className="h-4 w-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 break-words">
                                {evidencia.descripcion}
                            </p>
                            {evidencia.url && (
                                <button
                                    type="button"
                                    onClick={() => abrirEnlace(evidencia.url)}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-full"
                                >
                                    {evidencia.nombreArchivo || evidencia.url} <ExternalLink className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {isEditable && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEliminar(evidencia.id)}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}

                {evidencias.length === 0 && readOnly && (
                    <p className="text-sm text-gray-500 italic">No hay evidencias registradas.</p>
                )}
            </div>

            {isEditable && (
                <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Agregar Nueva Evidencia
                    </h4>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="evidencia-desc" className="text-xs">Descripción *</Label>
                            <Input
                                id="evidencia-desc"
                                value={nuevaDescripcion}
                                onChange={(e) => setNuevaDescripcion(e.target.value)}
                                placeholder="Ej: Reporte firmado, Foto del cambio..."
                                className="bg-white h-9"
                            />
                        </div>

                        <Tabs defaultValue="upload" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-9">
                                <TabsTrigger value="upload" className="text-xs">Subir Archivo</TabsTrigger>
                                <TabsTrigger value="link" className="text-xs">Enlace Externo</TabsTrigger>
                            </TabsList>

                            <TabsContent value="upload" className="mt-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    // accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        className="w-full bg-white text-gray-700 hover:bg-gray-50 border-dashed"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Subiendo...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Seleccionar Archivo
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-gray-500 text-center">
                                    Soporta PDF, Imágenes (JPG, PNG), Word, Excel.
                                </p>
                            </TabsContent>

                            <TabsContent value="link" className="mt-4 space-y-3">
                                <Input
                                    value={nuevaUrl}
                                    onChange={(e) => setNuevaUrl(e.target.value)}
                                    placeholder="https://drive.google.com/..."
                                    className="bg-white h-9 font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    onClick={handleAgregarLink}
                                    disabled={!nuevaDescripcion.trim()}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9"
                                >
                                    Agregar Enlace
                                </Button>
                            </TabsContent>
                        </Tabs>

                        {error && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {error}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
