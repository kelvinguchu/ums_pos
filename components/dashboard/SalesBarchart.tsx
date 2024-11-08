"use client";

import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getSaleBatches } from "@/lib/actions/supabaseActions";
import NumberTicker from "@/components/ui/number-ticker";
import { TrendingDown, BarChart as ChartIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface UserSaleData {
  [user: string]: number;
}

interface MeterTypeData {
  [meterType: string]: UserSaleData;
}

interface ChartData {
  date: string;
  [key: string]: number | string | MeterTypeData;
  userSales: MeterTypeData;
}

const chartConfig = {
  integrated: {
    label: "Integrated",
    gradientId: "integratedGradient",
    colors: ["#4F46E5", "#818CF8"], // Indigo gradient
  },
  split: {
    label: "Split",
    gradientId: "splitGradient",
    colors: ["#0EA5E9", "#38BDF8"], // Sky blue gradient
  },
  gas: {
    label: "Gas",
    gradientId: "gasGradient",
    colors: ["#059669", "#34D399"], // Emerald gradient
  },
  water: {
    label: "Water",
    gradientId: "waterGradient",
    colors: ["#2563EB", "#60A5FA"], // Blue gradient
  },
  smart: {
    label: "Smart",
    gradientId: "smartGradient",
    colors: ["#7C3AED", "#A78BFA"], // Violet gradient
  },
  "3 phase": {
    label: "3_Phase",
    gradientId: "threePhaseGradient",
    colors: ["#DC2626", "#F87171"], // Red gradient
  },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const userSales: UserSaleData =
      (payload[0].payload.userSales as MeterTypeData)[payload[0].dataKey] || {};
    return (
      <div className='custom-tooltip bg-white p-3 lg:p-4 border rounded shadow max-w-[250px] lg:max-w-none'>
        <p className='label text-sm lg:text-base font-bold'>{`Date: ${new Date(
          label
        ).toLocaleDateString()}`}</p>
        <p className='total text-sm lg:text-base font-semibold'>{`Total: ${payload[0].value} meters`}</p>
        <p className='meter-type text-sm lg:text-base'>{`Type: ${payload[0].dataKey}`}</p>
        <div className='user-breakdown mt-2'>
          <p className='text-sm lg:text-base font-semibold'>Seller(s)</p>
          {Object.entries(userSales).map(([user, amount]) => (
            <p
              key={user}
              className='text-sm lg:text-base'>{`${user}: ${amount} meters`}</p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const EmptyState = () => (
  <div className='flex flex-col items-center justify-center h-full p-8 text-gray-500'>
    <div className='relative'>
      <ChartIcon className='w-16 h-16 mb-4 text-gray-300' />
      <TrendingDown className='w-8 h-8 text-gray-400 absolute -bottom-2 -right-2 animate-bounce' />
    </div>
    <div className='text-center space-y-2'>
      <p className='text-lg font-semibold text-gray-600'>No Sales Data Yet</p>
      <p className='text-sm text-gray-400 flex items-center gap-2'>
        Sales will appear here
        <ArrowRight className='w-4 h-4' />
        Beautiful charts incoming!
      </p>
    </div>
  </div>
);

export function SalesBarchart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [activeChart, setActiveChart] =
    useState<keyof typeof chartConfig>("integrated");

  useEffect(() => {
    async function fetchAndProcessData() {
      try {
        const batches: SaleBatch[] = await getSaleBatches();
        const processedData: { [key: string]: ChartData } = {};

        batches.forEach((batch) => {
          const date = new Date(batch.sale_date).toISOString().split("T")[0];
          if (!processedData[date]) {
            processedData[date] = { date, userSales: {} };
            Object.keys(chartConfig).forEach((key) => {
              processedData[date][key] = 0;
              processedData[date].userSales[key] = {};
            });
          }

          const meterType = batch.meter_type.toLowerCase().trim();
          const chartKey = Object.keys(chartConfig).find(
            (key) => key.toLowerCase() === meterType
          );

          if (chartKey) {
            processedData[date][chartKey] =
              (processedData[date][chartKey] as number) + batch.batch_amount;

            if (!processedData[date].userSales[chartKey][batch.user_name]) {
              processedData[date].userSales[chartKey][batch.user_name] = 0;
            }
            processedData[date].userSales[chartKey][batch.user_name] +=
              batch.batch_amount;
          }
        });

        setChartData(Object.values(processedData));
      } catch (error) {
        console.error("Error fetching and processing sale batches:", error);
      }
    }

    fetchAndProcessData();
  }, []);

  const total = React.useMemo(
    () =>
      Object.keys(chartConfig).reduce((acc, key) => {
        acc[key as keyof typeof chartConfig] = chartData.reduce(
          (sum, day) => sum + ((day[key] as number) || 0),
          0
        );
        return acc;
      }, {} as Record<keyof typeof chartConfig, number>),
    [chartData]
  );

  const renderGradients = () => (
    <defs>
      {Object.entries(chartConfig).map(([key, config]) => (
        <linearGradient
          key={config.gradientId}
          id={config.gradientId}
          x1='0'
          y1='0'
          x2='0'
          y2='1'>
          <stop offset='5%' stopColor={config.colors[0]} stopOpacity={0.9} />
          <stop offset='95%' stopColor={config.colors[1]} stopOpacity={0.9} />
        </linearGradient>
      ))}
    </defs>
  );

  return (
    <Card className={cn(
      'h-auto lg:h-[500px] mt-16 lg:mt-0 w-full transition-all duration-200 ease-linear',
      'relative overflow-hidden'
    )}>
      <CardHeader className='flex flex-col items-stretch space-y-4 border-b p-4 lg:p-0 lg:space-y-0 lg:flex-row'>
        <div className='flex flex-1 flex-col justify-center gap-1 lg:px-6 lg:py-6'>
          <CardTitle>Meter Sales Chart</CardTitle>
          <CardDescription>Showing total meter sales by type</CardDescription>
        </div>
        <div className='grid grid-cols-2 lg:flex lg:flex-wrap'>
          {Object.entries(chartConfig).map(([key, config]) => (
            <button
              key={key}
              data-active={activeChart === key}
              className='relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left 
                even:border-l data-[active=true]:bg-muted/50 
                lg:px-8 lg:py-6 
                lg:border-t-0 lg:border-l'
              onClick={() => setActiveChart(key as keyof typeof chartConfig)}>
              <span className='text-xs text-muted-foreground'>
                {config.label}
              </span>
              {total[key as keyof typeof chartConfig] > 0 ? (
                <span className='text-base font-bold leading-none lg:text-3xl'>
                  <NumberTicker
                    value={total[key as keyof typeof chartConfig]}
                    className='text-base font-bold leading-none lg:text-3xl'
                  />
                </span>
              ) : (
                <span className='text-base font-bold leading-none lg:text-3xl text-gray-400'>
                  --
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className='p-2 h-[350px] lg:h-[400px] lg:p-6'>
        {chartData.length > 0 ? (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              {renderGradients()}
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='date'
                tickFormatter={(value) => {
                  const date = new Date(value);
                  // On mobile, show only day number
                  if (window.innerWidth < 768) {
                    return date.getDate().toString();
                  }
                  // On desktop, show month and day
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
                tick={{ fontSize: window.innerWidth < 768 ? 12 : 14 }}
              />
              <YAxis
                tick={{ fontSize: window.innerWidth < 768 ? 12 : 14 }}
                width={window.innerWidth < 768 ? 30 : 40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize: window.innerWidth < 768 ? "12px" : "14px",
                  marginTop: "10px",
                }}
              />
              <Bar
                dataKey={activeChart}
                fill={`url(#${chartConfig[activeChart].gradientId})`}
                maxBarSize={window.innerWidth < 768 ? 30 : 50}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}
