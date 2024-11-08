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
        "container transition-all duration-200 ease-linear py-4 md:p-6 mx-auto",
        state === "expanded" ? " lg:w-[80vw]" : " lg:w-[96vw]"
      )}>
      <SalesBarchart />
    </section>
  );
};

export default Dashboard;
