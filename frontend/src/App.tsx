import { ReactNode } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "./pages/Login";
import NoConformidadesAbiertas from "@/pages/No_conformidades_Abiertas";
import NoConformidadesEnTratamiento from "@/pages/No_conformidades_EnTratamiento";
import NoConformidadesCerradas from "./pages/No_conformidades_Cerradas";

import AccionesCorrectivasCerradas from "./pages/Acciones_correctivas/Acciones_correctivas_Cerradas";
import AccionesCorrectivasVerificadas from "./pages/Acciones_correctivas/Acciones_correctivas_Verificadas";
import NuevasAccionesCorrectivas from "./pages/Acciones_correctivas/nuevas";
import EnProcesoAccionesCorrectivas from "./pages/Acciones_correctivas/enproceso";
import SolucionarAccionCorrectiva from "./pages/Acciones_correctivas/SolucionarAccionCorrectiva";
import DashboardAccionesCorrectivas from "./pages/Acciones_correctivas/DashboardAccionesCorrectivas";

import AprobacionesPendientes from "./pages/documentos/Aprobaciones_Pendientes";
import RevisionesPendientes from "./pages/documentos/Revisiones_Pendientes";
import DocumentosObsoletos from "./pages/documentos/Documentos_Obsoletos";
import DocumentosPublicos from "./pages/documentos/Documentos_Publicos";

import GestionarAreas from "./pages/areas/Gestionar_Areas";
import AreasResponsables from "./pages/areas/Asignar_Responsables";

import ListaDeUsuarios from "./pages/usuarios/ListaDeUsuarios";
import NuevosUsuarios from "./pages/usuarios/NuevoUsuario";
import EditarUsuario from "./pages/usuarios/EditarUsuario";
import CargaMasivaUsuarios from "./pages/usuarios/CargaMasivaUsuarios";
import RolesYPermisos from "./pages/usuarios/Roles_Permisos";

import AuditoriasPlanificacion from "./pages/auditorias/AuditoriasPlanificacion";
import AuditoriasEnCurso from "./pages/auditorias/EnCurso";
import AuditoriasHallazgosView from "./pages/auditorias/hallazgos";
import AuditoriasCompletas from "./pages/auditorias/Completadas";
import AuditoriaEjecucion from "./pages/auditorias/AuditoriaEjecucion";
import ProgramaAnual from "./pages/auditorias/ProgramaAnual";
import FormulariosAuditoriaAdmin from "./pages/auditorias/FormulariosAuditoriaAdmin";

import ObjetivosActivos from "./pages/objetivosCalidad/Activos";
import Seguimiento from "./pages/objetivosCalidad/Seguimiento";
import Historial from "./pages/objetivosCalidad/Historial";

import Dashboard from "./pages/Dashboard";
import Perfil from "./components/usuarios/Perfil";
import Documentos from "./pages/Documentos";
import CreateDocument from "./components/documents/CreateDocument";
import VerDocumento from "./pages/VerDocumento";
import EditarDocumento from "./pages/EditarDocumento";
import ControlVersiones from "./pages/ControlVersiones";

import TableroIndicadores from "./pages/Indicadores/tablero";
import EficaciaIndicadores from "./pages/Indicadores/eficacia";
import EficienciaIndicadores from "./pages/Indicadores/eficiencia";
import CumplimientoIndicadores from "./pages/Indicadores/cumplimiento";


import CapacitacionesProgramadas from "./pages/CapacitacionesProgramadas";
import CapacitacionesHistorial from "./pages/CapacitacionesHistorial";
import CapacitacionesAsistencia from "./pages/CapacitacionesAsistencia";
import CapacitacionesCompetencia from "./pages/CapacitacionesCompetencia";

import ReportesView from "./pages/reportes";
import MatrizRiesgos from "./pages/riesgos/matriz";
import ControlesRiesgos from "./pages/riesgos/controles";
import TratamientoRiesgos from "./pages/riesgos/tratamiento";
import MapaProcesos from "./pages/MapaProcesos";
import FormularioProceso from "./pages/procesos/FormularioProceso";
import DetalleProceso from "./pages/procesos/DetalleProceso";
import ListadoProcesos from "./pages/procesos/ListadoProcesos";
import MigracionesDB from "./pages/sistema/MigracionesDB";
import AuditLogPage from "./pages/sistema/AuditLog";
import MesaDeAyuda from "./pages/soporte/MesaDeAyuda";
import Seguridad from "./pages/seguridad";
import Configuracion from "./pages/configuracion";
import ManualUsuario from "./pages/ManualUsuario";

import { ProtectedLayout } from "./components/ProtectedLayout";
import PermissionRoute from "./components/PermissionRoute";
import { AuthProvider } from "./context/AuthContext";

import { Toaster } from "sonner";
import "./App.css";

function App() {
  const withPermission = (element: ReactNode, permissions: string[]) => (
    <PermissionRoute permissions={permissions}>{element}</PermissionRoute>
  );

  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" richColors closeButton />

        <Routes>
          {/* Redirección inicial */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<Perfil />} />

            {/* Documentos */}
            <Route path="/documentos" element={withPermission(<Documentos />, ["documentos.ver"])} />
            <Route path="/control-versiones" element={withPermission(<ControlVersiones />, ["documentos.revisar"])} />
            <Route path="/documentos/crear" element={withPermission(<CreateDocument />, ["documentos.crear"])} />
            <Route path="/documentos/:id" element={withPermission(<VerDocumento />, ["documentos.ver"])} />
            <Route path="/documentos/:id/editar" element={withPermission(<EditarDocumento />, ["documentos.revisar"])} />
            <Route path="/documentos/:id/aprobaciones" element={withPermission(<AprobacionesPendientes />, ["documentos.aprobar"])} />

            <Route path="/Aprobaciones_Pendientes" element={withPermission(<AprobacionesPendientes />, ["documentos.aprobar"])} />
            <Route path="/Revisiones_Pendientes" element={withPermission(<RevisionesPendientes />, ["documentos.revisar"])} />
            <Route path="/Documentos_Obsoletos" element={withPermission(<DocumentosObsoletos />, ["documentos.anular"])} />
            <Route path="/Documentos_Publicos" element={<DocumentosPublicos />} />

            {/* Áreas */}
            <Route path="/gestionar_areas" element={withPermission(<GestionarAreas />, ["areas.gestionar"])} />
            <Route
              path="/Asignar_Responsables"
              element={withPermission(<AreasResponsables />, ["areas.gestionar"])}
            />
            <Route path="/reportes" element={withPermission(<ReportesView />, ["calidad.ver", "documentos.ver", "auditorias.ver", "riesgos.ver"])} />

            {/* Usuarios */}
            <Route path="/ListaDeUsuarios" element={withPermission(<ListaDeUsuarios />, ["usuarios.ver"])} />
            <Route path="/NuevoUsuario" element={withPermission(<NuevosUsuarios />, ["usuarios.crear", "usuarios.gestion"])} />
            <Route path="/usuarios/:id/editar" element={withPermission(<EditarUsuario />, ["usuarios.editar", "usuarios.gestion"])} />
            <Route path="/usuarios/carga-masiva" element={withPermission(<CargaMasivaUsuarios />, ["usuarios.crear", "usuarios.gestion"])} />
            <Route path="/Roles_y_Permisos" element={withPermission(<RolesYPermisos />, ["usuarios.gestion"])} />

            {/* Auditorías */}
            <Route path="/AuditoriasPlanificacion" element={withPermission(<AuditoriasPlanificacion />, ["auditorias.planificar"])} />
            <Route path="/AuditoriasEnCurso" element={withPermission(<AuditoriasEnCurso />, ["auditorias.ejecutar"])} />
            <Route path="/AuditoriasCompletas" element={withPermission(<AuditoriasCompletas />, ["auditorias.ejecutar", "auditorias.ver"])} />
            <Route path="/AuditoriasHallazgosView" element={withPermission(<AuditoriasHallazgosView />, ["auditorias.ejecutar", "auditorias.ver"])} />
            <Route path="/auditorias/ejecucion/:id" element={withPermission(<AuditoriaEjecucion />, ["auditorias.ejecutar"])} />
            <Route path="/auditorias/programa-anual" element={withPermission(<ProgramaAnual />, ["auditorias.planificar"])} />
            <Route path="/auditorias/formularios" element={withPermission(<FormulariosAuditoriaAdmin />, ["auditorias.planificar"])} />

            {/* Objetivos de Calidad */}
            <Route path="/Activos" element={withPermission(<ObjetivosActivos />, ["calidad.ver"])} />
            <Route path="/Seguimiento" element={withPermission(<Seguimiento />, ["calidad.ver"])} />
            <Route path="/Historial" element={withPermission(<Historial />, ["calidad.ver"])} />

            {/* No conformidades */}
            <Route path="/No_conformidades_Abiertas" element={withPermission(<NoConformidadesAbiertas />, ["noconformidades.gestion", "noconformidades.reportar"])} />
            <Route path="/No_conformidades_EnTratamiento" element={withPermission(<NoConformidadesEnTratamiento />, ["noconformidades.gestion"])} />
            <Route path="/No_conformidades_Cerradas" element={withPermission(<NoConformidadesCerradas />, ["noconformidades.cerrar", "noconformidades.gestion"])} />

            {/* Acciones Correctivas */}
            <Route path="/acciones-correctivas/dashboard" element={withPermission(<DashboardAccionesCorrectivas />, ["noconformidades.gestion"])} />
            <Route path="/Acciones_correctivas_Cerradas" element={withPermission(<AccionesCorrectivasCerradas />, ["noconformidades.cerrar", "noconformidades.gestion"])} />
            <Route path="/Acciones_correctivas_Verificadas" element={withPermission(<AccionesCorrectivasVerificadas />, ["noconformidades.cerrar"])} />
            <Route path="/Acciones_correctivas_Nuevas" element={withPermission(<NuevasAccionesCorrectivas />, ["noconformidades.gestion"])} />
            <Route path="/Acciones_correctivas_EnProceso" element={withPermission(<EnProcesoAccionesCorrectivas />, ["noconformidades.gestion"])} />
            <Route path="/acciones-correctivas/:id/solucionar" element={withPermission(<SolucionarAccionCorrectiva />, ["noconformidades.gestion"])} />

            {/* Capacitaciones */}
            <Route path="/capacitaciones/programadas" element={withPermission(<CapacitacionesProgramadas />, ["capacitaciones.gestion"])} />
            <Route path="/capacitaciones/historial" element={withPermission(<CapacitacionesHistorial />, ["capacitaciones.gestion"])} />
            <Route path="/capacitaciones/asistencias" element={withPermission(<CapacitacionesAsistencia />, ["capacitaciones.gestion"])} />
            <Route path="/capacitaciones/competencias" element={withPermission(<CapacitacionesCompetencia />, ["capacitaciones.gestion"])} />

            {/* Indicadores */}
            <Route path="/indicadores/tablero" element={withPermission(<TableroIndicadores />, ["calidad.ver"])} />
            <Route path="/indicadores/dashboard" element={withPermission(<Navigate to="/indicadores/tablero" replace />, ["calidad.ver"])} />
            <Route path="/indicadores/eficacia" element={withPermission(<EficaciaIndicadores />, ["calidad.ver"])} />
            <Route path="/indicadores/eficiencia" element={withPermission(<EficienciaIndicadores />, ["calidad.ver"])} />
            <Route path="/indicadores/cumplimiento" element={withPermission(<CumplimientoIndicadores />, ["calidad.ver"])} />

            {/* Riesgos */}
            <Route path="/riesgos/matriz" element={withPermission(<MatrizRiesgos />, ["riesgos.ver", "riesgos.gestion"])} />
            <Route path="/riesgos/controles" element={withPermission(<ControlesRiesgos />, ["riesgos.gestion"])} />
            <Route path="/riesgos/tratamiento" element={withPermission(<TratamientoRiesgos />, ["riesgos.gestion"])} />

            {/* Procesos */}
            <Route path="/procesos" element={withPermission(<MapaProcesos />, ["procesos.ver", "procesos.admin"])} />
            <Route path="/procesos/listado" element={withPermission(<ListadoProcesos />, ["procesos.ver", "procesos.admin"])} />
            <Route path="/procesos/nuevo" element={withPermission(<FormularioProceso />, ["procesos.admin"])} />
            <Route path="/procesos/:id" element={withPermission(<DetalleProceso />, ["procesos.ver", "procesos.admin"])} />
            <Route path="/procesos/:id/editar" element={withPermission(<FormularioProceso />, ["procesos.admin"])} />

            {/* Sistema */}
            <Route path="/sistema/migraciones" element={withPermission(<MigracionesDB />, ["sistema.admin"])} />
            <Route path="/sistema/audit-log" element={withPermission(<AuditLogPage />, ["sistema.admin"])} />

            {/* Soporte */}
            <Route path="/mesa-ayuda" element={<MesaDeAyuda />} />
            <Route path="/manual-usuario" element={<ManualUsuario />} />

            {/* Configuración y Seguridad */}
            <Route path="/configuracion" element={withPermission(<Configuracion />, ["sistema.config", "sistema.admin"])} />
            <Route path="/seguridad" element={withPermission(<Seguridad />, ["sistema.admin"])} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
