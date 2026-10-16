import { createBrowserRouter } from 'react-router';
import { Layout } from './pages/Layout';
import { UserLayout, UserHome } from './pages/UserLayout';
import { Today } from './pages/Today';
import { HomeWorkout } from './pages/HomeWorkout';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { UserDetail } from './pages/UserDetail';
import { Billing } from './pages/Billing';
import { StaffPage } from './pages/Staff';
import { Attendance } from './pages/Attendance';
import { Reports } from './pages/Reports';
import { Routines } from './pages/Routines';
import { RoutineBuilder } from './pages/RoutineBuilder';
import { MyProfile } from './pages/MyProfile';
import { MyTraining } from './pages/MyTraining';
import { MyProgress } from './pages/MyProgress';
import { MyAttendance } from './pages/MyAttendance';
import { MyPayments } from './pages/MyPayments';
import { Login } from './pages/Login';
import { Activate } from './pages/Activate';
import { DatabaseDiagnostic } from './pages/DatabaseDiagnostic';
import { AdminPermissions } from './pages/AdminPermissions';
import { Exercises } from './pages/Exercises';
import { ExerciseDetailPage } from './pages/ExerciseDetailPage';
import { Plans } from './pages/Plans';
import { CompanyPage } from './pages/Company';
import { PlatformPage } from './pages/Platform';

export const router = createBrowserRouter([
  // Ruta pública - Login
  {
    path: '/login',
    Component: Login,
  },
  // Ruta pública - Crear cuenta (entrenar por tu cuenta)
  {
    path: '/registro',
    Component: Login,
  },
  // Ruta pública - Activación de cuenta
  {
    path: '/activar/:token',
    Component: Activate,
  },
  // Ruta de diagnóstico de base de datos
  {
    path: '/diagnostico-db',
    Component: DatabaseDiagnostic,
  },
  // Rutas para usuarios regulares
  {
    path: '/usuario',
    Component: UserLayout,
    children: [
      { index: true, Component: UserHome },
      { path: 'hoy', Component: Today },
      { path: 'entrenar', Component: HomeWorkout },
      { path: 'bienvenida', Component: Onboarding },
      { path: 'mi-entrenamiento', Component: MyTraining },
      { path: 'mi-perfil', Component: MyProfile },
      { path: 'progreso', Component: MyProgress },
      { path: 'asistencia', Component: MyAttendance },
      { path: 'pagos', Component: MyPayments },
    ],
  },
// Rutas protegidas - Staff (Con Layout administrativo)
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'usuarios', Component: Users },
      { path: 'usuarios/:id', Component: UserDetail },
      { path: 'facturacion', Component: Billing },
      { path: 'planes', Component: Plans },
      { path: 'personal', Component: StaffPage },
      { path: 'asistencia', Component: Attendance },
      { path: 'rutinas', Component: Routines },
      { path: 'rutinas/crear', Component: RoutineBuilder },
      { path: 'rutinas/:id/editar', Component: RoutineBuilder },
      { path: 'ejercicios', Component: Exercises },
      { path: 'ejercicios/:id', Component: ExerciseDetailPage },
      { path: 'reportes', Component: Reports },
      { path: 'admin/permisos', Component: AdminPermissions },
      { path: 'gimnasios', Component: CompanyPage },
      { path: 'plataforma', Component: PlatformPage },
    //   { path: 'migrar-rutinas', Component: MigrateRoutines },
    ],
  },
]);