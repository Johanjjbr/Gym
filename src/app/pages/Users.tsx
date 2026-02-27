/**
 * Página de Usuarios con CRUD completo usando React Query y Zod
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Plus, Eye, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useUsers, useDeleteUser } from '../hooks/useUsers';
import { UserFormDialog } from '../components/UserFormDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export function Users() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // React Query hooks
  const { data: users, isLoading, error } = useUsers();
  const deleteUser = useDeleteUser();

  // Filtrado de usuarios
  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'Todos' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activo':
        return 'bg-[#10f94e]/20 text-[#10f94e] border-[#10f94e]/30';
      case 'Inactivo':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'Suspendido':
        return 'bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (userToDelete) {
      await deleteUser.mutateAsync(userToDelete.id);
      setUserToDelete(null);
    }
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 text-[#10f94e] animate-spin mx-auto" />
          <p className="text-gray-400">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  // Estado de error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl mb-2">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra los miembros del gimnasio</p>
          </div>
        </div>

        <Card className="bg-card border-[#ff3b5c]/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#ff3b5c] mt-0.5" />
              <div>
                <p className="font-semibold text-[#ff3b5c]">Error al cargar usuarios</p>
                <p className="text-sm text-gray-400 mt-1">{error.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Verifica que el backend de Supabase esté funcionando correctamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl mb-2">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra los miembros del gimnasio</p>
        </div>
        <Button
          className="bg-[#10f94e] text-black hover:bg-[#0ed145] font-bold"
          onClick={openCreateDialog}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Usuarios</p>
            <p className="text-2xl font-bold">{users?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Activos</p>
            <p className="text-2xl font-bold text-[#10f94e]">
              {users?.filter((u: any) => u.status === 'Activo').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Inactivos</p>
            <p className="text-2xl font-bold text-gray-400">
              {users?.filter((u: any) => u.status === 'Inactivo').length || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Suspendidos</p>
            <p className="text-2xl font-bold text-[#ff3b5c]">
              {users?.filter((u: any) => u.status === 'Suspendido').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-input border-border">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Activo">Activos</SelectItem>
                <SelectItem value="Inactivo">Inactivos</SelectItem>
                <SelectItem value="Suspendido">Suspendidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Lista de Usuarios ({filteredUsers?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron usuarios</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('Todos');
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground">Nombre</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Teléfono</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Plan</th>
                    <th className="text-left py-3 px-4 text-muted-foreground">Estado</th>
                    <th className="text-right py-3 px-4 text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers?.map((user: any) => (
                    <tr
                      key={user.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium">{user.name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm">{user.phone || '-'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm">{user.plan || '-'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/usuarios/${user.id}`)}
                            className="hover:bg-[#10f94e]/10 hover:text-[#10f94e]"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-[#10f94e]/10 hover:text-[#10f94e]"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-[#ff3b5c]/10 hover:text-[#ff3b5c]"
                            onClick={() => setUserToDelete(user)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        user={editingUser}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar Usuario</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              ¿Estás seguro de que quieres eliminar a <strong>{userToDelete?.name}</strong>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              className="bg-[#ff3b5c] hover:bg-[#ff3b5c]/90 text-white"
            >
              {deleteUser.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}