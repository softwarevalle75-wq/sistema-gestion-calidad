import { useEffect, useState } from "react";
import { Crown, Pencil, Plus, Trash2, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usuarioService, Usuario } from "@/services/usuario.service";
import {
    responsableProcesoService,
    ResponsableProceso,
    ResponsableProcesoCreate,
    RolResponsableProceso,
    ROLES_PROCESO,
} from "@/services/responsableProceso.service";
import LoadingSpinner from "../ui/LoadingSpinner";
import { hasAnyPermission } from "@/lib/permissions";

type Props = {
    procesoId: string;
};

const ROLES_OPTIONS: { value: RolResponsableProceso; label: string }[] = [
    { value: "responsable", label: "Responsable" },
    { value: "ejecutor", label: "Ejecutor" },
    { value: "supervisor", label: "Supervisor" },
    { value: "apoyo", label: "Apoyo" },
    { value: "auditor_interno", label: "Auditor Interno" },
];

const defaultForm = (procesoId: string): ResponsableProcesoCreate => ({
    proceso_id: procesoId,
    usuario_id: "",
    rol: "ejecutor",
    es_principal: false,
    observaciones: "",
});

export default function ResponsablesProceso({ procesoId }: Props) {
    const canManageResponsables = hasAnyPermission(["procesos.admin"]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [responsables, setResponsables] = useState<ResponsableProceso[]>([]);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editing, setEditing] = useState<ResponsableProceso | null>(null);
    const [form, setForm] = useState<ResponsableProcesoCreate>(
        defaultForm(procesoId)
    );

    useEffect(() => {
        void cargarDatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [procesoId]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [responsablesData, usuariosData] = await Promise.all([
                responsableProcesoService.getByProceso(procesoId),
                usuarioService.getAllActive(),
            ]);
            setResponsables(responsablesData);
            setUsuarios(usuariosData);
        } catch (error) {
            console.error(error);
            toast.error("No se pudieron cargar los responsables del proceso");
        } finally {
            setLoading(false);
        }
    };

    const abrirNuevo = () => {
        setEditing(null);
        setForm(defaultForm(procesoId));
        setOpenDialog(true);
    };

    const abrirEditar = (resp: ResponsableProceso) => {
        setEditing(resp);
        setForm({
            proceso_id: resp.proceso_id,
            usuario_id: resp.usuario_id,
            rol: resp.rol,
            es_principal: resp.es_principal,
            vigente_hasta: resp.vigente_hasta || undefined,
            observaciones: resp.observaciones || "",
        });
        setOpenDialog(true);
    };

    const guardar = async () => {
        if (!form.usuario_id) {
            toast.error("Debe seleccionar un usuario");
            return;
        }

        try {
            setSaving(true);
            if (editing) {
                await responsableProcesoService.actualizar(editing.id, {
                    rol: form.rol,
                    es_principal: form.es_principal,
                    vigente_hasta: form.vigente_hasta || null,
                    observaciones: form.observaciones,
                });
                toast.success("Asignación actualizada");
            } else {
                await responsableProcesoService.asignar(procesoId, form);
                toast.success("Responsable asignado");
            }
            setOpenDialog(false);
            await cargarDatos();
        } catch (error: any) {
            console.error(error);
            const msg =
                error?.response?.data?.detail || "No se pudo guardar la asignación";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const eliminar = async (responsableId: string) => {
        if (!window.confirm("¿Eliminar esta asignación?")) return;
        try {
            await responsableProcesoService.eliminar(responsableId);
            toast.success("Asignación eliminada");
            await cargarDatos();
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar la asignación");
        }
    };

    if (loading) {
        return <LoadingSpinner message="Cargando equipo" fullScreen={false} />;
    }

    const principal = responsables.find((r) => r.es_principal);
    const resto = responsables.filter((r) => !r.es_principal);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Equipo del Proceso
                    <Badge variant="outline" className="ml-1">
                        {responsables.length}
                    </Badge>
                </h3>
                {canManageResponsables && (
                    <Button onClick={abrirNuevo} className="gap-2" size="sm">
                        <Plus className="h-4 w-4" />
                        Asignar
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-blue-500" />
                        Responsables Formales
                        <span className="text-xs font-normal text-gray-400 ml-1">
                            ISO 9001 — Cláusula 5.3
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {responsables.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-medium">
                                No hay responsables asignados
                            </p>
                            <p className="text-xs mt-1">
                                Asigne roles formales para cumplir con la Cláusula 5.3
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Responsable principal destacado */}
                            {principal && (
                                <div className="border-2 border-blue-300 bg-blue-50/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                                                {principal.usuario_nombre
                                                    ?.split(" ")
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join("") || "?"}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-900">
                                                        {principal.usuario_nombre || "Sin nombre"}
                                                    </p>
                                                    <Crown className="h-4 w-4 text-yellow-500" />
                                                    <Badge className="bg-blue-600 text-white text-xs">
                                                        Principal
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {principal.usuario_correo}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`${ROLES_PROCESO[principal.rol]?.bgColor || ""}`}
                                            >
                                                {ROLES_PROCESO[principal.rol]?.label || principal.rol}
                                            </Badge>
                                            {canManageResponsables && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => abrirEditar(principal)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {canManageResponsables && (
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => eliminar(principal.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Resto del equipo */}
                            {resto.map((resp) => (
                                <div
                                    key={resp.id}
                                    className="border rounded-xl p-4 hover:border-blue-200 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium text-sm">
                                                {resp.usuario_nombre
                                                    ?.split(" ")
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join("") || "?"}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {resp.usuario_nombre || "Sin nombre"}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {resp.usuario_correo}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={`${ROLES_PROCESO[resp.rol]?.bgColor || ""}`}
                                            >
                                                {ROLES_PROCESO[resp.rol]?.label || resp.rol}
                                            </Badge>
                                            {resp.vigente_hasta && (
                                                <Badge variant="outline" className="text-xs">
                                                    Hasta{" "}
                                                    {new Date(resp.vigente_hasta).toLocaleDateString(
                                                        "es-CO"
                                                    )}
                                                </Badge>
                                            )}
                                            {canManageResponsables && (
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => abrirEditar(resp)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {canManageResponsables && (
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => eliminar(resp.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {resp.observaciones && (
                                        <p className="text-xs text-gray-400 mt-2 ml-12">
                                            {resp.observaciones}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Dialog para asignar/editar */}
            <Dialog open={openDialog && canManageResponsables} onOpenChange={setOpenDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Editar asignación" : "Asignar responsable"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        {/* Selector de usuario */}
                        <div>
                            <label className="text-sm font-medium">Usuario *</label>
                            <select
                                className="w-full p-2 border rounded-md mt-1"
                                value={form.usuario_id}
                                onChange={(e) =>
                                    setForm({ ...form, usuario_id: e.target.value })
                                }
                                disabled={!!editing}
                            >
                                <option value="">Seleccione un usuario...</option>
                                {usuarios.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.nombre} {u.primer_apellido} — {u.correo_electronico}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de rol */}
                        <div>
                            <label className="text-sm font-medium">Rol en el proceso *</label>
                            <select
                                className="w-full p-2 border rounded-md mt-1"
                                value={form.rol}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        rol: e.target.value as RolResponsableProceso,
                                    })
                                }
                            >
                                {ROLES_OPTIONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                            {form.rol && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {ROLES_PROCESO[form.rol]?.descripcion}
                                </p>
                            )}
                        </div>

                        {/* Es principal */}
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.es_principal || false}
                                onChange={(e) =>
                                    setForm({ ...form, es_principal: e.target.checked })
                                }
                            />
                            <span className="font-medium">Responsable principal</span>
                            <span className="text-gray-400 text-xs">
                                (solo puede haber uno por proceso)
                            </span>
                        </label>

                        {/* Vigente hasta */}
                        <div>
                            <label className="text-sm font-medium">
                                Vigente hasta (opcional)
                            </label>
                            <Input
                                type="date"
                                value={
                                    form.vigente_hasta
                                        ? new Date(form.vigente_hasta).toISOString().split("T")[0]
                                        : ""
                                }
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        vigente_hasta: e.target.value
                                            ? new Date(e.target.value).toISOString()
                                            : undefined,
                                    })
                                }
                                className="mt-1"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Dejar vacío para asignación indefinida
                            </p>
                        </div>

                        {/* Observaciones */}
                        <div>
                            <label className="text-sm font-medium">Observaciones</label>
                            <Textarea
                                value={form.observaciones || ""}
                                onChange={(e) =>
                                    setForm({ ...form, observaciones: e.target.value })
                                }
                                placeholder="Observaciones sobre esta asignación..."
                                className="min-h-[60px] mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>
                            Cancelar
                        </Button>
                        {canManageResponsables && (
                            <Button onClick={guardar} disabled={saving}>
                                {saving ? "Guardando..." : editing ? "Actualizar" : "Asignar"}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
