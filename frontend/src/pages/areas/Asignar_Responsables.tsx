import { useEffect, useState } from "react";
import {
  UserPlus,
  Users,
  Building2,
  AlertCircle,
  Eye,
  Trash2,
  Save,
  Search,
  ShieldCheck,
  Calendar,
  Hash,
  RefreshCw,
} from "lucide-react";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Area {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
}

interface Usuario {
  id: string;
  documento?: number;
  nombre: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  correo_electronico: string;
  nombre_usuario?: string;
  rol?: string;
}

interface Asignacion {
  id: string;
  area_id: string;
  usuario_id: string;
  area: Area;
  usuario: Usuario;
  es_principal: boolean;
  creado_en: string;
}

import { apiClient } from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeAsignacionResponsable } from "@/utils/documentosRegistrosSGC";

// ... previous interfaces

export default function AsignarResponsables() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "view">("create");
  const [showDocumento, setShowDocumento] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<Asignacion | null>(null);
  const [formData, setFormData] = useState({
    area_id: "",
    usuario_id: "",
    es_principal: false,
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroUsuarioForm, setFiltroUsuarioForm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    asignacion: Asignacion | null;
  }>({ open: false, asignacion: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [asignacionesRes, areasRes, usuariosRes] = await Promise.all([
        apiClient.get<Asignacion[]>("/asignaciones"),
        apiClient.get<Area[]>("/areas"),
        apiClient.get<Usuario[]>("/usuarios", { params: { limit: 1000, activo: true } }),
      ]);

      setAsignaciones(Array.isArray(asignacionesRes.data) ? asignacionesRes.data : []);
      setAreas(Array.isArray(areasRes.data) ? areasRes.data : []);
      setUsuarios(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setDialogMode("create");
    setFormData({ area_id: "", usuario_id: "", es_principal: false });
    setFiltroUsuarioForm("");
    setSelectedAsignacion(null);
    setShowDialog(true);
  };

  const handleView = (asignacion: Asignacion) => {
    setSelectedAsignacion(asignacion);
    setShowDocumento(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.area_id || !formData.usuario_id) {
        toast.error("Selecciona un área y un usuario");
        return;
      }

      await apiClient.post("/asignaciones", formData);

      await fetchData();
      setShowDialog(false);
      toast.success("Responsable asignado con éxito!");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (asignacion: Asignacion) => {
    setDeleteDialog({ open: true, asignacion });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, asignacion: null });
  };

  const handleDelete = async () => {
    const asignacion = deleteDialog.asignacion;
    if (!asignacion) return;

    try {
      await apiClient.delete(`/asignaciones/${asignacion.id}`);

      await fetchData();
      toast.success("Asignación eliminada");
      closeDeleteDialog();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    }
  };

  const filteredAsignaciones = asignaciones.filter((a) =>
    matchesTextSearch(
      searchTerm,
      a,
      a.area,
      a.usuario,
      a.usuario?.documento,
      a.usuario?.correo_electronico,
      a.usuario?.nombre_usuario,
      `${a.usuario?.nombre || ""} ${a.usuario?.segundo_nombre || ""} ${a.usuario?.primer_apellido || ""} ${a.usuario?.segundo_apellido || ""}`,
      a.area?.codigo,
      a.area?.nombre,
    )
  );

  const usuariosFiltradosForm = usuarios.filter((usuario) =>
    matchesTextSearch(
      filtroUsuarioForm,
      usuario,
      usuario.documento,
      usuario.correo_electronico,
      usuario.nombre_usuario,
      `${usuario.nombre || ""} ${usuario.segundo_nombre || ""} ${usuario.primer_apellido || ""} ${usuario.segundo_apellido || ""}`,
    )
  );

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  const totalAsignaciones = asignaciones.length;
  const areasConResponsable = new Set(asignaciones.map((a) => a.area_id)).size;
  const areasSinResponsable = areas.length - areasConResponsable;
  const responsablesPrincipales = asignaciones.filter((a) => a.es_principal).length;
  const coveragePercentage = areas.length === 0 ? 0 : Math.round((areasConResponsable / areas.length) * 100);

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header Profesional */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <UserPlus className="h-9 w-9 text-[#2563EB]" />
                  Asignación de Responsables
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  Vincula usuarios a áreas del sistema de gestión de calidad
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {totalAsignaciones} asignaciones
                  </Badge>
                  <Badge className="bg-[#ECFDF5] text-[#22C55E] border border-[#22C55E]/30">
                    {responsablesPrincipales} principales
                  </Badge>
                  {areasSinResponsable > 0 && (
                    <Badge className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/30">
                      {areasSinResponsable} sin asignar
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Nueva Asignación
              </Button>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total Asignaciones</CardDescription>
                  <Users className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{totalAsignaciones}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Activas en el sistema
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Áreas Cubiertas</CardDescription>
                  <Building2 className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{areasConResponsable}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium mb-2">
                  Cobertura: {coveragePercentage}%
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-3">
                  <div
                    className="bg-[#10B981] h-3 rounded-full transition-all"
                    style={{ width: `${coveragePercentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#9A3412]">Sin Responsable</CardDescription>
                  <AlertCircle className="h-8 w-8 text-[#F97316]/50" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#9A3412]">{areasSinResponsable}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                  Pendiente
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Responsables Principales</CardDescription>
                  <ShieldCheck className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{responsablesPrincipales}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/80 text-[#10B981] border-[#10B981]/20 font-bold uppercase text-[10px]">
                  Liderazgo
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Guía de Asignación */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Asignación</CardTitle>
              <CardDescription>
                Pasos para asignar responsables de manera efectiva
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">Seleccionar Área</span>
                    <span className="text-[#6B7280]">Elige la área organizacional.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold text-[#065F46] block mb-1">Asignar Usuario</span>
                    <span className="text-[#6B7280]">Vincula al responsable adecuado.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold text-[#9A3412] block mb-1">Definir Principal</span>
                    <span className="text-[#6B7280]">Marca si es líder del área.</span>
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

          {/* Tabla principal */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1E3A8A]">Asignaciones Actuales</h2>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredAsignaciones.length} resultados
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código Área</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Área</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Responsable</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Email</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Tipo</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Fecha</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAsignaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-[#6B7280]">
                        <div className="flex flex-col items-center">
                          <UserPlus className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            {searchTerm ? "No se encontraron asignaciones" : "No hay asignaciones aún"}
                          </p>
                          {!searchTerm && (
                            <Button onClick={handleCreate} className="mt-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
                              <UserPlus className="mr-2 h-5 w-5" />
                              Hacer primera asignación
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAsignaciones.map((asignacion) => (
                      <TableRow key={asignacion.id} className="hover:bg-[#F5F3FF] transition-colors">
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-[#E0EDFF] text-[#2563EB] font-bold px-4 py-2">
                            {asignacion.area?.codigo || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-bold">{asignacion.area?.nombre || "Área no disponible"}</TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-lg">
                              {(asignacion.usuario?.nombre || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{asignacion.usuario?.nombre || "Usuario no disponible"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">{asignacion.usuario?.correo_electronico || "—"}</TableCell>
                        <TableCell className="px-6 py-4">
                          {asignacion.es_principal ? (
                            <Badge className="bg-[#ECFDF5] text-[#22C55E] border-[#22C55E]/30">
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              Principal
                            </Badge>
                          ) : (
                            <Badge variant="outline">Apoyo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">
                          {new Date(asignacion.creado_en).toLocaleDateString("es-CO")}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => handleView(asignacion)} className="rounded-xl">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Ver detalles</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(asignacion)} className="rounded-xl">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Eliminar</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <VistaDocumentoSGCDialog
            open={showDocumento}
            onOpenChange={(open) => {
              setShowDocumento(open);
              if (!open) setSelectedAsignacion(null);
            }}
            data={selectedAsignacion ? datosSGCDesdeAsignacionResponsable(selectedAsignacion) : null}
            title="Asignación de responsable"
            description="Documento controlado con el responsable asignado al área."
          />

          {/* Diálogo de Crear/Ver */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  {dialogMode === "create" ? (
                    <><UserPlus className="h-7 w-7 text-[#2563EB]" /> Nueva Asignación</>
                  ) : (
                    <><Eye className="h-7 w-7 text-[#2563EB]" /> Detalles de Asignación</>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-8 py-4">
                {dialogMode === "create" ? (
                  <>
                    <div className="space-y-2">
                      <Label className="font-bold">
                        Área a Asignar <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.area_id} onValueChange={(v) => setFormData({ ...formData, area_id: v })}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecciona un área" />
                        </SelectTrigger>
                        <SelectContent>
                          {areas.map((area) => (
                            <SelectItem key={area.id} value={area.id}>
                              [{area.codigo}] {area.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">
                        Responsable <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder={SEARCH_ANY_PLACEHOLDER}
                        value={filtroUsuarioForm}
                        onChange={(e) => setFiltroUsuarioForm(e.target.value)}
                        className="rounded-xl"
                      />
                      <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-white">
                        {usuariosFiltradosForm.length === 0 ? (
                          <p className="px-4 py-6 text-sm text-[#6B7280] text-center">
                            No se encontraron usuarios con ese criterio (CC, correo, nombre o usuario).
                          </p>
                        ) : (
                          usuariosFiltradosForm.map((u) => {
                            const seleccionado = formData.usuario_id === u.id;
                            const nombre = `${u.nombre} ${u.segundo_nombre || ""} ${u.primer_apellido || ""} ${u.segundo_apellido || ""}`.replace(/\s+/g, " ").trim();
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, usuario_id: u.id })}
                                className={`w-full text-left px-4 py-3 border-b border-[#F3F4F6] last:border-b-0 ${
                                  seleccionado ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                                }`}
                              >
                                <p className="font-medium text-[#111827]">{nombre}</p>
                                <p className="text-xs text-[#6B7280]">
                                  {u.documento ? `CC ${u.documento} · ` : ""}
                                  {u.correo_electronico || "Sin correo"}
                                  {u.nombre_usuario ? ` · @${u.nombre_usuario}` : ""}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                      <Checkbox
                        id="principal"
                        checked={formData.es_principal}
                        onCheckedChange={(checked) => setFormData({ ...formData, es_principal: !!checked })}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="principal" className="text-base font-medium cursor-pointer">
                          Marcar como Responsable Principal
                        </Label>
                        <p className="text-sm text-[#6B7280]">
                          Otorga permisos adicionales y liderazgo sobre el área
                        </p>
                      </div>
                    </div>
                  </>
                ) : selectedAsignacion && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                        <Label className="text-[#6B7280] uppercase text-xs font-bold">Área</Label>
                        <div className="mt-3">
                          <Badge className="text-lg px-4 py-2 bg-[#2563EB]/10 text-[#2563EB] mb-2">
                            {selectedAsignacion.area.codigo}
                          </Badge>
                          <p className="text-2xl font-bold text-[#111827]">{selectedAsignacion.area.nombre}</p>
                          {selectedAsignacion.area.descripcion && (
                            <p className="text-[#6B7280] mt-3">{selectedAsignacion.area.descripcion}</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                        <Label className="text-[#6B7280] uppercase text-xs font-bold">Responsable</Label>
                        <div className="flex items-center gap-4 mt-3">
                          <div className="h-16 w-16 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-2xl font-bold">
                            {selectedAsignacion.usuario.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-[#111827]">{selectedAsignacion.usuario.nombre}</p>
                            <p className="text-[#6B7280]">{selectedAsignacion.usuario.correo_electronico}</p>
                            <p className="text-sm text-[#6B7280] mt-1">Rol: {selectedAsignacion.usuario.rol}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      {selectedAsignacion.es_principal ? (
                        <Badge className="text-lg px-8 py-4 bg-[#ECFDF5] text-[#22C55E] border-[#22C55E]/30">
                          <ShieldCheck className="h-6 w-6 mr-3" />
                          Responsable Principal
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-lg px-8 py-4">
                          Responsable de Apoyo
                        </Badge>
                      )}
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-[#E5E7EB]">
                      <Label className="text-[#6B7280] uppercase text-xs font-bold">Fecha de Asignación</Label>
                      <p className="text-xl font-medium mt-3">
                        {new Date(selectedAsignacion.creado_en).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="gap-4">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                  {dialogMode === "view" ? "Cerrar" : "Cancelar"}
                </Button>
                {dialogMode === "create" && (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold"
                  >
                    {saving ? (
                      <>
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        Asignando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Asignar Responsable
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* AlertDialog de Eliminación */}
          <AlertDialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-[#EF4444]" />
                  ¿Eliminar asignación?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteDialog.asignacion && (
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EB] mt-4">
                      <p className="font-bold">{deleteDialog.asignacion.usuario.nombre}</p>
                      <p className="text-sm text-[#6B7280]">Área: {deleteDialog.asignacion.area.nombre} ({deleteDialog.asignacion.area.codigo})</p>
                      <p className="text-sm mt-3 text-[#991B1B] font-medium">
                        Esta acción es permanente.
                      </p>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-[#EF4444] hover:bg-[#DC2626] rounded-xl">
                  Eliminar Asignación
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </div>
  );
}
