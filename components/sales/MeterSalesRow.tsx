"use client";

import { Fragment, useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getMetersByBatchId } from "@/lib/actions/supabaseActions";
import { format } from "date-fns";
import { Loader2, Search, Download, ArrowUp } from "lucide-react";
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
import { generateCSV } from "@/lib/utils/csvGenerator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDownloadSerials = () => {
    const headers = ["SN#"];
    const data = meters.map((meter) => [meter.serial_number]);

    generateCSV(`meter_serials_batch_${batch.id}`, headers, data);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className={`${geistMono.className} min-w-[60vw] w-full `}>
        <SheetHeader className='space-y-1'>
          <SheetTitle className='flex items-center gap-2 text-xl'>
            <span>Sale Details</span>
            <Badge variant='outline' className='bg-blue-100'>
              Batch #{batch.id}
            </Badge>
          </SheetTitle>
          <SheetDescription className='flex items-center gap-2 text-sm'>
            <span>
              Sold on{" "}
              {new Date(batch.sale_date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div
          ref={scrollContainerRef}
          className='mt-8 space-y-6 max-h-[80vh] overflow-y-auto relative pr-2'>
          {/* Batch Summary */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* Sale Info */}
            <div className='space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100'>
              <h3 className='font-medium text-blue-800'>Sale Information</h3>
              <div className='space-y-2'>
                <div>
                  <p className='text-sm text-blue-600'>Seller</p>
                  <p className='font-medium'>{batch.user_name}</p>
                </div>
                <div>
                  <p className='text-sm text-blue-600'>Meter Type</p>
                  <p className='font-medium'>{batch.meter_type}</p>
                </div>
                <div>
                  <p className='text-sm text-blue-600'>Quantity</p>
                  <p className='font-medium'>{batch.batch_amount} units</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className='space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-100'>
              <h3 className='font-medium text-green-800'>
                Customer Information
              </h3>
              <div className='space-y-2'>
                <div>
                  <p className='text-sm text-green-600'>Recipient</p>
                  <p className='font-medium'>{batch.recipient}</p>
                </div>
                <div>
                  <p className='text-sm text-green-600'>Customer Type</p>
                  <p className='font-medium capitalize'>
                    {batch.customer_type}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-green-600'>Contact</p>
                  <p className='font-medium'>{batch.customer_contact}</p>
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className='space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100'>
              <h3 className='font-medium text-purple-800'>Price Information</h3>
              <div className='space-y-2'>
                <div>
                  <p className='text-sm text-purple-600'>Total Amount</p>
                  <p className='font-medium'>
                    KES {Math.round(batch.total_price).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-purple-600'>Unit Price</p>
                  <p className='font-medium'>
                    KES {Math.round(batch.unit_price).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className='text-sm text-purple-600'>Location</p>
                  <div className='flex flex-col items-left gap-2'>
                    <div>
                      <Badge variant='outline' className='bg-purple-100'>
                        county: {batch.customer_county}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant='outline' className='bg-green-100'>
                        destination: {batch.destination}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Download Section */}
          <div className='sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-4 border-b'>
            <div className='flex justify-between items-center gap-4'>
              <div className='relative flex-1'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  className='pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors'
                  placeholder='Search serial numbers...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleDownloadSerials}
                className='whitespace-nowrap hover:bg-gray-50'>
                <Download className='h-4 w-4 mr-2' />
                Download List
              </Button>
            </div>
          </div>

          {/* Meters Display */}
          <div className='relative'>
            {loading ? (
              <div className='flex flex-col items-center justify-center py-12 space-y-4'>
                <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
                <p className='text-sm text-muted-foreground'>
                  Loading meters...
                </p>
              </div>
            ) : (
              <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <h3 className='font-medium text-gray-800'>
                    Serial Numbers
                    <span className='ml-2 text-sm text-muted-foreground'>
                      ({filteredMeters.length} of {meters.length})
                    </span>
                  </h3>
                </div>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  {currentMeters.map((meter, index) => (
                    <div
                      key={index}
                      className='p-3 bg-gray-50/80 hover:bg-gray-100/80 rounded-md text-center font-mono text-sm transition-colors'>
                      {meter.serial_number}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='mt-8 flex justify-center'>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={(e) => {
                              e.preventDefault();
                              const currentScroll =
                                scrollContainerRef.current?.scrollTop || 0;
                              setCurrentPage((p) => Math.max(1, p - 1));
                              setTimeout(() => {
                                if (scrollContainerRef.current) {
                                  scrollContainerRef.current.scrollTop =
                                    currentScroll;
                                }
                              }, 0);
                            }}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (page) =>
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 &&
                                page <= currentPage + 1)
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
                                  isActive={currentPage === page}>
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            </Fragment>
                          ))}

                        <PaginationItem>
                          <PaginationNext
                            onClick={(e) => {
                              e.preventDefault();
                              const currentScroll =
                                scrollContainerRef.current?.scrollTop || 0;
                              setCurrentPage((p) =>
                                Math.min(totalPages, p + 1)
                              );
                              setTimeout(() => {
                                if (scrollContainerRef.current) {
                                  scrollContainerRef.current.scrollTop =
                                    currentScroll;
                                }
                              }, 0);
                            }}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}

                {filteredMeters.length === 0 && searchTerm && (
                  <div className='text-center py-8 text-muted-foreground'>
                    <p>No serial numbers match your search</p>
                    <p className='text-sm mt-1'>Try a different search term</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {showScrollTop && (
            <Button
              variant='outline'
              size='icon'
              className='fixed bottom-4 right-4 rounded-full shadow-lg bg-white/90 backdrop-blur-sm hover:bg-gray-50'
              onClick={scrollToTop}>
              <ArrowUp className='h-4 w-4' />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
