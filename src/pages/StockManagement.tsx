import { useState, useEffect, useMemo } from "react";
import {
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Calendar as CalendarIcon,
  CheckCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventory, useTransactions } from "@/hooks/useSupabaseStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { MonthSummary } from "@/lib/types";

const StockManagement = () => {
  const [restockBrand, setRestockBrand] = useState("Bashundhara LPG");
  const [restockQty, setRestockQty] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [openingStock, setOpeningStock] = useState(0);
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState("");

  const { inventory, restockInventory } = useInventory();
  const { transactions } = useTransactions();

  // Fetch all months from month_summary table
  const fetchAllMonths = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    const { data } = await supabase
      .from("month_summary")
      .select("month_id")
      .order("month_id", { ascending: false });
    if (data) {
      setAllMonths(data.map((m) => m.month_id));
    }
  };

  useEffect(() => {
    fetchAllMonths();
  }, []);

  // Set default to latest month
  useEffect(() => {
    if (allMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(allMonths[0]);
    }
  }, [allMonths, selectedMonth]);

  // Fetch month data
  useEffect(() => {
    const fetchMonthData = async () => {
      if (!selectedMonth || !isSupabaseConfigured() || !supabase) return;

      const { data, error } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", selectedMonth)
        .single();

      if (!error && data) {
        setMonthData(data);
        setOpeningStock(data.opening_stock);
      } else {
        setMonthData(null);
        setOpeningStock(0);
      }
    };

    fetchMonthData();
  }, [selectedMonth]);

  // Calculate sold for selected month
  const soldThisMonth = useMemo(() => {
    return transactions
      .filter((tx) => {
        const date = new Date(tx.date);
        const txMonth = format(date, "MMM-yyyy").toLowerCase();
        return txMonth === selectedMonth;
      })
      .reduce((sum, tx) => sum + tx.qty, 0);
  }, [transactions, selectedMonth]);

  const handleAddNewMonth = async () => {
    if (!newMonthInput || !isSupabaseConfigured() || !supabase) return;

    // Parse input like "April 2025" or "apr-2025"
    let monthId = newMonthInput.toLowerCase().trim();
    let monthLabel = newMonthInput;

    // If user enters "April 2025", convert to "apr-2025"
    if (monthId.includes(" ")) {
      const parts = monthId.split(" ");
      const monthName = parts[0].substring(0, 3);
      const year = parts[1];
      monthId = `${monthName}-${year}`;
      monthLabel = `${parts[0]} ${year}`;
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from("month_summary")
      .select("month_id")
      .eq("month_id", monthId)
      .single();

    if (existing) {
      toast.error("Month already exists");
      return;
    }

    // Get previous month's carry forward
    const { data: allData } = await supabase
      .from("month_summary")
      .select("*")
      .order("month_id", { ascending: false });

    const previousMonthCarryForward =
      allData && allData.length > 0 ? allData[0].carry_forward_stock : 0;

    const newMonth = {
      month_id: monthId,
      month_label: monthLabel,
      opening_stock: previousMonthCarryForward,
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

    const { error } = await supabase
      .from("month_summary")
      .insert([newMonth])
      .select()
      .single();

    if (error) {
      console.error("Failed to create month:", error);
      toast.error("Failed to create month");
    } else {
      toast.success(
        `Created ${monthLabel} with opening stock: ${previousMonthCarryForward}`,
      );
      setNewMonthInput("");
      setShowAddMonth(false);
      await fetchAllMonths();
      setSelectedMonth(monthId);
    }
  };

  const handleRestock = async () => {
    if (restockQty <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (!monthData) {
      toast.error("Please select a valid month");
      return;
    }

    // Update inventory
    await restockInventory(restockBrand, restockQty);

    // Update month_summary
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from("month_summary")
        .update({
          total_restocked: monthData.total_restocked + restockQty,
        })
        .eq("month_id", selectedMonth);

      if (error) {
        console.error("Failed to update month summary:", error);
        toast.error("Failed to update month summary");
      } else {
        toast.success(`${restockQty} units restocked for ${restockBrand}`);
        // Refresh month data
        const { data } = await supabase
          .from("month_summary")
          .select("*")
          .eq("month_id", selectedMonth)
          .single();
        if (data) setMonthData(data);
      }
    }

    setRestockQty(0);
  };

  const handleUpdateOpeningStock = async () => {
    if (!monthData || !isSupabaseConfigured() || !supabase) return;

    const { error } = await supabase
      .from("month_summary")
      .update({ opening_stock: openingStock })
      .eq("month_id", selectedMonth);

    if (error) {
      toast.error("Failed to update opening stock");
    } else {
      toast.success("Opening stock updated");
      const { data } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", selectedMonth)
        .single();
      if (data) setMonthData(data);
    }
  };

  const handleCloseMonth = async () => {
    if (!monthData || !isSupabaseConfigured() || !supabase) return;

    const remaining =
      monthData.opening_stock + monthData.total_restocked - soldThisMonth;

    const { error } = await supabase
      .from("month_summary")
      .update({
        carry_forward_stock: remaining,
      })
      .eq("month_id", selectedMonth);

    if (error) {
      toast.error("Failed to close month");
    } else {
      toast.success(`Month closed. Carry forward: ${remaining} units`);
      const { data } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", selectedMonth)
        .single();
      if (data) setMonthData(data);
    }
  };

  const remaining = monthData
    ? monthData.opening_stock + monthData.total_restocked - soldThisMonth
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Stock Management</h2>
        <p className="text-sm text-muted-foreground">
          Month-wise inventory tracking & restock operations
        </p>
      </div>

      {/* Month Selector */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              SELECT MONTH TO MANAGE
            </label>
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Choose month" />
                </SelectTrigger>
                <SelectContent>
                  {allMonths.map((m) => {
                    // Parse month_id like "feb-2025" to display "February 2025"
                    const [monthStr, year] = m.split("-");
                    const monthNames: Record<string, string> = {
                      jan: "January",
                      feb: "February",
                      mar: "March",
                      apr: "April",
                      may: "May",
                      jun: "June",
                      jul: "July",
                      aug: "August",
                      sep: "September",
                      oct: "October",
                      nov: "November",
                      dec: "December",
                    };
                    const displayName = `${monthNames[monthStr] || monthStr} ${year}`;
                    return (
                      <SelectItem key={m} value={m}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowAddMonth(!showAddMonth)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                ADD MONTH
              </Button>
            </div>
          </div>
        </div>

        {/* Add New Month Form */}
        {showAddMonth && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
            <Label className="text-xs">
              ENTER MONTH (e.g., "April 2025" or "apr-2025")
            </Label>
            <div className="flex gap-2">
              <Input
                value={newMonthInput}
                onChange={(e) => setNewMonthInput(e.target.value)}
                placeholder="April 2025"
              />
              <Button onClick={handleAddNewMonth} size="sm">
                CREATE
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Opening stock will be set from previous month's carry forward
            </p>
          </div>
        )}
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">OPENING STOCK</span>
          </div>
          <p className="text-3xl font-bold font-mono text-blue-500">
            {monthData?.opening_stock || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Start of month</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">RESTOCKED</span>
          </div>
          <p className="text-3xl font-bold font-mono text-success">
            {monthData?.total_restocked || 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Added this month</p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">SOLD</span>
          </div>
          <p className="text-3xl font-bold font-mono text-warning">
            {soldThisMonth}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            From transactions
          </p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">REMAINING</span>
          </div>
          <p className="text-3xl font-bold font-mono text-primary">
            {remaining}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Available stock</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Current Inventory Status */}
          <div className="bg-card rounded-xl border p-5">
            <h3 className="font-bold mb-4">CURRENT INVENTORY STATUS</h3>
            <div className="space-y-4">
              {inventory.map((inv) => {
                const fillPct =
                  inv.total_bottles > 0
                    ? Math.round((inv.full_bottles / inv.total_bottles) * 100)
                    : 0;
                return (
                  <div key={inv.brand}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{inv.brand}</h4>
                      <span className="text-xs font-mono text-muted-foreground">
                        {fillPct}% filled
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Full</p>
                        <p className="text-xl font-bold font-mono text-primary">
                          {inv.full_bottles}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Empty</p>
                        <p className="text-xl font-bold font-mono text-warning">
                          {inv.empty_bottles}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-xl font-bold font-mono">
                          {inv.total_bottles}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Set Opening Stock */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="font-bold text-sm">SET OPENING STOCK</span>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  OPENING STOCK FOR {monthData?.month_label || ""}
                </Label>
                <Input
                  type="number"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(Number(e.target.value))}
                  min={0}
                  placeholder="Enter opening stock"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Stock at start of month
                </p>
              </div>
              <Button
                onClick={handleUpdateOpeningStock}
                className="w-full gap-2"
                size="sm"
              >
                <CheckCircle className="h-4 w-4" />
                UPDATE OPENING STOCK
              </Button>
            </div>
          </div>

          {/* Restock Operation */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm">
                RESTOCK FOR {monthData?.month_label || ""}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  BRAND
                </Label>
                <Select value={restockBrand} onValueChange={setRestockBrand}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bashundhara LPG">
                      Bashundhara LPG
                    </SelectItem>
                    <SelectItem value="Navana LPG">Navana LPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  QUANTITY TO ADD
                </Label>
                <Input
                  type="number"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  min={0}
                  placeholder="Enter quantity"
                />
              </div>
              <Button onClick={handleRestock} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                ADD RESTOCK
              </Button>
              <p className="text-xs text-muted-foreground">
                Current restocked: {monthData?.total_restocked || 0}
              </p>
            </div>
          </div>

          {/* Close Month */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-bold text-sm">CLOSE MONTH</span>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 rounded p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Opening:</span>
                  <span className="font-mono">
                    {monthData?.opening_stock || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Restocked:</span>
                  <span className="font-mono">
                    +{monthData?.total_restocked || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sold:</span>
                  <span className="font-mono">-{soldThisMonth}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Carry Forward:</span>
                  <span className="font-mono text-primary">{remaining}</span>
                </div>
              </div>
              <Button
                onClick={handleCloseMonth}
                className="w-full gap-2"
                variant="default"
              >
                <CheckCircle className="h-4 w-4" />
                CLOSE & CARRY FORWARD
              </Button>
              <p className="text-xs text-muted-foreground">
                Finalizes month and sets carry forward
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockManagement;
