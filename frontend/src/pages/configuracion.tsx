import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCircle,
  Settings,
  Shield,
  BookOpen,
  LifeBuoy,
  Loader2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { getCurrentUser } from "@/services/auth";
import { configuracionService } from "@/services/configuracion.service";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface UserProfile {
  id: string;
  nombre: string;
  segundo_nombre?: string;
  primer_apellido: string;
  segundo_apellido?: string;
  correo_electronico: string;
  area?: { nombre?: string };
  roles?: Array<{ rol?: { nombre?: string } }>;
}

const PREF_KEYS = {
  telefono: "telefono",
  correoContacto: "correo_contacto",
  idioma: "idioma",
  zonaHoraria: "zona_horaria",
} as const;

export default function Configuracion() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [telefono, setTelefono] = useState("");
  const [correoContacto, setCorreoContacto] = useState("");
  const [idioma, setIdioma] = useState("es");
  const [zonaHoraria, setZonaHoraria] = useState("America/Bogota");

  const prefKey = (field: string) => (userId ? `usuario_${userId}_${field}` : field);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get("/auth/me");
        setProfile(res.data);

        const configs = await configuracionService.list({ categoria: "usuario", limit: 500 });
        const byKey = new Map(configs.map((cfg) => [cfg.clave, cfg.valor]));

        if (userId) {
          setTelefono(byKey.get(prefKey(PREF_KEYS.telefono)) || "");
          setCorreoContacto(byKey.get(prefKey(PREF_KEYS.correoContacto)) || res.data?.correo_electronico || "");
          setIdioma(byKey.get(prefKey(PREF_KEYS.idioma)) || "es");
          setZonaHoraria(byKey.get(prefKey(PREF_KEYS.zonaHoraria)) || "America/Bogota");
        }
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar la configuración");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const nombreCompleto = profile
    ? [profile.nombre, profile.segundo_nombre, profile.primer_apellido, profile.segundo_apellido]
        .filter(Boolean)
        .join(" ")
    : "";

  const rolNombre = profile?.roles?.[0]?.rol?.nombre || "Sin rol asignado";
  const areaNombre = profile?.area?.nombre || "Sin área asignada";

  const handleSave = async () => {
    if (!userId) {
      toast.error("Sesión no válida. Inicia sesión nuevamente.");
      return;
    }

    try {
      setSaving(true);
      await Promise.all([
        configuracionService.save(prefKey(PREF_KEYS.telefono), telefono, "Teléfono de contacto", "usuario"),
        configuracionService.save(prefKey(PREF_KEYS.correoContacto), correoContacto, "Correo de contacto", "usuario"),
        configuracionService.save(prefKey(PREF_KEYS.idioma), idioma, "Idioma de la interfaz", "usuario"),
        configuracionService.save(prefKey(PREF_KEYS.zonaHoraria), zonaHoraria, "Zona horaria", "usuario"),
      ]);
      toast.success("Preferencias guardadas correctamente");
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando configuración..." />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-5 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <Settings className="h-8 w-8 sm:h-9 sm:w-9 text-[#2563EB]" />
                Configuración
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Administra la información básica de tu cuenta y preferencias
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => navigate("/perfil")}>
                Editar perfil
              </Button>
              <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => navigate("/seguridad")}>
                Seguridad
              </Button>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
          <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-row items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCircle className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg text-[#1E3A8A]">Perfil del Usuario</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Nombre completo</Label>
                <Input value={nombreCompleto} disabled className="rounded-xl px-4 py-5 h-auto bg-gray-50 border-gray-200" />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Teléfono</Label>
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="rounded-xl px-4 py-5 h-auto"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Correo electrónico</Label>
                <Input
                  value={profile?.correo_electronico || ""}
                  disabled
                  className="rounded-xl px-4 py-5 h-auto bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Correo de contacto</Label>
                <Input
                  value={correoContacto}
                  onChange={(e) => setCorreoContacto(e.target.value)}
                  placeholder="contacto@empresa.com"
                  className="rounded-xl px-4 py-5 h-auto"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Rol</Label>
                <Input value={rolNombre} disabled className="rounded-xl px-4 py-5 h-auto bg-gray-50 border-gray-200" />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Área asignada</Label>
                <Input value={areaNombre} disabled className="rounded-xl px-4 py-5 h-auto bg-gray-50 border-gray-200" />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Idioma</Label>
                <Select value={idioma} onValueChange={setIdioma}>
                  <SelectTrigger className="rounded-xl px-4 py-5 h-auto">
                    <SelectValue placeholder="Selecciona un idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">Inglés</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-700">Zona horaria</Label>
                <Select value={zonaHoraria} onValueChange={setZonaHoraria}>
                  <SelectTrigger className="rounded-xl px-4 py-5 h-auto">
                    <SelectValue placeholder="Selecciona una zona horaria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Bogota">(GMT-5) América / Bogotá</SelectItem>
                    <SelectItem value="America/Mexico_City">(GMT-6) México</SelectItem>
                    <SelectItem value="America/Argentina/Buenos_Aires">(GMT-3) Buenos Aires</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-8 py-6 h-auto font-bold shadow-sm"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto rounded-2xl p-5 justify-start" onClick={() => navigate("/seguridad")}>
            <Shield className="h-5 w-5 mr-3 text-[#2563EB]" />
            <span className="text-left">
              <span className="block font-bold text-[#1E3A8A]">Seguridad</span>
              <span className="text-xs text-[#6B7280]">Contraseña, 2FA y sesiones</span>
            </span>
          </Button>
          <Button variant="outline" className="h-auto rounded-2xl p-5 justify-start" onClick={() => navigate("/mesa-ayuda")}>
            <LifeBuoy className="h-5 w-5 mr-3 text-[#2563EB]" />
            <span className="text-left">
              <span className="block font-bold text-[#1E3A8A]">Mesa de ayuda</span>
              <span className="text-xs text-[#6B7280]">Reportar un incidente</span>
            </span>
          </Button>
          <Button variant="outline" className="h-auto rounded-2xl p-5 justify-start" onClick={() => navigate("/manual-usuario")}>
            <BookOpen className="h-5 w-5 mr-3 text-[#2563EB]" />
            <span className="text-left">
              <span className="block font-bold text-[#1E3A8A]">Manual de usuario</span>
              <span className="text-xs text-[#6B7280]">Guía de uso del SGC</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
