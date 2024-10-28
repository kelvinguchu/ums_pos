"use client";
import DailyReports from "@/components/DailyReports";
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import DailyReportPDF from '@/components/dashboard/DailyReportPDF';
import { useState, useEffect } from "react";
import { getSaleBatches, getRemainingMetersByType } from "@/lib/actions/supabaseActions";
import { useToast } from "@/hooks/use-toast";

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

export default function DailyReportsPage() {
  const [todaySales, setTodaySales] = useState<SaleBatch[]>([]);
  const [yesterdaySales, setYesterdaySales] = useState<SaleBatch[]>([]);
  const [remainingMetersByType, setRemainingMetersByType] = useState<RemainingMetersByType[]>([]);
  const [todayTotalEarnings, setTodayTotalEarnings] = useState<number>(0);
  const [yesterdayTotalEarnings, setYesterdayTotalEarnings] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sales = await getSaleBatches();
        
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const todaysSales = sales.filter(sale => 
          sale.sale_date.startsWith(today)
        );
        const yesterdaysSales = sales.filter(sale => 
          sale.sale_date.startsWith(yesterday)
        );
        
        setTodaySales(todaysSales);
        setYesterdaySales(yesterdaysSales);

        const todayTotal = todaysSales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        );
        const yesterdayTotal = yesterdaysSales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        );

        setTodayTotalEarnings(todayTotal);
        setYesterdayTotalEarnings(yesterdayTotal);

        const remainingMeters = await getRemainingMetersByType();
        setRemainingMetersByType(remainingMeters);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleDownloadReport = async () => {
    try {
      setIsGenerating(true);
      const blob = await pdf(
        <DailyReportPDF
          todaySales={todaySales}
          yesterdaySales={yesterdaySales}
          remainingMetersByType={remainingMetersByType}
          todayTotalEarnings={todayTotalEarnings}
          yesterdayTotalEarnings={yesterdayTotalEarnings}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Report downloaded successfully!",
        style: { backgroundColor: '#2ECC40', color: 'white' },
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Error",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative mt-8">
      <div className="absolute right-4 top-4 z-10">
        <Button 
          variant="outline"
          className="flex gap-2 items-center"
          onClick={handleDownloadReport}
          disabled={isGenerating}
        >
          <Download className="h-4 w-4" />
          {isGenerating ? "Preparing..." : "Download Today's Report"}
        </Button>
      </div>
      <DailyReports />
    </div>
  );
}
