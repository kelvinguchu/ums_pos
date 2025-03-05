import React, { useState, useEffect } from "react";
import { useMetersData, MeterStatusFilter } from "../hooks/useMetersData";
import { MeterWithStatus } from "@/lib/actions/supabaseActions2";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMeterTypeBadgeClass } from "../utils/meterTypeConfig";
import { cn } from "@/lib/utils";
import {
  Search,
  Download,
  Package,
  User,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { generateCSV } from "@/lib/utils/csvGenerator";
import { getAllMetersForExport } from "@/lib/actions/supabaseActions2";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const METER_TYPES = [
  "integrated",
  "split",
  "gas",
  "water",
  "smart",
  "3 phase",
] as const;

const STATUS_ICONS = {
  in_stock: <Package className='h-4 w-4' />,
  with_agent: <User className='h-4 w-4' />,
  sold: <ShoppingCart className='h-4 w-4' />,
  replaced: <RefreshCw className='h-4 w-4' />,
  faulty: <AlertTriangle className='h-4 w-4' />,
};

const STATUS_COLORS = {
  in_stock: "bg-green-200 text-green-900",
  with_agent: "bg-blue-200 text-blue-900",
  sold: "bg-purple-200 text-purple-900",
  replaced: "bg-orange-200 text-orange-900",
  faulty: "bg-red-200 text-red-900",
};

// Add a debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const AllMetersView: React.FC = () => {
  const { meters, totalCount, isLoading, error, pagination, filters, refetch } =
    useMetersData(25); // Reduce to 25 entries per page
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Debounced search function
  const debouncedSearch = debounce(() => {
    filters.handleSearchChange(searchInput);
  }, 500);

  useEffect(() => {
    if (searchInput) {
      debouncedSearch();
    }
  }, [searchInput]);

  const handleSearch = () => {
    filters.handleSearchChange(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      // Get all meters based on current filters
      const allMeters = await getAllMetersForExport(
        filters.statusFilter,
        filters.typeFilter,
        filters.searchTerm
      );

      if (!allMeters.length) {
        toast({
          title: "Export Failed",
          description: "No meters found to export with the current filters",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Format the data for CSV
      const csvData = allMeters.map((meter: MeterWithStatus) => {
        const baseData = {
          "Serial Number": meter.serial_number,
          Type: meter.type,
          Status: meter.status,
        };

        let additionalData = {};

        // Handle different meter statuses
        switch (meter.status) {
          case "with_agent":
            if (meter.agent_details) {
              additionalData = {
                "Agent Name": meter.agent_details.agent_name,
                "Agent Phone": meter.agent_details.agent_phone,
                "Agent Location": meter.agent_details.agent_location,
                "Assigned Date": meter.agent_details.assigned_at
                  ? format(
                      new Date(meter.agent_details.assigned_at),
                      "yyyy-MM-dd"
                    )
                  : "",
              };
            }
            break;

          case "sold":
            if (meter.sale_details) {
              additionalData = {
                "Sold Date": meter.sale_details.sold_at
                  ? format(new Date(meter.sale_details.sold_at), "yyyy-MM-dd")
                  : "",
                "Sold By": meter.sale_details.sold_by,
                Recipient: meter.sale_details.recipient,
                Destination: meter.sale_details.destination,
                "Customer Contact": meter.sale_details.customer_contact,
                "Unit Price": meter.sale_details.unit_price,
              };
            }
            break;

          case "replaced":
            if (meter.sale_details) {
              additionalData = {
                "Sold Date": meter.sale_details.sold_at
                  ? format(new Date(meter.sale_details.sold_at), "yyyy-MM-dd")
                  : "",
                "Sold By": meter.sale_details.sold_by,
                Recipient: meter.sale_details.recipient,
                Destination: meter.sale_details.destination,
                "Customer Contact": meter.sale_details.customer_contact,
                "Unit Price": meter.sale_details.unit_price,
              };

              if (meter.replacement_details) {
                additionalData = {
                  ...additionalData,
                  "Replacement Serial":
                    meter.replacement_details.replacement_serial,
                  "Replacement Date": meter.replacement_details.replacement_date
                    ? format(
                        new Date(meter.replacement_details.replacement_date),
                        "yyyy-MM-dd"
                      )
                    : "",
                  "Replaced By": meter.replacement_details.replacement_by,
                };
              }
            }
            break;

          case "faulty":
            if (meter.fault_details) {
              additionalData = {
                "Reported Date": meter.fault_details.reported_at
                  ? format(
                      new Date(meter.fault_details.reported_at),
                      "yyyy-MM-dd"
                    )
                  : "",
                "Reported By": meter.fault_details.reported_by,
                "Returner Name": meter.fault_details.returner_name,
                "Fault Description": meter.fault_details.fault_description,
                "Fault Status": meter.fault_details.fault_status,
              };
            }

            if (meter.sale_details) {
              additionalData = {
                ...additionalData,
                "Sold Date": meter.sale_details.sold_at
                  ? format(new Date(meter.sale_details.sold_at), "yyyy-MM-dd")
                  : "",
                "Sold By": meter.sale_details.sold_by,
                Recipient: meter.sale_details.recipient,
                Destination: meter.sale_details.destination,
              };
            }
            break;

          case "in_stock":
            // No additional data needed for in_stock meters
            break;

          default:
            break;
        }

        return {
          ...baseData,
          ...additionalData,
        };
      });

      // Generate and download the CSV
      generateCSV(
        csvData,
        `meters-report-${filters.statusFilter || "all"}-${
          new Date().toISOString().split("T")[0]
        }`
      );

      toast({
        title: "Export Successful",
        description: `Exported ${allMeters.length} meters`,
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Export Failed",
        description:
          "An error occurred while exporting the data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Refreshed",
        description: "Meter data has been refreshed",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh meter data",
        variant: "destructive",
      });
    }
  };

  const renderMeterDetails = (meter: MeterWithStatus) => {
    return (
      <div className='space-y-1 text-sm'>
        {meter.status === "with_agent" && meter.agent_details && (
          <div>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Agent:</span>{" "}
              {meter.agent_details.agent_name}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Phone:</span>{" "}
              {meter.agent_details.agent_phone}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Location:</span>{" "}
              {meter.agent_details.agent_location}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Assigned on:</span>{" "}
              {meter.agent_details.assigned_at
                ? format(
                    new Date(meter.agent_details.assigned_at),
                    "MMM d, yyyy"
                  )
                : "Unknown"}
            </p>
          </div>
        )}

        {(meter.status === "sold" || meter.status === "replaced") &&
          meter.sale_details && (
            <div>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Sold on:</span>{" "}
                {format(new Date(meter.sale_details.sold_at), "MMM d, yyyy")}
              </p>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Sold by:</span>{" "}
                {meter.sale_details.sold_by}
              </p>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Destination:</span>{" "}
                {meter.sale_details.destination}
              </p>
              <p className='text-muted-foreground'>
                <span className='font-medium'>Recipient:</span>{" "}
                {meter.sale_details.recipient}
              </p>
              {meter.sale_details.customer_contact && (
                <p className='text-muted-foreground'>
                  <span className='font-medium'>Contact:</span>{" "}
                  {meter.sale_details.customer_contact}
                </p>
              )}
            </div>
          )}

        {meter.status === "replaced" && meter.replacement_details && (
          <div className='mt-2 pt-2 border-t'>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Replaced with:</span>{" "}
              {meter.replacement_details.replacement_serial}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Replaced on:</span>{" "}
              {format(
                new Date(meter.replacement_details.replacement_date),
                "MMM d, yyyy"
              )}
            </p>
          </div>
        )}

        {meter.status === "faulty" && meter.fault_details && (
          <div>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Returned on:</span>{" "}
              {format(
                new Date(meter.fault_details.returned_at || ""),
                "MMM d, yyyy"
              )}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Returned by:</span>{" "}
              {meter.fault_details.returner_name || ""}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Fault:</span>{" "}
              {meter.fault_details.fault_description}
            </p>
            <p className='text-muted-foreground'>
              <span className='font-medium'>Status:</span>{" "}
              <Badge
                variant='outline'
                className={
                  meter.fault_details.fault_status === "repaired"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }>
                {meter.fault_details.fault_status || ""}
              </Badge>
            </p>
          </div>
        )}
      </div>
    );
  };

  // Skeleton loader component
  const TableSkeleton = () => (
    <div className='space-y-3'>
      <div className='flex items-center space-x-4'>
        <Skeleton className='h-8 w-[250px]' />
        <Skeleton className='h-8 w-[100px]' />
      </div>
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <div key={i} className='flex items-center space-x-4'>
            <Skeleton className='h-12 w-full' />
          </div>
        ))}
    </div>
  );

  const CardSkeleton = () => (
    <div className='space-y-4'>
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <Card key={i} className='p-4'>
            <div className='space-y-3'>
              <div className='flex justify-between'>
                <Skeleton className='h-5 w-[120px]' />
                <Skeleton className='h-5 w-[80px]' />
              </div>
              <Skeleton className='h-4 w-[180px]' />
              <Skeleton className='h-4 w-full' />
            </div>
          </Card>
        ))}
    </div>
  );

  return (
    <div className='flex flex-col h-full'>
      <div className='flex justify-between items-center mb-4 pr-8'>
        <h2 className='text-2xl font-bold'>All Meters</h2>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={handleRefresh}>
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
          <Input
            type='text'
            placeholder='Search by serial number...'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className='w-64'
          />
          <Button variant='outline' onClick={handleSearch}>
            <Search className='h-4 w-4 mr-2' />
            Search
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            className='ml-2'>
            {isExporting ? (
              <>
                <span className='animate-spin mr-2'>⏳</span>
                Exporting...
              </>
            ) : (
              "Export CSV"
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <Tabs
          defaultValue='in_stock'
          className='w-full'
          value={filters.statusFilter}
          onValueChange={(value) => {
            filters.handleStatusFilterChange(value as MeterStatusFilter);
          }}>
          <div className='flex justify-between items-center mb-4 pr-2'>
            <TabsList>
              <TabsTrigger value='in_stock'>In Stock</TabsTrigger>
              <TabsTrigger value='with_agent'>With Agent</TabsTrigger>
              <TabsTrigger value='sold'>Sold</TabsTrigger>
              <TabsTrigger value='replaced'>Replaced</TabsTrigger>
              <TabsTrigger value='faulty'>Faulty</TabsTrigger>
            </TabsList>

            <Select
              value={filters.typeFilter || ""}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                filters.handleTypeFilterChange(e.target.value || null);
              }}>
              <SelectTrigger className='w-[150px]'>
                <SelectValue>All Types</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=''>All Types</SelectItem>
                {METER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content for each tab */}
          {["in_stock", "with_agent", "sold", "replaced", "faulty"].map(
            (status) => (
              <TabsContent key={status} value={status} className='mt-0'>
                {isLoading ? (
                  <div>
                    {/* Mobile skeleton */}
                    <div className='md:hidden'>
                      <CardSkeleton />
                    </div>
                    {/* Desktop skeleton */}
                    <div className='hidden md:block'>
                      <TableSkeleton />
                    </div>
                  </div>
                ) : error ? (
                  <div className='flex flex-col justify-center items-center h-64'>
                    <AlertCircle className='h-8 w-8 text-red-500 mb-2' />
                    <p className='text-red-500'>Error loading meters</p>
                    <Button
                      variant='outline'
                      size='sm'
                      className='mt-2'
                      onClick={() => refetch()}>
                      Retry
                    </Button>
                  </div>
                ) : meters.length === 0 ? (
                  <div className='flex flex-col justify-center items-center h-64'>
                    <Package className='h-8 w-8 text-gray-400 mb-2' />
                    <p className='text-gray-500'>No meters found</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile view */}
                    <div className='md:hidden space-y-4'>
                      {(meters as MeterWithStatus[]).map((meter) => (
                        <Card key={meter.serial_number} className='p-4'>
                          <div className='flex justify-between items-start'>
                            <div>
                              <p className='font-medium'>
                                {meter.serial_number}
                              </p>
                              <Badge
                                className={getMeterTypeBadgeClass(meter.type)}>
                                {meter.type}
                              </Badge>
                            </div>
                          </div>
                          {renderMeterDetails(meter)}
                        </Card>
                      ))}
                    </div>

                    {/* Desktop view */}
                    <div className='hidden md:block'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serial Number</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(meters as MeterWithStatus[]).map((meter) => (
                            <TableRow key={meter.serial_number}>
                              <TableCell className='font-medium'>
                                {meter.serial_number}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getMeterTypeBadgeClass(
                                    meter.type
                                  )}>
                                  {meter.type}
                                </Badge>
                              </TableCell>
                              <TableCell>{renderMeterDetails(meter)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* Pagination */}
                {meters.length > 0 && (
                  <div className='flex justify-end mt-4'>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              pagination.handlePageChange(pagination.page - 1)
                            }
                            className={
                              pagination.page === 1
                                ? "opacity-50 pointer-events-none"
                                : ""
                            }
                          />
                        </PaginationItem>

                        {/* First page */}
                        {pagination.page > 2 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() => pagination.handlePageChange(1)}>
                              1
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {/* Ellipsis if needed */}
                        {pagination.page > 3 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {/* Previous page if not on first page */}
                        {pagination.page > 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() =>
                                pagination.handlePageChange(pagination.page - 1)
                              }>
                              {pagination.page - 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {/* Current page */}
                        <PaginationItem>
                          <PaginationLink isActive>
                            {pagination.page}
                          </PaginationLink>
                        </PaginationItem>

                        {/* Next page if not on last page */}
                        {pagination.page < pagination.totalPages && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() =>
                                pagination.handlePageChange(pagination.page + 1)
                              }>
                              {pagination.page + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        {/* Ellipsis if needed */}
                        {pagination.page < pagination.totalPages - 2 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}

                        {/* Last page */}
                        {pagination.page < pagination.totalPages - 1 && (
                          <PaginationItem>
                            <PaginationLink
                              onClick={() =>
                                pagination.handlePageChange(
                                  pagination.totalPages
                                )
                              }>
                              {pagination.totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        )}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              pagination.handlePageChange(pagination.page + 1)
                            }
                            className={
                              pagination.page === pagination.totalPages
                                ? "opacity-50 pointer-events-none"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </TabsContent>
            )
          )}
        </Tabs>
      </ScrollArea>
    </div>
  );
};

export default AllMetersView;
