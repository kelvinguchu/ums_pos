import { useState, useEffect } from 'react';
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
import type { 
  TopSeller, 
  MeterTypeEarnings, 
  RemainingMetersByType,
  AgentInventory,
  CustomerTypeData 
} from '../types';

interface ReportsData {
  remainingMetersByType: RemainingMetersByType[];
  topSellers: TopSeller[];
  mostSellingProduct: string;
  earningsByMeterType: MeterTypeEarnings[];
  totalEarnings: number;
  userRole: string;
  agentInventory: AgentInventory[];
  customerTypeData: CustomerTypeData[];
}

export function useReportsData() {
  const [data, setData] = useState<ReportsData>({
    remainingMetersByType: [],
    topSellers: [],
    mostSellingProduct: '',
    earningsByMeterType: [],
    totalEarnings: 0,
    userRole: '',
    agentInventory: [],
    customerTypeData: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('No user found');
        }

        const profile = await getUserProfile(user.id);
        const userRole = profile?.role || '';

        const [
          topUsers,
          topProduct,
          remainingMeters,
          agentInventoryData,
          customerTypes,
          earnings,
        ] = await Promise.all([
          getTopSellingUsers(),
          getMostSellingProduct(),
          getRemainingMetersByType(),
          getAgentInventoryCount(),
          getCustomerTypeCounts(),
          userRole === 'admin' ? getEarningsByMeterType() : Promise.resolve([]),
        ]);

        // Process top sellers data
        const aggregatedSales = topUsers.reduce((acc: TopSeller[], seller) => {
          const existingSeller = acc.find(s => s.user_name === seller.user_name);
          if (existingSeller) {
            existingSeller.total_sales += seller.total_sales;
          } else {
            acc.push({ ...seller });
          }
          return acc;
        }, []);
        
        const sortedSales = aggregatedSales.sort((a, b) => b.total_sales - a.total_sales);

        // Calculate total earnings
        const total = earnings.reduce(
          (sum, item) => sum + item.total_earnings,
          0
        );

        setData({
          remainingMetersByType: remainingMeters,
          topSellers: sortedSales,
          mostSellingProduct: topProduct,
          earningsByMeterType: earnings,
          totalEarnings: total,
          userRole,
          agentInventory: agentInventoryData,
          customerTypeData: customerTypes,
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, isLoading, error };
} 