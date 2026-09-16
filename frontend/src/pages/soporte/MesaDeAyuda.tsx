import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Plus, Search, RefreshCw, LifeBuoy, Clock, CheckCircle,
    AlertTriangle, Ticket as TicketIcon, Edit, Eye, Trash2, Save, Paperclip
} from "lucide-react";
import { toast } from "sonner";
import ticketService, { Ticket, TicketCreate, TicketUpdate } from "@/services/ticket.service";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { uploadService } from "@/services/upload.service";
import { areaService, Area } from "@/services/area.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCurrentUser } from "@/services/auth";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeTicket } from "@/utils/documentosRegistrosSGC";

export default function MesaDeAyuda() {
    const currentUser = getCurrentUser();
    const currentUserId = currentUser?.id;
    const currentAreaId = currentUser?.area_id || currentUser?.areaId;
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showDocumento, setShowDocumento] = useState(false);
    const [showResolveDialog, setShowResolveDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<TicketCreate>({
        titulo: "",
        descripcion: "",
        categoria: "soporte",
    });
    const [adjunto, setAdjunto] = useState<File | null>(null);

    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ticket: Ticket | null }>({
        open: false,
        ticket: null,
    });

    const [resolutionText, setResolutionText] = useState("");
    const [resolutionFile, setResolutionFile] = useState<File | null>(null);


    const [searchParams] = useSearchParams();

    useEffect(() => {
        fetchTickets();
        fetchAreas();
    }, []);

    const fetchAreas = async () => {
        try {
            const data = await areaService.getAll();
            setAreas(data || []);
        } catch (error) {
            toast.error("Error al cargar áreas");
            setAreas([]);
        }
    };

    // Efecto para abrir ticket desde URL
    useEffect(() => {
        if (!loading && tickets.length > 0) {
            const ticketId = searchParams.get("ticket_id");
            if (ticketId) {
                const ticket = tickets.find(t => t.id === ticketId);
                if (ticket) {
                    handleView(ticket);
                    // Opcional: limpiar la URL sin recargar
                    // window.history.replaceState(null, "", "/mesa-ayuda");
                }
            }
        }
    }, [loading, tickets, searchParams]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const data = await ticketService.getAll();
            setTickets(data);
        } catch (error) {
            toast.error("Error al cargar los tickets");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setDialogMode('create');
        setFormData({
            titulo: "",
            descripcion: "",
            categoria: "soporte",
            area_destino_id: undefined,
        });
        setAdjunto(null);
        setSelectedTicket(null);
        setOpenDialog(true);
    };

    const handleEdit = (ticket: Ticket) => {
        setDialogMode('edit');
        setFormData({
            titulo: ticket.titulo,
            descripcion: ticket.descripcion,
            categoria: ticket.categoria,
            area_destino_id: ticket.area_destino_id,
            archivo_adjunto_url: ticket.archivo_adjunto_url,
        });
        setAdjunto(null);
        setSelectedTicket(ticket);
        setOpenDialog(true);
    };

    const handleView = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setResolutionText("");
        setResolutionFile(null);
        setShowDocumento(true);
    };



    const handleSave = async () => {
        if (!formData.titulo.trim() || !formData.descripcion.trim()) {
            toast.error("Título y descripción son obligatorios");
            return;
        }
        if (!formData.area_destino_id) {
            toast.error("Debes seleccionar un área destino");
            return;
        }

        setSaving(true);
        try {
            let archivoAdjuntoUrl = formData.archivo_adjunto_url;
            if (adjunto) {
                const subida = await uploadService.uploadEvidencia(adjunto);
                archivoAdjuntoUrl = subida.url;
            }

            const payload: TicketCreate = {
                ...formData,
                archivo_adjunto_url: archivoAdjuntoUrl,
                prioridad: inferirPrioridad(formData.categoria, formData.titulo, formData.descripcion),
            };

            if (dialogMode === 'create') {
                await ticketService.create(payload);
                toast.success("Ticket creado exitosamente");
            } else if (selectedTicket) {
                await ticketService.update(selectedTicket.id, payload as TicketUpdate);
                toast.success("Ticket actualizado exitosamente");
            }
            setOpenDialog(false);
            setAdjunto(null);
            fetchTickets();
        } catch (error: any) {
            const detalle = error?.response?.data?.detail;
            const mensaje = Array.isArray(detalle) ? detalle.map((d: any) => d?.msg).filter(Boolean).join(", ") : detalle;
            toast.error(
                mensaje ||
                (dialogMode === 'create' ? "Error al crear el ticket" : "Error al actualizar el ticket")
            );
        } finally {
            setSaving(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedTicket || !resolutionText.trim()) return;

        setSaving(true);
        try {
            if (resolutionFile) {
                const subida = await uploadService.uploadEvidencia(resolutionFile);
                await ticketService.update(selectedTicket.id, { archivo_adjunto_url: subida.url });
            }
            await ticketService.resolver(selectedTicket.id, { solucion: resolutionText });
            toast.success("Ticket resuelto exitosamente");
            setShowDocumento(false);
            setShowResolveDialog(false);
            setResolutionText("");
            setResolutionFile(null);
            fetchTickets();
        } catch (error) {
            toast.error("Error al resolver el ticket");
        } finally {
            setSaving(false);
        }
    };

    const openDeleteDialog = (ticket: Ticket) => {
        setDeleteDialog({ open: true, ticket });
    };

    const closeDeleteDialog = () => {
        setDeleteDialog({ open: false, ticket: null });
    };

    const handleDelete = async () => {
        const ticket = deleteDialog.ticket;
        if (!ticket) return;

        try {
            await ticketService.delete(ticket.id);
            toast.success("Ticket eliminado correctamente");
            fetchTickets();
            closeDeleteDialog();
        } catch (error) {
            toast.error("Error al eliminar el ticket");
        }
    };

    // Métricas
    const total = tickets.length;
    const abiertos = tickets.filter(t => t.estado === "abierto").length;
    const enProgreso = tickets.filter(t => t.estado === "en_progreso").length;
    const resueltos = tickets.filter(t => t.estado === "resuelto" || t.estado === "cerrado").length;

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case "abierto":
                return <Badge className="bg-[#EF4444] text-white">Abierto</Badge>;
            case "en_progreso":
                return <Badge className="bg-[#2563EB] text-white">En Progreso</Badge>;
            case "resuelto":
            case "cerrado":
                return <Badge className="bg-[#10B981] text-white">Resuelto</Badge>;
            default:
                return <Badge variant="outline">{estado}</Badge>;
        }
    };

    const getPriorityBadge = (prioridad: string) => {
        switch (prioridad) {
            case "critica":
                return <Badge className="bg-[#991B1B] text-white">Crítica</Badge>;
            case "alta":
                return <Badge className="bg-[#F97316] text-white">Alta</Badge>;
            case "media":
                return <Badge className="bg-[#EAB308] text-black">Media</Badge>;
            case "baja":
                return <Badge className="bg-[#10B981] text-white">Baja</Badge>;
            default:
                return <Badge variant="outline">{prioridad}</Badge>;
        }
    };

    const inferirPrioridad = (categoria: string, titulo: string, descripcion: string) => {
        const texto = `${titulo} ${descripcion}`.toLowerCase();
        const base: Record<string, "baja" | "media" | "alta" | "critica"> = {
            soporte: "alta",
            consulta: "baja",
            mejora: "media",
            solicitud_documento: "media",
        };
        let prioridad = base[categoria] || "media";

        const criticas = ["caido", "caída", "bloquea", "bloqueado", "produccion", "producción", "urgente", "no funciona", "inoperante"];
        if (criticas.some((p) => texto.includes(p))) return "critica";

        const altas = ["error", "falla", "incidente", "no puedo", "fallo"];
        if (altas.some((p) => texto.includes(p)) && (prioridad === "baja" || prioridad === "media")) {
            prioridad = "alta";
        }
        return prioridad;
    };

    const getLiderAsignadoPorArea = (areaId?: string) => {
        if (!areaId) return null;
        const area = areas.find((a) => a.id === areaId);
        if (!area) return null;
        const principal = area.asignaciones?.find((a) => a.es_principal) || area.asignaciones?.[0];
        if (!principal?.usuario) return "Sin líder asignado";
        const apellido = principal.usuario.primer_apellido ? ` ${principal.usuario.primer_apellido}` : "";
        return `${principal.usuario.nombre}${apellido}`;
    };

    const getSolicitanteLabel = (ticket: Ticket) => {
        if (ticket.solicitante) {
            const apellidos = [ticket.solicitante.primer_apellido, ticket.solicitante.segundo_apellido]
                .filter(Boolean)
                .join(" ");
            return `${ticket.solicitante.nombre} ${apellidos}`.trim();
        }
        return ticket.solicitante_id;
    };

    const filteredTickets = tickets.filter(ticket =>
        matchesTextSearch(searchTerm, ticket)
    );

    const canEditTicket = (ticket: Ticket) =>
        ticket.solicitante_id === currentUserId && ticket.estado === "abierto";

    const canDeleteTicket = (ticket: Ticket) =>
        ticket.solicitante_id === currentUserId && ticket.estado === "abierto";

    const canResolveTicket = (ticket: Ticket) => {
        if (ticket.estado === "resuelto" || ticket.estado === "cerrado") return false;
        return (
            ticket.asignado_a === currentUserId ||
            (Boolean(currentAreaId) && ticket.area_destino_id === currentAreaId)
        );
    };

    if (loading) {
        return <LoadingSpinner message="Cargando tickets" />;
    }

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
            <TooltipProvider>
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Header Profesional */}
                    <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                                    <LifeBuoy className="h-9 w-9 text-[#2563EB]" />
                                    Mesa de Ayuda
                                </h1>
                                <p className="text-[#6B7280] mt-2 text-lg">
                                    Gestiona solicitudes de soporte, consultas y mejoras del sistema de calidad
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                    <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                                        {total} tickets
                                    </Badge>
                                    {abiertos > 0 && (
                                        <Badge className="bg-[#FEF2F2] text-[#EF4444] border border-[#EF4444]/30">
                                            {abiertos} abiertos
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <Button
                                onClick={handleCreate}
                                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Nuevo Ticket
                            </Button>
                        </div>
                    </div>

                    {/* Tarjetas de métricas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardDescription className="font-bold text-[#1E3A8A]">Total Tickets</CardDescription>
                                    <TicketIcon className="h-8 w-8 text-[#2563EB]" />
                                </div>
                                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-[#6B7280] font-medium">
                                    Registrados en el sistema
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardDescription className="font-bold text-[#991B1B]">Abiertos</CardDescription>
                                    <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
                                </div>
                                <CardTitle className="text-4xl font-bold text-[#991B1B]">{abiertos}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                                    Requieren atención
                                </Badge>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#DBEAFE] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardDescription className="font-bold text-[#1E3A8A]">En Progreso</CardDescription>
                                    <Clock className="h-8 w-8 text-[#2563EB]" />
                                </div>
                                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{enProgreso}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-[#6B7280] font-medium">
                                    Siendo atendidos
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardDescription className="font-bold text-[#065F46]">Resueltos</CardDescription>
                                    <CheckCircle className="h-8 w-8 text-[#10B981]" />
                                </div>
                                <CardTitle className="text-4xl font-bold text-[#065F46]">{resueltos}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-[#6B7280] font-medium">
                                    Cerrados satisfactoriamente
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Guía de Uso */}
                    <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
                        <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                            <CardTitle className="text-lg text-[#1E3A8A]">Guía para Crear Tickets Efectivos</CardTitle>
                            <CardDescription>Mejores prácticas para una atención rápida</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                                    <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                                    <div>
                                        <span className="font-bold text-[#1E3A8A] block mb-1">Título Claro</span>
                                        <span className="text-[#6B7280]">Resume el problema en pocas palabras.</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                                    <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                                    <div>
                                        <span className="font-bold text-[#065F46] block mb-1">Descripción Detallada</span>
                                        <span className="text-[#6B7280]">Pasos para reproducir, pantallas, errores exactos.</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                                    <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                                    <div>
                                        <span className="font-bold text-[#9A3412] block mb-1">Adjunta Evidencia</span>
                                        <span className="text-[#6B7280]">Carga archivos para acelerar la atención.</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Buscador */}
                    <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
                            <Input
                                placeholder={SEARCH_ANY_PLACEHOLDER}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 py-6 rounded-xl border-[#E5E7EB]"
                            />
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
                        <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de Tickets</h2>
                            <div className="flex items-center gap-4">
                                <Button variant="outline" size="sm" onClick={fetchTickets}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Actualizar
                                </Button>
                                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                                    {filteredTickets.length} resultados
                                </Badge>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-[#F8FAFC]">
                                    <TableRow>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Título</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Enviado por</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Área</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Categoría</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Prioridad</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Estado</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha</TableHead>
                                        <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTickets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-20 text-[#6B7280]">
                                                <div className="flex flex-col items-center">
                                                    <LifeBuoy className="h-16 w-16 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">
                                                        {searchTerm ? "No se encontraron tickets" : "No hay tickets registrados"}
                                                    </p>
                                                    {!searchTerm && (
                                                        <Button onClick={handleCreate} className="mt-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
                                                            <Plus className="mr-2 h-5 w-5" />
                                                            Crear primer ticket
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredTickets.map((ticket) => (
                                            <TableRow key={ticket.id} className="hover:bg-[#F5F3FF] transition-colors">
                                                <TableCell className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">{ticket.titulo}</span>
                                                        <span className="text-sm text-[#6B7280] line-clamp-2 max-w-md">
                                                            {ticket.descripcion || "Sin descripción"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-[#374151]">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{getSolicitanteLabel(ticket)}</span>
                                                        {ticket.solicitante?.correo_electronico && (
                                                            <span className="text-xs text-[#6B7280]">{ticket.solicitante.correo_electronico}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4">
                                                    {ticket.area_destino_id ? (areas.find(a => a.id === ticket.area_destino_id)?.nombre || "Sin área") : "Sin área"}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 capitalize">{ticket.categoria.replace("_", " ")}</TableCell>
                                                <TableCell className="px-6 py-4">{getPriorityBadge(ticket.prioridad)}</TableCell>
                                                <TableCell className="px-6 py-4">{getStatusBadge(ticket.estado)}</TableCell>
                                                <TableCell className="px-6 py-4 text-[#6B7280]">
                                                    {new Date(ticket.creado_en).toLocaleDateString('es-CO')}
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button size="sm" variant="outline" onClick={() => handleView(ticket)} className="rounded-xl">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>Ver detalle</p></TooltipContent>
                                                        </Tooltip>
                                                        {canEditTicket(ticket) && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="sm" variant="outline" onClick={() => handleEdit(ticket)} className="rounded-xl">
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Editar</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        {canDeleteTicket(ticket) && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(ticket)} className="rounded-xl">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Eliminar</p></TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Dialog Crear/Editar Ticket */}
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                                    {dialogMode === 'create' && <><Plus className="h-7 w-7 text-[#2563EB]" /> Crear Nuevo Ticket</>}
                                    {dialogMode === 'edit' && <><Edit className="h-7 w-7 text-[#2563EB]" /> Editar Ticket</>}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="font-bold">
                                                Título <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                value={formData.titulo}
                                                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                                placeholder="Ej: Error al generar reporte mensual"
                                                className="rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold">Categoría</Label>
                                            <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="soporte">Soporte Técnico</SelectItem>
                                                    <SelectItem value="consulta">Consulta (ISO/Procesos)</SelectItem>
                                                    <SelectItem value="mejora">Solicitud de Mejora</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold">Área destino</Label>
                                        <Select
                                            value={formData.area_destino_id || "__none"}
                                            onValueChange={(v) =>
                                                setFormData({
                                                    ...formData,
                                                    area_destino_id: v === "__none" ? undefined : v,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none">Sin área</SelectItem>
                                                {areas.map((area) => (
                                                    <SelectItem key={area.id} value={area.id}>
                                                        {area.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {formData.area_destino_id && (
                                            <p className="text-xs text-[#6B7280]">
                                                Se asignará a:{" "}
                                                <span className="font-semibold text-[#1E3A8A]">
                                                    {getLiderAsignadoPorArea(formData.area_destino_id)}
                                                </span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4 text-sm text-[#1E3A8A]">
                                        La prioridad se asigna automáticamente según el tipo de solicitud y su descripción.
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold">
                                            Descripción <span className="text-red-500">*</span>
                                        </Label>
                                        <Textarea
                                            value={formData.descripcion}
                                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                            placeholder="Describe detalladamente el problema, pasos para reproducirlo, capturas si aplica..."
                                            rows={6}
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold">Adjuntar documento (opcional)</Label>
                                        <Input
                                            type="file"
                                            onChange={(e) => setAdjunto(e.target.files?.[0] || null)}
                                            className="rounded-xl"
                                        />
                                        <p className="text-xs text-[#6B7280]">
                                            Puedes subir PDF, Word, Excel o imagen como evidencia de la solicitud.
                                        </p>
                                        {formData.archivo_adjunto_url && !adjunto && (
                                            <a
                                                href={formData.archivo_adjunto_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-[#2563EB] text-sm font-medium hover:underline"
                                            >
                                                <Paperclip className="h-4 w-4" />
                                                Ver adjunto actual
                                            </a>
                                        )}
                                    </div>
                                </div>

                            <DialogFooter className="gap-4">
                                <Button variant="outline" onClick={() => setOpenDialog(false)} className="rounded-xl">
                                    Cancelar
                                </Button>
                                <Button onClick={handleSave} disabled={saving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold">
                                        {saving ? (
                                            <>
                                                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-5 w-5" />
                                                {dialogMode === 'create' ? 'Enviar Ticket' : 'Guardar Cambios'}
                                            </>
                                        )}
                                    </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <VistaDocumentoSGCDialog
                        open={showDocumento}
                        onOpenChange={(open) => {
                            setShowDocumento(open);
                            if (!open) setShowResolveDialog(false);
                        }}
                        data={
                            selectedTicket
                                ? datosSGCDesdeTicket(
                                    selectedTicket,
                                    selectedTicket.area_destino_id
                                        ? areas.find((a) => a.id === selectedTicket.area_destino_id)?.nombre
                                        : undefined,
                                )
                                : null
                        }
                        title="Ticket de mesa de ayuda"
                        description="Documento controlado con la solicitud, asignación y solución del ticket."
                        extraActions={
                            selectedTicket ? (
                                <>
                                    {canEditTicket(selectedTicket) && (
                                        <Button
                                            variant="outline"
                                            className="rounded-xl"
                                            onClick={() => {
                                                setShowDocumento(false);
                                                handleEdit(selectedTicket);
                                            }}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Editar
                                        </Button>
                                    )}
                                    {canResolveTicket(selectedTicket) && (
                                        <Button
                                            className="rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
                                            onClick={() => setShowResolveDialog(true)}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Resolver
                                        </Button>
                                    )}
                                </>
                            ) : null
                        }
                    />

                    <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
                        <DialogContent className="max-w-lg rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-[#1E3A8A] flex items-center gap-2">
                                    <CheckCircle className="h-6 w-6 text-[#10B981]" />
                                    Resolver ticket
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-[#166534]">Solución técnica</Label>
                                    <Textarea
                                        value={resolutionText}
                                        onChange={(e) => setResolutionText(e.target.value)}
                                        placeholder="Describe cómo se solucionó el problema..."
                                        className="rounded-xl"
                                        rows={4}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-[#166534]">Documento de solución (opcional)</Label>
                                    <Input
                                        type="file"
                                        onChange={(e) => setResolutionFile(e.target.files?.[0] || null)}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" className="rounded-xl" onClick={() => setShowResolveDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleResolve}
                                    disabled={saving || !resolutionText.trim()}
                                    className="rounded-xl bg-[#10B981] hover:bg-[#059669] text-white"
                                >
                                    {saving ? "Guardando..." : "Confirmar solución"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* AlertDialog de Eliminación */}
                    <AlertDialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
                        <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <Trash2 className="h-5 w-5 text-[#EF4444]" />
                                    ¿Eliminar ticket?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {deleteDialog.ticket && (
                                        <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EB] mt-4">
                                            <p className="font-bold">{deleteDialog.ticket.titulo}</p>
                                            <p className="text-sm mt-3 text-[#991B1B] font-medium">
                                                Esta acción es permanente y no se podrá deshacer.
                                            </p>
                                        </div>
                                    )}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-[#EF4444] hover:bg-[#DC2626] rounded-xl">
                                    Eliminar Ticket
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </TooltipProvider>
        </div>
    );
}
