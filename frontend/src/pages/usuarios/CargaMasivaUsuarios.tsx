import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Upload,
    ArrowLeft,
    Download,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    AlertCircle,
    Users,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { apiClient } from "@/lib/api";
import { usuarioService } from "@/services/usuario.service";
import {
    cargarDominiosInstitucionales,
    esCorreoInstitucional,
    mensajeCorreoInstitucional,
} from "@/utils/correoInstitucional";

const COLUMNAS_USUARIO = [
    "documento",
    "nombre",
    "segundo_nombre",
    "primer_apellido",
    "segundo_apellido",
    "correo_electronico",
    "nombre_usuario",
    "contrasena",
    "area_codigo",
    "roles",
    "activo",
] as const;

const COLUMNAS_REQUERIDAS = [
    "documento",
    "nombre",
    "primer_apellido",
    "correo_electronico",
    "nombre_usuario",
    "contrasena",
    "area_codigo",
    "roles",
] as const;

const ALIAS_COLUMNAS: Record<string, string> = {
    document: "documento",
    cedula: "documento",
    identificacion: "documento",
    id: "documento",
    primer_nombre: "nombre",
    apellido: "primer_apellido",
    apellido_1: "primer_apellido",
    correo: "correo_electronico",
    email: "correo_electronico",
    e_mail: "correo_electronico",
    mail: "correo_electronico",
    usuario: "nombre_usuario",
    username: "nombre_usuario",
    user: "nombre_usuario",
    password: "contrasena",
    pass: "contrasena",
    clave: "contrasena",
    area: "area_codigo",
    codigo_area: "area_codigo",
    codigo_de_area: "area_codigo",
    area_code: "area_codigo",
    rol: "roles",
    role: "roles",
    estado: "activo",
};

type AreaCatalogo = { id?: string; codigo: string; nombre: string };
type RolCatalogo = { id?: string; clave: string; nombre: string };

const descargarLibroExcel = (libro: XLSX.WorkBook, nombreArchivo: string) => {
    XLSX.writeFile(libro, nombreArchivo);
};

const normalizarColumna = (nombre: string) => {
    const texto = String(nombre || "")
        .replace("\ufeff", "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    return ALIAS_COLUMNAS[texto] || texto;
};

const parseDocumento = (valor: string): number | null => {
    let texto = String(valor || "").trim().replace(/ /g, "").replace(/,/g, "");
    if (!texto) return null;
    if (/^\d+\.0+$/.test(texto)) texto = texto.split(".")[0];
    const numero = Number(texto);
    return Number.isFinite(numero) ? Math.trunc(numero) : null;
};

const parseActivo = (valor: string, porDefecto = true) => {
    const texto = String(valor || "").trim().toLowerCase();
    if (!texto) return porDefecto;
    if (["true", "1", "si", "sí", "yes", "y", "activo"].includes(texto)) return true;
    if (["false", "0", "no", "n", "inactivo"].includes(texto)) return false;
    return porDefecto;
};

const esErrorDeRed = (error: any) => {
    const mensaje = String(error?.message || error?.code || "");
    return (
        !error?.response &&
        /networkerror|failed to fetch|network error|err_network|err_connection|load failed/i.test(mensaje)
    );
};

const mensajeDesdeError = (error: any) => {
    const data = error?.response?.data;
    const detail = data?.detail ?? error?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
        return detail.map((item: any) => item?.msg || item?.detail || JSON.stringify(item)).join(". ");
    }
    return error?.message || "Error al procesar el archivo";
};

const leerFilasArchivo = async (file: File): Promise<Record<string, string>[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", raw: false });
    const ignorar = new Set(["areas", "roles", "instrucciones", "nota"]);
    const hoja =
        workbook.SheetNames.find((nombre) => nombre.toLowerCase() === "usuarios") ||
        workbook.SheetNames.find((nombre) => !ignorar.has(nombre.toLowerCase())) ||
        workbook.SheetNames[0];
    if (!hoja || !workbook.Sheets[hoja]) {
        throw new Error("El archivo no contiene una hoja de usuarios");
    }

    const crudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[hoja], {
        defval: "",
        raw: false,
    });

    return crudas
        .map((fila) => {
            const normalizada: Record<string, string> = {};
            for (const [clave, valor] of Object.entries(fila)) {
                const columna = normalizarColumna(clave);
                if (!columna) continue;
                normalizada[columna] = valor == null ? "" : String(valor).trim();
            }
            return normalizada;
        })
        .filter((fila) => Object.values(fila).some((valor) => valor.length > 0));
};

interface ErrorDetalle {
    fila: number;
    campo: string;
    valor?: string;
    error: string;
}

interface UsuarioExitoso {
    fila: number;
    nombre_usuario: string;
    nombre_completo: string;
    correo_electronico: string;
}

interface ResultadoCarga {
    total_procesados: number;
    exitosos: number;
    errores: number;
    detalles_exitosos: UsuarioExitoso[];
    detalles_errores: ErrorDetalle[];
}

function validarFilaLocal(
    fila: Record<string, string>,
    filaNum: number,
    areas: AreaCatalogo[],
    roles: RolCatalogo[],
) {
    const errores: ErrorDetalle[] = [];
    const documento = parseDocumento(fila.documento || "");
    if (documento == null) {
        errores.push({
            fila: filaNum,
            campo: "documento",
            valor: fila.documento || undefined,
            error: "El documento es obligatorio y debe ser numérico",
        });
    }
    if (!fila.nombre) {
        errores.push({ fila: filaNum, campo: "nombre", error: "El nombre es obligatorio" });
    }
    if (!fila.primer_apellido) {
        errores.push({ fila: filaNum, campo: "primer_apellido", error: "El primer apellido es obligatorio" });
    }
    if (!fila.correo_electronico) {
        errores.push({ fila: filaNum, campo: "correo_electronico", error: "El correo electrónico es obligatorio" });
    } else if (!fila.correo_electronico.includes("@")) {
        errores.push({
            fila: filaNum,
            campo: "correo_electronico",
            valor: fila.correo_electronico,
            error: "El correo electrónico no es válido",
        });
    } else if (!esCorreoInstitucional(fila.correo_electronico)) {
        errores.push({
            fila: filaNum,
            campo: "correo_electronico",
            valor: fila.correo_electronico,
            error: mensajeCorreoInstitucional(),
        });
    }
    if (!fila.nombre_usuario) {
        errores.push({ fila: filaNum, campo: "nombre_usuario", error: "El nombre de usuario es obligatorio" });
    }
    if (!fila.contrasena || fila.contrasena.length < 8) {
        errores.push({
            fila: filaNum,
            campo: "contrasena",
            valor: "***",
            error: "La contraseña debe tener al menos 8 caracteres",
        });
    }

    const areaCodigo = fila.area_codigo || "";
    const area =
        areas.find((item) => item.codigo?.toUpperCase() === areaCodigo.toUpperCase()) ||
        areas.find((item) => normalizarColumna(item.nombre) === normalizarColumna(areaCodigo));
    if (!areaCodigo) {
        errores.push({ fila: filaNum, campo: "area_codigo", error: "El código de área es obligatorio" });
    } else if (!area?.id) {
        errores.push({
            fila: filaNum,
            campo: "area_codigo",
            valor: areaCodigo,
            error: `El área con código ${areaCodigo} no existe`,
        });
    }

    const claves = (fila.roles || "").split(/[,;|]/).map((rol) => rol.trim()).filter(Boolean);
    const rolIds: string[] = [];
    const invalidos: string[] = [];
    for (const clave of claves) {
        const rol =
            roles.find((item) => item.clave?.toLowerCase() === clave.toLowerCase()) ||
            roles.find((item) => normalizarColumna(item.nombre) === normalizarColumna(clave));
        if (!rol?.id) invalidos.push(clave);
        else if (!rolIds.includes(rol.id)) rolIds.push(rol.id);
    }
    if (!claves.length) {
        errores.push({ fila: filaNum, campo: "roles", error: "Debe especificar al menos un rol" });
    } else if (invalidos.length) {
        errores.push({
            fila: filaNum,
            campo: "roles",
            valor: invalidos.join(", "),
            error: `Roles no encontrados: ${invalidos.join(", ")}`,
        });
    }

    return {
        errores,
        payload: {
            documento,
            nombre: fila.nombre,
            segundo_nombre: fila.segundo_nombre || null,
            primer_apellido: fila.primer_apellido,
            segundo_apellido: fila.segundo_apellido || null,
            correo_electronico: fila.correo_electronico,
            nombre_usuario: fila.nombre_usuario,
            contrasena: fila.contrasena,
            area_id: area?.id || null,
            rol_ids: rolIds,
            activo: parseActivo(fila.activo),
        },
    };
}

async function crearUsuariosUnoAUno(
    filas: Record<string, string>[],
    areas: AreaCatalogo[],
    roles: RolCatalogo[],
): Promise<ResultadoCarga> {
    const detalles_exitosos: UsuarioExitoso[] = [];
    const detalles_errores: ErrorDetalle[] = [];

    for (let i = 0; i < filas.length; i++) {
        const fila = filas[i];
        const filaNum = i + 2;
        const previa = validarFilaLocal(fila, filaNum, areas, roles);
        if (previa.errores.length) {
            detalles_errores.push(...previa.errores);
            continue;
        }

        try {
            const creado = await apiClient.post("/usuarios", previa.payload, { timeout: 60000 });
            const nombre = creado.data?.nombre || previa.payload.nombre;
            const apellido = creado.data?.primer_apellido || previa.payload.primer_apellido;
            detalles_exitosos.push({
                fila: filaNum,
                nombre_usuario: creado.data?.nombre_usuario || previa.payload.nombre_usuario,
                nombre_completo: `${nombre} ${apellido}`.trim(),
                correo_electronico: creado.data?.correo_electronico || previa.payload.correo_electronico,
            });
        } catch (error: any) {
            if (error?.response?.status === 401) throw error;
            detalles_errores.push({
                fila: filaNum,
                campo: "general",
                valor: fila.nombre_usuario || undefined,
                error: mensajeDesdeError(error),
            });
        }
    }

    return {
        total_procesados: filas.length,
        exitosos: detalles_exitosos.length,
        errores: detalles_errores.length,
        detalles_exitosos,
        detalles_errores,
    };
}

export default function CargaMasivaUsuarios() {
    const navigate = useNavigate();
    const [archivo, setArchivo] = useState<File | null>(null);
    const [cargando, setCargando] = useState(false);
    const [descargando, setDescargando] = useState<"plantilla" | "usuarios" | null>(null);
    const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
    const [areas, setAreas] = useState<AreaCatalogo[]>([]);
    const [roles, setRoles] = useState<RolCatalogo[]>([]);

    useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                await cargarDominiosInstitucionales();
                const [areasRes, rolesRes] = await Promise.all([
                    apiClient.get("/areas?limit=200"),
                    apiClient.get("/roles?limit=200"),
                ]);
                setAreas(Array.isArray(areasRes.data) ? areasRes.data : []);
                setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
            } catch (error) {
                console.error("No se pudieron cargar áreas o roles:", error);
            }
        };
        cargarCatalogos();
    }, []);

    const extraerMensajeError = async (error: any) => {
        if (esErrorDeRed(error)) {
            return "No se pudo conectar con el servidor. Verifique su conexión e inténtelo de nuevo.";
        }
        const data = error?.response?.data;
        if (data instanceof Blob) {
            try {
                const parsed = JSON.parse(await data.text());
                if (typeof parsed?.detail === "string") return parsed.detail;
            } catch {
                /* ignore */
            }
        }
        return mensajeDesdeError(error);
    };

    const generarPlantillaLocal = () => {
        const areaEjemplo = areas[0]?.codigo || "CAL";
            const rolEjemplo = roles.find((r) => r.clave !== "admin")?.clave || roles[0]?.clave || "colaborador";

        const ejemplos = [
            {
                documento: "10000001",
                nombre: "Juan",
                segundo_nombre: "Carlos",
                primer_apellido: "Perez",
                segundo_apellido: "Garcia",
                correo_electronico: "juan.perez@gmail.com",
                nombre_usuario: "jperez",
                contrasena: "Password123",
                area_codigo: areaEjemplo,
                roles: rolEjemplo,
                activo: "true",
            },
            {
                documento: "10000002",
                nombre: "Maria",
                segundo_nombre: "Elena",
                primer_apellido: "Lopez",
                segundo_apellido: "Martinez",
                correo_electronico: "maria.lopez@outlook.com",
                nombre_usuario: "mlopez",
                contrasena: "Password123",
                area_codigo: areaEjemplo,
                roles: rolEjemplo,
                activo: "true",
            },
        ];

        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(ejemplos, { header: [...COLUMNAS_USUARIO] }), "Usuarios");
        XLSX.utils.book_append_sheet(
            libro,
            XLSX.utils.json_to_sheet(
                areas.length ? areas.map((a) => ({ codigo: a.codigo, nombre: a.nombre })) : [{ codigo: "", nombre: "No hay áreas" }]
            ),
            "Areas"
        );
        XLSX.utils.book_append_sheet(
            libro,
            XLSX.utils.json_to_sheet(
                roles.length ? roles.map((r) => ({ clave: r.clave, nombre: r.nombre })) : [{ clave: "", nombre: "No hay roles" }]
            ),
            "Roles"
        );
        descargarLibroExcel(libro, "plantilla_usuarios.xlsx");
    };

    const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
                toast.error("Tipo de archivo no válido. Use .xlsx, .xls o .csv");
                return;
            }

            // Validar tamaño (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("El archivo no puede superar los 5MB");
                return;
            }

            setArchivo(file);
            setResultado(null);
        }
    };

    const handleProcesar = async () => {
        if (!archivo) {
            toast.error("Seleccione un archivo primero");
            return;
        }

        setCargando(true);

        try {
            const filas = await leerFilasArchivo(archivo);
            if (!filas.length) {
                throw new Error("El archivo no contiene usuarios para procesar");
            }

            const encabezados = new Set(Object.keys(filas[0]));
            const faltantes = COLUMNAS_REQUERIDAS.filter((columna) => !encabezados.has(columna));
            if (faltantes.length) {
                throw new Error(`Columnas faltantes en el archivo: ${faltantes.join(", ")}`);
            }
            if (filas.length > 1000) {
                throw new Error("El archivo no puede contener más de 1000 usuarios");
            }

            let data: ResultadoCarga;
            try {
                const response = await apiClient.post(
                    "/usuarios/carga-masiva/json",
                    { filas },
                    { timeout: 120000 }
                );
                data = response.data;
            } catch (error: any) {
                const status = error?.response?.status;
                const endpointNoDisponible = !status || [404, 405, 422].includes(status);
                if (!endpointNoDisponible) {
                    throw error;
                }
                data = await crearUsuariosUnoAUno(filas, areas, roles);
            }

            setResultado(data);

            if (data.errores === 0) {
                toast.success(`¡${data.exitosos} usuarios creados exitosamente!`);
            } else if (data.exitosos === 0) {
                toast.error(`No se pudo crear ningún usuario. ${data.errores} errores encontrados.`);
            } else {
                toast.warning(`${data.exitosos} usuarios creados, ${data.errores} con errores.`);
            }
        } catch (error: any) {
            console.error("Error:", error);
            toast.error(await extraerMensajeError(error));
        } finally {
            setCargando(false);
        }
    };

    const descargarPlantilla = async () => {
        setDescargando("plantilla");
        try {
            generarPlantillaLocal();
            toast.success("Plantilla descargada");
        } catch (error: any) {
            console.error(error);
            toast.error((await extraerMensajeError(error)) || "No se pudo descargar la plantilla");
        } finally {
            setDescargando(null);
        }
    };

    const exportarUsuarios = async () => {
        setDescargando("usuarios");
        try {
            const [usuarios, rolesRes] = await Promise.all([
                usuarioService.getAll({ limit: 5000 }),
                roles.length ? Promise.resolve({ data: roles }) : apiClient.get("/roles"),
            ]);

            const catalogoRoles = Array.isArray(rolesRes.data) ? rolesRes.data : roles;
            const rolesPorId = new Map<string, string>(
                catalogoRoles
                    .filter((rol: { id?: string; clave: string }) => rol.id && rol.clave)
                    .map((rol: { id?: string; clave: string }) => [String(rol.id), rol.clave])
            );

            const filas = (Array.isArray(usuarios) ? usuarios : []).map((usuario: any) => {
                const clavesRol = Array.isArray(usuario.roles)
                    ? usuario.roles
                          .map((asignacion: any) => rolesPorId.get(String(asignacion.rol_id)) || asignacion.rol?.clave || "")
                          .filter(Boolean)
                    : [];
                return {
                    documento: usuario.documento ?? "",
                    nombre: usuario.nombre || "",
                    segundo_nombre: usuario.segundo_nombre || "",
                    primer_apellido: usuario.primer_apellido || "",
                    segundo_apellido: usuario.segundo_apellido || "",
                    correo_electronico: usuario.correo_electronico || "",
                    nombre_usuario: usuario.nombre_usuario || "",
                    contrasena: "",
                    area_codigo: usuario.area?.codigo || "",
                    roles: clavesRol.join(","),
                    activo: usuario.activo ? "true" : "false",
                };
            });

            const libro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(
                libro,
                XLSX.utils.json_to_sheet(filas, { header: [...COLUMNAS_USUARIO] }),
                "Usuarios"
            );
            XLSX.utils.book_append_sheet(
                libro,
                XLSX.utils.json_to_sheet([
                    {
                        nota: "Las contraseñas no se exportan porque están cifradas. Este archivo es de consulta; para crear usuarios use la plantilla e incluya una contraseña de al menos 8 caracteres.",
                    },
                ]),
                "Nota"
            );
            descargarLibroExcel(libro, "usuarios_plataforma.xlsx");
            toast.success(`${filas.length} usuarios descargados`);
        } catch (error: any) {
            console.error(error);
            toast.error((await extraerMensajeError(error)) || "No se pudieron exportar los usuarios");
        } finally {
            setDescargando(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-gradient-to-br from-[#E0EDFF] to-[#C7D2FE] rounded-2xl shadow-sm border border-[#E5E7EB] p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1E3A8A] flex items-start sm:items-center gap-3">
                        <Upload className="h-8 w-8 text-[#2563EB] shrink-0" />
                        <span className="break-words">Carga Masiva de Usuarios</span>
                    </h1>
                    <p className="text-[#6B7280] mt-2 text-sm sm:text-base">
                        Cargue múltiples usuarios desde un archivo Excel o CSV
                    </p>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0 rounded-xl" onClick={() => navigate("/ListaDeUsuarios")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>
            </div>

            {/* Instrucciones y Plantilla */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        Instrucciones
                    </CardTitle>
                    <CardDescription>
                        Siga estos pasos para cargar usuarios masivamente
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-2">Formato del archivo:</h3>
                        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li>Tipos soportados: Excel (.xlsx, .xls) o CSV</li>
                            <li>El archivo se lee en su navegador; no se envía el Excel binario al servidor</li>
                            <li>Tamaño máximo: 5MB</li>
                            <li>Máximo 1000 usuarios por archivo</li>
                            <li>Primera fila debe contener los encabezados</li>
                            <li>Por ahora el correo puede ser Gmail, Outlook o Hotmail. Esos usuarios ingresarán con OTP</li>
                        </ul>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h3 className="font-semibold text-amber-900 mb-2">Columnas requeridas:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-amber-800 break-all">
                            <span>• documento</span>
                            <span>• nombre</span>
                            <span>• primer_apellido</span>
                            <span>• correo_electronico</span>
                            <span>• nombre_usuario</span>
                            <span>• contrasena (mín. 8 caracteres)</span>
                            <span>• area_codigo</span>
                            <span>• roles (separados por coma)</span>
                        </div>
                    </div>

                    {(areas.length > 0 || roles.length > 0) && (
                        <div className="grid gap-4 md:grid-cols-2">
                            {areas.length > 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-slate-900 mb-2">Códigos de área válidos</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {areas.map((area) => (
                                            <Badge key={area.codigo} variant="outline">
                                                {area.codigo} — {area.nombre}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {roles.length > 0 && (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-slate-900 mb-2">Claves de rol válidas</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {roles.map((rol) => (
                                            <Badge key={rol.clave} variant="outline">
                                                {rol.clave} — {rol.nombre}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Button onClick={descargarPlantilla} variant="outline" disabled={!!descargando} className="w-full whitespace-normal h-auto py-3">
                            {descargando === "plantilla" ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Descargar Plantilla de Ejemplo
                        </Button>
                        <Button onClick={exportarUsuarios} variant="outline" disabled={!!descargando} className="w-full whitespace-normal h-auto py-3">
                            {descargando === "usuarios" ? (
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Users className="mr-2 h-4 w-4" />
                            )}
                            Descargar Usuarios de la Plataforma
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        La plantilla incluye ejemplos y las hojas Areas/Roles con valores válidos.
                        La exportación trae los usuarios actuales (sin contraseñas, porque están cifradas).
                    </p>
                </CardContent>
            </Card>

            {/* Carga de Archivo */}
            <Card>
                <CardHeader>
                    <CardTitle>Seleccionar Archivo</CardTitle>
                    <CardDescription>
                        Seleccione el archivo Excel o CSV con los datos de los usuarios
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleArchivoChange}
                            className="min-w-0 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {archivo && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 max-w-full truncate">
                                <CheckCircle className="w-3 h-3 mr-1 shrink-0" />
                                <span className="truncate">{archivo.name}</span>
                            </Badge>
                        )}
                    </div>

                    <Button
                        onClick={handleProcesar}
                        disabled={!archivo || cargando}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {cargando ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Procesar Archivo
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Resultados */}
            {resultado && (
                <>
                    {/* Resumen */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Total Procesados
                                </CardDescription>
                                <CardTitle className="text-4xl font-bold">
                                    {resultado.total_procesados}
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card className="border-green-100">
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    Exitosos
                                </CardDescription>
                                <CardTitle className="text-4xl font-bold text-green-600">
                                    {resultado.exitosos}
                                </CardTitle>
                            </CardHeader>
                        </Card>

                        <Card className="border-red-100">
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2 text-red-600">
                                    <XCircle className="w-4 h-4" />
                                    Errores
                                </CardDescription>
                                <CardTitle className="text-4xl font-bold text-red-600">
                                    {resultado.errores}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Usuarios Creados */}
                    {resultado.detalles_exitosos.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <CheckCircle className="w-5 h-5" />
                                    Usuarios Creados Exitosamente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fila</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Nombre Completo</TableHead>
                                            <TableHead>Correo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {resultado.detalles_exitosos.map((usuario, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{usuario.fila}</TableCell>
                                                <TableCell className="font-mono">{usuario.nombre_usuario}</TableCell>
                                                <TableCell>{usuario.nombre_completo}</TableCell>
                                                <TableCell>{usuario.correo_electronico}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Errores */}
                    {resultado.detalles_errores.length > 0 && (
                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-700">
                                    <AlertCircle className="w-5 h-5" />
                                    Errores Encontrados
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fila</TableHead>
                                            <TableHead>Campo</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Error</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {resultado.detalles_errores.map((error, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{error.fila}</TableCell>
                                                <TableCell className="font-mono text-sm">{error.campo}</TableCell>
                                                <TableCell className="text-sm">{error.valor || '-'}</TableCell>
                                                <TableCell className="text-red-600 text-sm">{error.error}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
        </div>
    );
}
