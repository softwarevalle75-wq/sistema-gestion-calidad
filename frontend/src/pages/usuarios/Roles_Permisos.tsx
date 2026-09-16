import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchesTextSearch, SEARCH_ANY_PLACEHOLDER } from "@/utils/textSearch";
import {
  Shield,
  Search,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle,
  Lock,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api";
import { hasAnyPermission, asId, sameId } from "@/lib/permissions";
import { refreshCurrentUserSession } from "@/services/auth";
import { VistaDocumentoSGCDialog } from "@/components/documents/VistaDocumentoSGCDialog";
import { datosSGCDesdeRol } from "@/utils/documentosRegistrosSGC";

const ROLES_CANONICOS = new Set(["admin", "lider_proceso", "auditor", "colaborador", "invitado"]);

interface Permiso {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string;
  creado_en: string;
}

interface Rol {
  id: string;
  nombre: string;
  clave: string;
  descripcion?: string;
  creado_en: string;
}

interface RolConPermisos extends Rol {
  permisos?: any[];
  cantidad_permisos?: number;
}

export default function GestionRolesPermisos() {
  const canGestionUsuarios = hasAnyPermission(["usuarios.gestion"]);
  const [roles, setRoles] = useState<RolConPermisos[]>([]);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [rolesFiltrados, setRolesFiltrados] = useState<RolConPermisos[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    type: "ver" | "eliminar" | "crear" | "editar" | "permisos" | null;
    rol: RolConPermisos | null;
  }>({ open: false, type: null, rol: null });

  const [formData, setFormData] = useState({
    nombre: "",
    clave: "",
    descripcion: "",
  });

  const [permisosSeleccionados, setPermisosSeleccionados] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDocumento, setShowDocumento] = useState(false);
  const [rolVista, setRolVista] = useState<RolConPermisos | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filtrarRoles();
  }, [searchTerm, roles]);



  // ... component start

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permisosRes] = await Promise.all([
        apiClient.get("/roles", { params: { limit: 200 } }),
        apiClient.get("/permisos", { params: { limit: 500 } }),
      ]);

      const rolesData = rolesRes.data;
      const permisosData = permisosRes.data;

      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setPermisos(Array.isArray(permisosData) ? permisosData : []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar roles y permisos del servidor");

      const ejemploRoles: RolConPermisos[] = [
        { id: "1", nombre: "Administrador SGC", clave: "admin", descripcion: "Gobernanza total del SGC", creado_en: new Date().toISOString(), cantidad_permisos: 26 },
        { id: "2", nombre: "Líder de Proceso", clave: "lider_proceso", descripcion: "Gestión de documentos, riesgos e indicadores de su área", creado_en: new Date().toISOString(), cantidad_permisos: 14 },
        { id: "3", nombre: "Auditor", clave: "auditor", descripcion: "Consulta total y carga de hallazgos", creado_en: new Date().toISOString(), cantidad_permisos: 8 },
        { id: "4", nombre: "Colaborador", clave: "colaborador", descripcion: "Consulta y carga de evidencias", creado_en: new Date().toISOString(), cantidad_permisos: 6 },
        { id: "5", nombre: "Invitado", clave: "invitado", descripcion: "Mapa y documentos de acceso libre", creado_en: new Date().toISOString(), cantidad_permisos: 1 },
      ];
      setRoles(ejemploRoles);
    } finally {
      setLoading(false);
    }
  };

  const filtrarRoles = () => {
    let resultado = [...roles];
    if (searchTerm.trim()) {
      resultado = resultado.filter((rol) => matchesTextSearch(searchTerm, rol));
    }
    setRolesFiltrados(resultado);
  };

  const openDialog = async (type: "ver" | "eliminar" | "crear" | "editar" | "permisos", rol: RolConPermisos | null = null) => {
    if (type === "ver" && rol) {
      setRolVista(rol);
      setShowDocumento(true);
      try {
        const response = await apiClient.get(`/roles/${rol.id}`);
        const data = response.data;
        setRolVista({
          ...rol,
          ...data,
          permisos: data.permisos || rol.permisos || [],
        });
      } catch (error) {
        console.error("Error al cargar el rol:", error);
      }
      return;
    }

    setDialogState({ open: true, type, rol });

    if (rol) {
      if (type === "editar") {
        setFormData({
          nombre: rol.nombre || "",
          clave: rol.clave || "",
          descripcion: rol.descripcion || "",
        });
      }

      if (type === "permisos") {
        setIsSaving(true);
        try {
          const response = await apiClient.get(`/roles/${rol.id}`);
          const data = response.data;
          const ids = data.permisos?.map((p: any) => asId(p.permiso_id || p.permiso?.id)).filter(Boolean) || [];
          setPermisosSeleccionados(ids);
        } catch (error) {
          console.error("Error:", error);
        } finally {
          setIsSaving(false);
        }
      }
    } else if (type === "crear") {
      setFormData({ nombre: "", clave: "", descripcion: "" });
    }
  };

  const closeDialog = () => {
    setDialogState({ open: false, type: null, rol: null });
    setFormData({ nombre: "", clave: "", descripcion: "" });
    setPermisosSeleccionados([]);
    setIsSaving(false);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim() || !formData.clave.trim()) {
      toast.error("Nombre y clave son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = dialogState.type === "editar";
      const url = isEditing ? `/roles/${dialogState.rol?.id}` : "/roles";

      if (isEditing) {
        await apiClient.put(url, formData);
      } else {
        await apiClient.post(url, formData);
      }

      toast.success(`Rol ${isEditing ? "actualizado" : "creado"} con éxito`);
      await fetchData();
      closeDialog();
    } catch (error: any) {
      toast.error("Error al procesar la solicitud");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!dialogState.rol) return;
    setIsSaving(true);
    try {
      await apiClient.delete(`/roles/${dialogState.rol.id}`);
      toast.success(`Rol eliminado`);
      await fetchData();
      closeDialog();
    } catch (error: any) {
      toast.error("Error al eliminar el rol");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardarPermisos = async () => {
    if (!dialogState.rol) return;
    setIsSaving(true);
    try {
      await apiClient.post(`/roles/${dialogState.rol.id}/permisos`, {
        permisoIds: permisosSeleccionados
      });

      toast.success("Permisos actualizados correctamente");
      await fetchData();
      try {
        await refreshCurrentUserSession();
      } catch {
        // Si falla el refresco de sesión, los permisos ya quedaron guardados en servidor
      }
      closeDialog();
    } catch (error: any) {
      toast.error("Error al asignar permisos");
    } finally {
      setIsSaving(false);
    }
  };

  const sincronizarCatalogoSgc = async () => {
    setIsSyncing(true);
    try {
      const { data } = await apiClient.post("/roles/sincronizar-sgc");
      toast.success(
        `Catálogo SGC aplicado. Migrados: ${data.usuarios_migrados}. Eliminados: ${(data.roles_eliminados || []).join(", ") || "ninguno"}.`
      );
      await fetchData();
    } catch (error) {
      console.error("Error sincronizando RBAC:", error);
      toast.error("No se pudo sincronizar el catálogo de roles SGC");
    } finally {
      setIsSyncing(false);
    }
  };

  const togglePermiso = (permisoId: string, checked?: boolean) => {
    const id = asId(permisoId);
    if (!id) return;
    setPermisosSeleccionados((prev) => {
      const already = prev.includes(id);
      const shouldSelect = checked === undefined ? !already : checked;
      if (shouldSelect) {
        return already ? prev : [...prev, id];
      }
      return prev.filter((p) => p !== id);
    });
  };

  if (loading && !dialogState.open) {
    return <LoadingSpinner message="Cargando Roles y Permisos" />;
  }

  const totalPermisosPosibles = permisos.length;
  const totalAsignados = roles.reduce((acc, r) => acc + (r.permisos?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  <Shield className="h-9 w-9 text-[#2563EB]" />
                  Gestión de Roles y Permisos
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">Administra los accesos del sistema</p>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge className="bg-white text-[#2563EB] border border-[#E5E7EB]">
                    {roles.length} roles activos
                  </Badge>
                  <Badge className="bg-[#ECFDF5] text-[#22C55E]">
                    <Lock className="h-4 w-4 mr-1" />
                    {permisos.length} permisos disponibles
                  </Badge>
                </div>
              </div>
              {canGestionUsuarios && (
                <div className="flex flex-wrap gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={sincronizarCatalogoSgc}
                        disabled={isSyncing}
                        className="bg-white"
                      >
                        <RefreshCw className={`mr-2 h-5 w-5 ${isSyncing ? "animate-spin" : ""}`} />
                        Aplicar catálogo SGC
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Crea los 5 roles de la documentación, migra usuarios y elimina roles obsoletos</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => openDialog("crear")} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                        <Plus className="mr-2 h-5 w-5" /> Nuevo Rol
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Crear un nuevo rol</p></TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>

          {/* Tarjetas resumen - con colores pastel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#E0EDFF] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E3A8A]">Total Roles</CardTitle>
                  <Shield className="h-8 w-8 text-[#2563EB]" />
                </div>
                <div className="text-4xl font-bold text-[#1E3A8A] mt-4">{roles.length}</div>
                <p className="text-[#6B7280] text-sm mt-1">Roles configurados</p>
              </CardHeader>
            </Card>

            <Card className="bg-[#ECFDF5] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E3A8A]">Total Permisos</CardTitle>
                  <Lock className="h-8 w-8 text-[#22C55E]" />
                </div>
                <div className="text-4xl font-bold text-[#1E3A8A] mt-4">{permisos.length}</div>
                <p className="text-[#6B7280] text-sm mt-1">Permisos disponibles</p>
              </CardHeader>
            </Card>

            <Card className="bg-[#FFF7ED] border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#1E3A8A]">Asignaciones</CardTitle>
                  <CheckCircle className="h-8 w-8 text-[#F59E0B]" />
                </div>
                <div className="text-4xl font-bold text-[#1E3A8A] mt-4">{totalAsignados}</div>
                <p className="text-[#6B7280] text-sm mt-1">Permisos asignados en total</p>
              </CardHeader>
            </Card>
          </div>

          {/* Búsqueda */}
          <Card className="shadow-sm">
            <CardHeader className="bg-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-[#6B7280]" />
                <CardTitle className="text-xl text-[#1E3A8A]">Búsqueda de Roles</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-[#6B7280]" />
                <Input
                  placeholder={SEARCH_ANY_PLACEHOLDER}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-[#6B7280] mt-4">
                Mostrando {rolesFiltrados.length} de {roles.length} roles
              </p>
            </CardContent>
          </Card>

          {/* Grid de Roles - tarjetas con colores sutiles y hover */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rolesFiltrados.length === 0 ? (
              <div className="col-span-full">
                <Card className="shadow-sm border-[#E5E7EB]">
                  <CardContent className="text-center py-20">
                    <Shield className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-xl font-medium text-[#6B7280]">
                      {searchTerm ? `No se encontraron roles para "${searchTerm}"` : "No hay roles registrados"}
                    </p>
                    {!searchTerm && canGestionUsuarios && (
                      <Button onClick={() => openDialog("crear")} variant="outline" className="mt-6">
                        <Plus className="mr-2 h-5 w-5" /> Crear primer rol
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              rolesFiltrados.map((rol) => (
                <Card
                  key={rol.id}
                  className="bg-white border border-[#E5E7EB] shadow-sm hover:shadow-lg hover:border-[#2563EB]/30 transition-all"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#E0EDFF] rounded-xl">
                          <Shield className="h-8 w-8 text-[#2563EB]" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-[#1E3A8A]">{rol.nombre}</CardTitle>
                          <Badge className="mt-2 bg-[#F1F5F9] text-[#6B7280] font-mono">
                            {rol.clave}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-[#6B7280] leading-relaxed">
                      {rol.descripcion || <span className="italic">Sin descripción</span>}
                    </p>
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-[#6B7280]" />
                      <span className="text-lg font-semibold text-[#1E3A8A]">
                        {rol.permisos?.length || 0}
                      </span>
                      <span className="text-[#6B7280]">permisos asignados</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#E5E7EB]">
                      {canGestionUsuarios && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => openDialog("permisos", rol)}>
                              <Lock className="mr-2 h-4 w-4 text-[#2563EB]" />
                              Permisos
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Gestionar permisos del rol</p></TooltipContent>
                        </Tooltip>
                      )}

                      {canGestionUsuarios && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => openDialog("editar", rol)}>
                              <Edit className="mr-2 h-4 w-4 text-[#4B5563]" />
                              Editar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Editar información del rol</p></TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => openDialog("ver", rol)}>
                            <Eye className="mr-2 h-4 w-4 text-[#2563EB]" />
                            Ver
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Ver detalles del rol</p></TooltipContent>
                      </Tooltip>

                      {canGestionUsuarios && !ROLES_CANONICOS.has((rol.clave || "").toLowerCase()) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => openDialog("eliminar", rol)} className="text-[#EF4444]">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Eliminar rol permanentemente</p></TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Dialogo Permisos - con colores en seleccionados */}
          <Dialog open={dialogState.open && dialogState.type === "permisos" && canGestionUsuarios} onOpenChange={closeDialog}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1E3A8A] flex items-center gap-3">
                  <Lock className="h-7 w-7 text-[#2563EB]" />
                  Gestionar Permisos - {dialogState.rol?.nombre}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permisos.map((p) => {
                    const isSelected = permisosSeleccionados.includes(asId(p.id));
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePermiso(p.id)}
                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                          ? "bg-[#E0EDFF] border-[#2563EB] shadow-sm"
                          : "bg-white border-[#E5E7EB] hover:border-[#2563EB]/50"
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={(checked) => togglePermiso(p.id, checked === true)}
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{p.nombre}</div>
                            <div className="text-sm font-mono text-[#6B7280]">{p.codigo}</div>
                            {p.descripcion && (
                              <div className="text-sm text-[#6B7280] mt-2">{p.descripcion}</div>
                            )}
                          </div>
                          {isSelected && <CheckCircle className="h-6 w-6 text-[#2563EB]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#E0EDFF] rounded-xl p-5 border border-[#2563EB]/30">
                <p className="text-lg font-semibold text-[#1E3A8A]">
                  {permisosSeleccionados.length} de {permisos.length} permisos seleccionados
                </p>
              </div>
              <DialogFooter className="mt-6 gap-3">
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarPermisos}
                  disabled={isSaving}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Guardar Permisos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialogo Crear/Editar */}
          <Dialog open={dialogState.open && (dialogState.type === "crear" || dialogState.type === "editar") && canGestionUsuarios} onOpenChange={closeDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1E3A8A]">
                  {dialogState.type === "crear" ? "Crear Nuevo Rol" : "Editar Rol"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1E3A8A]">Nombre del Rol *</label>
                  <Input
                    placeholder="Ej: Coordinador de Calidad"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1E3A8A]">Clave *</label>
                  <Input
                    placeholder="Ej: COORD_CALIDAD"
                    value={formData.clave}
                    onChange={(e) => setFormData({ ...formData, clave: e.target.value.toUpperCase() })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1E3A8A]">Descripción</label>
                  <Input
                    placeholder="Describe las responsabilidades del rol..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white">
                  {isSaving ? "Guardando..." : "Guardar Rol"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <VistaDocumentoSGCDialog
            open={showDocumento}
            onOpenChange={(open) => {
              setShowDocumento(open);
              if (!open) setRolVista(null);
            }}
            data={rolVista ? datosSGCDesdeRol(rolVista) : null}
            title="Rol y permisos"
            description="Documento controlado con la definición del rol y sus permisos en el SGC."
            extraActions={
              rolVista && canGestionUsuarios ? (
                <Button
                  className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                  onClick={() => {
                    const rol = rolVista;
                    setShowDocumento(false);
                    setTimeout(() => openDialog("permisos", rol), 100);
                  }}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Gestionar Permisos
                </Button>
              ) : null
            }
          />

          {/* Dialog Ver Detalles */}
          <Dialog open={dialogState.open && dialogState.type === "ver"} onOpenChange={closeDialog}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl text-[#1E3A8A] flex items-center gap-3">
                  <Eye className="h-7 w-7 text-[#2563EB]" />
                  Detalles del Rol
                </DialogTitle>
              </DialogHeader>
              {dialogState.rol && (
                <div className="flex-1 overflow-y-auto space-y-6 py-4">
                  {/* Información básica */}
                  <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-xl p-6 border border-[#2563EB]/30">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-4 bg-white rounded-xl shadow-sm">
                        <Shield className="h-10 w-10 text-[#2563EB]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-[#1E3A8A]">{dialogState.rol.nombre}</h3>
                        <Badge className="mt-2 bg-white text-[#2563EB] font-mono text-base px-3 py-1">
                          {dialogState.rol.clave}
                        </Badge>
                      </div>
                    </div>
                    {dialogState.rol.descripcion && (
                      <p className="text-[#1E3A8A] leading-relaxed mt-4">
                        {dialogState.rol.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Información adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#E5E7EB]">
                      <p className="text-sm text-[#6B7280] mb-1">Fecha de Creación</p>
                      <p className="text-lg font-semibold text-[#1E3A8A]">
                        {new Date(dialogState.rol.creado_en).toLocaleDateString("es-CO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#E5E7EB]">
                      <p className="text-sm text-[#6B7280] mb-1">Permisos Asignados</p>
                      <p className="text-lg font-semibold text-[#1E3A8A] flex items-center gap-2">
                        <Lock className="h-5 w-5 text-[#2563EB]" />
                        {dialogState.rol.permisos?.length || 0} permisos
                      </p>
                    </div>
                  </div>

                  {/* Lista de permisos */}
                  {dialogState.rol.permisos && dialogState.rol.permisos.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-[#1E3A8A] mb-4 flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Permisos del Rol
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {dialogState.rol.permisos.map((rp: any) => {
                          const permiso = permisos.find((p) =>
                            sameId(p.id, rp.permiso_id || rp.permiso?.id)
                          ) || rp.permiso;
                          if (!permiso) return null;
                          return (
                            <div
                              key={rp.permiso_id}
                              className="bg-[#E0EDFF] rounded-lg p-4 border border-[#2563EB]/30"
                            >
                              <div className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-[#1E3A8A] truncate">{permiso.nombre}</p>
                                  <p className="text-sm font-mono text-[#6B7280] mt-1">{permiso.codigo}</p>
                                  {permiso.descripcion && (
                                    <p className="text-sm text-[#6B7280] mt-2 line-clamp-2">{permiso.descripcion}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(!dialogState.rol.permisos || dialogState.rol.permisos.length === 0) && (
                    <div className="bg-[#FFF7ED] rounded-xl p-6 border border-[#F59E0B]/30 text-center">
                      <Lock className="h-12 w-12 text-[#F59E0B] mx-auto mb-3" />
                      <p className="text-[#F59E0B] font-medium">Este rol no tiene permisos asignados</p>
                    </div>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cerrar
                </Button>
                {dialogState.rol && canGestionUsuarios && (
                  <Button
                    onClick={() => {
                      closeDialog();
                      setTimeout(() => openDialog("permisos", dialogState.rol), 100);
                    }}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Gestionar Permisos
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Alerta Eliminar */}
          <AlertDialog open={dialogState.open && dialogState.type === "eliminar" && canGestionUsuarios} onOpenChange={closeDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#1E3A8A]">¿Eliminar este rol?</AlertDialogTitle>
                <AlertDialogDescription>
                  {dialogState.rol && (
                    <div className="bg-[#F1F5F9] p-5 rounded-lg my-4 border border-[#E5E7EB]">
                      <p className="font-semibold text-lg">{dialogState.rol.nombre}</p>
                      <p className="text-sm font-mono text-[#6B7280]">{dialogState.rol.clave}</p>
                    </div>
                  )}
                  Esta acción es permanente y no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleEliminar} className="bg-[#EF4444] hover:bg-red-700">
                  Eliminar Rol
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

        </div>
      </TooltipProvider>
    </div>
  );
}
