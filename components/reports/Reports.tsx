"use client";
import React from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useReportsData } from "./hooks/useReportsData";
import Loader from "@/components/Loader";

// Import all card components
import { MeterInventoryCard } from "./cards/MeterInventoryCard";
import { TopSellersCard } from "./cards/TopSellersCard";
import { BestSellerCard } from "./cards/BestSellerCard";
import { EarningsByTypeCard } from "./cards/EarningsByTypeCard";
import { TotalEarningsCard } from "./cards/TotalEarningsCard";
import { CustomerDistributionCard } from "./cards/CustomerDistributionCard";

// Error component
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-lg text-red-500">Error: {message}</div>
  </div>
);

export default function Reports() {
  const { state } = useSidebar();
  const { 
    data: {
      remainingMetersByType,
      topSellers,
      mostSellingProduct,
      earningsByMeterType,
      totalEarnings,
      userRole,
      agentInventory,
      customerTypeData
    },
    isLoading,
    error
  } = useReportsData();

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className={cn(
      `container transition-all duration-200 ease-linear p-4 md:p-6 mx-auto`,
      state === "expanded" ? "w-full lg:w-[75vw]" : "w-full lg:w-[95vw]"
    )}>
      <h1 className='text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6 drop-shadow-lg'>
        Overall Reports
      </h1>
      
      <div className={cn(
        'grid gap-4',
        'grid-cols-1 sm:grid-cols-2',
        state === "expanded" 
          ? 'lg:grid-cols-2 xl:grid-cols-3' 
          : 'lg:grid-cols-3 xl:grid-cols-4'
      )}>
        <MeterInventoryCard 
          remainingMetersByType={remainingMetersByType}
          agentInventory={agentInventory}
          sidebarState={state}
        />

        <TopSellersCard topSellers={topSellers} />
        
        <BestSellerCard product={mostSellingProduct} />

        {userRole === "admin" && (
          <>
            <EarningsByTypeCard earnings={earningsByMeterType} />
            <TotalEarningsCard total={totalEarnings} />
          </>
        )}

        <CustomerDistributionCard 
          data={customerTypeData}
          sidebarState={state}
        />
      </div>
    </div>
  );
}
