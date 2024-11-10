import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUserProfile,
  getCurrentUser,
  getTopSellingUsers,
  getMostSellingProduct,
  getEarningsByMeterType,
  getRemainingMetersByType,
  getAgentInventoryCount,
  getCustomerTypeCounts,
} from '@/lib/actions/supabaseActions';
import { supabase } from '@/lib/supabase';
import type { 
  TopSeller, 
  MeterTypeEarnings, 
  RemainingMetersByType,
  AgentInventory,
  CustomerTypeData 
} from '../types';

// Define query keys
const QUERY_KEYS = {
  remainingMeters: 'remainingMeters',
  topSellers: 'topSellers',
  mostSellingProduct: 'mostSellingProduct',
  earnings: 'earnings',
  agentInventory: 'agentInventory',
  customerTypes: 'customerTypes',
  userRole: 'userRole'
} as const;

export function useReportsData() {
  const queryClient = useQueryClient();

  // Setup real-time subscriptions
  useEffect(() => {
    const salesChannel = supabase
      .channel('sales_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_batches'
        },
        () => {
          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.topSellers] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.mostSellingProduct] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.earnings] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.customerTypes] });
        }
      )
      .subscribe();

    const metersChannel = supabase
      .channel('meters_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meters'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.remainingMeters] });
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.agentInventory] });
        }
      )
      .subscribe();

    return () => {
      salesChannel.unsubscribe();
      metersChannel.unsubscribe();
    };
  }, [queryClient]);

  // User role query
  const userRoleQuery = useQuery({
    queryKey: [QUERY_KEYS.userRole],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('No user found');
      const profile = await getUserProfile(user.id);
      return profile?.role || '';
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  // Remaining meters query
  const remainingMetersQuery = useQuery({
    queryKey: [QUERY_KEYS.remainingMeters],
    queryFn: getRemainingMetersByType,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Top sellers query
  const topSellersQuery = useQuery({
    queryKey: [QUERY_KEYS.topSellers],
    queryFn: async () => {
      const topUsers = await getTopSellingUsers();
      return topUsers.reduce((acc: TopSeller[], seller) => {
        const existingSeller = acc.find(s => s.user_name === seller.user_name);
        if (existingSeller) {
          existingSeller.total_sales += seller.total_sales;
        } else {
          acc.push({ ...seller });
        }
        return acc;
      }, []).sort((a, b) => b.total_sales - a.total_sales);
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Most selling product query
  const mostSellingProductQuery = useQuery({
    queryKey: [QUERY_KEYS.mostSellingProduct],
    queryFn: getMostSellingProduct,
    staleTime: 1000 * 60, // 1 minute
  });

  // Agent inventory query
  const agentInventoryQuery = useQuery({
    queryKey: [QUERY_KEYS.agentInventory],
    queryFn: getAgentInventoryCount,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Customer types query
  const customerTypesQuery = useQuery({
    queryKey: [QUERY_KEYS.customerTypes],
    queryFn: getCustomerTypeCounts,
    staleTime: 1000 * 60, // 1 minute
  });

  // Earnings query (admin only)
  const earningsQuery = useQuery({
    queryKey: [QUERY_KEYS.earnings],
    queryFn: getEarningsByMeterType,
    enabled: userRoleQuery.data === 'admin',
    staleTime: 1000 * 60, // 1 minute
  });

  const isLoading = 
    userRoleQuery.isLoading ||
    remainingMetersQuery.isLoading ||
    topSellersQuery.isLoading ||
    mostSellingProductQuery.isLoading ||
    agentInventoryQuery.isLoading ||
    customerTypesQuery.isLoading ||
    (userRoleQuery.data === 'admin' && earningsQuery.isLoading);

  const error = 
    userRoleQuery.error ||
    remainingMetersQuery.error ||
    topSellersQuery.error ||
    mostSellingProductQuery.error ||
    agentInventoryQuery.error ||
    customerTypesQuery.error ||
    (userRoleQuery.data === 'admin' && earningsQuery.error);

  return {
    data: {
      remainingMetersByType: remainingMetersQuery.data || [],
      topSellers: topSellersQuery.data || [],
      mostSellingProduct: mostSellingProductQuery.data || '',
      earningsByMeterType: earningsQuery.data || [],
      totalEarnings: earningsQuery.data?.reduce((sum, item) => sum + item.total_earnings, 0) || 0,
      userRole: userRoleQuery.data || '',
      agentInventory: agentInventoryQuery.data || [],
      customerTypeData: customerTypesQuery.data || [],
    },
    isLoading,
    error,
    refetch: () => {
      queryClient.invalidateQueries();
    }
  };
} 