"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSaleBatches } from "@/lib/actions/supabaseActions";
import localFont from "next/font/local";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import { DatePicker } from "@/components/ui/date-picker";
import { X, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { generateCSV } from "@/lib/utils/csvGenerator";
import { pdf } from "@react-pdf/renderer";
import TableReportPDF from "@/components/sharedcomponents/TableReportPDF";
import { MeterSalesRow } from "./MeterSalesRow";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Update the SaleBatch interface to include unit_price
interface SaleBatch {
  id: number;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  sale_date: string;
  destination: string;
  recipient: string;
  total_price: number;
  unit_price: number; // Add this field
}

const EmptyState = ({ message }: { message: string }) => (
  <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
    <PackageOpen className='w-12 h-12 mb-4' />
    <p className='text-sm'>{message}</p>
  </div>
);

export default function MeterSales() {
  const { state } = useSidebar();
  const [saleBatches, setSaleBatches] = useState<SaleBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<SaleBatch[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUser, setSearchUser] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const itemsPerPage = 10;
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchSaleBatches() {
      try {
        const batches = await getSaleBatches();
        setSaleBatches(batches);
        setFilteredBatches(batches);
      } catch (error) {
        console.error("Error fetching sale batches:", error);
      }
    }
    fetchSaleBatches();
  }, []);

  // Filter data
  useEffect(() => {
    let filtered = [...saleBatches];

    if (searchUser) {
      filtered = filtered.filter((batch) =>
        batch.user_name.toLowerCase().includes(searchUser.toLowerCase())
      );
    }

    if (selectedType) {
      filtered = filtered.filter(
        (batch) => batch.meter_type.toLowerCase() === selectedType.toLowerCase()
      );
    }

    if (dateRange) {
      const startDate = new Date(dateRange.start.toString());
      const endDate = new Date(dateRange.end.toString());
      filtered = filtered.filter((batch) => {
        const saleDate = new Date(batch.sale_date);
        return saleDate >= startDate && saleDate <= endDate;
      });
    }

    if (selectedDate) {
      const date = new Date(selectedDate.toString());
      filtered = filtered.filter((batch) => {
        const saleDate = new Date(batch.sale_date);
        return saleDate.toDateString() === date.toDateString();
      });
    }

    setFilteredBatches(filtered);
    setCurrentPage(1);
  }, [saleBatches, searchUser, selectedType, dateRange, selectedDate]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBatches = filteredBatches.slice(startIndex, endIndex);

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", " at");
  };

  const hasActiveFilters = () => {
    return searchUser || selectedType || dateRange || selectedDate;
  };

  const clearSearch = () => {
    setSearchUser("");
    setSelectedType("");
    setDateRange(null);
    setSelectedDate(null);
  };

  const handleExportPDF = async () => {
    const dataToExport = hasActiveFilters() ? currentBatches : filteredBatches;

    const headers = [
      "Seller",
      "Meter Type",
      "Amount",
      "Sale Amount",
      "Sale Date",
      "Destination",
      "Recipient",
    ];
    const data = dataToExport.map((batch) => [
      batch.user_name,
      batch.meter_type,
      batch.batch_amount.toString(),
      // Remove .00 from sale amount by using Math.round and adding KES prefix
      `KES ${Math.round(batch.total_price).toLocaleString()}`,
      // Simplify date format to just show the date without time
      new Date(batch.sale_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      batch.destination,
      batch.recipient,
    ]);

    const blob = await pdf(
      <TableReportPDF
        title='Meter Sales Report'
        headers={headers}
        data={data}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `meter-sales-report-${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    // Use all filtered batches instead of just currentBatches
    const dataToExport = hasActiveFilters() ? currentBatches : filteredBatches;

    const headers = [
      "Seller",
      "Meter Type",
      "Amount",
      "Sale Amount",
      "Sale Date",
      "Destination",
      "Recipient",
    ];
    const data = dataToExport.map((batch) => [
      batch.user_name,
      batch.meter_type,
      batch.batch_amount.toString(),
      batch.total_price.toString(),
      formatDate(batch.sale_date),
      batch.destination,
      batch.recipient,
    ]);

    generateCSV("meter_sales_report", headers, data);
  };

  return (
    <div className={`${geistMono.className} mx-auto mt-10`}>
      <h1 className='text-3xl font-bold mb-6 text-center'>Sales</h1>

      {/* Search and Filter Section */}
      <div className='mb-6'>
        <div className='flex gap-4 mb-2 justify-between'>
          <div className='flex gap-4'>
            <Input
              type='text'
              placeholder='Search by user...'
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className='max-w-xs'
            />

            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Types</SelectItem>
                <SelectItem value='split'>Split</SelectItem>
                <SelectItem value='integrated'>Integrated</SelectItem>
                <SelectItem value='gas'>Gas</SelectItem>
                <SelectItem value='water'>Water</SelectItem>
              </SelectContent>
            </Select>

            <div className='flex gap-4'>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                label='Search by date'
              />
              <span className='text-sm text-muted-foreground self-center'>
                or
              </span>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                label='Search by date range'
              />
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline'>
                <Download className='mr-2 h-4 w-4' />
                Export Table as
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportPDF}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasActiveFilters() && (
          <Button
            variant='outline'
            size='sm'
            onClick={clearSearch}
            className='text-muted-foreground hover:text-foreground'>
            Clear search
            <X className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>

      {/* Table Card */}
      <Card
        className={`${
          state === "expanded" ? "w-[75vw] " : "w-[93vw]"
        } mx-auto`}>
        <CardHeader>
          <CardTitle>Meter Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {currentBatches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Meter Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sale Amount</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Recipient</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentBatches.map((batch) => (
                  <React.Fragment key={batch.id}>
                    <TableRow
                      className='cursor-pointer hover:bg-muted/50'
                      onClick={() => setSelectedBatch(batch.id)}>
                      <TableCell>{batch.user_name}</TableCell>
                      <TableCell>{batch.meter_type}</TableCell>
                      <TableCell>{batch.batch_amount}</TableCell>
                      <TableCell>
                        {batch.total_price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "KES",
                        })}
                      </TableCell>
                      <TableCell>{formatDate(batch.sale_date)}</TableCell>
                      <TableCell>{batch.destination}</TableCell>
                      <TableCell>{batch.recipient}</TableCell>
                    </TableRow>
                    <MeterSalesRow
                      batch={batch}
                      isOpen={selectedBatch === batch.id}
                      onOpenChange={(open) =>
                        setSelectedBatch(open ? batch.id : null)
                      }
                    />
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState message="No sales data available" />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className='mt-4 flex justify-center'>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                isActive={currentPage !== 1}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
              )
              .map((page, i, arr) => (
                <React.Fragment key={page}>
                  {i > 0 && arr[i - 1] !== page - 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={page === currentPage}>
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              ))}

            <PaginationItem>
              <PaginationNext
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                isActive={currentPage !== totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
