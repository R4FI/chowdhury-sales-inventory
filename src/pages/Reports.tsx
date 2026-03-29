import { useState, useMemo, useEffect } from "react";
import {
  Download,
  Calendar as CalendarIcon,
  Package,
  TrendingUp,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { companyInfo } from "@/lib/store";
import { generateInvoice } from "@/lib/invoice";
import {
  useTransactions,
  useMonthSummary,
  useMonthCommission,
  useInventory,
} from "@/hooks/useSupabaseStore";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { MonthSummary } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const Reports = () => {
  const { month } = useMonthSummary();
  const { transactions } = useTransactions();
  const { inventory } = useInventory();

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedMonthData, setSelectedMonthData] =
    useState<MonthSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { commission } = useMonthCommission(selectedMonth || month.month_id);

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

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

  // Fetch selected month's summary data
  useEffect(() => {
    const fetchMonthData = async () => {
      if (!selectedMonth || !isSupabaseConfigured() || !supabase) return;

      const { data, error } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", selectedMonth)
        .single();

      if (!error && data) {
        setSelectedMonthData(data);
      } else {
        setSelectedMonthData(null);
      }
    };

    fetchMonthData();

    // Set up real-time subscription to refresh when data changes
    const channel = supabase
      ?.channel("month_summary_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "month_summary",
          filter: `month_id=eq.${selectedMonth}`,
        },
        () => {
          fetchMonthData();
        },
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [selectedMonth, refreshKey]); // Add refreshKey to trigger manual refresh

  // Calculate monthly statistics from transactions
  const monthlyStats = useMemo(() => {
    const monthTxs = transactions.filter((tx) => {
      const date = new Date(tx.date);
      const txMonth = format(date, "MMM-yyyy").toLowerCase();
      return txMonth === selectedMonth;
    });

    const totalSold = monthTxs.reduce((sum, tx) => sum + tx.qty, 0);

    // Use month_summary data if available, otherwise calculate from transactions
    const grossRevenue =
      selectedMonthData?.gross_revenue ||
      monthTxs.reduce((sum, tx) => sum + tx.revenue, 0);
    const totalBuyingCost =
      selectedMonthData?.total_buying_cost ||
      monthTxs.reduce((sum, tx) => sum + tx.qty * tx.unit_buying_price, 0);
    const operatingExpenses = selectedMonthData?.operating_expenses || 0;

    // Calculate from transactions for reference
    const totalLaborCost = monthTxs.reduce((sum, tx) => sum + tx.labor_cost, 0);
    const totalTransportCost = monthTxs.reduce(
      (sum, tx) => sum + tx.transport_cost,
      0,
    );
    const transactionExpenses = totalLaborCost + totalTransportCost;

    // Use operating_expenses from month_summary if available, otherwise use transaction expenses
    const totalExpenses =
      operatingExpenses > 0 ? operatingExpenses : transactionExpenses;
    const totalCost = totalBuyingCost + totalExpenses;
    const netProfit = selectedMonthData?.net_profit || grossRevenue - totalCost;

    // Normalize brand names to fix inconsistencies
    const normalizeBrand = (brand: string) => {
      return brand.trim().replace(/\s+/g, " "); // Remove extra spaces
    };

    // Brand-wise breakdown with sale type
    const brandStats = monthTxs.reduce(
      (acc, tx) => {
        const normalizedBrand = normalizeBrand(tx.product_brand);

        if (!acc[normalizedBrand]) {
          acc[normalizedBrand] = {
            refill: { qty: 0, revenue: 0 },
            package: { qty: 0, revenue: 0 },
            total: { qty: 0, revenue: 0 },
          };
        }

        if (tx.sale_type === "Refill") {
          acc[normalizedBrand].refill.qty += tx.qty;
          acc[normalizedBrand].refill.revenue += tx.revenue;
        } else {
          acc[normalizedBrand].package.qty += tx.qty;
          acc[normalizedBrand].package.revenue += tx.revenue;
        }

        acc[normalizedBrand].total.qty += tx.qty;
        acc[normalizedBrand].total.revenue += tx.revenue;

        return acc;
      },
      {} as Record<
        string,
        {
          refill: { qty: number; revenue: number };
          package: { qty: number; revenue: number };
          total: { qty: number; revenue: number };
        }
      >,
    );

    return {
      transactions: monthTxs.length,
      monthTransactions: monthTxs,
      totalSold,
      grossRevenue,
      totalBuyingCost,
      totalLaborCost,
      totalTransportCost,
      totalExpenses,
      totalCost,
      netProfit,
      brandStats,
    };
  }, [transactions, selectedMonth, selectedMonthData]);

  const currentInventory = inventory.reduce(
    (sum, inv) => sum + inv.full_bottles,
    0,
  );

  const totalProfitWithCommission =
    monthlyStats.netProfit + (commission?.commission_amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monthly Reports & Overview</h2>
          <p className="text-sm text-muted-foreground">
            View detailed monthly statistics and download reports
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">OPENING STOCK</span>
          </div>
          <p className="text-3xl font-bold font-mono text-blue-500">
            {month.total_restocked}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Start of month</p>
        </div>

        {/* <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">RESTOCKED</span>
          </div>
          <p className="text-3xl font-bold font-mono text-green-500">
            {month.total_restocked}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Added this month</p>
        </div> */}

        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">TOTAL SOLD</span>
          </div>
          <p className="text-3xl font-bold font-mono">
            {monthlyStats.totalSold}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {monthlyStats.transactions} transactions
          </p>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">REMAINING</span>
          </div>
          <p className="text-3xl font-bold font-mono text-warning">
            {month.opening_stock +
              month.total_restocked -
              monthlyStats.totalSold}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Available stock</p>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">NET PROFIT</span>
          </div>
          <p className="text-3xl font-bold font-mono text-success">
            TK{monthlyStats.netProfit.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">After all costs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Breakdown */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-6">
          <h3 className="font-bold mb-4">COST BREAKDOWN</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
              <span className="text-sm">Total Buying Cost</span>
              <span className="font-mono font-semibold">
                TK{monthlyStats.totalBuyingCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
              <span className="text-sm">Labor Cost</span>
              <span className="font-mono font-semibold">
                TK{monthlyStats.totalLaborCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded">
              <span className="text-sm">Transport Cost</span>
              <span className="font-mono font-semibold">
                TK{monthlyStats.totalTransportCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded border-2 border-primary">
              <span className="font-semibold">Total Expenses</span>
              <span className="font-mono font-bold text-primary">
                TK{monthlyStats.totalExpenses.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-destructive/10 rounded border-2 border-destructive">
              <span className="font-semibold">
                Total Cost (Buying + Expenses)
              </span>
              <span className="font-mono font-bold text-destructive">
                TK{monthlyStats.totalCost.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <h3 className="font-bold mb-4">BRAND-WISE SALES</h3>
            <div className="space-y-4">
              {Object.entries(monthlyStats.brandStats).map(([brand, stats]) => (
                <div key={brand} className="bg-muted/30 rounded-lg p-4 border">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold">{brand}</span>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold">
                        {stats.total.qty} units
                      </div>
                      <div className="text-xs font-mono text-success font-semibold">
                        TK{stats.total.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                    {stats.refill.qty > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Refill Only
                        </span>
                        <div className="flex gap-3">
                          <span className="font-mono">
                            {stats.refill.qty} units
                          </span>
                          <span className="font-mono font-semibold min-w-[100px] text-right">
                            TK{stats.refill.revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {stats.package.qty > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Full Package
                        </span>
                        <div className="flex gap-3">
                          <span className="font-mono">
                            {stats.package.qty} units
                          </span>
                          <span className="font-mono font-semibold min-w-[100px] text-right">
                            TK{stats.package.revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary & Download */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-bold mb-4">MONTHLY SUMMARY</h3>
            {selectedMonthData ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Revenue</span>
                  <span className="font-mono font-semibold">
                    TK{selectedMonthData.gross_revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cost</span>
                  <span className="font-mono font-semibold text-destructive">
                    TK
                    {(
                      selectedMonthData.total_buying_cost +
                      selectedMonthData.operating_expenses
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Net Profit</span>
                  <span className="font-mono font-bold text-success">
                    TK{selectedMonthData.net_profit.toLocaleString()}
                  </span>
                </div>
                {commission && commission.commission_amount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Commission</span>
                      <span className="font-mono font-semibold text-success">
                        TK{commission.commission_amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-bold">Total Profit</span>
                      <span className="font-mono font-bold text-success text-lg">
                        TK
                        {(
                          selectedMonthData.net_profit +
                          commission.commission_amount
                        ).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No data available for this month
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-bold mb-2">Download Report</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate PDF invoice for{" "}
              {selectedMonth
                ? format(new Date(selectedMonth), "MMMM yyyy")
                : "Selected Month"}
            </p>
            <Button
              onClick={() => {
                if (!selectedMonth || !selectedMonthData) return;
                // Use the fetched month data, not the cached one
                const invoiceData = {
                  month_id: selectedMonth,
                  month_label: selectedMonthData.month_label,
                  opening_stock: selectedMonthData.opening_stock,
                  total_restocked: selectedMonthData.total_restocked,
                  full_bottles: selectedMonthData.full_bottles,
                  empty_bottles: selectedMonthData.empty_bottles,
                  total_bottles: selectedMonthData.total_bottles,
                  gross_revenue: selectedMonthData.gross_revenue,
                  total_buying_cost: selectedMonthData.total_buying_cost,
                  operating_expenses: selectedMonthData.operating_expenses,
                  net_profit: selectedMonthData.net_profit,
                  carry_forward_stock: selectedMonthData.carry_forward_stock,
                  carry_forward_value: selectedMonthData.carry_forward_value,
                };
                generateInvoice(
                  companyInfo,
                  invoiceData,
                  monthlyStats.monthTransactions,
                );
              }}
              className="w-full gap-2"
              disabled={!selectedMonth || !selectedMonthData}
            >
              <Download className="h-4 w-4" />
              Download Invoice PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
