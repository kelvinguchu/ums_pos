"use client";
import React from "react";
import Reports from "@/components/reports/Reports";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const ReportsPage = () => {
  return (
    <div
      className={`
        ${geistMono.className} 
        mt-20 lg:mt-8 
        transition-all 
        duration-300 
        ease-in-out 
        mx-auto 
        w-full 
        overflow-hidden
        px-2 sm:px-4
      `}
    >
      <Reports />
    </div>
  );
};

export default ReportsPage;
