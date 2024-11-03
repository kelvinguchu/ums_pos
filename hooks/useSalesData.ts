import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  getSaleBatches,
  getRemainingMetersByType,
} from "@/lib/actions/supabaseActions";

interface SaleBatch {
  id: string;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  unit_price: number;
  total_price: number;
  destination: string;
  recipient: string;
  sale_date: string;
}

interface RemainingMetersByType {
  type: string;
  remaining_meters: number;
}

interface SalesDataReturn {
  salesData: {
    todaySales: SaleBatch[];
    yesterdaySales: SaleBatch[];
    remainingMetersByType: RemainingMetersByType[];
    todayTotalEarnings: number;
    yesterdayTotalEarnings: number;
  };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSalesData(): SalesDataReturn {
  const queryClient = useQueryClient();

  // Query for sales data
  const {
    data: salesBatches = [],
    isLoading: isSalesLoading,
    isError: isSalesError,
    error: salesError,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ["saleBatches"],
    queryFn: getSaleBatches,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Query for remaining meters
  const {
    data: remainingMeters = [],
    isLoading: isRemainingLoading,
    isError: isRemainingError,
    error: remainingError,
  } = useQuery({
    queryKey: ["remainingMeters"],
    queryFn: getRemainingMetersByType,
    staleTime: 1000 * 60 * 5,
  });

  // Set up real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel("sales_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sale_batches",
        },
        () => {
          // Invalidate and refetch queries when data changes
          queryClient.invalidateQueries({ queryKey: ["saleBatches"] });
          queryClient.invalidateQueries({ queryKey: ["remainingMeters"] });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Process sales data
  const processedData = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    const todaySales = salesBatches.filter((sale) =>
      sale.sale_date.startsWith(today)
    );
    const yesterdaySales = salesBatches.filter((sale) =>
      sale.sale_date.startsWith(yesterday)
    );

    const todayTotal = todaySales.reduce(
      (sum, sale) => sum + sale.total_price,
      0
    );
    const yesterdayTotal = yesterdaySales.reduce(
      (sum, sale) => sum + sale.total_price,
      0
    );

    return {
      todaySales,
      yesterdaySales,
      remainingMetersByType: remainingMeters,
      todayTotalEarnings: todayTotal,
      yesterdayTotalEarnings: yesterdayTotal,
    };
  }, [salesBatches, remainingMeters]);

  const isLoading = isSalesLoading || isRemainingLoading;
  const isError = isSalesError || isRemainingError;
  const error = salesError || remainingError;

  return {
    salesData: processedData(),
    isLoading,
    isError,
    error,
    refetch: () => {
      refetchSales();
    },
  };
}
