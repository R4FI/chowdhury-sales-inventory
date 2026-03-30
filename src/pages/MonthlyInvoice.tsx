import { useState, useEffect, useMemo } from "react";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { generateMonthlyInvoice } from "@/lib/monthlyInvoice";

const MonthlyInvoice = () => {
  const { transactions } = useTransactions();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

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

  // Generate invoice number
  useEffect(() => {
    if (selectedMonth) {
      const timestamp = Date.now().toString().slice(-6);
      setInvoiceNumber(`INV-${selectedMonth.toUpperCase()}-${timestamp}`);
    }
  }, [selectedMonth]);

  // Fetch month data and calculate bottles sold
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
      }
      setLoading(false);
    };

    fetchMonthData();
  }, [selectedMonth]);

  // Calculate total bottles sold for the month
  const bottlesSold = useMemo(() => {
    return transactions
      .filter((tx) => {
        const date = new Date(tx.date);
        const monthKey = format(date, "MMM-yyyy").toLowerCase();
        return monthKey === selectedMonth;
      })
      .reduce((sum, tx) => sum + tx.qty, 0);
  }, [transactions, selectedMonth]);

  const handleGenerateInvoice = () => {
    if (!monthData) {
      toast.error("No data available for this month");
      return;
    }

    generateMonthlyInvoice({
      invoiceNumber,
      month: monthData,
      bottlesSold,
    });

    toast.success("Invoice generated successfully");
  };

  if (loading) {
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
          <h2 className="text-2xl font-bold">Monthly Invoice Generator</h2>
          <p className="text-sm text-muted-foreground">
            Generate PDF invoices for monthly sales summary
          </p>
        </div>
        <Badge variant={isSupabaseConfigured() ? "default" : "secondary"}>
          {isSupabaseConfigured()
            ? "Supabase (Persistent)"
            : "Local Memory (Temporary)"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">SELECT MONTH</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                MONTH
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
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

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">
                INVOICE NUMBER
              </p>
              <p className="font-mono font-semibold">{invoiceNumber}</p>
            </div>

            <Button
              onClick={handleGenerateInvoice}
              className="w-full gap-2 h-11"
              disabled={!monthData}
            >
              <Download className="h-4 w-4" />
              GENERATE INVOICE PDF
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-6">
            <h3 className="font-bold mb-4">INVOICE PREVIEW</h3>
            {monthData ? (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <p className="text-xs text-muted-foreground mb-1">PERIOD</p>
                  <p className="font-semibold text-lg">
                    {monthData.month_label}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Bottles Sold
                    </span>
                    <span className="font-mono font-bold text-lg">
                      {bottlesSold}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Gross Revenue
                    </span>
                    <span className="font-mono font-semibold">
                      TK {monthData.gross_revenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Total Expenses
                    </span>
                    <span className="font-mono font-semibold">
                      TK{" "}
                      {(
                        monthData.total_buying_cost +
                        monthData.operating_expenses
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-bold">Net Profit</span>
                    <span className="font-mono font-bold text-success text-xl">
                      TK {monthData.net_profit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a month to preview invoice data
              </p>
            )}
          </div>

          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">About Monthly Invoices</p>
            <p className="text-xs">
              This generates a clean PDF invoice showing the monthly summary
              without transaction breakdowns. Perfect for quick financial
              reports and record keeping.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyInvoice;
