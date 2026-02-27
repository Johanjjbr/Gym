/**
 * Hook para obtener pagos de un usuario específico
 */
export function useUserPayments(userId: string) {
  return useQuery({
    queryKey: paymentKeys.byUser(userId),
    queryFn: async () => {
      console.log('🔍 Fetching payments for user:', userId);
      const result = await payments.getByUser(userId);
      console.log('✅ Payments received for user:', userId, result);
      return result;
    },
    staleTime: 0, // No usar caché, siempre refetch
    cacheTime: 0, // No guardar en caché
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!userId, // Solo ejecutar si hay userId
  });
}