"use client";
import DailyReports from "@/components/DailyReports";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import DailyReportPDF from "@/components/dashboard/DailyReportPDF";
import { useState, useEffect } from "react";
import {
  getSaleBatches,
  getRemainingMetersByType,
} from "@/lib/actions/supabaseActions";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import TimeRangeReportPDF from "@/components/dashboard/TimeRangeReportPDF";
import {
  calculateReportMetrics,
  filterSalesByDateRange,
} from "@/lib/services/reportService";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

const DailyReportsPage = () => {
  const [todaySales, setTodaySales] = useState<SaleBatch[]>([]);
  const [yesterdaySales, setYesterdaySales] = useState<SaleBatch[]>([]);
  const [remainingMetersByType, setRemainingMetersByType] = useState<
    RemainingMetersByType[]
  >([]);
  const [todayTotalEarnings, setTodayTotalEarnings] = useState<number>(0);
  const [yesterdayTotalEarnings, setYesterdayTotalEarnings] =
    useState<number>(0);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  const [isGeneratingOther, setIsGeneratingOther] = useState(false);
  const { toast } = useToast();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(
    null
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sales = await getSaleBatches();

        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000)
          .toISOString()
          .split("T")[0];

        const todaysSales = sales.filter((sale) =>
          sale.sale_date.startsWith(today)
        );
        const yesterdaysSales = sales.filter((sale) =>
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
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const getDateRange = (option: string): DateRange => {
    const endDate = new Date();
    const startDate = new Date();

    switch (option) {
      case "yesterday":
        startDate.setDate(endDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        return { startDate, endDate, label: "Yesterday's Report" };
      case "last5days":
        startDate.setDate(endDate.getDate() - 5);
        return { startDate, endDate, label: "Last 5 Days Report" };
      case "lastWeek":
        startDate.setDate(endDate.getDate() - 7);
        return { startDate, endDate, label: "Last Week Report" };
      case "last10days":
        startDate.setDate(endDate.getDate() - 10);
        return { startDate, endDate, label: "Last 10 Days Report" };
      case "last2weeks":
        startDate.setDate(endDate.getDate() - 14);
        return { startDate, endDate, label: "Last 2 Weeks Report" };
      case "monthly":
        startDate.setDate(1);
        return { startDate, endDate, label: "Monthly Report" };
      default:
        return {
          startDate: new Date(),
          endDate: new Date(),
          label: "Today's Report",
        };
    }
  };

  // Keep this handler exclusively for daily reports
  const handleDownloadDailyReport = async () => {
    try {
      setIsGeneratingDaily(true);
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
      const link = document.createElement("a");
      link.href = url;
      link.download = `daily-report-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Daily report downloaded successfully!",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Error",
        description: "Failed to download daily report. Please try again.",
        variant: "destructive",
        style: { backgroundColor: "#FF4136", color: "white" },
      });
    } finally {
      setIsGeneratingDaily(false);
    }
  };

  // Separate handler for yesterday's report
  const handleYesterdayReport = async () => {
    try {
      setIsGeneratingOther(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const sales = await getSaleBatches();
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const yesterdaySales = sales.filter((sale) =>
        sale.sale_date.startsWith(yesterdayStr)
      );

      const metrics = {
        totalSales: yesterdaySales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        ),
        averageDailySales: yesterdaySales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        ),
        totalMeters: yesterdaySales.reduce(
          (sum, sale) => sum + sale.batch_amount,
          0
        ),
        metersByType: yesterdaySales.reduce(
          (acc: { [key: string]: number }, sale) => {
            acc[sale.meter_type] =
              (acc[sale.meter_type] || 0) + sale.batch_amount;
            return acc;
          },
          {}
        ),
      };

      const blob = await pdf(
        <TimeRangeReportPDF
          sales={yesterdaySales}
          dateRange={{
            startDate: yesterday,
            endDate: yesterday,
            label: "Yesterday's Report",
          }}
          metrics={metrics}
        />
      ).toBlob();

      handleReportDownload(blob, "yesterday's-report");
    } catch (error) {
      handleReportError(error);
    } finally {
      setIsGeneratingOther(false);
    }
  };

  // Handler for range-based reports
  const handleTimeRangeReport = async (option: string) => {
    if (option === "yesterday") {
      await handleYesterdayReport();
      return;
    }

    try {
      setIsGeneratingOther(true);
      const dateRange = getDateRange(option);
      const sales = await getSaleBatches();
      const filteredSales = filterSalesByDateRange(
        sales,
        dateRange.startDate,
        dateRange.endDate
      );
      const metrics = calculateReportMetrics(
        filteredSales,
        dateRange.startDate,
        dateRange.endDate
      );

      const blob = await pdf(
        <TimeRangeReportPDF
          sales={filteredSales}
          dateRange={dateRange}
          metrics={metrics}
        />
      ).toBlob();

      handleReportDownload(
        blob,
        dateRange.label.toLowerCase().replace(/\s+/g, "-")
      );
    } catch (error) {
      handleReportError(error);
    } finally {
      setIsGeneratingOther(false);
    }
  };

  // Helper functions for report handling
  const handleReportDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report downloaded successfully!",
      style: { backgroundColor: "#2ECC40", color: "white" },
    });
  };

  const handleReportError = (error: any) => {
    console.error("Error generating report:", error);
    toast({
      title: "Error",
      description: "Failed to generate report. Please try again.",
      variant: "destructive",
      style: { backgroundColor: "#FF4136", color: "white" },
    });
  };

  return (
    <div
      className={`
        ${geistMono.className} 
        mt-20 sm:mt-8 
        transition-all 
        duration-300 
        ease-in-out 
        mx-auto 
        w-full sm:w-auto
        overflow-hidden
        px-2 sm:px-4
        relative
      `}>
      <div className='mb-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end'>
        <Button
          variant='outline'
          className='flex gap-2 items-center'
          onClick={handleDownloadDailyReport}
          disabled={isGeneratingDaily}>
          <Download className='h-4 w-4' />
          {isGeneratingDaily ? "Preparing..." : "Download Today's Report"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='outline'
              className='flex gap-2 items-center'
              disabled={isGeneratingOther}>
              {isGeneratingOther ? "Preparing..." : "Other Reports"}{" "}
              <ChevronDown className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("yesterday")}>
              Yesterday's Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("last5days")}>
              Last 5 Days Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTimeRangeReport("lastWeek")}>
              Last 7 Days Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("last10days")}>
              Last 10 Days Report
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeReport("last2weeks")}>
              Last 2 Weeks Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleTimeRangeReport("monthly")}>
              Monthly Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DailyReports
        selectedDateRange={selectedDateRange}
        setSelectedDateRange={setSelectedDateRange}
      />
    </div>
  );
};

export default DailyReportsPage;
