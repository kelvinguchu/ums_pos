"use client";
import React from "react";
import Reports from "@/components/Reports";
import localFont from "next/font/local";
import { useSidebar } from "@/components/ui/sidebar";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function ReportsPage() {
  const { state } = useSidebar();

  return (
    <div
      className={`
        ${geistMono.className} 
        mt-20 
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
}
