"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getMetersByBatchId } from "@/lib/actions/supabaseActions";
import { format } from "date-fns";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import localFont from "next/font/local";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface MeterSalesRowProps {
  batch: {
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
  };
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SoldMeter {
  serial_number: string;
}

export function MeterSalesRow({
  batch,
  isOpen,
  onOpenChange,
}: MeterSalesRowProps) {
  const [meters, setMeters] = useState<SoldMeter[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Show 20 serial numbers per page

  // Add useEffect to fetch data when sheet opens
  useEffect(() => {
    async function fetchData() {
      if (isOpen) {
        setLoading(true);
        try {
          const data = await getMetersByBatchId(batch.id);
          setMeters(data);
        } catch (error) {
          console.error("Error fetching meter details:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    fetchData();
  }, [isOpen, batch.id]);

  // Filter and paginate meters
  const filteredMeters = meters.filter((meter) =>
    meter.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredMeters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMeters = filteredMeters.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className={`min-w-[50vw] ${geistMono.className}`}>
        <SheetHeader>
          <SheetTitle>Sale Batch Details</SheetTitle>
          <SheetDescription>
            Batch #{batch.id} - {format(new Date(batch.sale_date), "PPpp")}
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6 space-y-6 max-h-[80vh] overflow-y-auto'>
          {/* Batch Summary */}
          <div className='grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg'>
            <div>
              <p className='text-sm text-muted-foreground'>Seller</p>
              <p className='font-medium'>{batch.user_name}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Meter Type</p>
              <p className='font-medium'>{batch.meter_type}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Total</p>
              <p className='font-medium'>
                KES {Math.round(batch.total_price).toLocaleString()}
              </p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Destination</p>
              <p className='font-medium'>{batch.destination}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Recipient</p>
              <p className='font-medium'>{batch.recipient}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Unit Price</p>
              <p className='font-medium'>
                KES {Math.round(batch.unit_price).toLocaleString()}
              </p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Customer Type</p>
              <p className='font-medium capitalize'>{batch.customer_type}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>County</p>
              <p className='font-medium'>{batch.customer_county}</p>
            </div>
            <div>
              <p className='text-sm text-muted-foreground'>Contact</p>
              <p className='font-medium'>{batch.customer_contact}</p>
            </div>
          </div>

          {/* Search Input */}
          <div className='sticky top-0 bg-white z-10 pb-4'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              className='pl-9'
              placeholder='Search serial numbers...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Meters Display */}
          <div className='relative'>
            {loading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : (
              <div>
                <h3 className='font-semibold mb-4'>
                  Serial Numbers in this Batch
                  <span className='text-muted-foreground ml-2'>
                    ({filteredMeters.length} of {meters.length})
                  </span>
                </h3>
                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                  {currentMeters.map((meter, index) => (
                    <div
                      key={index}
                      className='p-2 bg-muted rounded-md text-center font-mono'>
                      {meter.serial_number}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => 
                            page === 1 || 
                            page === totalPages || 
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          )
                          .map((page, i, arr) => (
                            <Fragment key={page}>
                              {i > 0 && arr[i - 1] !== page - 1 && (
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              )}
                              <PaginationItem>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </Fragment>
                          ))}

                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {filteredMeters.length === 0 && searchTerm && (
                  <p className='text-center text-muted-foreground py-4'>
                    No serial numbers match your search
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
