import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Send, User as UserIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { accionCorrectivaService, ComentarioAccion } from "@/services/accionCorrectiva.service";
import { toast } from "sonner";

interface ComentariosAccionProps {
    accionId: string;
    comentariosIniciales?: ComentarioAccion[];
}

export default function ComentariosAccion({ accionId, comentariosIniciales = [] }: ComentariosAccionProps) {
    const [comentarios, setComentarios] = useState<ComentarioAccion[]>(comentariosIniciales);
    const [nuevoComentario, setNuevoComentario] = useState("");
    const [enviando, setEnviando] = useState(false);

    // Ordenar comentarios por fecha (más recientes al final)
    const comentariosOrdenados = [...comentarios].sort((a, b) =>
        new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime()
    );

    const handleEnviar = async () => {
        if (!nuevoComentario.trim()) return;

        setEnviando(true);
        try {
            const comentarioCreado = await accionCorrectivaService.createComentario(accionId, nuevoComentario);
            setComentarios([...comentarios, comentarioCreado]);
            setNuevoComentario("");
            toast.success("Comentario agregado");
        } catch (error) {
            console.error("Error al enviar comentario:", error);
            toast.error("No se pudo enviar el comentario");
        } finally {
            setEnviando(false);
        }
    };

    const getIniciales = (nombre?: string, apellido?: string) => {
        if (!nombre) return "U";
        return `${nombre.charAt(0)}${apellido ? apellido.charAt(0) : ''}`.toUpperCase();
    };

    return (
        <div className="flex flex-col h-[600px] border rounded-xl bg-white shadow-sm overflow-hidden sticky top-8">
            <div className="p-4 border-b bg-gray-50/50">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    Comentarios
                    <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {comentarios.length}
                    </span>
                </h3>
            </div>

            <div className="flex-1 p-4 bg-gray-50/30 overflow-y-auto">
                <div className="space-y-4">
                    {comentariosOrdenados.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            <p>No hay comentarios aún.</p>
                            <p>Sé el primero en iniciar la conversación.</p>
                        </div>
                    ) : (
                        comentariosOrdenados.map((comentario) => (
                            <div key={comentario.id} className="flex gap-3">
                                <Avatar className="h-8 w-8 border bg-white shrink-0">
                                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                                        {getIniciales(comentario.usuario?.nombre, comentario.usuario?.primerApellido)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-900">
                                            {comentario.usuario?.nombre} {comentario.usuario?.primerApellido}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(comentario.creadoEn), { addSuffix: true, locale: es })}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border shadow-sm">
                                        {comentario.comentario}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Escribe un comentario..."
                        value={nuevoComentario}
                        onChange={(e) => setNuevoComentario(e.target.value)}
                        className="min-h-[44px] max-h-[120px] resize-none focus-visible:ring-blue-500"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleEnviar();
                            }
                        }}
                    />
                    <Button
                        size="icon"
                        onClick={handleEnviar}
                        disabled={enviando || !nuevoComentario.trim()}
                        className="bg-blue-600 hover:bg-blue-700 h-[44px] w-[44px] shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 pl-1">
                    Presiona Enter para enviar
                </p>
            </div>
        </div>
    );
}
