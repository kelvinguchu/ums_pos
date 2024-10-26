'use client';
import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSaleBatches } from '@/lib/actions/supabaseActions';
import localFont from "next/font/local";
import { useSidebar } from "@/components/ui/sidebar";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface SaleBatch {
  id: number;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  sale_date: string;
  destination: string;
  recipient: string;
  total_price: number;
}

export default function MeterSales() {
  const { state } = useSidebar();
  const [saleBatches, setSaleBatches] = useState<SaleBatch[]>([]);

  useEffect(() => {
    async function fetchSaleBatches() {
      try {
        const batches = await getSaleBatches();
        setSaleBatches(batches);
      } catch (error) {
        console.error("Error fetching sale batches:", error);
      }
    }

    fetchSaleBatches();
  }, []);

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(',', ' at');
  };

    return (
      <div className={`${geistMono.className} mx-auto`}>
        <h1 className='text-3xl font-bold mb-6 text-center'>Sales</h1>
        <Card className={`${state === "expanded" ? "w-[75vw] " : "w-[93vw]"} mx-auto`}>
          <CardHeader>
            <CardTitle>Meter Sales</CardTitle>
          </CardHeader>
          <CardContent>
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
                {saleBatches.map((batch) => (
                  <TableRow key={batch.id}>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
}
