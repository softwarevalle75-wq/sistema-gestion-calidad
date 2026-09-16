import { useEffect, useState } from "react";
import {
  AlertTriangle, Plus, Users, UserCheck, UserX, AlertCircle,
  Eye, Trash2, Save, Building2, Hash, FileText, Calendar, Search, Edit, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { apiClient } from "@/lib/api";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeArea } from "@/utils/documentosRegistrosSGC";
import { CampoCodigoAutomatico, useCodigoAutomatico } from "@/components/forms/CampoCodigoAutomatico";

interface Usuario {
  id: string;
  nombre: string;
  primer_apellido: string;
  correo_electronico: string;
}

interface Asignacion {
  id: string;
  usuario_id: string;
  es_principal: boolean;
  usuario: Usuario;
}

interface Area {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  creado_en: string;
  actualizado_en: string;
  asignaciones: Asignacion[];
}

export default function AreasResponsables() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDocumento, setShowDocumento] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: ''
  });
  const [saving, setSaving] = useState(false);
  const codigoAutomatico = useCodigoAutomatico("area", showDialog && dialogMode === "create");

  useEffect(() => {
    if (dialogMode === "create" && codigoAutomatico) {
      setFormData((prev) => ({ ...prev, codigo: codigoAutomatico }));
    }
  }, [codigoAutomatico, dialogMode]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; area: Area | null }>({
    open: false,
    area: null,
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Area[]>("/areas");
      setAreas(response.data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar áreas");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setDialogMode('create');
    setFormData({ codigo: '', nombre: '', descripcion: '' });
    setSelectedArea(null);
    setShowDialog(true);
  };

  const handleEdit = (area: Area) => {
    setDialogMode('edit');
    setFormData({
      codigo: area.codigo,
      nombre: area.nombre,
      descripcion: area.descripcion || ''
    });
    setSelectedArea(area);
    setShowDialog(true);
  };

  const handleView = (area: Area) => {
    setSelectedArea(area);
    setShowDocumento(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.nombre.trim()) {
        toast.error("El nombre es obligatorio");
        return;
      }

      if (dialogMode === 'create') {
        await apiClient.post("/areas", formData);
      } else {
        await apiClient.put(`/areas/${selectedArea?.id}`, formData);
      }

      await fetchAreas();
      setShowDialog(false);
      toast.success(dialogMode === 'create' ? 'Área creada con éxito!' : 'Área actualizada con éxito!');
    } catch (error: any) {
      toast.error(error.message || "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (area: Area) => {
    setDeleteDialog({ open: true, area });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, area: null });
  };

  const handleDelete = async () => {
    const area = deleteDialog.area;
    if (!area) return;

    try {
      await apiClient.delete(`/areas/${area.id}`);
      await fetchAreas();
      toast.success('Área eliminada correctamente');
      closeDeleteDialog();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    }
  };

  const filteredAreas = areas.filter((a) => matchesTextSearch(searchTerm, a));

  if (loading) {
    return <LoadingSpinner message="Cargando" />;
  }

  const total = areas.length;
  const asignadas = areas.filter(a => a.asignaciones && a.asignaciones.length > 0).length;
  const sinAsignar = total - asignadas;
  const conIncidencias = 0;
  const coveragePercentage = total === 0 ? 0 : Math.round((asignadas / total) * 100);

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header Profesional */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <Building2 className="h-9 w-9 text-[#2563EB]" />
                  Gestión de Áreas Responsables
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  Administra las áreas organizacionales del sistema de calidad
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {total} áreas
                  </Badge>
                  {sinAsignar > 0 && (
                    <Badge className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/30">
                      {sinAsignar} sin responsable
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm rounded-xl px-6 py-6 h-auto font-bold"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nueva Área
              </Button>
            </div>
          </div>

          {/* Tarjetas de métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#1E3A8A]">Total Áreas</CardDescription>
                  <Users className="h-8 w-8 text-[#2563EB]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#1E3A8A]">{total}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] font-medium">
                  Registradas en el sistema
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#065F46]">Asignadas</CardDescription>
                  <UserCheck className="h-8 w-8 text-[#10B981]" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#065F46]">{asignadas}</CardTitle>
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
                  <UserX className="h-8 w-8 text-[#F97316]/50" />
                </div>
                <CardTitle className="text-4xl font-bold text-[#9A3412]">{sinAsignar}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/80 text-[#F97316] border-[#F97316]/20 font-bold uppercase text-[10px]">
                  Pendiente asignación
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-[#FEF2F2] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-bold text-[#991B1B]">Con Incidencias</CardDescription>
                  <div className="h-6 w-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
                  </div>
                </div>
                <CardTitle className="text-4xl font-bold text-[#991B1B]">{conIncidencias}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-white/80 text-[#EF4444] border-[#EF4444]/20 font-bold uppercase text-[10px]">
                  Atención requerida
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Guía de Gestión */}
          <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
            <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
              <CardTitle className="text-lg text-[#1E3A8A]">Guía de Gestión de Áreas</CardTitle>
              <CardDescription>
                Mejores prácticas para mantener las áreas actualizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="flex items-start gap-3 p-4 bg-[#EFF6FF] rounded-xl border border-[#DBEAFE]">
                  <div className="h-8 w-8 rounded-lg bg-[#2563EB] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <span className="font-bold text-[#1E3A8A] block mb-1">Definir Claramente</span>
                    <span className="text-[#6B7280]">Código único y descripción detallada.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#ECFDF5] rounded-xl border border-[#D1FAE5]">
                  <div className="h-8 w-8 rounded-lg bg-[#10B981] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <span className="font-bold text-[#065F46] block mb-1">Asignar Responsable</span>
                    <span className="text-[#6B7280]">Designa un líder para cada área.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#FFF7ED] rounded-xl border border-[#FBBF24]/20">
                  <div className="h-8 w-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <span className="font-bold text-[#9A3412] block mb-1">Revisar Periódicamente</span>
                    <span className="text-[#6B7280]">Actualiza según cambios organizacionales.</span>
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
              <h2 className="text-xl font-bold text-[#1E3A8A]">Listado de Áreas</h2>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={fetchAreas}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
                <Badge variant="outline" className="bg-white border-[#E5E7EB] text-[#6B7280]">
                  {filteredAreas.length} resultados
                </Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8FAFC]">
                  <TableRow>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Código</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Nombre</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Responsables</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Descripción</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A]">Creado</TableHead>
                    <TableHead className="px-6 py-4 font-bold text-[#1E3A8A] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAreas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-[#6B7280]">
                        <div className="flex flex-col items-center">
                          <Building2 className="h-16 w-16 text-gray-300 mb-4" />
                          <p className="text-lg font-medium">
                            {searchTerm ? "No se encontraron áreas" : "No hay áreas registradas"}
                          </p>
                          {!searchTerm && (
                            <Button onClick={handleCreate} className="mt-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl">
                              <Plus className="mr-2 h-5 w-5" />
                              Crear primera área
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAreas.map((area) => (
                      <TableRow key={area.id} className="hover:bg-[#F5F3FF] transition-colors">
                        <TableCell className="px-6 py-4">
                          <Badge className="bg-[#E0EDFF] text-[#2563EB] font-bold px-4 py-2">
                            {area.codigo}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-bold">{area.nombre}</TableCell>
                        <TableCell className="px-6 py-4">
                          {area.asignaciones && area.asignaciones.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {area.asignaciones.map((asig) => (
                                <Badge
                                  key={asig.id}
                                  className={asig.es_principal ? "bg-[#10B981] text-white" : "bg-[#E0EDFF] text-[#2563EB]"}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  {asig.usuario.nombre} {asig.usuario.primer_apellido}
                                  {asig.es_principal && " ★"}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge className="bg-[#FEF3C7] text-[#92400E]">
                              <UserX className="h-3 w-3 mr-1" />
                              Sin asignar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280] max-w-md">
                          {area.descripcion || <span className="italic">Sin descripción</span>}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-[#6B7280]">
                          {new Date(area.creado_en).toLocaleDateString('es-CO')}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => handleView(area)} className="rounded-xl">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Ver detalles</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => handleEdit(area)} className="rounded-xl">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Editar</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="destructive" onClick={() => openDeleteDialog(area)} className="rounded-xl">
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
            }}
            data={selectedArea ? datosSGCDesdeArea(selectedArea) : null}
            title="Área del SGC"
            description="Documento controlado con la caracterización del área y sus responsables."
            extraActions={
              selectedArea ? (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setShowDocumento(false);
                    handleEdit(selectedArea);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              ) : null
            }
          />

          {/* Dialog de Crear/Editar/Ver */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  {dialogMode === 'create' && <><Plus className="h-7 w-7 text-[#2563EB]" /> Nueva Área</>}
                  {dialogMode === 'edit' && <><Edit className="h-7 w-7 text-[#2563EB]" /> Editar Área</>}
                  {dialogMode === 'view' && <><Eye className="h-7 w-7 text-[#2563EB]" /> Detalles del Área</>}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-8 py-4">
                {dialogMode === 'view' && selectedArea ? (
                  <>
                    <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <Label className="text-[#6B7280] uppercase text-xs font-bold">Código</Label>
                          <Badge className="mt-2 text-lg px-6 py-3 bg-[#2563EB]/10 text-[#2563EB] font-bold">
                            {selectedArea.codigo}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-[#6B7280] uppercase text-xs font-bold">Nombre</Label>
                          <p className="mt-2 text-2xl font-bold text-[#111827]">{selectedArea.nombre}</p>
                        </div>
                      </div>
                    </div>

                    {selectedArea.descripcion && (
                      <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E5E7EB]">
                        <Label className="text-[#6B7280] uppercase text-xs font-bold mb-3 block">Descripción</Label>
                        <p className="text-[#111827] leading-relaxed">{selectedArea.descripcion}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl p-6 border border-[#E5E7EB]">
                        <Label className="text-[#6B7280] uppercase text-xs font-bold">Creado el</Label>
                        <p className="mt-2 text-lg font-medium">
                          {new Date(selectedArea.creado_en).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-6 border border-[#E5E7EB]">
                        <Label className="text-[#6B7280] uppercase text-xs font-bold">Última actualización</Label>
                        <p className="mt-2 text-lg font-medium">
                          {new Date(selectedArea.actualizado_en).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CampoCodigoAutomatico value={formData.codigo} />
                      <div className="space-y-2">
                        <Label className="font-bold">
                          Nombre <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          placeholder="Gestión de Calidad"
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-bold">Descripción</Label>
                      <Textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        placeholder="Describe funciones y responsabilidades..."
                        rows={6}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-4">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
                  {dialogMode === 'view' ? 'Cerrar' : 'Cancelar'}
                </Button>
                {dialogMode !== 'view' && (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl font-bold"
                  >
                    {saving ? (
                      <>
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Guardar Área
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
                  ¿Eliminar área?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteDialog.area && (
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EB] mt-4">
                      <p className="font-bold">{deleteDialog.area.nombre}</p>
                      <p className="text-sm text-[#6B7280]">Código: {deleteDialog.area.codigo}</p>
                      {deleteDialog.area.asignaciones?.length ? (
                        <p className="text-sm mt-3 text-[#9A3412] font-medium">
                          Los {deleteDialog.area.asignaciones.length} usuario(s) asignados quedarán sin área y se eliminarán las asignaciones de responsables.
                        </p>
                      ) : null}
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
                  Eliminar Área
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </div>
  );
}