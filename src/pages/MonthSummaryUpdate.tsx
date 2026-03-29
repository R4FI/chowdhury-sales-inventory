import { useState, useEffect, useMemo } from "react";
import { Save, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTransactions } from "@/hooks/useSupabaseStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { MonthSummary } from "@/lib/types";

const MonthSummaryUpdate = () => {
  const { transactions } = useTransactions();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    gross_revenue: 0,
    total_buying_cost: 0,
    operating_expenses: 0,
    net_profit: 0,
  });

  // Get unique months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((tx) => {
      const date = new Date(tx.date);
      const monthKey = format(date, "MMM-yyyy").toLowerCase();
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Set default month
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Fetch month data when month changes
  useEffect(() => {
    const fetchMonthData = async () => {
      if (!selectedMonth || !isSupabaseConfigured() || !supabase) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", selectedMonth)
        .single();

      if (!error && data) {
        setMonthData(data);
        setFormData({
          gross_revenue: data.gross_revenue,
          total_buying_cost: data.total_buying_cost,
          operating_expenses: data.operating_expenses,
          net_profit: data.net_profit,
        });
      } else if (error && error.code === "PGRST116") {
        // Month doesn't exist, create it
        const monthLabel = format(new Date(selectedMonth), "MMM yyyy");
        const newMonth = {
          month_id: selectedMonth,
          month_label: monthLabel,
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

        const { data: created } = await supabase
          .from("month_summary")
          .insert([newMonth])
          .select()
          .single();

        if (created) {
          setMonthData(created);
          setFormData({
            gross_revenue: 0,
            total_buying_cost: 0,
            operating_expenses: 0,
            net_profit: 0,
          });
        }
      }
      setLoading(false);
    };

    fetchMonthData();
  }, [selectedMonth]);

  const handleChange = (field: string, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedMonth || !isSupabaseConfigured() || !supabase) return;

    const calculatedNetProfit =
      formData.gross_revenue -
      formData.total_buying_cost -
      formData.operating_expenses;

    const updates = {
      ...formData,
      net_profit: calculatedNetProfit,
    };

    const { error } = await supabase
      .from("month_summary")
      .update(updates)
      .eq("month_id", selectedMonth);

    if (!error) {
      toast.success("Month summary updated successfully");
      // Refresh data
      const { data } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", selectedMonth)
        .single();
      if (data) setMonthData(data);
    } else {
      toast.error("Failed to update month summary");
      console.error(error);
    }
  };

  const calculatedNetProfit =
    formData.gross_revenue -
    formData.total_buying_cost -
    formData.operating_expenses;

  if (!monthData && loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Update Month Summary</h2>
          <p className="text-sm text-muted-foreground">
            Manually update monthly financial data
          </p>
        </div>
        <Badge variant={isSupabaseConfigured() ? "default" : "secondary"}>
          {isSupabaseConfigured()
            ? "Supabase (Persistent)"
            : "Local Memory (Temporary)"}
        </Badge>
      </div>

      {/* Month Selector */}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">
              SELECT MONTH
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {format(new Date(m), "MMMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Save className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">
              UPDATE FINANCIAL DATA - {monthData ? monthData.month_label : ""}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="section-label text-[10px] mb-1.5 block">
                GROSS REVENUE (TK)
              </Label>
              <Input
                type="number"
                value={formData.gross_revenue}
                onChange={(e) =>
                  handleChange("gross_revenue", Number(e.target.value))
                }
                min={0}
                step={0.01}
              />
            </div>

            <div>
              <Label className="section-label text-[10px] mb-1.5 block">
                TOTAL BUYING COST (TK)
              </Label>
              <Input
                type="number"
                value={formData.total_buying_cost}
                onChange={(e) =>
                  handleChange("total_buying_cost", Number(e.target.value))
                }
                min={0}
                step={0.01}
              />
            </div>

            <div>
              <Label className="section-label text-[10px] mb-1.5 block">
                OPERATING EXPENSES (TK)
              </Label>
              <Input
                type="number"
                value={formData.operating_expenses}
                onChange={(e) =>
                  handleChange("operating_expenses", Number(e.target.value))
                }
                min={0}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Labor, transport, and other operational costs
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <Label className="section-label text-[10px] mb-2 block">
                CALCULATED NET PROFIT
              </Label>
              <p className="text-2xl font-bold font-mono text-success">
                TK {calculatedNetProfit.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Revenue - Buying Cost - Expenses
              </p>
            </div>

            <Button onClick={handleSave} className="w-full gap-2 h-11">
              <Save className="h-4 w-4" />
              UPDATE MONTH SUMMARY
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-bold mb-4">CURRENT VALUES</h3>
            {monthData ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Month</span>
                  <span className="font-semibold">{monthData.month_label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Revenue</span>
                  <span className="font-mono font-semibold">
                    TK {monthData.gross_revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Buying Cost</span>
                  <span className="font-mono font-semibold">
                    TK {monthData.total_buying_cost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-mono font-semibold">
                    TK {monthData.operating_expenses.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Net Profit</span>
                  <span className="font-mono font-bold text-success">
                    TK {monthData.net_profit.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No data available for this month
              </p>
            )}
          </div>

          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">About Manual Updates</p>
            <p className="text-xs">
              Use this page to manually correct or update monthly financial
              data. The net profit is automatically calculated based on the
              values you enter. Changes are saved directly to the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthSummaryUpdate;
