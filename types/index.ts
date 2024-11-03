export interface SaleBatch {
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