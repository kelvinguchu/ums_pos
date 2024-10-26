import React from "react";
import { SalesBarchart } from "@/components/dashboard/SalesBarchart";
import { useSidebar } from "@/components/ui/sidebar";

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const { state } = useSidebar();

  return (
    <section
      className={`mx-auto ${state === "expanded" ? "w-[75vw] " : "w-[93vw]"}`}>
      <SalesBarchart />
    </section>
  );
};

export default Dashboard;
