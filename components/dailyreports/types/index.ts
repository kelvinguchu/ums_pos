export interface SaleBatch {
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
}

export interface FiltersProps {
  searchUser: string;
  selectedType: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export interface RemainingMetersByType {
  type: string;
  remaining_meters: number;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: string | number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface MeterCount {
  type: string;
  count: number;
}

export interface DailyReportPDFProps {
  todaySales: SaleBatch[];
  yesterdaySales: SaleBatch[];
  remainingMetersByType: RemainingMetersByType[];
  todayTotalEarnings: number;
  yesterdayTotalEarnings: number;
  agentInventory: AgentInventory[];
}

export interface TimeRangeReportPDFProps {
  sales: SaleBatch[];
  dateRange: DateRange;
  metrics: ReportMetrics;
  remainingMetersByType: RemainingMetersByType[];
  agentInventory: AgentInventory[];
}

export interface ReportMetrics {
  totalSales: number;
  averageDailySales: number;
  totalMeters: number;
  metersByType: { [key: string]: number };
}

export interface AgentInventory {
  type: string;
  with_agents: number;
} 