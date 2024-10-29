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
  getTopSellingUsers,
  getMostSellingProduct,
  getEarningsByMeterType,
  getRemainingMetersByType,
} from "@/lib/actions/supabaseActions";
import { useSidebar } from "@/components/ui/sidebar";

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

interface TopSeller {
  user_name: string;
  total_sales: number;
}

interface MeterTypeEarnings {
  meter_type: string;
  total_earnings: number;
}

interface RemainingMetersByType {
  type: string;
  remaining_meters: number;
}

const Reports: React.FC = () => {
  const [recentSales, setRecentSales] = useState<SaleBatch[]>([]);
  const [remainingMetersByType, setRemainingMetersByType] = useState<
    RemainingMetersByType[]
  >([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [mostSellingProduct, setMostSellingProduct] = useState<string>("");
  const [earningsByMeterType, setEarningsByMeterType] = useState<
    MeterTypeEarnings[]
  >([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sales = await getSaleBatches();
        setRecentSales(sales.slice(0, 10));

        const topUsers = await getTopSellingUsers();
        setTopSellers(topUsers);

        const topProduct = await getMostSellingProduct();
        setMostSellingProduct(topProduct);

        const earnings = await getEarningsByMeterType();
        setEarningsByMeterType(earnings);

        const total = earnings.reduce(
          (sum, item) => sum + item.total_earnings,
          0
        );
        setTotalEarnings(total);

        const remainingMeters = await getRemainingMetersByType();
        setRemainingMetersByType(remainingMeters);
      } catch (error) {
        console.error("Error fetching data:", error);
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
      className={`grid gap-4 transition-all duration-300 ease-in-out ${
        state === "expanded"
          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 md:grid-cols-3 lg:grid-cols-4"
      } w-full md:w-[75vw] ${state === "expanded" ? "" : "md:w-[93vw]"} px-2 sm:px-4`}>
      <Card className='col-span-full shadow-md hover:shadow-xl'>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-w-[100vw]">
            <div className="min-w-[640px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller&apos;s Name</TableHead>
                    <TableHead>Meter Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.user_name}</TableCell>
                      <TableCell>{sale.meter_type}</TableCell>
                      <TableCell>{sale.batch_amount}</TableCell>
                      <TableCell>KES {sale.total_price.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(sale.sale_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
          <div className="overflow-auto">
            <div className="min-w-[300px]">
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
            </div>
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
          <CardTitle>Top Sellers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <div className="min-w-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellers.map((seller, index) => (
                    <TableRow key={index}>
                      <TableCell>{seller.user_name}</TableCell>
                      <TableCell>
                        KES {seller.total_sales.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-md hover:shadow-xl'>
        <CardHeader>
          <CardTitle>Best Seller</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-2xl font-bold'>{mostSellingProduct}</p>
        </CardContent>
      </Card>

      <Card
        className={`shadow-md hover:shadow-xl ${
          state === "expanded"
            ? "col-span-full md:col-span-1"
            : "col-span-1 md:col-span-2"
        }`}>
        <CardHeader>
          <CardTitle>Earnings by Meter Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <div className="min-w-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter Type</TableHead>
                    <TableHead>Total Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earningsByMeterType.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.meter_type}</TableCell>
                      <TableCell>
                        KES {item.total_earnings.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
          <CardTitle>Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-4xl font-bold'>
            KES {totalEarnings.toLocaleString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
