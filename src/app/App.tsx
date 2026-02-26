import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext'; // 1. Agregamos esta importación
// import { DatabaseSetup } from './components/DatabaseSetup';

export default function App() {
  // return <DatabaseSetup />;

  return (
    // 2. Envolvemos el enrutador con el proveedor de autenticación
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}