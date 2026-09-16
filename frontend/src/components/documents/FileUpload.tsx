import { useState, useRef, DragEvent } from "react";
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";

interface FileUploadProps {
    onFileSelect: (file: File | null) => void;
    accept?: string;
    maxSize?: number; // in MB
    selectedFile?: File | null;
}

export const FileUpload = ({
    onFileSelect,
    accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx",
    maxSize = 10,
    selectedFile = null,
}: FileUploadProps) => {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): boolean => {
        setError(null);

        // Validate file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSize) {
            setError(`El archivo es demasiado grande. Tamaño máximo: ${maxSize}MB`);
            return false;
        }

        // Validate file type
        const acceptedTypes = accept.split(",").map((type) => type.trim());
        const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;

        if (!acceptedTypes.includes(fileExtension)) {
            setError(`Tipo de archivo no permitido. Formatos aceptados: ${accept}`);
            return false;
        }

        return true;
    };

    const handleFile = (file: File) => {
        if (validateFile(file)) {
            onFileSelect(file);
        } else {
            onFileSelect(null);
        }
    };

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleButtonClick = () => {
        inputRef.current?.click();
    };

    const handleRemoveFile = () => {
        onFileSelect(null);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    };

    return (
        <div className="w-full">
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={accept}
                onChange={handleChange}
            />

            {!selectedFile ? (
                <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                            ? "border-primary bg-primary/5"
                            : error
                                ? "border-destructive bg-destructive/5"
                                : "border-border hover:border-primary/50 hover:bg-accent/50"
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center ${error
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                                }`}
                        >
                            {error ? (
                                <AlertCircle className="w-8 h-8" />
                            ) : (
                                <Upload className="w-8 h-8" />
                            )}
                        </div>

                        <div>
                            <p className="text-lg font-medium mb-1">
                                {dragActive
                                    ? "Suelta el archivo aquí"
                                    : "Arrastra y suelta tu archivo aquí"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                                o haz click para seleccionar
                            </p>
                            <button
                                type="button"
                                onClick={handleButtonClick}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                            >
                                Seleccionar Archivo
                            </button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            <p>Formatos aceptados: {accept.replace(/\./g, "").toUpperCase()}</p>
                            <p>Tamaño máximo: {maxSize}MB</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="border border-border rounded-lg p-4 bg-card">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <File className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{selectedFile.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatFileSize(selectedFile.size)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="p-1 hover:bg-destructive/10 rounded-md transition-colors text-muted-foreground hover:text-destructive"
                                    title="Eliminar archivo"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-600">Archivo listo para subir</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-2 p-3 bg-destructive/10 border border-destructive rounded-md flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}
        </div>
    );
};
