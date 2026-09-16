import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

interface AvatarUploadProps {
    usuarioId: string;
    currentAvatarUrl?: string;
    onAvatarChange?: (newUrl: string | null) => void;
}

export default function AvatarUpload({
    usuarioId,
    currentAvatarUrl,
    onAvatarChange,
}: AvatarUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentAvatarUrl);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error("Formato no válido. Use JPG, PNG o WEBP");
            return;
        }

        // Validar tamaño (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error("La imagen no puede superar los 2MB");
            return;
        }

        // Mostrar preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await apiClient.post(
                `/usuarios/${usuarioId}/foto-perfil`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const newUrl = response.data.foto_url;
            setAvatarUrl(newUrl);
            setPreview(null);

            if (onAvatarChange) {
                onAvatarChange(newUrl);
            }

            toast.success("Foto de perfil actualizada");

            // Limpiar input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.response?.data?.detail || "Error al subir la imagen");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!avatarUrl) return;

        if (!confirm("¿Está seguro de eliminar su foto de perfil?")) {
            return;
        }

        setUploading(true);

        try {
            await apiClient.delete(`/usuarios/${usuarioId}/foto-perfil`);

            setAvatarUrl(undefined);
            setPreview(null);

            if (onAvatarChange) {
                onAvatarChange(null);
            }

            toast.success("Foto de perfil eliminada");
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.response?.data?.detail || "Error al eliminar la imagen");
        } finally {
            setUploading(false);
        }
    };

    const cancelPreview = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const displayUrl = preview || avatarUrl;

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Avatar Display */}
            <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {displayUrl ? (
                        <img
                            src={displayUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Camera className="w-12 h-12" />
                    )}
                </div>

                {/* Overlay cuando está subiendo */}
                {uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                )}
            </div>

            {/* Preview Actions */}
            {preview && (
                <div className="flex gap-2">
                    <Button
                        onClick={handleUpload}
                        disabled={uploading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Upload className="w-4 h-4 mr-1" />
                        Subir
                    </Button>
                    <Button
                        onClick={cancelPreview}
                        disabled={uploading}
                        size="sm"
                        variant="outline"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                    </Button>
                </div>
            )}

            {/* Upload/Delete Actions */}
            {!preview && (
                <div className="flex gap-2">
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        size="sm"
                        variant="outline"
                    >
                        <Camera className="w-4 h-4 mr-1" />
                        {avatarUrl ? "Cambiar Foto" : "Subir Foto"}
                    </Button>

                    {avatarUrl && (
                        <Button
                            onClick={handleDelete}
                            disabled={uploading}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Eliminar
                        </Button>
                    )}
                </div>
            )}

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Info */}
            <p className="text-xs text-gray-500 text-center max-w-xs">
                JPG, PNG o WEBP. Máximo 2MB.
                <br />
                La imagen se redimensionará automáticamente.
            </p>
        </div>
    );
}
