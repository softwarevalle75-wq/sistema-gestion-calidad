import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { hasAnyPermission } from "@/lib/permissions";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileCheck,
  Clock,
  AlertCircle,
  User,
} from "lucide-react";

interface WorkflowAction {
  label: string;
  action: string;
  icon: React.ReactElement;
  color: string;
  nextState: string;
}

interface DocumentWorkflowProps {
  currentState: string;
  creadoPorId?: string;
  revisadoPorId?: string;
  aprobadoPorId?: string;
  onStateChange: (newState: string, action: string) => Promise<void>;
}

export const DocumentWorkflow = ({
  currentState,
  creadoPorId,
  revisadoPorId,
  aprobadoPorId,
  onStateChange,
}: DocumentWorkflowProps) => {
  const { user } = useAuth();
  const canCrearDocumento = hasAnyPermission(["documentos.crear"]);
  const canRevisarDocumento = hasAnyPermission(["documentos.revisar"]);
  const canAprobarDocumento = hasAnyPermission(["documentos.aprobar"]);
  const canAnularDocumento = hasAnyPermission(["documentos.anular"]);
  const [loading, setLoading] = useState(false);

  // Determinar las acciones disponibles según el estado actual
  const getAvailableActions = (): WorkflowAction[] => {
    const actions: WorkflowAction[] = [];

    switch (currentState) {
      case "borrador":
        // El creador puede enviar a revisión
        if (user?.id === creadoPorId && canCrearDocumento) {
          actions.push({
            label: "Enviar a Revisión",
            action: "send_to_review",
            icon: <Eye className="w-4 h-4" />,
            color: "bg-blue-500 hover:bg-blue-600",
            nextState: "en_revision",
          });
        }
        break;

      case "en_revision":
        // El revisor puede aprobar o rechazar
        if (user?.id === revisadoPorId && (canRevisarDocumento || canAprobarDocumento)) {
          actions.push({
            label: "Aprobar para Validación Final",
            action: "approve_for_final",
            icon: <FileCheck className="w-4 h-4" />,
            color: "bg-green-500 hover:bg-green-600",
            nextState: "pendiente_aprobacion",
          });
          actions.push({
            label: "Rechazar (Volver a Borrador)",
            action: "reject_to_draft",
            icon: <XCircle className="w-4 h-4" />,
            color: "bg-red-500 hover:bg-red-600",
            nextState: "borrador",
          });
        }
        break;

      case "pendiente_aprobacion":
        // El aprobador final puede aprobar o rechazar
        if (user?.id === aprobadoPorId && canAprobarDocumento) {
          actions.push({
            label: "Aprobar Definitivamente",
            action: "approve_final",
            icon: <CheckCircle className="w-4 h-4" />,
            color: "bg-green-500 hover:bg-green-600",
            nextState: "aprobado",
          });
          actions.push({
            label: "Rechazar (Volver a Revisión)",
            action: "reject_to_review",
            icon: <XCircle className="w-4 h-4" />,
            color: "bg-red-500 hover:bg-red-600",
            nextState: "en_revision",
          });
        }
        break;

      case "aprobado":
        // Cualquier responsable puede marcar como obsoleto
        if (
          (user?.id === creadoPorId ||
            user?.id === revisadoPorId ||
            user?.id === aprobadoPorId) &&
          canAnularDocumento
        ) {
          actions.push({
            label: "Marcar como Obsoleto",
            action: "mark_obsolete",
            icon: <AlertCircle className="w-4 h-4" />,
            color: "bg-orange-500 hover:bg-orange-600",
            nextState: "obsoleto",
          });
        }
        break;

      case "obsoleto":
        // El aprobador puede reactivar
        if (user?.id === aprobadoPorId && canAprobarDocumento) {
          actions.push({
            label: "Reactivar Documento",
            action: "reactivate",
            icon: <CheckCircle className="w-4 h-4" />,
            color: "bg-blue-500 hover:bg-blue-600",
            nextState: "aprobado",
          });
        }
        break;
    }

    return actions;
  };

  const handleAction = async (action: WorkflowAction) => {
    const confirmed = await confirmAction(action);
    if (!confirmed) return;

    setLoading(true);
    try {
      await onStateChange(action.nextState, action.action);
      toast.success(`Acción completada: ${action.label}`);
    } catch (error) {
      console.error("Error al ejecutar acción:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al ejecutar la acción",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = (action: WorkflowAction): Promise<boolean> => {
    return new Promise((resolve) => {
      toast.warning(
        <div>
          <p className="font-semibold">¿Confirmar acción?</p>
          <p className="text-sm text-muted-foreground mt-1">{action.label}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                toast.dismiss();
                resolve(true);
              }}
              className={`px-3 py-1 text-white rounded text-sm ${action.color}`}
            >
              Confirmar
            </button>
            <button
              onClick={() => {
                toast.dismiss();
                resolve(false);
              }}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>,
        {
          duration: 10000,
        },
      );
    });
  };

  const getStateInfo = () => {
    switch (currentState) {
      case "borrador":
        return {
          icon: <Clock className="w-5 h-5" />,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          label: "Borrador",
          description: "El documento está en proceso de creación",
        };
      case "en_revision":
        return {
          icon: <Eye className="w-5 h-5" />,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          label: "En Revisión",
          description: "El documento está siendo revisado",
        };
      case "pendiente_aprobacion":
        return {
          icon: <FileCheck className="w-5 h-5" />,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          label: "Pendiente de Aprobación Final",
          description: "Esperando aprobación del jefe de área",
        };
      case "aprobado":
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: "text-green-600",
          bgColor: "bg-green-100",
          label: "Aprobado",
          description: "El documento ha sido aprobado y está vigente",
        };
      case "obsoleto":
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: "text-red-600",
          bgColor: "bg-red-100",
          label: "Obsoleto",
          description: "El documento ha sido descontinuado",
        };
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          label: "Desconocido",
          description: "Estado desconocido",
        };
    }
  };

  const availableActions = getAvailableActions();
  const stateInfo = getStateInfo();

  // Si no hay acciones disponibles para el usuario actual, no mostrar el componente
  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Acciones de Flujo</h3>
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${stateInfo.bgColor}`}
        >
          <span className={stateInfo.color}>{stateInfo.icon}</span>
          <div>
            <p className={`font-semibold text-sm ${stateInfo.color}`}>
              {stateInfo.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {stateInfo.description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground mb-3">
          Acciones disponibles para ti:
        </p>
        {availableActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleAction(action)}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.color}`}
          >
            {action.icon}
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-3 bg-muted rounded-md">
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Tu rol en este documento:</p>
            {user?.id === creadoPorId && <p>• Creador del documento</p>}
            {user?.id === revisadoPorId && <p>• Revisor asignado</p>}
            {user?.id === aprobadoPorId && (
              <p>• Aprobador final (Jefe de área)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
