export interface Transaction {
  id: string;
  date: string;
  product_brand: string;
  sale_type: "Refill" | "Package";
  qty: number;
  unit_buying_price: number;
  unit_selling_price: number;
  labor_cost: number;
  transport_cost: number;
  revenue: number;
  profit: number;
  status: "Completed" | "Pending";
  time: string;
}

export interface InventoryItem {
  brand: string;
  full_bottles: number;
  empty_bottles: number;
  total_bottles: number;
}

export interface MonthSummary {
  month_id: string;
  month_label: string;
  opening_stock: number;
  total_restocked: number;
  full_bottles: number;
  empty_bottles: number;
  total_bottles: number;
  gross_revenue: number;
  total_buying_cost: number;
  operating_expenses: number;
  net_profit: number;
  carry_forward_stock: number;
  carry_forward_value: number;
}

export interface CompanyInfo {
  name: string;
  address: string;
}

export interface MonthCommission {
  id?: string;
  month_id: string;
  month_label: string;
  commission_amount: number;
  commission_note?: string;
  created_at?: string;
}
