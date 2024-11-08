import { useState, useEffect } from "react";
import { getSaleBatches, getRemainingMetersByType } from "@/lib/actions/supabaseActions";

// Define the SaleBatch interface here
interface SaleBatch {
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

// Add RemainingMetersByType interface
interface RemainingMetersByType {
  type: string;
  remaining_meters: number;
}

interface SalesData {
  todaySales: SaleBatch[];
  totalSales: number;
  totalEarnings: number;
  remainingMetersByType: RemainingMetersByType[];
}

export function useSalesData() {
  const [salesData, setSalesData] = useState<SalesData>({
    todaySales: [],
    totalSales: 0,
    totalEarnings: 0,
    remainingMetersByType: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSalesData() {
      try {
        const [salesData, remainingMeters] = await Promise.all([
          getSaleBatches(),
          getRemainingMetersByType()
        ]);

        setSalesData({
          todaySales: salesData,
          totalSales: salesData.length,
          totalEarnings: salesData.reduce((sum, sale) => sum + sale.total_price, 0),
          remainingMetersByType: remainingMeters,
        });
      } catch (err) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Failed to fetch sales data'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchSalesData();
  }, []);

  return { salesData, isLoading, isError, error };
}
