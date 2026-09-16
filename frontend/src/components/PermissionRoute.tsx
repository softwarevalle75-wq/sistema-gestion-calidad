import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/services/auth";
import { hasAnyPermission } from "@/lib/permissions";

interface PermissionRouteProps {
  permissions: string[];
  children: ReactNode;
}

export default function PermissionRoute({ permissions, children }: PermissionRouteProps) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!hasAnyPermission(permissions)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
