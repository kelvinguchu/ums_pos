"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSaleBatches,
  getRemainingMetersByType,
} from "@/lib/actions/supabaseActions";
import { useSidebar } from "@/components/ui/sidebar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import NumberTicker from "@/components/ui/number-ticker";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
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

const DailyReports: React.FC = () => {
  const [todaySales, setTodaySales] = useState<SaleBatch[]>([]);
  const [remainingMetersByType, setRemainingMetersByType] = useState<
    RemainingMetersByType[]
  >([]);
  const [todayTotalEarnings, setTodayTotalEarnings] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchUser, setSearchUser] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [filteredSales, setFilteredSales] = useState<SaleBatch[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sales = await getSaleBatches();
        
        const today = new Date().toISOString().split('T')[0];
        const todaysSales = sales.filter(sale => 
          sale.sale_date.startsWith(today)
        );
        
        setTodaySales(todaysSales);
        setFilteredSales(todaysSales);

        const todayTotal = todaysSales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        );
        setTodayTotalEarnings(todayTotal);

        const remainingMeters = await getRemainingMetersByType();
        setRemainingMetersByType(remainingMeters);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Add filter effect
  useEffect(() => {
    let filtered = [...todaySales];

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

    setFilteredSales(filtered);
    setCurrentPage(1);

    // Update total earnings based on filtered sales
    const filteredTotal = filtered.reduce(
      (sum, sale) => sum + sale.total_price,
      0
    );
    setTodayTotalEarnings(filteredTotal);
  }, [todaySales, searchUser, selectedType]);

  const { state } = useSidebar();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

  const hasActiveFilters = () => {
    return searchUser || selectedType;
  };

  const clearSearch = () => {
    setSearchUser("");
    setSelectedType("");
  };

  // Update pagination logic to use filteredSales
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div
      className={`grid gap-4 transition-all duration-300 ease-in-out ${
        geistMono.className
      } ${
        state === "expanded"
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 md:grid-cols-3 w-[93vw]"
      } w-[75vw] `}>
      <Card className='col-span-full shadow-md hover:shadow-xl'>
        <CardHeader>
          <CardTitle>Today&apos;s Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Filter Section */}
          <div className='mb-6'>
            <div className='flex gap-4 mb-2'>
              <Input
                type='text'
                placeholder='Search by user...'
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className='max-w-xs'
              />

              <Select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="integrated">Integrated</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters() && (
              <Button
                variant='outline'
                size='sm'
                onClick={clearSearch}
                className='text-muted-foreground hover:text-foreground'>
                Clear filters
                <X className='ml-2 h-4 w-4' />
              </Button>
            )}
          </div>

          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller&apos;s Name</TableHead>
                  <TableHead>Meter Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.user_name}</TableCell>
                    <TableCell>{sale.meter_type}</TableCell>
                    <TableCell>{sale.batch_amount}</TableCell>
                    <TableCell>
                      KES {sale.total_price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(sale.sale_date).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredSales.length > itemsPerPage && (
              <div className='mt-4 flex justify-center'>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          handlePageChange(Math.max(1, currentPage - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {[...Array(totalPages)].map((_, index) => (
                      <PaginationItem key={index + 1}>
                        <PaginationLink
                          onClick={() => handlePageChange(index + 1)}
                          isActive={currentPage === index + 1}>
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          handlePageChange(
                            Math.min(totalPages, currentPage + 1)
                          )
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card
        className={`shadow-md hover:shadow-xl ${
          state === "expanded"
            ? "col-span-full md:col-span-1"
            : "col-span-1 md:col-span-2"
        }`}>
        <CardHeader>
          <CardTitle>Meters Remaining</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meter Type</TableHead>
                <TableHead>Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remainingMetersByType.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.remaining_meters}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className='font-bold'>Total</TableCell>
                <TableCell className='font-bold'>
                  {remainingMetersByType.reduce(
                    (sum, item) => sum + item.remaining_meters,
                    0
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card
        className={`shadow-md hover:shadow-xl ${
          state === "expanded"
            ? "col-span-full md:col-span-1"
            : "col-span-1 md:col-span-1"
        }`}>
        <CardHeader>
          <CardTitle>Today&apos;s Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-4xl font-bold'>
            KES <NumberTicker 
              value={todayTotalEarnings} 
              className="text-4xl font-bold"
            />
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReports;
