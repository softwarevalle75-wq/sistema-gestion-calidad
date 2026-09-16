import { getCurrentUser } from "@/services/auth";

const PERMISSION_ALIASES: Record<string, string[]> = {
  "sistema.config": ["sistema.config", "sistema.configurar"],
  "usuarios.gestion": ["usuarios.gestion", "usuarios.crear", "usuarios.editar", "usuarios.eliminar"],
  "areas.gestionar": ["areas.gestionar", "procesos.admin"],
  "noconformidades.gestion": ["noconformidades.gestion", "no_conformidades.gestionar", "acciones_correctivas.gestionar"],
  "noconformidades.reportar": ["noconformidades.reportar"],
  "noconformidades.cerrar": ["noconformidades.cerrar"],
  "riesgos.gestion": ["riesgos.gestion", "riesgos.administrar"],
  "capacitaciones.gestion": ["capacitaciones.gestion", "capacitaciones.gestionar"],
  "procesos.admin": ["procesos.admin", "procesos.gestionar"],
  "procesos.ver": ["procesos.ver", "procesos.admin", "procesos.gestionar"],
};

export function sameId(a: unknown, b: unknown): boolean {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

export function asId(value: unknown): string {
  return String(value || "").toLowerCase();
}

export function getUserPermissions(): string[] {
  const user = getCurrentUser();
  return Array.isArray(user?.permisos) ? user.permisos : [];
}

function expandPermissions(required: string[]): string[] {
  const expanded = new Set<string>();
  required.forEach((code) => {
    (PERMISSION_ALIASES[code] || [code]).forEach((c) => expanded.add(c));
  });
  return Array.from(expanded);
}

export function hasAnyPermission(required: string[]): boolean {
  const userPerms = getUserPermissions();
  if (userPerms.includes("sistema.admin")) return true;
  const expanded = expandPermissions(required);
  return expanded.some((perm) => userPerms.includes(perm));
}

export function collectUserPermissionCodes(usuario: {
  permisos?: string[];
  roles?: Array<{
    rol?: {
      clave?: string;
      permisos?: Array<{ permiso?: { codigo?: string } }>;
    };
  }>;
} | null | undefined): string[] {
  const codes = new Set<string>();
  (usuario?.permisos || []).forEach((code) => {
    if (code) codes.add(code);
  });
  (usuario?.roles || []).forEach((asignacion) => {
    (asignacion.rol?.permisos || []).forEach((item) => {
      if (item?.permiso?.codigo) codes.add(item.permiso.codigo);
    });
  });
  return Array.from(codes);
}

type UsuarioConPermisos = {
  permisos?: string[];
  roles?: Array<{
    rol?: {
      permisos?: Array<{
        permiso?: { codigo?: string };
      }>;
    };
  }>;
};

export function usuarioTienePermiso(
  usuario: UsuarioConPermisos | null | undefined,
  required: string[],
): boolean {
  const userPerms = collectUserPermissionCodes(usuario);
  if (userPerms.includes("sistema.admin")) return true;
  const expanded = expandPermissions(required);
  return expanded.some((perm) => userPerms.includes(perm));
}
