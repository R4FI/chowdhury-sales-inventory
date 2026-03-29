import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  Transaction,
  InventoryItem,
  MonthSummary,
  MonthCommission,
} from "@/lib/types";
import * as localStore from "@/lib/store";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(
    localStore.getTransactions(),
  );
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("time", { ascending: false });
    if (!error && data) setTransactions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(
    async (
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

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.from("transactions").insert([newTx]);
        if (error) {
          console.error("Supabase insert error:", error);
          // fallback to local
          localStore.addTransaction(tx);
        }
        await fetchTransactions();
      } else {
        localStore.addTransaction(tx);
        setTransactions(localStore.getTransactions());
      }

      return newTx;
    },
    [fetchTransactions],
  );

  return { transactions, loading, addTransaction, refetch: fetchTransactions };
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>(
    localStore.getInventory(),
  );
  const [loading, setLoading] = useState(false);

  const initializeInventory = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;

    const defaultBrands = [
      {
        brand: "Bashundhara LPG",
        full_bottles: 0,
        empty_bottles: 0,
        total_bottles: 0,
      },
      {
        brand: "Bashundhara LPG 30",
        full_bottles: 0,
        empty_bottles: 0,
        total_bottles: 0,
      },
      {
        brand: "Bashundhara LPG 40",
        full_bottles: 0,
        empty_bottles: 0,
        total_bottles: 0,
      },
      {
        brand: "Navana LPG",
        full_bottles: 0,
        empty_bottles: 0,
        total_bottles: 0,
      },
    ];

    for (const item of defaultBrands) {
      const { data: existing } = await supabase
        .from("inventory")
        .select("brand")
        .eq("brand", item.brand)
        .single();

      if (!existing) {
        await supabase.from("inventory").insert([item]);
      }
    }
  }, []);

  const fetchInventory = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("inventory").select("*");
    if (!error && data) {
      if (data.length === 0) {
        // Initialize if empty
        await initializeInventory();
        // Fetch again
        const { data: newData } = await supabase.from("inventory").select("*");
        if (newData) setInventory(newData);
      } else {
        setInventory(data);
      }
    }
    setLoading(false);
  }, [initializeInventory]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const restockInventory = useCallback(
    async (brand: string, qty: number) => {
      if (isSupabaseConfigured() && supabase) {
        const current = inventory.find((i) => i.brand === brand);
        if (current) {
          // When restocking: add to full bottles, reduce empty bottles (exchange)
          const newFull = current.full_bottles + qty;
          const newEmpty = Math.max(0, current.empty_bottles - qty);
          const newTotal = newFull + newEmpty;

          const { error } = await supabase
            .from("inventory")
            .update({
              full_bottles: newFull,
              empty_bottles: newEmpty,
              total_bottles: newTotal,
            })
            .eq("brand", brand);
          if (error) console.error("Restock error:", error);
          await fetchInventory();
        }
      } else {
        localStore.restockInventory(brand, qty);
        setInventory(localStore.getInventory());
      }
    },
    [inventory, fetchInventory],
  );

  const updateAfterSale = useCallback(
    async (brand: string, qty: number, saleType: "Refill" | "Package") => {
      if (isSupabaseConfigured() && supabase) {
        const current = inventory.find((i) => i.brand === brand);
        if (current) {
          // When selling: reduce full bottles
          const newFull = current.full_bottles - qty;

          // If Refill: customer returns empty, so empty_bottles increases
          // If Package: customer takes cylinder away, total decreases
          let newEmpty = current.empty_bottles;
          let newTotal = current.total_bottles;

          if (saleType === "Refill") {
            newEmpty = current.empty_bottles + qty; // Customer returns empty
            newTotal = newFull + newEmpty; // Total stays same
          } else {
            // Package sale: cylinder goes out, total decreases
            newTotal = newFull + newEmpty; // Total decreases by qty
          }

          const { error } = await supabase
            .from("inventory")
            .update({
              full_bottles: newFull,
              empty_bottles: newEmpty,
              total_bottles: newTotal,
            })
            .eq("brand", brand);
          if (error) console.error("Inventory update error:", error);
          await fetchInventory();
        }
      }
    },
    [inventory, fetchInventory],
  );

  return {
    inventory,
    loading,
    restockInventory,
    updateAfterSale,
    refetch: fetchInventory,
  };
}

export function useMonthSummary() {
  const [month, setMonth] = useState<MonthSummary>(
    localStore.getMonthSummary(),
  );
  const [loading, setLoading] = useState(false);

  const initializeMonthSummary = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;

    const now = new Date();
    const monthId = now
      .toLocaleDateString("en-US", { month: "short", year: "numeric" })
      .toLowerCase()
      .replace(" ", "-");
    const monthLabel = now.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const defaultMonth: Omit<MonthSummary, "month_id" | "month_label"> = {
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

    const { error } = await supabase.from("month_summary").insert([
      {
        month_id: monthId,
        month_label: monthLabel,
        ...defaultMonth,
      },
    ]);

    if (error) console.error("Month summary init error:", error);
  }, []);

  const fetchMonth = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("month_summary")
      .select("*")
      .order("month_id", { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      setMonth(data[0]);
    } else if (!error && data && data.length === 0) {
      // Initialize if empty
      await initializeMonthSummary();
      // Fetch again
      const { data: newData } = await supabase
        .from("month_summary")
        .select("*")
        .order("month_id", { ascending: false })
        .limit(1);
      if (newData && newData.length > 0) setMonth(newData[0]);
    }
    setLoading(false);
  }, [initializeMonthSummary]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  const updateMonthSummary = useCallback(
    async (updates: Partial<MonthSummary>) => {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from("month_summary")
          .update(updates)
          .eq("month_id", month.month_id);
        if (error) console.error("Month summary update error:", error);
        await fetchMonth();
      } else {
        setMonth((prev) => ({ ...prev, ...updates }));
      }
    },
    [month.month_id, fetchMonth],
  );

  return { month, loading, updateMonthSummary, refetch: fetchMonth };
}

export function useMonthCommission(monthId: string) {
  const [commission, setCommission] = useState<MonthCommission | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCommission = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || !monthId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("month_commissions")
      .select("*")
      .eq("month_id", monthId)
      .single();

    if (!error && data) {
      setCommission(data);
    } else if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected when no commission exists
      console.error("Commission fetch error:", error);
    }
    setLoading(false);
  }, [monthId]);

  useEffect(() => {
    fetchCommission();
  }, [fetchCommission]);

  const addOrUpdateCommission = useCallback(
    async (amount: number, note?: string) => {
      if (!isSupabaseConfigured() || !supabase) {
        // Fallback to local storage
        const newCommission: MonthCommission = {
          id: `comm_${Date.now()}`,
          month_id: monthId,
          month_label: monthId,
          commission_amount: amount,
          commission_note: note,
          created_at: new Date().toISOString(),
        };
        setCommission(newCommission);
        return newCommission;
      }

      // Check if commission already exists
      const { data: existing } = await supabase
        .from("month_commissions")
        .select("*")
        .eq("month_id", monthId)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("month_commissions")
          .update({
            commission_amount: amount,
            commission_note: note,
          })
          .eq("month_id", monthId)
          .select()
          .single();

        if (error) {
          console.error("Commission update error:", error);
          return null;
        }
        await fetchCommission();
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("month_commissions")
          .insert([
            {
              month_id: monthId,
              month_label: monthId,
              commission_amount: amount,
              commission_note: note,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Commission insert error:", error);
          return null;
        }
        await fetchCommission();
        return data;
      }
    },
    [monthId, fetchCommission],
  );

  const deleteCommission = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setCommission(null);
      return;
    }

    const { error } = await supabase
      .from("month_commissions")
      .delete()
      .eq("month_id", monthId);

    if (error) {
      console.error("Commission delete error:", error);
    }
    await fetchCommission();
  }, [monthId, fetchCommission]);

  return {
    commission,
    loading,
    addOrUpdateCommission,
    deleteCommission,
    refetch: fetchCommission,
  };
}
