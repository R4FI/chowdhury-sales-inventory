import { Transaction, InventoryItem, MonthSummary, CompanyInfo } from "./types";

export const companyInfo: CompanyInfo = {
  name: "Chowdhury Enterprise",
  address: "Islampur, Melandah, Jamalpur",
};

// Empty initial data - will be populated from Supabase
const initialTransactions: Transaction[] = [];

const initialInventory: InventoryItem[] = [
  {
    brand: "Bashundhara LPG",
    full_bottles: 0,
    empty_bottles: 0,
    total_bottles: 0,
  },
  { brand: "Navana LPG", full_bottles: 0, empty_bottles: 0, total_bottles: 0 },
];

const initialMonth: MonthSummary = {
  month_id: "feb-2025",
  month_label: "Feb 2025",
  opening_stock: 0,
  total_restocked: 0,
  full_bottles: 0,
  empty_bottles: 0,
  total_bottles: 0,
  gross_revenue: 0,
  total_buying_cost: 0,
  operating_expenses: 0,
  net_profit: 0,
  carry_forward_stock: 0,
  carry_forward_value: 0,
};

// Simple in-memory store (will be replaced with Supabase)
let transactions = [...initialTransactions];
let inventory = [...initialInventory];
let monthSummary = { ...initialMonth };

export const getTransactions = () => transactions;
export const getInventory = () => inventory;
export const getMonthSummary = () => monthSummary;

export const addTransaction = (
  tx: Omit<Transaction, "id" | "revenue" | "profit" | "status" | "time">,
) => {
  const revenue = tx.qty * tx.unit_selling_price;
  const totalCost =
    tx.qty * tx.unit_buying_price + tx.labor_cost + tx.transport_cost;
  const profit = revenue - totalCost;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const newTx: Transaction = {
    ...tx,
    id: `tx_${Date.now()}`,
    revenue,
    profit,
    status: "Completed",
    time,
  };

  transactions = [newTx, ...transactions];

  // Update inventory
  const invIdx = inventory.findIndex((i) => i.brand === tx.product_brand);
  if (invIdx >= 0) {
    const inv = { ...inventory[invIdx] };
    inv.full_bottles -= tx.qty;
    if (tx.sale_type === "Package") {
      // new cylinders go out
    } else {
      inv.empty_bottles += tx.qty;
    }
    inv.total_bottles = inv.full_bottles + inv.empty_bottles;
    inventory = [...inventory];
    inventory[invIdx] = inv;
  }

  // Update month summary
  monthSummary = {
    ...monthSummary,
    gross_revenue: monthSummary.gross_revenue + revenue,
    total_buying_cost: monthSummary.total_buying_cost + totalCost,
    net_profit: monthSummary.net_profit + profit,
    full_bottles: inventory.reduce((s, i) => s + i.full_bottles, 0),
    empty_bottles: inventory.reduce((s, i) => s + i.empty_bottles, 0),
  };

  return newTx;
};

export const restockInventory = (brand: string, qty: number) => {
  const invIdx = inventory.findIndex((i) => i.brand === brand);
  if (invIdx >= 0) {
    const inv = { ...inventory[invIdx] };
    inv.full_bottles += qty;
    inv.empty_bottles = Math.max(0, inv.empty_bottles - qty);
    inv.total_bottles = inv.full_bottles + inv.empty_bottles;
    inventory = [...inventory];
    inventory[invIdx] = inv;
  }

  monthSummary = {
    ...monthSummary,
    total_restocked: monthSummary.total_restocked + qty,
    full_bottles: inventory.reduce((s, i) => s + i.full_bottles, 0),
    empty_bottles: inventory.reduce((s, i) => s + i.empty_bottles, 0),
  };
};
