import { createBrowserRouter } from 'react-router';
import { Layout } from './pages/Layout';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { UserDetail } from './pages/UserDetail';
import { Payments } from './pages/Payments';
import { StaffPage } from './pages/Staff';
import { Attendance } from './pages/Attendance';
import { Reports } from './pages/Reports';
import { Routines } from './pages/Routines';
import { MyWorkout } from './pages/MyWorkout';
import { Login } from './pages/Login';
import TestSupabase from './pages/TestSupabase';


export const router = createBrowserRouter([
  // Ruta pública - Login
  {
    path: '/login',
    Component: Login,
  },
  // Ruta de prueba - Test Supabase (Temporal para desarrollo)
  {
    path: '/test-supabase',
    Component: TestSupabase,
  },
  // Rutas protegidas - Con Layout
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
      { path: 'mi-entrenamiento', Component: MyWorkout },
      { path: 'reportes', Component: Reports },
    ],
  },
]);