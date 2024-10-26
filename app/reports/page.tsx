'use client';
import React from 'react'
import Reports from '@/components/Reports';
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
    <div className={`${geistMono.className} transition-all duration-300 ease-in-out -mt-6 ${state === 'expanded' ? 'ml-4' : 'ml-4'} p-4`}>
      <Reports />
    </div>
  );
}
