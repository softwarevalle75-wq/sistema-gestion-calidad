import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserPlus,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  User,
  Shield,
  UserCheck,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { usuarioService } from "@/services/usuario.service";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { asId, sameId } from "@/lib/permissions";
import { getCurrentUser, refreshCurrentUserSession } from "@/services/auth";
import {
  cargarDominiosInstitucionales,
  esCorreoInstitucional,
  mensajeCorreoInstitucional,
} from "@/utils/correoInstitucional";

interface Area {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
}

interface Rol {
  id: string;
  nombre: string;
  clave: string;
  descripcion?: string;
}

interface FormData {
  documento: string;
  nombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  correoElectronico: string;
  nombreUsuario: string;
  contrasena: string;
  confirmarContrasena: string;
  areaId: string;
  activo: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export default function FormularioUsuario() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    documento: "",
    nombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    correoElectronico: "",
    nombreUsuario: "",
    contrasena: "",
    confirmarContrasena: "",
    areaId: "",
    activo: true,
  });

  const [areas, setAreas] = useState<Area[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [requiereOtp, setRequiereOtp] = useState(!isEditing);

  // Cargar áreas, roles y datos del usuario (si es edición)
  useEffect(() => {
    const fetchInitialData = async () => {
      setFetchingData(true);
      try {
        await cargarDominiosInstitucionales();
        // Cargar áreas
        const areasResponse = await apiClient.get("/areas");
        const areasData = areasResponse.data;
        setAreas(Array.isArray(areasData) ? areasData : []);

        // Cargar roles
        const rolesResponse = await apiClient.get("/roles", { params: { limit: 200 } });
        const rolesData = rolesResponse.data;
        console.log("Roles cargados desde BD:", rolesData); // Para debug
        setRoles(Array.isArray(rolesData) ? rolesData : []);

        // Si es edición, cargar datos del usuario
        if (isEditing && id) {
          const userData: any = await usuarioService.getById(id);
          console.log("Usuario cargado:", userData); // Para debug

          setFormData({
            documento: String(userData.documento || ""),
            nombre: userData.nombre || "",
            segundoNombre: userData.segundo_nombre || "",
            primerApellido: userData.primer_apellido || "",
            segundoApellido: userData.segundo_apellido || "",
            correoElectronico: userData.correo_electronico || "",
            nombreUsuario: userData.nombre_usuario || "",
            contrasena: "",
            confirmarContrasena: "",
            areaId: userData.area_id || "",
            activo: userData.activo ?? true,
          });
          setRequiereOtp(Boolean(userData.requiere_otp));

          // Cargar roles del usuario
          if (userData.roles && Array.isArray(userData.roles)) {
            const roleIds = userData.roles
              .map((ur: any) => asId(ur.rol_id || ur.rol?.id))
              .filter(Boolean);
            console.log("Roles del usuario:", roleIds); // Para debug
            setSelectedRoleIds(roleIds);
          }
        }
      } catch (error: any) {
        console.error("Error al cargar datos iniciales:", error);
        toast.error(error.message || "Error al cargar datos del formulario");

        // Datos de respaldo solo si falla la conexión
        if (areas.length === 0) {
          setAreas([
            { id: "1", codigo: "CAL", nombre: "Gestión de Calidad" },
            { id: "2", codigo: "SIS", nombre: "Sistemas y Tecnología" },
            { id: "3", codigo: "RRHH", nombre: "Recursos Humanos" },
          ]);
        }

        if (roles.length === 0) {
          setRoles([
            { id: "1", nombre: "Administrador", clave: "ADMIN", descripcion: "Acceso total al sistema" },
            { id: "2", nombre: "Coordinador de Calidad", clave: "COORD_CALIDAD", descripcion: "Gestiona procesos de calidad" },
            { id: "3", nombre: "Auditor Interno", clave: "AUDITOR", descripcion: "Realiza auditorías internas" },
            { id: "4", nombre: "Usuario Estándar", clave: "USER", descripcion: "Acceso básico al sistema" },
          ]);
        }

        if (isEditing) {
          navigate("/ListaDeUsuarios");
        }
      } finally {
        setFetchingData(false);
      }
    };

    fetchInitialData();
  }, [id, isEditing, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.documento.trim()) newErrors.documento = "El documento es obligatorio";
    else if (!/^\d+$/.test(formData.documento)) newErrors.documento = "Solo números permitidos";

    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es obligatorio";
    if (!formData.primerApellido.trim()) newErrors.primerApellido = "El primer apellido es obligatorio";

    if (!formData.correoElectronico.trim()) newErrors.correoElectronico = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correoElectronico))
      newErrors.correoElectronico = "Formato de correo inválido";
    else if ((!isEditing || requiereOtp) && !esCorreoInstitucional(formData.correoElectronico))
      newErrors.correoElectronico = mensajeCorreoInstitucional();

    if (!formData.nombreUsuario.trim()) newErrors.nombreUsuario = "El nombre de usuario es obligatorio";
    else if (formData.nombreUsuario.length < 3) newErrors.nombreUsuario = "Mínimo 3 caracteres";

    if (!isEditing) {
      if (!formData.contrasena) newErrors.contrasena = "La contraseña es obligatoria";
      else if (formData.contrasena.length < 8) newErrors.contrasena = "Mínimo 8 caracteres";

      if (!formData.confirmarContrasena) newErrors.confirmarContrasena = "Confirme la contraseña";
      else if (formData.contrasena !== formData.confirmarContrasena)
        newErrors.confirmarContrasena = "Las contraseñas no coinciden";
    } else if (formData.contrasena) {
      if (formData.contrasena.length < 8) newErrors.contrasena = "Mínimo 8 caracteres";
      if (formData.contrasena !== formData.confirmarContrasena)
        newErrors.confirmarContrasena = "Las contraseñas no coinciden";
    }

    if (!formData.areaId) newErrors.areaId = "Seleccione un área";
    if (selectedRoleIds.length === 0) newErrors.roles = "Seleccione al menos un rol";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload: any = {
        documento: parseInt(formData.documento, 10),
        nombre: formData.nombre.trim(),
        segundo_nombre: formData.segundoNombre.trim() || null,
        primer_apellido: formData.primerApellido.trim(),
        segundo_apellido: formData.segundoApellido.trim() || null,
        correo_electronico: formData.correoElectronico.trim(),
        nombre_usuario: formData.nombreUsuario.trim(),
        area_id: formData.areaId,
        activo: formData.activo,
        rol_ids: selectedRoleIds,
      };

      // Solo incluir contraseña si se proporcionó
      if (formData.contrasena) {
        payload.contrasena = formData.contrasena;
      }

      if (isEditing && id) {
        await usuarioService.update(id, payload);
        if (getCurrentUser()?.id && sameId(getCurrentUser()?.id, id)) {
          try {
            await refreshCurrentUserSession();
          } catch {
            // El usuario ya se actualizó; el refresco de sesión es opcional
          }
        }
        toast.success(`Usuario "${formData.nombreUsuario}" actualizado exitosamente`);
      } else {
        await usuarioService.create(payload);
        toast.success(
          `Usuario "${formData.nombreUsuario}" creado. Ingresará con un código OTP enviado a su correo.`,
        );
      }

      setTimeout(() => navigate("/ListaDeUsuarios"), 1500);
    } catch (error: any) {
      console.error("Error al guardar usuario:", error);
      toast.error(error.message || "Error al guardar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId: string, checked?: boolean) => {
    const normalized = asId(roleId);
    if (!normalized) return;
    setSelectedRoleIds(prev => {
      const already = prev.includes(normalized);
      const shouldSelect = checked === undefined ? !already : checked;
      if (shouldSelect) {
        return already ? prev : [...prev, normalized];
      }
      return prev.filter(currentId => currentId !== normalized);
    });
    setErrors(prevErrors => {
      if (!prevErrors.roles) return prevErrors;
      const newErrors = { ...prevErrors };
      delete newErrors.roles;
      return newErrors;
    });
  };

  // Pantalla de carga mientras se obtienen los datos
  if (fetchingData) {
    return (
      <div className="min-h-[60vh] bg-[#F5F7FA] p-4 md:p-8">
        <LoadingSpinner fullScreen={false} message={`Cargando ${isEditing ? "usuario" : "formulario"}...`} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <TooltipProvider>
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                  {isEditing ? (
                    <UserCheck className="h-9 w-9 text-[#2563EB]" />
                  ) : (
                    <UserPlus className="h-9 w-9 text-[#2563EB]" />
                  )}
                  {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
                </h1>
                <p className="text-[#6B7280] mt-2 text-lg">
                  {isEditing
                    ? `Modificando el perfil de @${formData.nombreUsuario}`
                    : "Complete el formulario para registrar un nuevo usuario en el sistema ISO 9001"}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" onClick={() => navigate("/ListaDeUsuarios")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Volver a la lista de usuarios</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Formulario */}
          <Card className="shadow-sm border-[#E5E7EB]">
            <CardHeader className="bg-[#F1F5F9] border-b border-[#E5E7EB]">
              <CardTitle className="text-2xl text-[#1E3A8A] flex items-center gap-3">
                <User className="h-6 w-6 text-[#2563EB]" />
                Información del Usuario
              </CardTitle>
            </CardHeader>

            <CardContent className="p-8 space-y-10">

              {/* Datos Personales */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A]">Datos Personales</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={errors.documento ? "text-red-500" : ""}>
                      Documento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="documento"
                      value={formData.documento}
                      onChange={handleInputChange}
                      placeholder="Ej: 12345678"
                      className={errors.documento ? "border-red-500" : ""}
                    />
                    {errors.documento && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.documento}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={errors.nombre ? "text-red-500" : ""}>
                      Primer Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej: Juan"
                      className={errors.nombre ? "border-red-500" : ""}
                    />
                    {errors.nombre && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.nombre}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Segundo Nombre</Label>
                    <Input
                      name="segundoNombre"
                      value={formData.segundoNombre}
                      onChange={handleInputChange}
                      placeholder="Ej: Carlos"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={errors.primerApellido ? "text-red-500" : ""}>
                      Primer Apellido <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="primerApellido"
                      value={formData.primerApellido}
                      onChange={handleInputChange}
                      placeholder="Ej: Pérez"
                      className={errors.primerApellido ? "border-red-500" : ""}
                    />
                    {errors.primerApellido && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.primerApellido}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Segundo Apellido</Label>
                    <Input
                      name="segundoApellido"
                      value={formData.segundoApellido}
                      onChange={handleInputChange}
                      placeholder="Ej: García"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className={errors.areaId ? "text-red-500" : ""}>
                      Área <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.areaId || undefined}
                      onValueChange={(val) => {
                        setFormData(p => ({ ...p, areaId: val }));
                        if (errors.areaId) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.areaId;
                            return newErrors;
                          });
                        }
                      }}
                    >
                      <SelectTrigger className={errors.areaId ? "border-red-500" : ""}>
                        <SelectValue placeholder="Seleccione un área..." />
                      </SelectTrigger>
                      <SelectContent>
                        {areas.map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            [{a.codigo}] {a.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.areaId && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.areaId}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Asignación de Roles - CORREGIDO PARA MOSTRAR ROLES DE LA BD */}
              <div className="pt-8 border-t border-[#E5E7EB] space-y-6">
                <div>
                  <h3 className={`text-lg font-semibold flex items-center gap-2 ${errors.roles ? "text-red-500" : "text-[#1E3A8A]"}`}>
                    <Shield className="h-5 w-5" />
                    Asignación de Roles <span className="text-red-500">*</span>
                  </h3>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {roles.length > 0
                      ? `${roles.length} roles disponibles en el sistema`
                      : "Cargando roles desde la base de datos..."}
                  </p>
                  {errors.roles && (
                    <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.roles}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {roles.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-[#6B7280]">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Cargando roles...</p>
                    </div>
                  ) : (
                    roles.filter((rol) => Boolean(asId(rol.id))).map(rol => {
                      const roleId = asId(rol.id);
                      const isSelected = selectedRoleIds.includes(roleId);
                      return (
                        <div
                          key={roleId}
                          className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                            ? "bg-[#E0EDFF] border-[#2563EB] shadow-sm"
                            : "bg-white border-[#E5E7EB] hover:border-[#2563EB]/50 hover:shadow-sm"
                            }`}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              id={`role-${roleId}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleRole(roleId, checked === true)}
                            />
                            <label
                              htmlFor={`role-${roleId}`}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="font-semibold text-gray-900">{rol.nombre}</div>
                              <div className="text-xs text-gray-400 font-mono uppercase mt-1">{rol.clave}</div>
                              {rol.descripcion && (
                                <div className="text-sm text-[#6B7280] mt-2">{rol.descripcion}</div>
                              )}
                            </label>
                            {isSelected && (
                              <CheckCircle className="h-6 w-6 text-[#2563EB] flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Resumen de roles seleccionados */}
                {selectedRoleIds.length > 0 && (
                  <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E5E7EB]">
                    <p className="text-sm font-medium text-[#6B7280] mb-3">
                      Roles seleccionados ({selectedRoleIds.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRoleIds.map(id => {
                        const rol = roles.find(r => sameId(r.id, id));
                        return rol ? (
                          <Badge key={id} className="bg-[#E0EDFF] text-[#2563EB] text-sm px-4 py-1">
                            {rol.nombre}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Información de Cuenta */}
              <div className="pt-8 border-t border-[#E5E7EB] space-y-6">
                <h3 className="text-lg font-semibold text-[#1E3A8A]">Credenciales de Acceso</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={errors.correoElectronico ? "text-red-500" : ""}>
                      Correo Electrónico <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="correoElectronico"
                      type="email"
                      value={formData.correoElectronico}
                      onChange={handleInputChange}
                      placeholder="usuario@gmail.com"
                      className={errors.correoElectronico ? "border-red-500" : ""}
                    />
                    {errors.correoElectronico && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.correoElectronico}
                      </p>
                    )}
                    {(!isEditing || requiereOtp) && !errors.correoElectronico && (
                      <p className="text-xs text-[#6B7280]">
                        Por ahora se aceptan Gmail, Outlook y Hotmail. El usuario ingresará con un código OTP enviado a este correo.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={errors.nombreUsuario ? "text-red-500" : ""}>
                      Nombre de Usuario <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      name="nombreUsuario"
                      value={formData.nombreUsuario}
                      onChange={handleInputChange}
                      placeholder="usuario123"
                      className={errors.nombreUsuario ? "border-red-500" : ""}
                    />
                    {errors.nombreUsuario && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.nombreUsuario}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={errors.contrasena ? "text-red-500" : ""}>
                      {isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
                      {!isEditing && <span className="text-red-500"> *</span>}
                    </Label>
                    <Input
                      type="password"
                      name="contrasena"
                      value={formData.contrasena}
                      onChange={handleInputChange}
                      placeholder={isEditing ? "Dejar vacío para mantener la actual" : "Mínimo 8 caracteres"}
                      className={errors.contrasena ? "border-red-500" : ""}
                    />
                    {errors.contrasena && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.contrasena}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className={errors.confirmarContrasena ? "text-red-500" : ""}>
                      Confirmar Contraseña
                    </Label>
                    <Input
                      type="password"
                      name="confirmarContrasena"
                      value={formData.confirmarContrasena}
                      onChange={handleInputChange}
                      placeholder="Repita la contraseña"
                      className={errors.confirmarContrasena ? "border-red-500" : ""}
                    />
                    {errors.confirmarContrasena && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.confirmarContrasena}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estado y Acciones */}
              <div className="pt-8 border-t border-[#E5E7EB] space-y-6">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={formData.activo}
                    onCheckedChange={(val) => setFormData(p => ({ ...p, activo: val }))}
                  />
                  <div className="flex-1">
                    <Label className="font-semibold cursor-pointer">Usuario Activo</Label>
                    <p className="text-sm text-[#6B7280] mt-1">
                      {formData.activo
                        ? "El usuario puede iniciar sesión inmediatamente"
                        : "El acceso al sistema está deshabilitado"}
                    </p>
                  </div>
                  <Badge className={`px-4 py-2 ${formData.activo ? "bg-[#ECFDF5] text-[#22C55E]" : "bg-gray-100 text-gray-600"}`}>
                    {formData.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="flex gap-4 pt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="submit"
                        disabled={loading}
                        onClick={handleSubmit}
                        className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-5 w-5" />
                            {isEditing ? "Actualizar Usuario" : "Crear Usuario"}
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{isEditing ? "Actualizar usuario" : "Crear nuevo usuario"}</p></TooltipContent>
                  </Tooltip>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </div>
  );
}