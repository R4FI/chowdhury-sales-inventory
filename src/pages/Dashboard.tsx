import {
  Package,
  Cylinder,
  Banknote,
  ArrowRight,
  Download,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import SalesChart from "@/components/SalesChart";
import RecentTransactions from "@/components/RecentTransactions";
import { Button } from "@/components/ui/button";
import { companyInfo } from "@/lib/store";
import { generateInvoice } from "@/lib/invoice";
import {
  useTransactions,
  useInventory,
  useMonthSummary,
  useMonthCommission,
} from "@/hooks/useSupabaseStore";

const Dashboard = () => {
  const { transactions } = useTransactions();
  const { inventory } = useInventory();
  const { month } = useMonthSummary();
  const { commission } = useMonthCommission(month.month_id);
  const totalFull = inventory.reduce((s, i) => s + i.full_bottles, 0);
  const totalEmpty = inventory.reduce((s, i) => s + i.empty_bottles, 0);
  const totalProfitWithCommission =
    month.net_profit + (commission?.commission_amount || 0);

  const handleDownloadInvoice = () => {
    generateInvoice(companyInfo, month, transactions);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="TOTAL FULL"
          value={String(totalFull)}
          subtitle="Cylinders in Warehouse"
        />
        <StatCard
          icon={Cylinder}
          label="EMPTY ON HAND"
          value={String(totalEmpty)}
          subtitle="Pending Refill Cycle"
        />
        <StatCard
          icon={Banknote}
          label="MONTHLY REVENUE"
          value={`TK ${month.gross_revenue.toLocaleString()}`}
          subtitle="Current Month Total"
        />
        <StatCard
          icon={ArrowRight}
          label="CARRY FORWARD"
          value={String(month.carry_forward_stock)}
          subtitle="Projected Next Day"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div className="bg-card rounded-xl border p-5 flex flex-col gap-4">
          <div>
            <p className="section-label">MONTHLY SUMMARY</p>
            <h3 className="text-lg font-bold">{month.month_label}</h3>
          </div>
          <div className="space-y-3 flex-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gross Revenue</span>
              <span className="font-mono font-semibold">
                TK {month.gross_revenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Buying Cost</span>
              <span className="font-mono font-semibold">
                TK {month.total_buying_cost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-mono font-semibold">
                TK {month.operating_expenses.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between text-sm">
              <span className="font-semibold">Net Profit</span>
              <span className="font-mono font-bold text-success">
                TK {month.net_profit.toLocaleString()}
              </span>
            </div>
            {commission && commission.commission_amount > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-mono font-semibold text-success">
                    + TK {commission.commission_amount.toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between text-sm">
                  <span className="font-semibold">Total Profit</span>
                  <span className="font-mono font-bold text-success">
                    TK {totalProfitWithCommission.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
          <Button onClick={handleDownloadInvoice} className="gap-2 w-full">
            <Download className="h-4 w-4" />
            Download Monthly Invoice (PDF)
          </Button>
        </div>
      </div>

      <RecentTransactions transactions={transactions} />

      <div className="bg-primary rounded-lg px-6 py-3 flex items-center justify-between text-primary-foreground text-xs font-mono">
        <span>
          MONTHLY SUMMARY: {month.total_bottles.toLocaleString()} Bottles
        </span>
        <span>TRANSACTIONS: {transactions.length}</span>
        <button
          onClick={handleDownloadInvoice}
          className="underline hover:no-underline"
        >
          Download Monthly Invoice (PDF)
        </button>
        <span className="text-primary-foreground/60">
          © 2025 LPG INDUSTRIAL SYSTEMS
        </span>
      </div>
    </div>
  );
};

export default Dashboard;
