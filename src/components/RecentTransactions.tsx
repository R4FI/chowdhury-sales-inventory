import { Transaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  transactions: Transaction[];
  limit?: number;
}

const RecentTransactions = ({ transactions, limit = 5 }: Props) => {
  const items = transactions.slice(0, limit);

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="px-5 py-3 bg-primary flex items-center justify-between">
        <span className="text-xs font-mono font-semibold tracking-wider text-primary-foreground">
          RECENT TRANSACTIONS
        </span>
        <span className="text-[10px] font-mono text-primary-foreground/70 animate-pulse-subtle">
          AUTO-SYNCING...
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground font-mono tracking-wider">
              <th className="text-left px-5 py-3">DATE</th>
              <th className="text-left px-3 py-3">PRODUCT</th>
              <th className="text-left px-3 py-3">TYPE</th>
              <th className="text-center px-3 py-3">QTY</th>
              <th className="text-right px-3 py-3">REVENUE</th>
              <th className="text-right px-5 py-3">PROFIT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((tx) => (
              <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{tx.date}</td>
                <td className="px-3 py-3 font-semibold text-primary">{tx.product_brand.replace(" LPG", "")}<br /><span className="text-[10px] text-muted-foreground">12KG</span></td>
                <td className="px-3 py-3">
                  <Badge variant={tx.sale_type === "Refill" ? "secondary" : "default"} className="text-[10px] font-mono">
                    {tx.sale_type === "Refill" ? "REFILL ONLY" : "FULL PACKAGE"}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-center font-mono">{String(tx.qty).padStart(2, "0")}</td>
                <td className="px-3 py-3 text-right font-mono">TK {tx.revenue.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-mono text-success">TK {tx.profit.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTransactions;
