/**
 * Hook personalizado que combina toda la funcionalidad de gestión de usuarios
 * Ejemplo de cómo crear hooks compuestos para casos de uso complejos
 */

import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from './useUsers';
import { usePayments } from './usePayments';

export function useUserManagement() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Queries
  const { data: users, isLoading: loadingUsers, error: usersError } = useUsers();
  const { data: payments, isLoading: loadingPayments } = usePayments();

  // Mutations
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // Filtrado avanzado de usuarios
  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);

    const matchesStatus = statusFilter === 'Todos' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Enriquecer usuarios con información de pagos
  const enrichedUsers = filteredUsers?.map((user) => {
    const userPayments = payments?.filter((p: any) => p.user_id === user.id) || [];
    const lastPayment = userPayments[0]; // Asumiendo que están ordenados por fecha

    return {
      ...user,
      lastPayment,
      totalPayments: userPayments.length,
      hasOverduePayment: lastPayment?.status === 'Vencido',
    };
  });

  // Estadísticas rápidas
  const stats = {
    total: users?.length || 0,
    active: users?.filter((u) => u.status === 'Activo').length || 0,
    inactive: users?.filter((u) => u.status === 'Inactivo').length || 0,
    suspended: users?.filter((u) => u.status === 'Suspendido').length || 0,
    filtered: filteredUsers?.length || 0,
  };

  // Funciones de acción
  const openCreateForm = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const openEditForm = (user: any) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedUser(null);
    setIsFormOpen(false);
  };

  const handleCreate = async (data: any) => {
    await createUser.mutateAsync(data);
    closeForm();
  };

  const handleUpdate = async (data: any) => {
    if (!selectedUser) return;
    await updateUser.mutateAsync({ id: selectedUser.id, data });
    closeForm();
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      await deleteUser.mutateAsync(userId);
    }
  };

  return {
    // Datos
    users: enrichedUsers,
    selectedUser,
    stats,

    // Estados
    isLoading: loadingUsers || loadingPayments,
    error: usersError,
    isFormOpen,
    searchQuery,
    statusFilter,

    // Acciones de filtrado
    setSearchQuery,
    setStatusFilter,

    // Acciones de formulario
    openCreateForm,
    openEditForm,
    closeForm,

    // Acciones de CRUD
    handleCreate,
    handleUpdate,
    handleDelete,

    // Estados de mutaciones
    isCreating: createUser.isPending,
    isUpdating: updateUser.isPending,
    isDeleting: deleteUser.isPending,
  };
}
