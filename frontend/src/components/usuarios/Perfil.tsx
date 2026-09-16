import { useEffect, useState, useCallback, useRef } from "react";
import { UploadIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser } from "@/services/auth";
import { apiClient } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    id: "",
    nombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    correoElectronico: "",
    areaId: "",
    areaNombre: "",
    activo: false,
    fotoUrl: "",
  });

  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [oldImagePath, setOldImagePath] = useState<string | null>(null);



  const currentUser = getCurrentUser();
  const usuarioId = currentUser?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarPerfil = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      const data = res.data;

      console.log("🔍 Datos del perfil recibidos:", data);
      console.log("🖼️ foto_url recibida:", data.foto_url);

      setProfile({
        id: data.id,
        nombre: data.nombre,
        segundoNombre: data.segundo_nombre || "",
        primerApellido: data.primer_apellido,
        segundoApellido: data.segundo_apellido || "",
        correoElectronico: data.correo_electronico,
        areaId: data.area_id || "",
        areaNombre: data.area?.nombre || "",
        activo: data.activo,
        fotoUrl: data.foto_url || "",
        nombreUsuario: data.nombre_usuario, // Añadir si falta en el estado inicial
      } as any);

      // Usar fotoUrl
      const imageUrl = data.foto_url;
      console.log("🎨 URL de imagen a mostrar:", imageUrl);
      setPreview(imageUrl || null);

      if (imageUrl) {
        const urlParts = imageUrl.split("/");
        const pathIndex = urlParts.findIndex(
          (part: string) => part === "imagenes",
        );
        if (pathIndex !== -1) {
          const path = urlParts.slice(pathIndex + 1).join("/");
          setOldImagePath(path);
        }
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
      toast.error("No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  /** Manejar cambios de texto */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  /** Manejar cambio de foto */
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }

    setFoto(file);
    setPreview(URL.createObjectURL(file));
  };

  /** Guardar cambios */
  const handleGuardar = async () => {
    setSaving(true);

    try {
      let fotoUrl = profile.fotoUrl;

      // 1. Si hay nueva foto, subirla usando el endpoint del backend
      if (foto) {
        setUploadingImage(true);
        toast.info("Subiendo imagen...");

        try {
          const formData = new FormData();
          formData.append("file", foto);

          const uploadResponse = await apiClient.post(
            `/usuarios/${usuarioId}/foto-perfil`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          fotoUrl = uploadResponse.data.foto_url;
          toast.success("Imagen subida correctamente");
        } catch (error) {
          toast.error("Error al subir la imagen");
          console.error("Error uploading image:", error);
          setSaving(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // 2. Actualizar perfil en el backend
      const updateData: any = {
        nombre: profile.nombre,
        segundo_nombre: profile.segundoNombre || null,
        primer_apellido: profile.primerApellido,
        segundo_apellido: profile.segundoApellido || null,
        correo_electronico: profile.correoElectronico,
        foto_url: fotoUrl,
      };



      await apiClient.put(`/usuarios/${usuarioId}`, updateData);

      // Actualizar el estado local
      setProfile({ ...profile, fotoUrl: fotoUrl });
      setPreview(fotoUrl);
      setFoto(null);

      // Actualizar localStorage con la nueva foto (solo fotoUrl en camelCase)
      const storedUser = getCurrentUser();
      if (storedUser) {
        const updatedUser = {
          ...storedUser,
          fotoUrl: fotoUrl,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      toast.success("Perfil actualizado correctamente.");

    } catch (error) {
      toast.error("Error al guardar los cambios.");
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <LoadingSpinner message="Cargando perfil" />
    );

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
        <h1 className="text-3xl font-bold text-[#1E3A8A]">Mi Perfil</h1>
        <p className="text-[#6B7280] mt-2">Datos personales y foto de usuario del SGC</p>
      </div>
      <Card className="w-full rounded-2xl shadow-sm border border-[#E5E7EB]">
        <CardHeader>
          <CardTitle className="text-[#1E3A8A]">Información de la cuenta</CardTitle>
        </CardHeader>
        <Separator />

        <CardContent className="flex flex-col md:flex-row gap-6 py-6">
          {/* FOTO DE PERFIL */}
          <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
            <Avatar className="w-32 h-32 border">
              {preview ? (
                <AvatarImage src={preview} alt="Foto de perfil" />
              ) : (
                <AvatarFallback>
                  {profile.nombre
                    ? profile.nombre
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                    : "?"}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex flex-col items-center gap-2 w-full">
              <Label htmlFor="foto" className="text-sm font-medium">
                Foto de perfil
              </Label>

              <input
                ref={fileInputRef}
                id="foto"
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                disabled={uploadingImage || saving}
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Subir foto
                  </>
                )}
              </Button>

              {foto && (
                <span className="text-xs text-muted-foreground text-center">
                  {foto.name}
                </span>
              )}
            </div>
          </div>

          {/* CAMPOS DE TEXTO */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Primer nombre</FieldLabel>
                <FieldContent>
                  <Input
                    name="nombre"
                    value={profile.nombre}
                    onChange={handleChange}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Segundo nombre</FieldLabel>
                <FieldContent>
                  <Input
                    name="segundoNombre"
                    value={profile.segundoNombre}
                    onChange={handleChange}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Primer apellido</FieldLabel>
                <FieldContent>
                  <Input
                    name="primerApellido"
                    value={profile.primerApellido}
                    onChange={handleChange}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Segundo apellido</FieldLabel>
                <FieldContent>
                  <Input
                    name="segundoApellido"
                    value={profile.segundoApellido}
                    onChange={handleChange}
                  />
                </FieldContent>
              </Field>
            </div>

            <Field>
              <FieldLabel>Correo electrónico</FieldLabel>
              <FieldContent>
                <Input
                  name="correoElectronico"
                  type="email"
                  value={profile.correoElectronico}
                  onChange={handleChange}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Área</FieldLabel>
              <FieldContent>
                <Input
                  name="areaId"
                  value={profile.areaNombre}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </FieldContent>
            </Field>


          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={saving || uploadingImage}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Guardar cambios?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción actualizará tu información personal y contraseña
                  (si fue modificada). Asegúrate de que los datos sean correctos
                  antes de continuar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleGuardar}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Confirmar y guardar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}
