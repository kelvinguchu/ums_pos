import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PackageOpen } from "lucide-react";
import NumberTicker from "@/components/ui/number-ticker";
import type { RemainingMetersByType } from '@/types';

interface SummaryProps {
  totalEarnings: number;
  remainingMetersByType: RemainingMetersByType[];
  sidebarState: string;
}

export const DailyReportsSummary = memo(function DailyReportsSummary({
  totalEarnings,
  remainingMetersByType,
  sidebarState
}: SummaryProps) {
  return (
    <>
      <Card
        className={`shadow-md hover:shadow-xl ${
          sidebarState === "expanded"
            ? "col-span-full md:col-span-1"
            : "col-span-1 md:col-span-2"
        }`}>
        <CardHeader>
          <CardTitle>Meters Remaining</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <div className="min-w-[300px] sm:min-w-0">
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
          sidebarState === "expanded"
            ? "col-span-full md:col-span-1"
            : "col-span-1"
        }`}>
        <CardHeader>
          <CardTitle>Today's Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {totalEarnings > 0 ? (
            <p className='text-2xl sm:text-4xl font-bold'>
              KES <NumberTicker 
                value={totalEarnings} 
                className="text-2xl sm:text-4xl font-bold"
              />
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <PackageOpen className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">Empty Coffers</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}); 