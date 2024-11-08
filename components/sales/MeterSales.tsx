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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Update the SaleBatch interface to include new fields
interface SaleBatch {
  id: number;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  sale_date: string;
  destination: string;
  recipient: string;
  total_price: number;
  unit_price: number;
  customer_type: string;
  customer_county: string;
  customer_contact: string;
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
      "Customer Type",
      "County",
      "Contact",
    ];
    const data = dataToExport.map((batch) => [
      batch.user_name,
      batch.meter_type,
      batch.batch_amount.toString(),
      `KES ${Math.round(batch.total_price).toLocaleString()}`,
      new Date(batch.sale_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      batch.customer_type,
      batch.customer_county,
      batch.customer_contact,
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
    const dataToExport = hasActiveFilters() ? currentBatches : filteredBatches;

    const headers = [
      "Seller",
      "Meter Type",
      "Amount",
      "Sale Amount",
      "Sale Date",
      "Destination",
      "Recipient",
      "Customer Type",
      "County",
      "Contact",
    ];
    const data = dataToExport.map((batch) => [
      batch.user_name,
      batch.meter_type,
      batch.batch_amount.toString(),
      batch.total_price.toString(),
      formatDate(batch.sale_date),
      batch.destination,
      batch.recipient,
      batch.customer_type,
      batch.customer_county,
      batch.customer_contact,
    ]);

    generateCSV("meter_sales_report", headers, data);
  };

  return (
    <div className={cn(
      `${geistMono.className} container transition-all duration-200 ease-linear mt-10 lg:mt-2 p-4 md:p-6 mx-auto`,
      state === "expanded" ? "w-full md:w-[75vw]" : "w-full md:w-[95vw]"
    )}>
      <h1 className='text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center drop-shadow-lg'>Sales</h1>

      {/* Search and Filter Section - Made more mobile-friendly */}
      <div className='mb-4 md:mb-6 space-y-4'>
        <div className='flex flex-col space-y-4'>
          {/* Search and Type Filter */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:flex gap-3'>
            <Input
              type='text'
              placeholder='Search by user...'
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className='w-full md:max-w-xs'
            />

            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}>
              <SelectTrigger className='w-full md:w-[180px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Types</SelectItem>
                <SelectItem value='split'>Split</SelectItem>
                <SelectItem value='integrated'>Integrated</SelectItem>
                <SelectItem value='gas'>Gas</SelectItem>
                <SelectItem value='water'>Water</SelectItem>
                <SelectItem value='3 Phase'>3 Phase</SelectItem>
                <SelectItem value='Smart'>Smart</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filters */}
            <div className='flex flex-col sm:flex-row gap-3 w-full lg:w-auto'>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                label='Search by date'
              />
              <span className='hidden lg:block text-sm text-muted-foreground self-center'>
                or
              </span>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                label='Search by date range'
              />
            </div>

            {/* Export Button */}
            <div className='w-full sm:w-auto lg:ml-auto'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' className='w-full sm:w-auto'>
                    <Download className='mr-2 h-4 w-4' />
                    Export Table
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPDF}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters() && (
            <Button
              variant='outline'
              size='sm'
              onClick={clearSearch}
              className='text-muted-foreground hover:text-foreground w-full sm:w-auto'>
              Clear filters
              <X className='ml-2 h-4 w-4' />
            </Button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <Card className='w-full transition-all duration-200 ease-linear'>
        <CardHeader className='p-4 md:p-6'>
          <CardTitle className='text-lg md:text-xl'>Meter Sales</CardTitle>
        </CardHeader>
        <CardContent className='p-0 md:p-6'>
          {currentBatches.length > 0 ? (
            <div className='overflow-x-auto'>
              {/* Mobile View */}
              <div className='md:hidden space-y-4 p-4'>
                {currentBatches.map((batch) => (
                  <div 
                    key={batch.id} 
                    className='bg-white p-4 rounded-lg border shadow-sm space-y-2'
                    onClick={() => setSelectedBatch(batch.id)}
                  >
                    <div className='flex justify-between items-start'>
                      <div>
                        <p className='font-medium'>{batch.user_name}</p>
                        <p className='text-sm text-muted-foreground'>{formatDate(batch.sale_date)}</p>
                      </div>
                      <Badge variant='outline' className='bg-blue-100'>
                        {batch.customer_type}
                      </Badge>
                    </div>
                    <div className='grid grid-cols-2 gap-2 text-sm'>
                      <div>
                        <p className='text-muted-foreground'>Meter Type</p>
                        <p>{batch.meter_type}</p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>Amount</p>
                        <p>{batch.batch_amount}</p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>Sale Amount</p>
                        <p>{batch.total_price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "KES",
                        })}</p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>County</p>
                        <Badge variant='outline' className='bg-green-100'>
                          {batch.customer_county}
                        </Badge>
                      </div>
                    </div>
                    <MeterSalesRow
                      batch={batch}
                      isOpen={selectedBatch === batch.id}
                      onOpenChange={(open) =>
                        setSelectedBatch(open ? batch.id : null)
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className='hidden md:block'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead>Meter Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Sale Amount</TableHead>
                      <TableHead>Sale Date</TableHead>
                      <TableHead>Customer Type</TableHead>
                      <TableHead>County</TableHead>
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
                          <TableCell>
                            <Badge variant='outline' className='bg-blue-100'>
                              {batch.customer_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline' className='bg-green-100'>
                              {batch.customer_county}
                            </Badge>
                          </TableCell>
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
              </div>
            </div>
          ) : (
            <EmptyState message='No sales data available' />
          )}
        </CardContent>
      </Card>

      {/* Pagination - Made responsive */}
      <div className='mt-4 md:mt-6'>
        <Pagination>
          <PaginationContent className='flex-wrap justify-center gap-2'>
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
