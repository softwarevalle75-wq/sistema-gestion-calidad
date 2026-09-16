import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, reenviarOtp, verificarOtp } from "@/services/auth";
import { ArrowLeft, FileText, Mail, ShieldCheck } from "lucide-react";

type LegalDocumentType = "terms" | "privacy";

const legalDocuments = {
  terms: {
    title: "Términos de Servicio",
    intro:
      "Estos términos regulan el acceso y uso del Sistema de Gestión de Calidad por parte de usuarios autorizados.",
    sections: [
      {
        title: "Alcance del servicio",
        content:
          "El sistema permite gestionar procesos, documentos, versiones, auditorías, hallazgos, riesgos, objetivos de calidad, indicadores, capacitaciones, competencias, no conformidades, acciones correctivas, tickets de soporte, notificaciones, reportes, migraciones y registros de auditoría interna.",
      },
      {
        title: "Usuarios autorizados y credenciales",
        content:
          "El acceso es personal, controlado por usuario, contraseña, token de sesión, roles y permisos. Las credenciales son intransferibles. El usuario debe proteger su contraseña, cerrar sesión en equipos compartidos y reportar cualquier acceso no autorizado.",
      },
      {
        title: "Administración de cuentas",
        content:
          "La creación de usuarios, asignación de áreas, roles, permisos, activación de cuentas y cambios de contraseña corresponde a usuarios con permisos administrativos. Los usuarios no deben intentar modificar privilegios, acceder a módulos restringidos o eludir controles del sistema.",
      },
      {
        title: "Uso correcto de la información",
        content:
          "La información registrada debe ser veraz, completa, pertinente y relacionada con actividades del sistema de calidad. No se debe cargar información falsa, ofensiva, innecesaria, ajena al proceso institucional o que vulnere derechos de terceros.",
      },
      {
        title: "Documentos, evidencias y archivos",
        content:
          "Los documentos, imágenes, soportes, evidencias, respuestas de formularios y archivos adjuntos cargados al sistema deben usarse para soportar gestión documental, auditorías, tickets, capacitaciones, no conformidades, acciones correctivas y trazabilidad operativa.",
      },
      {
        title: "Trazabilidad y auditoría",
        content:
          "El sistema puede registrar acciones de los usuarios, fechas, responsables, cambios, aprobaciones, revisiones, estados, comentarios y eventos relevantes para control interno, auditoría, seguridad, seguimiento de responsabilidades y mejora continua.",
      },
      {
        title: "Disponibilidad, soporte y cambios",
        content:
          "El servicio puede presentar interrupciones por mantenimiento, actualizaciones, fallas técnicas o cambios de configuración. Las solicitudes de soporte deben gestionarse mediante la mesa de ayuda o los canales definidos por la administración del sistema.",
      },
      {
        title: "Uso indebido",
        content:
          "El incumplimiento de estos términos puede generar restricción de acceso, revisión administrativa, corrección de registros, reporte a responsables internos o las medidas que correspondan según las políticas de la organización.",
      },
    ],
    footer: {
      title: "Aceptación de los términos",
      content:
        "Al marcar la casilla de aceptación e iniciar sesión, el usuario declara que entiende las condiciones de uso del sistema y se compromete a utilizarlo de forma responsable, segura y conforme a los permisos asignados.",
    },
  },
  privacy: {
    title: "Política de Privacidad y Uso de la Información",
    intro:
      "Esta política describe cómo el software recolecta, usa, conserva y protege los datos personales e información operativa del Sistema de Gestión de Calidad.",
    sections: [
      {
        title: "Responsable y finalidad general",
        content:
          "La organización que administra el sistema actúa como responsable o encargada del tratamiento, según corresponda. La información se usa para operar, controlar y mejorar los procesos del Sistema de Gestión de Calidad y para mantener evidencia de las actividades realizadas.",
      },
      {
        title: "Datos personales tratados",
        content:
          "El sistema puede tratar documento de identidad, nombres, apellidos, nombre de usuario, correo electrónico, cargo, área, foto de perfil, estado de cuenta, roles, permisos, usuario creador o responsable, token de sesión y datos técnicos asociados al acceso.",
      },
      {
        title: "Información operativa asociada",
        content:
          "La cuenta del usuario puede relacionarse con documentos creados, revisados o aprobados; versiones documentales; procesos; auditorías; hallazgos; riesgos; indicadores; objetivos; capacitaciones; asistencias; competencias; tickets; notificaciones; reportes; evidencias y registros de actividad.",
      },
      {
        title: "Finalidades específicas",
        content:
          "Los datos se usan para autenticar usuarios, administrar permisos, asignar responsables, controlar estados y aprobaciones, generar reportes, atender soporte, conservar evidencias, realizar auditorías, gestionar acciones de mejora, enviar notificaciones y proteger la seguridad del sistema.",
      },
      {
        title: "Archivos, evidencias y almacenamiento",
        content:
          "Los archivos cargados, como documentos, evidencias, imágenes, logos o adjuntos de tickets, pueden almacenarse en la infraestructura configurada para el proyecto, incluyendo backend, base de datos, rutas de archivo o servicios externos de almacenamiento como Supabase cuando estén habilitados.",
      },
      {
        title: "Seguridad y control de acceso",
        content:
          "El sistema aplica autenticación, token de sesión, permisos por rol, validaciones del backend, restricciones de rutas y registros de auditoría. La información solo debe ser consultada o modificada por usuarios autorizados según su rol y necesidad operativa.",
      },
      {
        title: "Conservación y trazabilidad",
        content:
          "La información se conserva durante el tiempo necesario para cumplir finalidades de gestión de calidad, control documental, auditoría, seguridad, soporte, mejora continua y obligaciones internas, legales o contractuales aplicables.",
      },
      {
        title: "Derechos de los titulares",
        content:
          "Los titulares pueden solicitar conocer, actualizar, rectificar, acceder o pedir información sobre el uso dado a sus datos personales. También pueden solicitar supresión o revocatoria cuando proceda conforme a la ley y a las finalidades legítimas del sistema.",
      },
      {
        title: "Confidencialidad y circulación",
        content:
          "La información no debe divulgarse a personas no autorizadas. Solo podrá compartirse con titulares, usuarios autorizados, administradores, responsables internos, proveedores tecnológicos necesarios, autoridades competentes o terceros permitidos por autorización, necesidad operativa o ley aplicable.",
      },
      {
        title: "Datos sensibles",
        content:
          "El sistema no solicita datos sensibles como parte ordinaria del login. Si un usuario incluye información sensible dentro de evidencias, archivos o comentarios, dicha información debe ser estrictamente necesaria para la gestión de calidad y será tratada con acceso restringido.",
      },
    ],
    footer: {
      title: "Autorización de tratamiento",
      content:
        "Al marcar la casilla de aceptación e iniciar sesión, el usuario autoriza el tratamiento de sus datos personales y de la información registrada en el sistema para las finalidades descritas en esta política.",
    },
  },
} satisfies Record<
  LegalDocumentType,
  {
    title: string;
    intro: string;
    sections: Array<{ title: string; content: string }>;
    footer: { title: string; content: string };
  }
>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre_usuario: "",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [openLegalDocument, setOpenLegalDocument] =
    useState<LegalDocumentType | null>(null);
  const [otpPending, setOtpPending] = useState<{
    otp_token: string;
    correo: string;
    mensaje: string;
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (otpPending) {
        if (!/^\d{6}$/.test(otpCode.trim())) {
          setError("Ingrese el código de 6 dígitos enviado a su correo");
          return;
        }
        setLoading(true);
        await verificarOtp(otpPending.otp_token, otpCode.trim());
        navigate("/dashboard");
        return;
      }

      if (!formData.nombre_usuario || !formData.password) {
        setError("Correo y contraseña son obligatorios");
        return;
      }

      const identificador = formData.nombre_usuario.trim();
      const esAdminUsuario = identificador.toLowerCase() === "admin";
      if (!identificador.includes("@") && !esAdminUsuario) {
        setError("Ingrese su correo electrónico para recibir el código OTP");
        return;
      }

      if (formData.password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres");
        return;
      }

      if (!acceptedPolicies) {
        setError(
          "Debes aceptar los términos de servicio y la política de privacidad para iniciar sesión"
        );
        return;
      }

      setLoading(true);

      const result = await login({
        nombre_usuario: formData.nombre_usuario,
        password: formData.password,
      });

      if (result.requiere_otp && result.otp_token) {
        setOtpPending({
          otp_token: result.otp_token,
          correo: result.correo_enmascarado || "su correo institucional",
          mensaje:
            result.mensaje ||
            "Enviamos un código de verificación a su correo institucional.",
        });
        setOtpCode("");
        setResendIn(60);
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Error en login:", err);
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpPending || resendIn > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      const result = await reenviarOtp(otpPending.otp_token);
      setOtpPending({
        otp_token: result.otp_token || otpPending.otp_token,
        correo: result.correo_enmascarado || otpPending.correo,
        mensaje: result.mensaje || "Enviamos un nuevo código a su correo.",
      });
      setOtpCode("");
      setResendIn(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar el código");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
    // Limpiar error al escribir
    if (error) setError("");
  };

  const activeLegalDocument = openLegalDocument
    ? legalDocuments[openLegalDocument]
    : null;
  const LegalDocumentIcon =
    openLegalDocument === "privacy" ? ShieldCheck : FileText;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-sm">
        <CardContent className="grid p-0 lg:grid-cols-2">
          <form className="p-5 sm:p-6 lg:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold text-[#1E3A8A]">Bienvenido</h1>
                <p className="text-balance text-[#6B7280]">
                  {otpPending
                    ? "Ingrese el código enviado a su correo institucional."
                    : "Inicia sesión para acceder al Sistema de Gestión de Calidad."}
                </p>
              </div>

              {error && (
                <div className="bg-destructive/15 text-destructive border border-destructive/30 rounded-md p-3 text-sm">
                  {error}
                </div>
              )}

              {otpPending ? (
                <>
                  <div className="rounded-md border bg-[#E0EDFF] p-3 text-sm text-[#1E3A8A]">
                    <p className="flex items-start gap-2">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {otpPending.mensaje} Correo:{" "}
                        <strong>{otpPending.correo}</strong>
                      </span>
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="otp_code">Código de verificación</Label>
                    <Input
                      id="otp_code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(event) => {
                        setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                        if (error) setError("");
                      }}
                      disabled={loading}
                      className="text-center text-2xl tracking-[0.4em]"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
                    {loading ? "Verificando..." : "Verificar código"}
                  </Button>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={loading || resendIn > 0}
                      onClick={handleResendOtp}
                    >
                      {resendIn > 0 ? `Reenviar en ${resendIn}s` : "Reenviar código"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      disabled={loading}
                      onClick={() => {
                        setOtpPending(null);
                        setOtpCode("");
                        setError("");
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Button>
                  </div>
                </>
              ) : (
                <>
              <div className="grid gap-2">
                <Label htmlFor="nombre_usuario">Correo electrónico</Label>
                <Input
                  id="nombre_usuario"
                  type="text"
                  placeholder="correo@gmail.com o Outlook"
                  required
                  value={formData.nombre_usuario}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                <Checkbox
                  id="acceptedPolicies"
                  checked={acceptedPolicies}
                  onCheckedChange={(checked) => {
                    setAcceptedPolicies(checked === true);
                    if (error) setError("");
                  }}
                  disabled={loading}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="acceptedPolicies"
                  className="text-sm font-normal leading-relaxed text-muted-foreground"
                >
                  Acepto los{" "}
                  <button
                    type="button"
                    onClick={() => setOpenLegalDocument("terms")}
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Términos de Servicio
                  </button>{" "}
                  y la{" "}
                  <button
                    type="button"
                    onClick={() => setOpenLegalDocument("privacy")}
                    className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    Política de Privacidad y Uso de la Información
                  </button>
                  .
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !acceptedPolicies}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
                </>
              )}
            </div>
          </form>
          <div className="relative hidden bg-muted lg:block">
            <img
              src="/fondo.png"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        Al iniciar sesión, confirmas que conoces y aceptas las condiciones de uso del sistema.
      </div>

      <Dialog
        open={openLegalDocument !== null}
        onOpenChange={(open) => {
          if (!open) setOpenLegalDocument(null);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden p-0 sm:rounded-lg">
          {activeLegalDocument && (
            <>
              <DialogHeader className="border-b bg-muted/40 px-6 py-5 pr-14 text-left">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border bg-background text-foreground shadow-sm">
                    <LegalDocumentIcon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-xl leading-tight">
                      {activeLegalDocument.title}
                    </DialogTitle>
                    <DialogDescription className="max-w-xl leading-relaxed">
                      {activeLegalDocument.intro}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="max-h-[62vh] space-y-3 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground">
                {activeLegalDocument.sections.map((section, index) => (
                  <section
                    key={section.title}
                    className="grid grid-cols-[auto_1fr] gap-3 rounded-md border bg-background p-4 shadow-sm"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {section.title}
                      </h3>
                      <p>{section.content}</p>
                    </div>
                  </section>
                ))}

                <div className="rounded-md border bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    {activeLegalDocument.footer.title}
                  </p>
                  <p>{activeLegalDocument.footer.content}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
