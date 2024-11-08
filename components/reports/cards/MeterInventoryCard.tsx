import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";
import { getMeterTypeBadgeClass } from "../utils/meterTypeConfig";
import type { RemainingMetersByType, AgentInventory } from "../types";

const METER_TYPES = [
  "integrated",
  "split",
  "gas",
  "water",
  "smart",
  "3 phase",
] as const;

interface MeterInventoryCardProps {
  remainingMetersByType: RemainingMetersByType[];
  agentInventory: AgentInventory[];
  sidebarState: string;
}

export function MeterInventoryCard({
  remainingMetersByType,
  agentInventory,
  sidebarState,
}: MeterInventoryCardProps) {
  // Helper functions
  const getAgentCount = (meterType: string) => {
    const inventory = agentInventory.find(
      (item) => item.type.toLowerCase() === meterType.toLowerCase()
    );
    return inventory?.with_agents || 0;
  };

  const getTotal = (meterType: string, remaining: number) => {
    const withAgents = getAgentCount(meterType);
    return remaining + withAgents;
  };

  return (
    <Card
      className={cn(
        "shadow-md hover:shadow-xl",
        sidebarState === "expanded"
          ? "col-span-full lg:col-span-2"
          : "col-span-full lg:col-span-2"
      )}>
      <CardHeader className='flex flex-row items-center justify-between p-4 md:p-6'>
        <CardTitle className='text-lg md:text-xl'>Meters Remaining</CardTitle>
        <Package className='w-5 h-5 text-[#E46020]' />
      </CardHeader>
      <CardContent className='p-4 md:p-6'>
        {remainingMetersByType.length > 0 ? (
          <div className='overflow-x-auto'>
            {/* Mobile View */}
            <div className='md:hidden space-y-4'>
              {METER_TYPES.map((type, index) => {
                const item = remainingMetersByType.find(
                  (m) => m.type === type
                ) || { type, remaining_meters: 0 };
                return (
                  <div key={index} className='space-y-2'>
                    <div className='flex justify-between items-center font-medium'>
                      <Badge
                        variant='outline'
                        className={cn(
                          "capitalize",
                          getMeterTypeBadgeClass(type)
                        )}>
                        {type}
                      </Badge>
                    </div>
                    <div className='grid grid-cols-3 gap-2 text-sm pl-2'>
                      <div>
                        <p className='text-muted-foreground'>In Stock</p>
                        <p className='font-medium'>{item.remaining_meters}</p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>With Agents</p>
                        <p className='font-medium'>{getAgentCount(type)}</p>
                      </div>
                      <div>
                        <p className='text-muted-foreground'>Total</p>
                        <p className='font-medium'>
                          {getTotal(type, item.remaining_meters)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className='flex justify-between items-center pt-4 border-t'>
                <Badge variant='outline' className='bg-gray-100'>
                  Total
                </Badge>
                <div className='grid grid-cols-3 gap-4 text-sm font-bold'>
                  <span>
                    {remainingMetersByType.reduce(
                      (sum, item) => sum + item.remaining_meters,
                      0
                    )}
                  </span>
                  <span>
                    {agentInventory.reduce(
                      (sum, item) => sum + item.with_agents,
                      0
                    )}
                  </span>
                  <span>
                    {remainingMetersByType.reduce(
                      (sum, item) =>
                        sum + getTotal(item.type, item.remaining_meters),
                      0
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop View */}
            <div className='hidden md:block'>
              <Table>
                <TableHeader>
                  <TableRow className='bg-gray-50'>
                    <TableHead className='font-semibold'>Meter Type</TableHead>
                    <TableHead className='font-semibold text-right'>
                      In Stock
                    </TableHead>
                    <TableHead className='font-semibold text-right'>
                      With Agents
                    </TableHead>
                    <TableHead className='font-semibold text-right'>
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {METER_TYPES.map((type, index) => {
                    const item = remainingMetersByType.find(
                      (m) => m.type === type
                    ) || { type, remaining_meters: 0 };
                    return (
                      <TableRow key={index} className='hover:bg-gray-50'>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={cn(
                              "capitalize",
                              getMeterTypeBadgeClass(item.type)
                            )}>
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right'>
                          {item.remaining_meters}
                        </TableCell>
                        <TableCell className='text-right'>
                          {getAgentCount(type)}
                        </TableCell>
                        <TableCell className='text-right'>
                          {getTotal(type, item.remaining_meters)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className='bg-gray-50'>
                    <TableCell>
                      <Badge variant='outline' className='bg-gray-100'>
                        Total
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right font-bold'>
                      {remainingMetersByType.reduce(
                        (sum, item) => sum + item.remaining_meters,
                        0
                      )}
                    </TableCell>
                    <TableCell className='text-right font-bold'>
                      {agentInventory.reduce(
                        (sum, item) => sum + item.with_agents,
                        0
                      )}
                    </TableCell>
                    <TableCell className='text-right font-bold'>
                      {remainingMetersByType.reduce(
                        (sum, item) =>
                          sum + getTotal(item.type, item.remaining_meters),
                        0
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <EmptyState icon={Package} message='No meters in inventory' />
        )}
      </CardContent>
    </Card>
  );
}
