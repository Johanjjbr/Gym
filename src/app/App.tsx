import { RouterProvider } from 'react-router';
import { router } from './routes';
// import { DatabaseSetup } from './components/DatabaseSetup';


export default function App() {
   // return <DatabaseSetup />;

  return <RouterProvider router={router} />;
}
