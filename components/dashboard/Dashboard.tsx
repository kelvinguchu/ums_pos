import React from "react";
import { SalesBarchart } from "@/components/dashboard/SalesBarchart";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { state } = useSidebar();

  return (
    <section
      className={cn(
        "container transition-all duration-200 ease-linear p-4 md:p-6 mx-auto",
        state === "expanded" ? "w-full md:w-[75vw]" : "w-full md:w-[96vw]"
      )}>
      <SalesBarchart />
    </section>
  );
};

export default Dashboard;
