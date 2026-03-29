import { useState, useEffect } from "react";
import {
  DollarSign,
  Save,
  Trash2,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMonthCommission } from "@/hooks/useSupabaseStore";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { MonthSummary } from "@/lib/types";

const Commission = () => {
  const [monthId, setMonthId] = useState("");
  const [monthLabel, setMonthLabel] = useState("");
  const [selectedMonthData, setSelectedMonthData] =
    useState<MonthSummary | null>(null);
  const [allMonths, setAllMonths] = useState<string[]>([]);
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState("");

  const { commission, addOrUpdateCommission, deleteCommission } =
    useMonthCommission(monthId);

  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  // Fetch all months from month_summary table
  const fetchAllMonths = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    const { data } = await supabase
      .from("month_summary")
      .select("month_id")
      .order("month_id", { ascending: false });
    if (data) {
      setAllMonths(data.map((m) => m.month_id));
      // Set default to latest month
      if (data.length > 0 && !monthId) {
        const latestMonth = data[0].month_id;
        setMonthId(latestMonth);
        // Parse month_id to set label
        const [monthStr, year] = latestMonth.split("-");
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
        setMonthLabel(`${monthNames[monthStr] || monthStr} ${year}`);
      }
    }
  };

  useEffect(() => {
    fetchAllMonths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch selected month's summary data
  useEffect(() => {
    const fetchMonthData = async () => {
      if (!isSupabaseConfigured() || !supabase || !monthId) return;

      const { data, error } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", monthId)
        .single();

      if (!error && data) {
        setSelectedMonthData(data);
      } else {
        setSelectedMonthData(null);
      }
    };

    fetchMonthData();
  }, [monthId]);

  // Update form when commission data changes
  useEffect(() => {
    if (commission) {
      setAmount(commission.commission_amount);
      setNote(commission.commission_note || "");
    } else {
      setAmount(0);
      setNote("");
    }
  }, [commission]);

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
      setMonthId(monthId);
      setMonthLabel(monthLabel);
    }
  };

  const handleSave = async () => {
    if (amount < 0) {
      toast.error("Commission amount cannot be negative");
      return;
    }

    const result = await addOrUpdateCommission(amount, note);
    if (result) {
      toast.success(
        commission
          ? "Commission updated successfully"
          : "Commission added successfully",
      );
    } else {
      toast.error("Failed to save commission");
    }
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this commission record?")) {
      await deleteCommission();
      setAmount(0);
      setNote("");
      toast.success("Commission deleted successfully");
    }
  };

  const netProfitWithCommission =
    (selectedMonthData?.net_profit || 0) + (commission?.commission_amount || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Commission Management</h2>
          <p className="text-sm text-muted-foreground">
            Track monthly commissions from the company
          </p>
        </div>
        <Badge variant={isSupabaseConfigured() ? "default" : "secondary"}>
          {isSupabaseConfigured()
            ? "Supabase (Persistent)"
            : "Local Memory (Temporary)"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-bold text-sm">
                {commission ? "UPDATE COMMISSION" : "ADD COMMISSION"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  SELECT MONTH
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={monthId}
                    onValueChange={(val) => {
                      setMonthId(val);
                      // Parse month_id like "feb-2025" to display "February 2025"
                      const [monthStr, year] = val.split("-");
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
                      setMonthLabel(
                        `${monthNames[monthStr] || monthStr} ${year}`,
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose month" />
                    </SelectTrigger>
                    <SelectContent>
                      {allMonths.map((m) => {
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
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {monthLabel}
                </p>
              </div>

              {/* Add New Month Form */}
              {showAddMonth && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <Label className="text-xs">
                    ENTER MONTH (e.g., "April 2025")
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newMonthInput}
                      onChange={(e) => setNewMonthInput(e.target.value)}
                      placeholder="April 2025"
                      className="text-sm"
                    />
                    <Button onClick={handleAddNewMonth} size="sm">
                      ADD
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  COMMISSION AMOUNT (TK)
                </Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min={0}
                  step={0.01}
                  placeholder="Enter commission amount"
                />
              </div>

              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  NOTE (OPTIONAL)
                </Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add any notes about this commission..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1 gap-2">
                  {commission ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {commission ? "UPDATE COMMISSION" : "ADD COMMISSION"}
                </Button>
                {commission && (
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    DELETE
                  </Button>
                )}
              </div>
            </div>
          </div>

          {commission && (
            <div className="bg-card rounded-xl border p-5">
              <p className="section-label text-[10px] mb-3">
                CURRENT COMMISSION DETAILS
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Month</span>
                  <span className="font-semibold">
                    {commission.month_label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold text-success">
                    TK {commission.commission_amount.toLocaleString()}
                  </span>
                </div>
                {commission.commission_note && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Note:</p>
                    <p className="text-sm">{commission.commission_note}</p>
                  </div>
                )}
                {commission.created_at && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Added on</span>
                    <span>
                      {new Date(commission.created_at).toLocaleDateString(
                        "en-GB",
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-5">
            <p className="section-label text-[10px] mb-3">
              FINANCIAL SUMMARY - {monthLabel}
            </p>
            {selectedMonthData ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Revenue</span>
                  <span className="font-mono font-semibold">
                    TK {selectedMonthData.gross_revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Costs</span>
                  <span className="font-mono font-semibold">
                    TK{" "}
                    {(
                      selectedMonthData.total_buying_cost +
                      selectedMonthData.operating_expenses
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net Profit</span>
                  <span className="font-mono font-semibold">
                    TK {selectedMonthData.net_profit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-mono font-semibold text-success">
                    + TK {(commission?.commission_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="font-semibold">Total Profit</span>
                  <span className="font-mono font-bold text-success text-lg">
                    TK {netProfitWithCommission.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No financial data available for {monthLabel}
              </p>
            )}
          </div>

          <div className="bg-primary rounded-xl p-5">
            <p className="text-[10px] font-mono tracking-wider text-primary-foreground/70 mb-2">
              TOTAL PROFIT (WITH COMMISSION)
            </p>
            <p className="text-3xl font-bold font-mono text-primary-foreground">
              TK {netProfitWithCommission.toLocaleString()}
            </p>
            <p className="text-xs text-primary-foreground/60 mt-2">
              {monthLabel}
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">About Commission</p>
            <p className="text-xs">
              Commission is additional income received from the company. It's
              tracked separately and added to your net profit for accurate
              financial reporting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Commission;
