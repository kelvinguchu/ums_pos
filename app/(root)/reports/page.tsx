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
        mt-10 lg:mt-4 
      `}
    >
      <Reports />
    </div>
  );
};

export default ReportsPage;
