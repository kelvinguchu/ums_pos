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