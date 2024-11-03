"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";
import { useSalesData } from "@/hooks/useSalesData";
import { SalesTable } from "./SalesTable";
import { DailyReportsFilters } from "./DailyReportsFilters";
import { DailyReportsSummary } from "./DailyReportsSummary";
import type { DateRange } from "@/types";
import { ErrorBoundary } from "./ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pdf } from "@react-pdf/renderer";
import TableReportPDF from "@/components/dashboard/TableReportPDF";
import { generateCSV } from "@/lib/utils/csvGenerator";


interface DailyReportsProps {
  selectedDateRange: DateRange | null;
  setSelectedDateRange: (range: DateRange | null) => void;
}

export default function DailyReports({
  selectedDateRange,
  setSelectedDateRange,
}: DailyReportsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUser, setSearchUser] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const itemsPerPage = 10;

  const { state } = useSidebar();
  const { salesData, isLoading, isError, error } = useSalesData();

  // Memoize filtered sales
  const filteredSales = useMemo(() => {
    let filtered = selectedDateRange
      ? salesData.todaySales
      : salesData.todaySales;

    if (searchUser) {
      filtered = filtered.filter((sale) =>
        sale.user_name.toLowerCase().includes(searchUser.toLowerCase())
      );
    }

    if (selectedType) {
      filtered = filtered.filter(
        (sale) => sale.meter_type.toLowerCase() === selectedType.toLowerCase()
      );
    }

    return filtered;
  }, [salesData.todaySales, searchUser, selectedType, selectedDateRange]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentItems = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchUser(value);
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setSelectedType(value);
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchUser("");
    setSelectedType("");
    setCurrentPage(1);
  }, []);

  const handleExportPDF = async () => {
    const dataToExport =
      searchUser || selectedType ? currentItems : filteredSales;

    const headers = [
      "Seller's Name",
      "Meter Type",
      "Amount",
      "Total Price",
      "Time",
    ];
    const data = dataToExport.map((sale) => [
      sale.user_name,
      sale.meter_type,
      sale.batch_amount.toString(),
      `KES ${sale.total_price.toLocaleString()}`,
      new Date(sale.sale_date).toLocaleTimeString(),
    ]);

    const blob = await pdf(
      <TableReportPDF
        title='Daily Sales Report'
        headers={headers}
        data={data}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-sales-report-${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const dataToExport =
      searchUser || selectedType ? currentItems : filteredSales;

    const headers = [
      "Seller's Name",
      "Meter Type",
      "Amount",
      "Total Price",
      "Time",
    ];
    const data = dataToExport.map((sale) => [
      sale.user_name,
      sale.meter_type,
      sale.batch_amount.toString(),
      sale.total_price.toString(),
      new Date(sale.sale_date).toLocaleTimeString(),
    ]);

    generateCSV("daily_sales_report", headers, data);
  };

  if (isError) {
    return (
      <div className='text-center py-8 text-red-500'>
        Error loading data: {error?.message}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-4 transition-all duration-300 ease-in-out ${
        state === "expanded"
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 md:grid-cols-3"
      } w-full md:w-[75vw] ${state === "expanded" ? "" : "md:w-[93vw]"}`}>
      <ErrorBoundary>
        <Card className='col-span-full shadow-md hover:shadow-xl'>
          <CardHeader>
            <CardTitle>
              {selectedDateRange ? selectedDateRange.label : "Today's Sales"}
              {selectedDateRange && (
                <span className='text-sm text-muted-foreground ml-2'>
                  ({selectedDateRange.startDate.toLocaleDateString()} -{" "}
                  {selectedDateRange.endDate.toLocaleDateString()})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='mb-6'>
              <div className='flex flex-col sm:flex-row gap-4 mb-2 justify-between'>
                <DailyReportsFilters
                  searchUser={searchUser}
                  selectedType={selectedType}
                  onSearchChange={handleSearchChange}
                  onTypeChange={handleTypeChange}
                  onClearFilters={handleClearFilters}
                  hasActiveFilters={Boolean(searchUser || selectedType)}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='outline'>
                      <Download className='mr-2 h-4 w-4' />
                      Export Table as
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <SalesTable
              sales={currentItems}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </CardContent>
        </Card>

        <DailyReportsSummary
          totalEarnings={filteredSales.reduce(
            (sum, sale) => sum + sale.total_price,
            0
          )}
          remainingMetersByType={salesData.remainingMetersByType}
          sidebarState={state}
        />
      </ErrorBoundary>
    </div>
  );
}
