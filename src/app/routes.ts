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

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
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
      { path: 'mi-perfil', Component: Dashboard }, // TODO: Crear página Mi Perfil
      { path: 'reportes', Component: Reports },
    ],
  },
]);