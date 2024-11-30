"use client";
import React, { Suspense } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useReportsData } from "./hooks/useReportsData";
import Loader from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Import all card components (removed TopSellersCard)
import { MeterInventoryCard } from "./cards/MeterInventoryCard";
import { BestSellerCard } from "./cards/BestSellerCard";
import { EarningsByTypeCard } from "./cards/EarningsByTypeCard";
import { TotalEarningsCard } from "./cards/TotalEarningsCard";
import { CustomerDistributionCard } from "./cards/CustomerDistributionCard";

// Error component
const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="text-lg text-red-500">Error: {message}</div>
    <Button onClick={onRetry} variant="outline">
      <RefreshCw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  </div>
);

// Lazy load each card component
const LazyCard = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="h-[300px] animate-pulse bg-gray-100 rounded-lg" />}>
    {children}
  </Suspense>
);

export default function Reports() {
  const { state } = useSidebar();
  const { toast } = useToast();
  const { 
    data: {
      remainingMetersByType,
      mostSellingProduct,
      earningsByMeterType,
      totalEarnings,
      userRole,
      agentInventory,
      customerTypeData
    },
    isLoading,
    error,
    refetch
  } = useReportsData();

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Success",
        description: "Reports data refreshed",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return <ErrorState message={error.message} onRetry={handleRefresh} />;
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className={cn(
      `container transition-all duration-200 ease-linear p-4 md:p-6 mx-auto`,
      state === "expanded" ? "w-full lg:w-[75vw]" : "w-full lg:w-[95vw]"
    )}>
      <div className="flex justify-between items-center mb-6">
        <h1 className='text-2xl md:text-3xl font-bold text-center drop-shadow-lg'>
          Overall Reports
        </h1>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          className="hover:bg-gray-100"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <div className={cn(
        'grid gap-4',
        'grid-cols-1',
        state === "expanded" 
          ? 'lg:grid-cols-2 xl:grid-cols-3' 
          : 'lg:grid-cols-2 xl:grid-cols-3'
      )}>
        {/* MeterInventoryCard now spans full width on mobile and 3 columns on larger screens */}
        <div className={cn(
          'col-span-1',
          'lg:col-span-2',
          'xl:col-span-3'
        )}>
          <LazyCard>
            <MeterInventoryCard 
              remainingMetersByType={remainingMetersByType}
              agentInventory={agentInventory}
              sidebarState={state}
            />
          </LazyCard>
        </div>

        <LazyCard>
          <BestSellerCard product={mostSellingProduct} />
        </LazyCard>

        {userRole === "admin" || userRole === "accountant" && (
          <>
            <LazyCard>
              <EarningsByTypeCard earnings={earningsByMeterType} />
            </LazyCard>
            <LazyCard>
              <TotalEarningsCard total={totalEarnings} />
            </LazyCard>
          </>
        )}

        <LazyCard>
          <CustomerDistributionCard 
            data={customerTypeData}
            sidebarState={state}
          />
        </LazyCard>
      </div>
    </div>
  );
}
