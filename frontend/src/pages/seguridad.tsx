import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Activity,
  Building,
  ClipboardList,
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { configuracionService } from "@/services/configuracion.service";
import { getCurrentUser, getToken, logout } from "@/services/auth";
import { uploadSystemLogo } from "@/services/storage";

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const SESSION_KEY_PREFIX = "sgc_security_sessions_";
const PASSWORD_UPDATE_KEY_PREFIX = "sgc_password_update_";

const getBrowserName = (ua: string): string => {
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  if (ua.includes("Chrome/")) return "Chrome";
  return "Navegador";
};

const getDeviceName = (ua: string): string => {
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Windows")) return "Windows";
  return "Dispositivo";
};

const formatRelativeTime = (isoDate: string): string => {
  const eventDate = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = Math.max(now - eventDate, 0);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Activa ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
};

const isSessionItem = (value: unknown): value is ActiveSession => {
  if (!value || typeof value !== "object") return false;
  const session = value as ActiveSession;
  return Boolean(
    session.id &&
      session.device &&
      session.browser &&
      session.location &&
      session.lastActive &&
      typeof session.isCurrent === "boolean",
  );
};

const buildCurrentSession = (userId: string): ActiveSession => {
  const token = getToken() || "local-session";
  const tokenFingerprint = token.slice(-10);
  const userAgent = navigator.userAgent || "";

  return {
    id: `${userId}-${tokenFingerprint}`,
    device: getDeviceName(userAgent),
    browser: getBrowserName(userAgent),
    location: "Sesión local",
    lastActive: new Date().toISOString(),
    isCurrent: true,
  };
};

export default function Seguridad() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id as string | undefined;
  const userPermisos = currentUser?.permisos || [];

  const isAdmin = userPermisos.includes("sistema.admin");
  const canConfigureSystem =
    isAdmin ||
    userPermisos.includes("sistema.configurar") ||
    userPermisos.includes("sistema.config");
  const canManageMigraciones = isAdmin || userPermisos.includes("sistema.migraciones");
  const canViewAuditLog = isAdmin;

  const sessionStorageKey = currentUserId
    ? `${SESSION_KEY_PREFIX}${currentUserId}`
    : `${SESSION_KEY_PREFIX}anon`;
  const twoFactorConfigKey = currentUserId
    ? `usuario_${currentUserId}_two_factor_enabled`
    : null;
  const passwordUpdateStorageKey = currentUserId
    ? `${PASSWORD_UPDATE_KEY_PREFIX}${currentUserId}`
    : null;

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [lastPasswordUpdate, setLastPasswordUpdate] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [systemTitle, setSystemTitle] = useState<string>("SGC ISO 9001");
  const [systemSubtitle, setSystemSubtitle] = useState<string>("Sistema de Calidad");
  const [savingTexts, setSavingTexts] = useState(false);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);

  const loadSessions = () => {
    if (!currentUserId) {
      setSessions([]);
      return;
    }

    setLoadingSessions(true);
    try {
      const currentSession = buildCurrentSession(currentUserId);
      const raw = localStorage.getItem(sessionStorageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
      const previousSessions = Array.isArray(parsed)
        ? parsed.filter(isSessionItem).map((session) => ({ ...session, isCurrent: false }))
        : [];

      const uniquePreviousSessions = previousSessions.filter(
        (session) => session.id !== currentSession.id,
      );
      const mergedSessions = [currentSession, ...uniquePreviousSessions].slice(0, 8);

      setSessions(mergedSessions);
      localStorage.setItem(sessionStorageKey, JSON.stringify(mergedSessions));
    } catch (error) {
      console.error("Error cargando sesiones locales:", error);
      setSessions(currentUserId ? [buildCurrentSession(currentUserId)] : []);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (passwordUpdateStorageKey) {
        const storedPasswordUpdate = localStorage.getItem(passwordUpdateStorageKey);
        setLastPasswordUpdate(storedPasswordUpdate);
      }

      let configsSistema: Awaited<ReturnType<typeof configuracionService.list>> = [];
      try {
        configsSistema = await configuracionService.list({ categoria: "sistema", limit: 500 });
      } catch (error) {
        console.error("Error cargando configuraciones del sistema:", error);
      }

      const configByKey = new Map(configsSistema.map((cfg) => [cfg.clave, cfg.valor]));

      if (canConfigureSystem) {
        const logo = configByKey.get("logo_universidad");
        const title = configByKey.get("sistema_titulo");
        const subtitle = configByKey.get("sistema_subtitulo");

        if (logo) setLogoUrl(logo);
        if (title) setSystemTitle(title);
        if (subtitle) setSystemSubtitle(subtitle);
      }

      if (twoFactorConfigKey) {
        const twoFactorValue = configByKey.get(twoFactorConfigKey);
        setTwoFactorEnabled(twoFactorValue === "true");
      }

      loadSessions();
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConfigureSystem, twoFactorConfigKey, passwordUpdateStorageKey, sessionStorageKey]);

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!canConfigureSystem) {
      toast.error("No tienes permisos para cambiar el logo del sistema.");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const url = await uploadSystemLogo(file);
      await configuracionService.save("logo_universidad", url, "Logo Universidad");
      setLogoUrl(url);
      toast.success("Logo actualizado correctamente");
      window.dispatchEvent(new Event("system-logo-change"));
    } catch (error) {
      console.error("Error subiendo logo:", error);
      const message = (error as Error).message || "Error al actualizar el logo";
      toast.error(message);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveSystemTexts = async () => {
    if (!canConfigureSystem) {
      toast.error("No tienes permisos para editar la configuración del sistema.");
      return;
    }

    const title = systemTitle.trim();
    const subtitle = systemSubtitle.trim();

    if (!title || !subtitle) {
      toast.error("El título y el subtítulo del sistema son obligatorios.");
      return;
    }

    setSavingTexts(true);
    try {
      await configuracionService.save("sistema_titulo", title, "Título del Sistema");
      await configuracionService.save("sistema_subtitulo", subtitle, "Subtítulo del Sistema");
      setSystemTitle(title);
      setSystemSubtitle(subtitle);
      toast.success("Textos del sistema actualizados correctamente");
      window.dispatchEvent(new Event("system-config-change"));
    } catch (error) {
      console.error("Error guardando textos:", error);
      const message = (error as Error).message || "Error al guardar los textos";
      toast.error(message);
    } finally {
      setSavingTexts(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error("Ingresa tu contraseña actual.");
      return;
    }
    if (!newPassword || !confirmPassword) {
      toast.error("Completa todos los campos de contraseña.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las nuevas contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!currentUserId) {
      toast.error("Sesión no válida. Inicia sesión nuevamente.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await apiClient.put(`/usuarios/${currentUserId}`, {
        contrasena: newPassword,
      });

      const updatedAt = new Date().toISOString();
      setLastPasswordUpdate(updatedAt);
      if (passwordUpdateStorageKey) {
        localStorage.setItem(passwordUpdateStorageKey, updatedAt);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña actualizada correctamente.");
    } catch (error) {
      console.error("Error actualizando contraseña:", error);
      const message = (error as Error).message || "No se pudo actualizar la contraseña.";
      toast.error(message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleToggleTwoFactor = async (checked: boolean) => {
    if (!twoFactorConfigKey) {
      toast.error("No se pudo identificar al usuario para guardar la configuración.");
      return;
    }

    const previousValue = twoFactorEnabled;
    setTwoFactorEnabled(checked);
    setSavingTwoFactor(true);

    try {
      await configuracionService.save(
        twoFactorConfigKey,
        checked ? "true" : "false",
        "Estado de verificación en dos pasos por usuario",
      );
      toast.success(
        checked
          ? "Verificación en dos pasos activada."
          : "Verificación en dos pasos desactivada.",
      );
    } catch (error) {
      console.error("Error actualizando 2FA:", error);
      setTwoFactorEnabled(previousValue);
      toast.error("No se pudo actualizar la verificación en dos pasos.");
    } finally {
      setSavingTwoFactor(false);
    }
  };

  const persistSessions = (nextSessions: ActiveSession[]) => {
    setSessions(nextSessions);
    localStorage.setItem(sessionStorageKey, JSON.stringify(nextSessions));
  };

  const handleCloseSession = async (session: ActiveSession) => {
    if (session.isCurrent) {
      setClosingSessionId(session.id);
      try {
        await logout();
      } catch (error) {
        console.error("Error cerrando sesión actual:", error);
      } finally {
        toast.success("Sesión cerrada.");
        window.location.href = "/login";
      }
      return;
    }

    setClosingSessionId(session.id);
    try {
      const nextSessions = sessions.filter((item) => item.id !== session.id);
      persistSessions(nextSessions);
      toast.success("Sesión eliminada correctamente.");
    } finally {
      setClosingSessionId(null);
    }
  };

  const handleCloseOtherSessions = () => {
    const currentSession = sessions.find((session) => session.isCurrent);
    if (!currentSession) {
      toast.error("No se encontró la sesión actual.");
      return;
    }

    persistSessions([currentSession]);
    toast.success("Se cerraron las otras sesiones registradas.");
  };

  const securityStatusCard = (
    <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden h-fit">
      <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-row items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Activity className="h-5 w-5 text-blue-600" />
        </div>
        <CardTitle className="text-lg text-[#1E3A8A]">Estado de seguridad</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
            <p className="text-xs text-[#6B7280] uppercase font-semibold">2FA</p>
            <p className="text-sm font-bold text-[#1E3A8A]">
              {twoFactorEnabled ? "Activo" : "Inactivo"}
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
            <p className="text-xs text-[#6B7280] uppercase font-semibold">Sesiones</p>
            <p className="text-sm font-bold text-[#1E3A8A]">{sessions.length} registradas</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
            <p className="text-xs text-[#6B7280] uppercase font-semibold">Contraseña</p>
            <p className="text-sm font-bold text-[#1E3A8A]">
              {lastPasswordUpdate
                ? formatRelativeTime(lastPasswordUpdate)
                : "Sin cambios recientes"}
            </p>
          </div>
        </div>

        {(canConfigureSystem || canManageMigraciones || canViewAuditLog) && (
          <>
            <Separator className="bg-gray-100" />
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#334155]">Vistas del sistema</p>
              <div className="flex flex-wrap gap-2">
                {canConfigureSystem && (
                  <Button
                    variant="outline"
                    className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => navigate("/configuracion")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configuración
                  </Button>
                )}
                {canManageMigraciones && (
                  <Button
                    variant="outline"
                    className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => navigate("/sistema/migraciones")}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Migraciones
                  </Button>
                )}
                {canViewAuditLog && (
                  <Button
                    variant="outline"
                    className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => navigate("/sistema/audit-log")}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Audit Log
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const sessionsCard = (
    <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden h-fit">
      <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-row items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Smartphone className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg text-[#1E3A8A]">Sesiones activas</CardTitle>
          <p className="text-xs text-[#6B7280] mt-1">
            Gestiona sesiones registradas en este usuario.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={loadSessions}
          disabled={loadingSessions}
        >
          {loadingSessions ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Actualizar"
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {sessions.length > 1 && (
          <Button
            variant="outline"
            className="w-full rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={handleCloseOtherSessions}
            disabled={loadingSessions}
          >
            Cerrar otras sesiones
          </Button>
        )}

        {sessions.map((session, index) => (
          <div key={session.id}>
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${
                session.isCurrent
                  ? "bg-blue-50 border-blue-100"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <div>
                <p className="text-sm font-bold text-[#1E3A8A]">
                  {session.device} · {session.browser}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {session.location} · {formatRelativeTime(session.lastActive)}
                </p>
              </div>
              {session.isCurrent ? (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full border border-green-200">
                  Sesión actual
                </span>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => handleCloseSession(session)}
                  disabled={closingSessionId === session.id}
                >
                  {closingSessionId === session.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar sesión
                    </>
                  )}
                </Button>
              )}
            </div>
            {index < sessions.length - 1 && <Separator className="my-4 bg-gray-100" />}
          </div>
        ))}

        {sessions.length === 1 && (
          <Button
            variant="destructive"
            className="w-full rounded-xl"
            onClick={() => handleCloseSession(sessions[0])}
            disabled={closingSessionId === sessions[0].id}
          >
            {closingSessionId === sessions[0].id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión actual
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const passwordCard = (
    <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
      <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-row items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <KeyRound className="h-5 w-5 text-blue-600" />
        </div>
        <CardTitle className="text-lg text-[#1E3A8A]">Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid gap-2">
          <Label className="font-semibold text-gray-700">Contraseña actual</Label>
          <Input
            type="password"
            placeholder="••••••••"
            className="rounded-xl"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Por seguridad, valida tu contraseña antes del cambio.
          </p>
        </div>

        <div className="grid gap-2">
          <Label className="font-semibold text-gray-700">Nueva contraseña</Label>
          <Input
            type="password"
            placeholder="Mínimo 8 caracteres"
            className="rounded-xl"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label className="font-semibold text-gray-700">Confirmar nueva contraseña</Label>
          <Input
            type="password"
            placeholder="Repite la contraseña"
            className="rounded-xl"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button
          onClick={handleUpdatePassword}
          disabled={updatingPassword}
          className="mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6 py-5 h-auto font-bold w-full"
        >
          {updatingPassword ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            "Actualizar contraseña"
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const twoFactorCard = (
    <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
      <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-row items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
        </div>
        <CardTitle className="text-lg text-[#1E3A8A]">Verificación en dos pasos</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-bold text-gray-800">Autenticación en dos pasos (2FA)</p>
          <p className="text-sm text-[#6B7280]">
            Activa una capa extra de seguridad para tu cuenta.
          </p>
        </div>
        <Switch
          checked={twoFactorEnabled}
          onCheckedChange={handleToggleTwoFactor}
          disabled={savingTwoFactor}
        />
      </CardContent>
    </Card>
  );

  const personalizationCard = canConfigureSystem ? (
    <Card className="rounded-2xl shadow-sm border-[#E5E7EB] overflow-hidden">
      <CardHeader className="bg-[#F8FAFC] border-b border-[#E5E7EB] flex flex-row items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Building className="h-5 w-5 text-blue-600" />
        </div>
        <CardTitle className="text-lg text-[#1E3A8A]">Personalización del Sistema</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative group flex aspect-square size-24 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo Universidad"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <Building className="size-10 text-gray-300" />
            )}
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900">Logo de la Universidad</h3>
              <p className="text-sm text-gray-500">Visible en la barra lateral y reportes.</p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                variant="outline"
                className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Cambiar logo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-100" />

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Textos del sistema</h3>
            <p className="text-sm text-gray-500">
              Personaliza el título y subtítulo de la barra lateral.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label className="font-semibold text-gray-700">Título principal</Label>
              <Input
                type="text"
                placeholder="SGC ISO 9001"
                className="rounded-xl"
                value={systemTitle}
                onChange={(e) => setSystemTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label className="font-semibold text-gray-700">Subtítulo</Label>
              <Input
                type="text"
                placeholder="Sistema de Calidad"
                className="rounded-xl"
                value={systemSubtitle}
                onChange={(e) => setSystemSubtitle(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSaveSystemTexts}
              disabled={savingTexts}
              className="mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl px-6 py-5 h-auto font-bold w-full"
            >
              {savingTexts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ) : null;

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1E3A8A] flex items-center gap-3">
                <Shield className="h-9 w-9 text-[#2563EB]" />
                Seguridad
              </h1>
              <p className="text-[#6B7280] mt-2 text-lg">
                Administra la seguridad y acceso de tu cuenta y del sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            {canConfigureSystem ? personalizationCard : passwordCard}
            {canConfigureSystem && securityStatusCard}
            {!canConfigureSystem && twoFactorCard}
            {!canConfigureSystem && securityStatusCard}
          </div>

          <div className="space-y-6">
            {sessionsCard}
            {canConfigureSystem && passwordCard}
            {canConfigureSystem && twoFactorCard}
          </div>
        </div>
      </div>
    </div>
  );
}
