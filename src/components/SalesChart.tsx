import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTransactions } from "@/hooks/useSupabaseStore";

const SalesChart = () => {
  const { transactions } = useTransactions();

  // Calculate daily sales data from transactions
  const salesByDay: Record<string, { bashundhara: number; navana: number }> =
    {};

  transactions.forEach((tx) => {
    const day = tx.date;
    if (!salesByDay[day]) {
      salesByDay[day] = { bashundhara: 0, navana: 0 };
    }
    if (tx.product_brand === "Bashundhara LPG") {
      salesByDay[day].bashundhara += tx.revenue;
    } else if (tx.product_brand === "Navana LPG") {
      salesByDay[day].navana += tx.revenue;
    }
  });

  // Convert to array and sort by date
  const sortedDays = Object.keys(salesByDay).sort();
  const data = sortedDays.map((day) => ({
    day: new Date(day).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    bashundhara: salesByDay[day].bashundhara,
    navana: salesByDay[day].navana,
  }));

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="section-label">SALES FLUCTUATIONS</p>
          <h3 className="text-lg font-bold">Current Month Flow</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            BASHUNDHARA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-info" />
            NAVANA
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={2}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(220 20% 90%)",
              fontSize: "12px",
            }}
          />
          <Bar
            dataKey="bashundhara"
            fill="hsl(224 60% 28%)"
            radius={[4, 4, 0, 0]}
          />
          <Bar dataKey="navana" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesChart;
