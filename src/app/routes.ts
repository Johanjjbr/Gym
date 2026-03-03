import { createBrowserRouter } from 'react-router';
import { Layout } from './pages/Layout';
import { UserLayout } from './pages/UserLayout';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { UserDetail } from './pages/UserDetail';
import { Payments } from './pages/Payments';
import { StaffPage } from './pages/Staff';
import { Attendance } from './pages/Attendance';
import { Reports } from './pages/Reports';
import { Routines } from './pages/Routines';
import { RoutineBuilder } from './pages/RoutineBuilder';
import { MyWorkout } from './pages/MyWorkout';
import { MyProfile } from './pages/MyProfile';
import { MyTraining } from './pages/MyTraining';
import { MyProgress } from './pages/MyProgress';
import { MyAttendance } from './pages/MyAttendance';
import { MyPayments } from './pages/MyPayments';
import { Login } from './pages/Login';
import { Activate } from './pages/Activate';
import { TestSupabase } from './pages/TestSupabase';
import { DatabaseDiagnostic } from './pages/DatabaseDiagnostic';

export const router = createBrowserRouter([
  // Ruta pública - Login
  {
    path: '/login',
    Component: Login,
  },
  // Ruta pública - Activación de cuenta
  {
    path: '/activar/:token',
    Component: Activate,
  },
  // Ruta de prueba - Test Supabase (Temporal para desarrollo)
  {
    path: '/test-supabase',
    Component: TestSupabase,
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
      { 
        index: true, 
        loader: () => {
          // Redirect a mi-entrenamiento cuando acceden a /usuario
          return new Response(null, {
            status: 302,
            headers: {
              Location: '/usuario/mi-entrenamiento'
            }
          });
        }
      },
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
      { path: 'pagos', Component: Payments },
      { path: 'personal', Component: StaffPage },
      { path: 'asistencia', Component: Attendance },
      { path: 'rutinas', Component: Routines },
      { path: 'rutinas/crear', Component: RoutineBuilder },
      { path: 'rutinas/:id/editar', Component: RoutineBuilder },
      { path: 'mi-entrenamiento', Component: MyWorkout },
      { path: 'reportes', Component: Reports },
    ],
  },
]);