import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSaleBatches } from '@/lib/actions/supabaseActions';
import { supabase } from '@/lib/supabase';

// Define interfaces
export interface SaleBatch {
  id: number;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  sale_date: string;
  destination: string;
  recipient: string;
  total_price: number;
  unit_price: number;
  customer_type: string;
  customer_county: string;
  customer_contact: string;
}

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds

export function useMeterSalesData() {
  const queryClient = useQueryClient();

  // Setup Supabase real-time subscription
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
          // Invalidate and refetch queries when data changes
          queryClient.invalidateQueries({ queryKey: ['saleBatches'] });
        }
      )
      .subscribe();

    return () => {
      salesChannel.unsubscribe();
    };
  }, [queryClient]);

  // Fetch sales data with caching
  const salesQuery = useQuery({
    queryKey: ['saleBatches'],
    queryFn: getSaleBatches,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });

  return {
    saleBatches: salesQuery.data || [],
    isLoading: salesQuery.isLoading,
    isError: salesQuery.isError,
    error: salesQuery.error,
    refetch: () => {
      salesQuery.refetch();
    }
  };
} 