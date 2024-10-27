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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sales = await getSaleBatches();
        
        // Filter sales for today only
        const today = new Date().toISOString().split('T')[0];
        const todaysSales = sales.filter(sale => 
          sale.sale_date.startsWith(today)
        );
        
        setTodaySales(todaysSales);

        // Calculate today's total earnings
        const total = todaysSales.reduce(
          (sum, sale) => sum + sale.total_price,
          0
        );
        setTodayTotalEarnings(total);

        const remainingMeters = await getRemainingMetersByType();
        setRemainingMetersByType(remainingMeters);

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const { state } = useSidebar();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

  return (
    <div
      className={`grid gap-4 transition-all duration-300 ease-in-out ${geistMono.className} ${
        state === "expanded"
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 md:grid-cols-3 w-[93vw]"
      } w-[75vw] `}>
      <Card className='col-span-full shadow-md hover:shadow-xl'>
        <CardHeader>
          <CardTitle>Today&apos;s Sales</CardTitle>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
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
              {todaySales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>{sale.user_name}</TableCell>
                  <TableCell>{sale.meter_type}</TableCell>
                  <TableCell>{sale.batch_amount}</TableCell>
                  <TableCell>KES {sale.total_price.toLocaleString()}</TableCell>
                  <TableCell>{new Date(sale.sale_date).toLocaleTimeString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            KES {todayTotalEarnings.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyReports;

