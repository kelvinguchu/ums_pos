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
import { getSaleBatches, getAgentsList } from "@/lib/actions/supabaseActions";
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
import { useMeterSalesData } from "./hooks/useMeterSalesData";
import type { SaleBatch } from "./hooks/useMeterSalesData";
import Loader from "@/components/Loader";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CUSTOMER_TYPES } from "@/lib/constants/locationData";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const EmptyState = ({ message }: { message: string }) => (
  <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
    <PackageOpen className='w-12 h-12 mb-4' />
    <p className='text-sm'>{message}</p>
  </div>
);

export default function MeterSales() {
  const { state } = useSidebar();
  const [filteredBatches, setFilteredBatches] = useState<SaleBatch[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUser, setSearchUser] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<any>(null);
  const itemsPerPage = 10;
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCustomerType, setSelectedCustomerType] = useState("");

  // Use the new hook
  const { saleBatches, isLoading, isError, error, refetch } =
    useMeterSalesData();

  // Add toast
  const { toast } = useToast();

  // Add refresh handler
  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Success",
        description: "Sales data refreshed",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    }
  };

  // Fetch agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agentsList = await getAgentsList();
        setAgents(agentsList.filter((agent) => agent.is_active));
      } catch (error) {
        console.error("Error loading agents:", error);
      }
    };
    loadAgents();
  }, []);

  // Filter data
  useEffect(() => {
    let filtered = [...saleBatches];

    if (searchUser) {
      filtered = filtered.filter(
        (batch) =>
          batch.user_name.toLowerCase().includes(searchUser.toLowerCase()) ||
          batch.recipient.toLowerCase().includes(searchUser.toLowerCase())
      );
    }

    if (selectedType) {
      filtered = filtered.filter(
        (batch) => batch.meter_type.toLowerCase() === selectedType.toLowerCase()
      );
    }

    if (selectedCustomerType) {
      filtered = filtered.filter(
        (batch) => batch.customer_type === selectedCustomerType
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
  }, [
    saleBatches,
    searchUser,
    selectedType,
    selectedCustomerType,
    dateRange,
    selectedDate,
  ]);

  // Add loading state
  if (isLoading) {
    return <Loader />;
  }

  // Add error state
  if (isError) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <div className='text-lg text-red-500'>Error: {error?.message}</div>
        <Button onClick={() => refetch()} variant='outline'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Retry
        </Button>
      </div>
    );
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBatches = filteredBatches.slice(startIndex, endIndex);

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const hasActiveFilters = () => {
    return (
      searchUser ||
      selectedType ||
      selectedCustomerType ||
      dateRange ||
      selectedDate
    );
  };

  const clearSearch = () => {
    setSearchUser("");
    setSelectedType("");
    setSelectedCustomerType("");
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
    <div
      className={cn(
        `${geistMono.className} container transition-all duration-200 ease-linear mt-10 lg:mt-2 p-4 md:p-6 mx-auto`,
        state === "expanded" ? "w-full md:w-[79vw]" : "w-full md:w-[95vw]"
      )}>
      <div className='flex flex-col items-center gap-6 mb-6'>
        <h1 className='text-2xl md:text-3xl font-bold text-center drop-shadow-lg'>
          Sales
        </h1>
      </div>

      {/* Search and Filter Section - Made more mobile-friendly */}
      <div className='mb-6 space-y-4'>
        {/* Main filters container */}
        <div className='bg-white p-4 rounded-lg border shadow-sm'>
          {/* All filters in one line */}
          <div className='flex flex-wrap items-center gap-3'>
            <Input
              type='text'
              placeholder='Search by seller or recipient...'
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className='w-[200px]'
            />

            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}>
              <SelectTrigger className='w-[140px]'>
                <SelectValue>Meter Type</SelectValue>
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

            <Select
              value={selectedCustomerType}
              onChange={(e) => setSelectedCustomerType(e.target.value)}>
              <SelectTrigger className='w-[140px]'>
                <SelectValue>Customer Type</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Customers</SelectItem>
                {CUSTOMER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className='w-[130px]'>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                label='Single date'
              />
            </div>

            <div className='w-[200px]'>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                label='Date range'
              />
            </div>

            <div className='flex items-center gap-2 ml-auto'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm'>
                    <Download className='mr-2 h-4 w-4' />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {hasActiveFilters() && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={clearSearch}
                  className='text-muted-foreground hover:text-foreground'>
                  <X className='h-4 w-4' />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <Card className='w-full transition-all duration-200 ease-linear'>
        <CardHeader className='p-4 md:p-6'>
          <div className='flex justify-between items-center'>
            <CardTitle className='text-lg md:text-xl'>Meter Sales</CardTitle>
            <Button
              variant='outline'
              size='icon'
              onClick={handleRefresh}
              className='hover:bg-gray-100'>
              <RefreshCw className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <CardContent className='p-0 md:p-6 -mt-0 md:-mt-8'>
          {currentBatches.length > 0 ? (
            <div className='overflow-x-auto'>
              {/* Mobile View */}
              <div className='md:hidden space-y-4 p-4'>
                {currentBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className='bg-white p-4 rounded-lg border shadow-sm space-y-2'
                    onClick={() => setSelectedBatch(batch.id)}>
                    <div className='flex justify-between items-start'>
                      <div>
                        <p className='font-medium'>{batch.user_name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {formatDate(batch.sale_date)}
                        </p>
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
                        <p>
                          KES {Math.round(batch.total_price).toLocaleString()}
                        </p>
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
                      <TableHead className='w-[16%]'>Seller</TableHead>
                      <TableHead className='w-[8%]'>Meter Type</TableHead>
                      <TableHead className='w-[7%] text-center'>
                        Quantity
                      </TableHead>
                      <TableHead className='w-[15%]'>Sale Amount</TableHead>
                      <TableHead className='w-[12%]'>Sale Date</TableHead>
                      <TableHead className='w-[18%]'>Recipient</TableHead>
                      <TableHead className='w-[12%]'>Customer Type</TableHead>
                      <TableHead className='w-[13%]'>County</TableHead>
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
                          <TableCell className='text-center'>
                            {batch.batch_amount}
                          </TableCell>
                          <TableCell>
                            KES {Math.round(batch.total_price).toLocaleString()}
                          </TableCell>
                          <TableCell>{formatDate(batch.sale_date)}</TableCell>
                          <TableCell className='max-w-[200px] truncate'>
                            {batch.recipient}
                          </TableCell>
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
