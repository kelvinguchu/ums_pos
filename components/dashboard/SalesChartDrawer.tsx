"use client";

import React from "react";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
  DrawerFooter,
} from "../ui/drawer";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";

const chartData = [
  { day: "Monday", product1: 150, product2: 200, product3: 180, product4: 220 },
  {
    day: "Tuesday",
    product1: 180,
    product2: 230,
    product3: 190,
    product4: 250,
  },
  {
    day: "Wednesday",
    product1: 200,
    product2: 250,
    product3: 220,
    product4: 280,
  },
  {
    day: "Thursday",
    product1: 220,
    product2: 280,
    product3: 250,
    product4: 300,
  },
  { day: "Friday", product1: 250, product2: 300, product3: 270, product4: 320 },
  {
    day: "Saturday",
    product1: 280,
    product2: 320,
    product3: 290,
    product4: 350,
  },
  { day: "Sunday", product1: 210, product2: 270, product3: 230, product4: 290 },
];

const chartConfig: ChartConfig = {
  product1: {
    label: "Product 1",
    color: "#FF6B6B", // vibrant red
  },
  product2: {
    label: "Product 2",
    color: "#4ECDC4", // vibrant teal
  },
  product3: {
    label: "Product 3",
    color: "#45B7D1", // vibrant blue
  },
  product4: {
    label: "Product 4",
    color: "#96CEB4", // vibrant green
  },
} as const;

const SalesChartDrawer: React.FC = () => {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant='outline'>View Sales Chart</Button>
      </DrawerTrigger>
      <DrawerContent className='h-[90vh]'>
        <div className='mx-auto w-full max-w-sm'>
          <DrawerHeader>
            <DrawerTitle>Weekly Sales Chart</DrawerTitle>
            <DrawerDescription>
              Showing sales for 4 products over the last week
            </DrawerDescription>
          </DrawerHeader>
          <div className='p-4 pb-0 h-[70%]'>
            <ChartContainer config={chartConfig}>
              <div className='h-[190px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart
                    data={chartData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis
                      dataKey='day'
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <defs>
                      {(
                        Object.keys(chartConfig) as Array<
                          keyof typeof chartConfig
                        >
                      ).map((key) => (
                        <linearGradient
                          key={key}
                          id={`fill${key}`}
                          x1='0'
                          y1='0'
                          x2='0'
                          y2='1'>
                          <stop
                            offset='5%'
                            stopColor={chartConfig[key].color}
                            stopOpacity={0.8}
                          />
                          <stop
                            offset='95%'
                            stopColor={chartConfig[key].color}
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    {(
                      Object.keys(chartConfig) as Array<
                        keyof typeof chartConfig
                      >
                    ).map((key) => (
                      <Area
                        key={key}
                        type='monotone'
                        dataKey={key}
                        stroke={chartConfig[key].color}
                        fillOpacity={1}
                        fill={`url(#fill${key})`}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartContainer>
            <div className='mt-4 flex items-center gap-2 text-sm text-emerald-500'>
              <TrendingUp className='h-4 w-4' />
              <span>Overall sales trending up by 8.3% this week</span>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant='outline'>Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SalesChartDrawer;
