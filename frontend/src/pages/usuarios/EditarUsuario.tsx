import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Edit,
    ArrowLeft,
    Save,
    X,
    CheckCircle,
    AlertCircle,
    Building2,
    Mail,
    User,
    Lock,
    FileText,
    Users,
    Shield,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
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

export default function EditarUsuario() {
    const { id } = useParams<{ id: string }>();
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [requiereOtp, setRequiereOtp] = useState(false);
    const [dialogState, setDialogState] = useState<{
        open: boolean;
        type: "success" | "error";
        message: string;
    }>({ open: false, type: "success", message: "" });

    useEffect(() => {
        cargarDominiosInstitucionales();
        fetchAreas();
        fetchRoles();
        if (id) {
            fetchUsuario(id);
        }
    }, [id]);

    const fetchUsuario = async (userId: string) => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/usuarios/${userId}`);
            const usuario = response.data;

            setFormData({
                documento: usuario.documento?.toString() || "",
                nombre: usuario.nombre || "",
                segundoNombre: usuario.segundo_nombre || "",
                primerApellido: usuario.primer_apellido || "",
                segundoApellido: usuario.segundo_apellido || "",
                correoElectronico: usuario.correo_electronico || "",
                nombreUsuario: usuario.nombre_usuario || "",
                contrasena: "",
                confirmarContrasena: "",
                areaId: usuario.area_id || "",
                activo: usuario.activo ?? true,
            });
            setRequiereOtp(Boolean(usuario.requiere_otp));

            // Cargar roles del usuario (rol_id de la asignación, no el id de usuario_roles)
            if (usuario.roles && Array.isArray(usuario.roles)) {
                setSelectedRoleIds(
                    usuario.roles
                        .map((r: any) => asId(r.rol_id || r.rol?.id))
                        .filter(Boolean)
                );
            }
        } catch (error) {
            console.error("Error al cargar usuario:", error);
            toast.error("Error al cargar los datos del usuario");
            navigate("/ListaDeUsuarios");
        } finally {
            setLoading(false);
        }
    };

    const fetchAreas = async () => {
        try {
            const response = await apiClient.get("/areas");
            const data = response.data;
            setAreas(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al obtener áreas:", error);
            setAreas([]);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await apiClient.get("/roles", { params: { limit: 200 } });
            const data = response.data;
            setRoles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al obtener roles:", error);
            setRoles([]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));

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

        if (!formData.documento.trim()) {
            newErrors.documento = "El documento es obligatorio";
        } else if (!/^\d+$/.test(formData.documento)) {
            newErrors.documento = "El documento debe contener solo números";
        }

        if (!formData.nombre.trim()) {
            newErrors.nombre = "El nombre es obligatorio";
        }

        if (!formData.primerApellido.trim()) {
            newErrors.primerApellido = "El primer apellido es obligatorio";
        }

        if (!formData.correoElectronico.trim()) {
            newErrors.correoElectronico = "El correo electrónico es obligatorio";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correoElectronico)) {
            newErrors.correoElectronico = "El correo electrónico no es válido";
        } else if (requiereOtp && !esCorreoInstitucional(formData.correoElectronico)) {
            newErrors.correoElectronico = mensajeCorreoInstitucional();
        }

        if (!formData.nombreUsuario.trim()) {
            newErrors.nombreUsuario = "El nombre de usuario es obligatorio";
        } else if (formData.nombreUsuario.length < 3) {
            newErrors.nombreUsuario = "El nombre de usuario debe tener al menos 3 caracteres";
        }

        // Validar contraseña solo si se está cambiando
        if (formData.contrasena || formData.confirmarContrasena) {
            if (formData.contrasena.length < 8) {
                newErrors.contrasena = "La contraseña debe tener al menos 8 caracteres";
            }

            if (formData.contrasena !== formData.confirmarContrasena) {
                newErrors.confirmarContrasena = "Las contraseñas no coinciden";
            }
        }

        if (!formData.areaId) {
            newErrors.areaId = "Debe seleccionar un área";
        }

        if (selectedRoleIds.length === 0) {
            newErrors.roles = "Debe seleccionar al menos un rol";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSaving(true);

        try {
            const dataToSend: any = {
                documento: parseInt(formData.documento, 10),
                nombre: formData.nombre.trim(),
                segundo_nombre: formData.segundoNombre.trim() || undefined,
                primer_apellido: formData.primerApellido.trim(),
                segundo_apellido: formData.segundoApellido.trim() || undefined,
                correo_electronico: formData.correoElectronico.trim(),
                nombre_usuario: formData.nombreUsuario.trim(),
                area_id: formData.areaId,
                activo: formData.activo,
                rol_ids: selectedRoleIds,
            };

            // Solo incluir contraseña si se está cambiando
            if (formData.contrasena) {
                dataToSend.contrasena = formData.contrasena;
            }

            await apiClient.put(`/usuarios/${id}`, dataToSend);

            if (getCurrentUser()?.id && sameId(getCurrentUser()?.id, id)) {
                try {
                    await refreshCurrentUserSession();
                } catch {
                    // El usuario ya se actualizó; el refresco de sesión es opcional
                }
            }

            toast.success(`Usuario "${formData.nombreUsuario}" actualizado exitosamente`);
            navigate("/ListaDeUsuarios");
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(error.message || "Error al actualizar el usuario");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (window.confirm("¿Está seguro de que desea cancelar? Se perderán todos los cambios no guardados.")) {
            navigate("/ListaDeUsuarios");
        }
    };

    const toggleRole = (roleId: string, checked?: boolean) => {
        const normalized = asId(roleId);
        if (!normalized) return;
        setSelectedRoleIds((prev) => {
            const already = prev.includes(normalized);
            const shouldSelect = checked === undefined ? !already : checked;
            if (shouldSelect) {
                return already ? prev : [...prev, normalized];
            }
            return prev.filter((currentId) => currentId !== normalized);
        });
        setErrors((prevErrors) => {
            if (!prevErrors.roles) return prevErrors;
            const newErrors = { ...prevErrors };
            delete newErrors.roles;
            return newErrors;
        });
    };

    if (loading) {
        return <LoadingSpinner fullScreen={false} message="Cargando datos del usuario" />;
    }

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                        <Edit className="h-9 w-9 text-[#2563EB]" />
                        Editar Usuario
                    </h1>
                    <p className="text-[#6B7280] mt-2">
                        Modifique los datos del usuario en el formulario
                    </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/ListaDeUsuarios")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Información del Usuario
                        </CardTitle>
                        <CardDescription>
                            Los campos marcados con asterisco (*) son obligatorios
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Información Personal */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Datos Personales
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Documento */}
                                <div className="space-y-2">
                                    <label htmlFor="documento" className="text-sm font-medium text-gray-700">
                                        Documento <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        id="documento"
                                        name="documento"
                                        type="text"
                                        placeholder="Ej: 12345678"
                                        value={formData.documento}
                                        onChange={handleInputChange}
                                        className={errors.documento ? "border-red-500" : ""}
                                    />
                                    {errors.documento && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.documento}
                                        </p>
                                    )}
                                </div>

                                {/* Nombre */}
                                <div className="space-y-2">
                                    <label htmlFor="nombre" className="text-sm font-medium text-gray-700">
                                        Primer Nombre <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        id="nombre"
                                        name="nombre"
                                        type="text"
                                        placeholder="Ej: Juan"
                                        value={formData.nombre}
                                        onChange={handleInputChange}
                                        className={errors.nombre ? "border-red-500" : ""}
                                    />
                                    {errors.nombre && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.nombre}
                                        </p>
                                    )}
                                </div>

                                {/* Segundo Nombre */}
                                <div className="space-y-2">
                                    <label htmlFor="segundoNombre" className="text-sm font-medium text-gray-700">
                                        Segundo Nombre
                                    </label>
                                    <Input
                                        id="segundoNombre"
                                        name="segundoNombre"
                                        type="text"
                                        placeholder="Ej: Carlos"
                                        value={formData.segundoNombre}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* Primer Apellido */}
                                <div className="space-y-2">
                                    <label htmlFor="primerApellido" className="text-sm font-medium text-gray-700">
                                        Primer Apellido <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        id="primerApellido"
                                        name="primerApellido"
                                        type="text"
                                        placeholder="Ej: Pérez"
                                        value={formData.primerApellido}
                                        onChange={handleInputChange}
                                        className={errors.primerApellido ? "border-red-500" : ""}
                                    />
                                    {errors.primerApellido && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.primerApellido}
                                        </p>
                                    )}
                                </div>

                                {/* Segundo Apellido */}
                                <div className="space-y-2">
                                    <label htmlFor="segundoApellido" className="text-sm font-medium text-gray-700">
                                        Segundo Apellido
                                    </label>
                                    <Input
                                        id="segundoApellido"
                                        name="segundoApellido"
                                        type="text"
                                        placeholder="Ej: García"
                                        value={formData.segundoApellido}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* Área */}
                                <div className="space-y-2">
                                    <label htmlFor="areaId" className="text-sm font-medium text-gray-700">
                                        Área <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <select
                                            id="areaId"
                                            name="areaId"
                                            value={formData.areaId}
                                            onChange={handleInputChange}
                                            className={`w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.areaId ? "border-red-500" : "border-gray-300"
                                                }`}
                                        >
                                            <option value="">Seleccione un área</option>
                                            {areas.map((area) => (
                                                <option key={area.id} value={area.id}>
                                                    {area.nombre} ({area.codigo})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {errors.areaId && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.areaId}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Selección de Roles */}
                        <div className="space-y-4 pt-6 border-t">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-600" />
                                Asignación de Roles
                            </h3>

                            <div className="space-y-6">
                                <div>
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
                                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                                            <p>Cargando roles...</p>
                                        </div>
                                    ) : (
                                        roles.filter((rol) => Boolean(asId(rol.id))).map((rol) => {
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

                                {selectedRoleIds.length > 0 && (
                                    <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E5E7EB]">
                                        <p className="text-sm font-medium text-[#6B7280] mb-3">
                                            Roles seleccionados ({selectedRoleIds.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRoleIds.map((roleId) => {
                                                const rol = roles.find((r) => sameId(r.id, roleId));
                                                return rol ? (
                                                    <Badge key={roleId} className="bg-[#E0EDFF] text-[#2563EB] text-sm px-4 py-1">
                                                        {rol.nombre}
                                                    </Badge>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Información de Cuenta */}
                        <div className="space-y-4 pt-6 border-t">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                Información de Cuenta
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Correo Electrónico */}
                                <div className="space-y-2">
                                    <label htmlFor="correoElectronico" className="text-sm font-medium text-gray-700">
                                        Correo Electrónico <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="correoElectronico"
                                            name="correoElectronico"
                                            type="email"
                                            placeholder="Ej: juan.perez@gmail.com"
                                            value={formData.correoElectronico}
                                            onChange={handleInputChange}
                                            className={`pl-10 ${errors.correoElectronico ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {errors.correoElectronico && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.correoElectronico}
                                        </p>
                                    )}
                                </div>

                                {/* Nombre de Usuario */}
                                <div className="space-y-2">
                                    <label htmlFor="nombreUsuario" className="text-sm font-medium text-gray-700">
                                        Nombre de Usuario <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="nombreUsuario"
                                            name="nombreUsuario"
                                            type="text"
                                            placeholder="Ej: jperez"
                                            value={formData.nombreUsuario}
                                            onChange={handleInputChange}
                                            className={`pl-10 ${errors.nombreUsuario ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {errors.nombreUsuario && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.nombreUsuario}
                                        </p>
                                    )}
                                </div>

                                {/* Contraseña */}
                                <div className="space-y-2">
                                    <label htmlFor="contrasena" className="text-sm font-medium text-gray-700">
                                        Nueva Contraseña <span className="text-gray-500 text-xs">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="contrasena"
                                            name="contrasena"
                                            type="password"
                                            placeholder="Dejar en blanco para no cambiar"
                                            value={formData.contrasena}
                                            onChange={handleInputChange}
                                            className={`pl-10 ${errors.contrasena ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {errors.contrasena && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.contrasena}
                                        </p>
                                    )}
                                </div>

                                {/* Confirmar Contraseña */}
                                <div className="space-y-2">
                                    <label htmlFor="confirmarContrasena" className="text-sm font-medium text-gray-700">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <Input
                                            id="confirmarContrasena"
                                            name="confirmarContrasena"
                                            type="password"
                                            placeholder="Repita la contraseña"
                                            value={formData.confirmarContrasena}
                                            onChange={handleInputChange}
                                            className={`pl-10 ${errors.confirmarContrasena ? "border-red-500" : ""}`}
                                        />
                                    </div>
                                    {errors.confirmarContrasena && (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.confirmarContrasena}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Estado */}
                        <div className="space-y-4 pt-6 border-t">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="activo"
                                    name="activo"
                                    checked={formData.activo}
                                    onChange={handleInputChange}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="activo" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    Usuario Activo
                                    <Badge variant="outline" className={formData.activo ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}>
                                        {formData.activo ? "Activo" : "Inactivo"}
                                    </Badge>
                                </label>
                            </div>
                            <p className="text-sm text-gray-500">
                                Los usuarios activos pueden iniciar sesión en el sistema
                            </p>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 pt-6 border-t">
                            <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Cambios
                                    </>
                                )}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving} className="flex-1">
                                <X className="w-4 h-4 mr-2" />
                                Cancelar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
        </div>
    );
}
