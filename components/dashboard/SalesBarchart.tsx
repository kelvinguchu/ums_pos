"use client"

import React, { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { getSaleBatches } from '@/lib/actions/supabaseActions'


interface SaleBatch {
  id: number
  user_name: string
  meter_type: string
  batch_amount: number
  sale_date: string
  destination: string
  recipient: string
  total_price: number
}

interface UserSaleData {
  [user: string]: number
}

interface MeterTypeData {
  [meterType: string]: UserSaleData
}

interface ChartData {
  date: string
  [key: string]: number | string | MeterTypeData
  userSales: MeterTypeData
}

const chartConfig = {
  integrated: {
    label: "Integrated",
    color: "hsl(var(--chart-1))",
  },
  split: {
    label: "Split",
    color: "hsl(var(--chart-2))",
  },
  gas: {
    label: "Gas",
    color: "hsl(var(--chart-3))",
  },
  water: {
    label: "Water",
    color: "hsl(var(--chart-4))",
  },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const userSales: UserSaleData = (payload[0].payload.userSales as MeterTypeData)[payload[0].dataKey] || {}
    return (
      <div className="custom-tooltip bg-white p-4 border rounded shadow">
        <p className="label font-bold">{`Date: ${label}`}</p>
        <p className="total font-semibold">{`Total: ${payload[0].value} meters`}</p>
        <p className="meter-type">{`Meter Type: ${payload[0].dataKey}`}</p>
        <div className="user-breakdown mt-2">
          <p className="font-semibold">Seller(s)</p>
          {Object.entries(userSales).map(([user, amount]) => (
            <p key={user}>{`${user}: ${amount} meters`}</p>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function SalesBarchart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>("integrated")

  useEffect(() => {
    async function fetchAndProcessData() {
      try {
        const batches: SaleBatch[] = await getSaleBatches()
        const processedData: { [key: string]: ChartData } = {}

        batches.forEach((batch) => {
          const date = new Date(batch.sale_date).toISOString().split('T')[0]
          if (!processedData[date]) {
            processedData[date] = { date, userSales: {} }
            Object.keys(chartConfig).forEach(key => {
              processedData[date][key] = 0
              processedData[date].userSales[key] = {}
            })
          }
          
          const meterType = batch.meter_type.toLowerCase() as keyof typeof chartConfig
          processedData[date][meterType] = (processedData[date][meterType] as number) + batch.batch_amount

          if (!processedData[date].userSales[meterType][batch.user_name]) {
            processedData[date].userSales[meterType][batch.user_name] = 0
          }
          processedData[date].userSales[meterType][batch.user_name] += batch.batch_amount
        })

        setChartData(Object.values(processedData))
      } catch (error) {
        console.error("Error fetching and processing sale batches:", error)
      }
    }

    fetchAndProcessData()
  }, [])

  const total = React.useMemo(
    () => Object.keys(chartConfig).reduce((acc, key) => {
      acc[key as keyof typeof chartConfig] = chartData.reduce((sum, day) => sum + ((day[key] as number) || 0), 0)
      return acc
    }, {} as Record<keyof typeof chartConfig, number>),
    [chartData]
  )

  return (
    <Card className=" h-[500px]">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Meter Sales Chart</CardTitle>
          <CardDescription>
            Showing total meter sales by type
          </CardDescription>
        </div>
        <div className="flex flex-wrap">
          {Object.entries(chartConfig).map(([key, config]) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key as keyof typeof chartConfig)}
            >
              <span className="text-xs text-muted-foreground">
                {config.label}
              </span>
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {total[key as keyof typeof chartConfig].toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey={activeChart}
              fill={chartConfig[activeChart].color}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
