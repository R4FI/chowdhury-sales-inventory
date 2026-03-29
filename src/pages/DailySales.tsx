/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import {
  Save,
  Download,
  TrendingUp,
  Upload,
  FileSpreadsheet,
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
import { Badge } from "@/components/ui/badge";
import {
  useTransactions,
  useInventory,
  useMonthSummary,
} from "@/hooks/useSupabaseStore";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const DailySales = () => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [brand, setBrand] = useState("Bashundhara LPG");
  const [saleType, setSaleType] = useState<"Refill" | "Package">("Refill");
  const [qty, setQty] = useState(0);
  const [unitPrice, setUnitPrice] = useState(1450);
  const [buyingCost, setBuyingCost] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { transactions, addTransaction } = useTransactions();
  const { inventory, updateAfterSale } = useInventory();
  const { month, updateMonthSummary } = useMonthSummary();

  const todayRevenue = transactions
    .filter((t) => t.date === date)
    .reduce((s, t) => s + t.revenue, 0);
  const todayProfit = transactions
    .filter((t) => t.date === date)
    .reduce((s, t) => s + t.profit, 0);
  const liveProfit =
    qty * unitPrice - qty * buyingCost - laborCost - transportCost;

  const handleSubmit = async () => {
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    const newTx = await addTransaction({
      date,
      product_brand: brand,
      sale_type: saleType,
      qty,
      unit_buying_price: buyingCost,
      unit_selling_price: unitPrice,
      labor_cost: laborCost,
      transport_cost: transportCost,
    });

    // Update inventory
    await updateAfterSale(brand, qty, saleType);

    // Update month summary for the transaction's month
    if (isSupabaseConfigured() && supabase) {
      const txDate = new Date(date);
      const txMonthId = txDate
        .toLocaleDateString("en-US", { month: "short", year: "numeric" })
        .toLowerCase()
        .replace(" ", "-");

      // Fetch the month's current data
      const { data: monthData } = await supabase
        .from("month_summary")
        .select("*")
        .eq("month_id", txMonthId)
        .single();

      if (monthData) {
        // Update the specific month's summary
        await supabase
          .from("month_summary")
          .update({
            gross_revenue: Number(monthData.gross_revenue) + newTx.revenue,
            total_buying_cost:
              Number(monthData.total_buying_cost) +
              (qty * buyingCost + laborCost + transportCost),
            net_profit: Number(monthData.net_profit) + newTx.profit,
          })
          .eq("month_id", txMonthId);
      }
    }

    toast.success("Transaction recorded successfully");
    setQty(0);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        console.log("📊 Total rows imported:", jsonData.length);
        console.log("📋 First row sample:", jsonData[0]);
        console.log(
          "📋 All column names:",
          jsonData.length > 0
            ? Object.keys(jsonData[0] as Record<string, any>)
            : [],
        );

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as Record<string, any>;
          try {
            // Try multiple column name variations (case-insensitive)
            const getColumnValue = (possibleNames: string[]) => {
              for (const name of possibleNames) {
                const key = Object.keys(row).find(
                  (k) => k.toLowerCase().trim() === name.toLowerCase(),
                );
                if (
                  key &&
                  row[key] !== undefined &&
                  row[key] !== null &&
                  row[key] !== ""
                ) {
                  return row[key];
                }
              }
              return null;
            };

            const txDate = getColumnValue([
              "date",
              "transaction_date",
              "sale_date",
            ]);
            const txBrand = getColumnValue([
              "brand",
              "product_brand",
              "product",
            ]);
            const txSaleType = getColumnValue([
              "sale_type",
              "type",
              "transaction_type",
            ]);
            const txQty = getColumnValue(["quantity", "qty", "amount"]);
            const txUnitPrice = getColumnValue([
              "unit_price",
              "unit_selling_price",
              "selling_price",
              "price",
            ]);
            const txBuyingCost =
              getColumnValue(["buying_cost", "unit_buying_price", "cost"]) || 0;
            const txLaborCost =
              getColumnValue(["labor_cost", "labour_cost"]) || 0;
            const txTransportCost =
              getColumnValue(["transport_cost", "shipping_cost"]) || 0;

            console.log(`Row ${i + 1} extracted:`, {
              date: txDate,
              brand: txBrand,
              saleType: txSaleType,
              qty: txQty,
              unitPrice: txUnitPrice,
            });

            // Validate required fields
            if (!txDate) {
              errors.push(`Row ${i + 1}: Missing date`);
              errorCount++;
              continue;
            }
            if (!txBrand) {
              errors.push(`Row ${i + 1}: Missing brand`);
              errorCount++;
              continue;
            }
            if (!txQty || Number(txQty) <= 0) {
              errors.push(`Row ${i + 1}: Invalid quantity (${txQty})`);
              errorCount++;
              continue;
            }
            if (!txUnitPrice || Number(txUnitPrice) <= 0) {
              errors.push(`Row ${i + 1}: Invalid unit price (${txUnitPrice})`);
              errorCount++;
              continue;
            }

            // Parse date to YYYY-MM-DD format
            let formattedDate = "";
            if (typeof txDate === "number") {
              // Excel date serial number
              const excelDate = XLSX.SSF.parse_date_code(txDate);
              formattedDate = `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
            } else if (typeof txDate === "string") {
              // Try to parse string date
              const parsedDate = new Date(txDate);
              if (!isNaN(parsedDate.getTime())) {
                formattedDate = parsedDate.toISOString().split("T")[0];
              } else {
                // Try DD/MM/YYYY or DD-MM-YYYY format
                const parts = txDate.split(/[\/\-]/);
                if (parts.length === 3) {
                  const day = parts[0].padStart(2, "0");
                  const month = parts[1].padStart(2, "0");
                  const year = parts[2];
                  formattedDate = `${year}-${month}-${day}`;
                }
              }
            }

            if (!formattedDate) {
              errors.push(`Row ${i + 1}: Invalid date format (${txDate})`);
              errorCount++;
              continue;
            }

            // Determine sale type: must be provided in file
            if (!txSaleType) {
              errors.push(
                `Row ${i + 1}: Missing sale_type (must be "Refill" or "Package")`,
              );
              errorCount++;
              continue;
            }

            const saleTypeStr = String(txSaleType).trim().toLowerCase();
            let finalSaleType: "Refill" | "Package";

            if (saleTypeStr === "refill") {
              finalSaleType = "Refill";
            } else if (saleTypeStr === "package") {
              finalSaleType = "Package";
            } else {
              errors.push(
                `Row ${i + 1}: Invalid sale_type "${txSaleType}" (must be "Refill" or "Package")`,
              );
              errorCount++;
              continue;
            }

            console.log(`✅ Processing row ${i + 1}:`, {
              date: formattedDate,
              brand: String(txBrand).trim(),
              saleType: finalSaleType,
              qty: Number(txQty),
              unitPrice: Number(txUnitPrice),
            });

            const newTx = await addTransaction({
              date: formattedDate,
              product_brand: String(txBrand).trim(),
              sale_type: finalSaleType,
              qty: Number(txQty),
              unit_buying_price: Number(txBuyingCost),
              unit_selling_price: Number(txUnitPrice),
              labor_cost: Number(txLaborCost),
              transport_cost: Number(txTransportCost),
            });

            // Update inventory
            await updateAfterSale(
              String(txBrand).trim(),
              Number(txQty),
              finalSaleType,
            );

            // Update month summary for the transaction's month
            if (isSupabaseConfigured() && supabase) {
              const txDate = new Date(formattedDate);
              const txMonthId = txDate
                .toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
                .toLowerCase()
                .replace(" ", "-");

              // Fetch the month's current data
              const { data: monthData } = await supabase
                .from("month_summary")
                .select("*")
                .eq("month_id", txMonthId)
                .single();

              if (monthData) {
                // Update the specific month's summary
                await supabase
                  .from("month_summary")
                  .update({
                    gross_revenue:
                      Number(monthData.gross_revenue) + newTx.revenue,
                    total_buying_cost:
                      Number(monthData.total_buying_cost) +
                      (Number(txQty) * Number(txBuyingCost) +
                        Number(txLaborCost) +
                        Number(txTransportCost)),
                    net_profit: Number(monthData.net_profit) + newTx.profit,
                  })
                  .eq("month_id", txMonthId);
              }
            }

            successCount++;
          } catch (err) {
            console.error(`❌ Error processing row ${i + 1}:`, row, err);
            errors.push(
              `Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
            errorCount++;
          }
        }

        console.log("📈 Import summary:", { successCount, errorCount });
        if (errors.length > 0) {
          console.log("❌ Errors:", errors);
        }

        toast.success(
          `Import complete: ${successCount} transactions added${errorCount > 0 ? `, ${errorCount} failed` : ""}`,
        );

        if (errorCount > 0 && errors.length <= 5) {
          setTimeout(() => {
            toast.error(`First errors: ${errors.slice(0, 3).join("; ")}`);
          }, 500);
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("File import error:", error);
      toast.error("Failed to import file");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const todayTx = transactions.filter((t) => t.date === date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Sales Entry</h2>
          <p className="text-sm text-muted-foreground">
            Terminal 01 • Session:{" "}
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-center">
            <p className="text-[9px] font-mono tracking-wider opacity-80">
              TOTAL SALES (TODAY)
            </p>
            <p className="text-xl font-bold font-mono">
              TK {todayRevenue.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-xs">+</span>
            </div>
            <span className="font-bold text-sm tracking-wide">
              NEW TRANSACTION
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  DATE
                </Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  PRODUCT BRAND
                </Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bashundhara LPG">
                      Bashundhara LPG 12KG
                    </SelectItem>
                    <SelectItem value="Bashundhara LPG 30">
                      Bashundhara LPG 30KG
                    </SelectItem>
                    <SelectItem value="Bashundhara LPG 40">
                      Bashundhara LPG 40KG
                    </SelectItem>
                    <SelectItem value="Navana LPG">Navana LPG 12KG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="section-label text-[10px] mb-1.5 block">
                SALE TYPE
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={saleType === "Refill" ? "default" : "outline"}
                  onClick={() => setSaleType("Refill")}
                  className="font-mono text-xs"
                >
                  Refill Only
                </Button>
                <Button
                  variant={saleType === "Package" ? "default" : "outline"}
                  onClick={() => setSaleType("Package")}
                  className="font-mono text-xs"
                >
                  Full Package
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  QUANTITY
                </Label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  min={0}
                />
              </div>
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  UNIT PRICE (TK)
                </Label>
                <Input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label className="section-label text-[10px] mb-1.5 block">
                BUYING COST (INTERNAL)
              </Label>
              <Input
                type="number"
                value={buyingCost}
                onChange={(e) => setBuyingCost(Number(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  LABOR COST
                </Label>
                <Input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                />
              </div>
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  TRANSPORT COST
                </Label>
                <Input
                  type="number"
                  value={transportCost}
                  onChange={(e) => setTransportCost(Number(e.target.value))}
                />
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full gap-2 h-11">
              <Save className="h-4 w-4" />
              RECORD TRANSACTION
            </Button>

            <div className="bg-primary rounded-lg p-4 mt-2">
              <p className="text-[10px] font-mono tracking-wider text-primary-foreground/70">
                LIVE PREVIEW PROFIT
              </p>
              <p className="text-2xl font-bold font-mono text-primary-foreground">
                TK{" "}
                {liveProfit.toLocaleString("en-BD", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Import from Excel/CSV */}
          <div className="bg-card rounded-xl border p-6 mt-6">
            <div className="flex items-center gap-2 mb-5">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              <span className="font-bold text-sm tracking-wide">
                BULK IMPORT FROM EXCEL/CSV
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="section-label text-[10px] mb-1.5 block">
                  UPLOAD FILE (.xlsx, .xls, .csv)
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full gap-2 h-11"
                >
                  <Upload className="h-4 w-4" />
                  SELECT FILE TO IMPORT
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
                <p className="font-semibold">Required Columns:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <span className="font-mono">date</span> - Transaction date
                    (YYYY-MM-DD or Excel date)
                  </li>
                  <li>
                    <span className="font-mono">brand</span> - Product brand
                    name
                  </li>
                  <li>
                    <span className="font-mono">sale_type</span> - "Refill" or
                    "Package"
                  </li>
                  <li>
                    <span className="font-mono">quantity</span> - Number of
                    units sold
                  </li>
                  <li>
                    <span className="font-mono">unit_price</span> - Selling
                    price per unit
                  </li>
                </ul>
                <p className="font-semibold mt-3">Optional Columns:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <span className="font-mono">buying_cost</span> - Cost per
                    unit (default: 0)
                  </li>
                  <li>
                    <span className="font-mono">labor_cost</span> - Labor cost
                    (default: 0)
                  </li>
                  <li>
                    <span className="font-mono">transport_cost</span> -
                    Transport cost (default: 0)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between border-b">
              <span className="font-bold text-sm">RECENT DAILY ENTRIES</span>
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Download className="h-3 w-3" /> Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground font-mono tracking-wider">
                    <th className="text-left px-5 py-2.5">TIME</th>
                    <th className="text-left px-3 py-2.5">PRODUCT</th>
                    <th className="text-left px-3 py-2.5">TYPE</th>
                    <th className="text-center px-3 py-2.5">QTY</th>
                    <th className="text-right px-5 py-2.5">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTx.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-muted-foreground text-sm"
                      >
                        No transactions for selected date
                      </td>
                    </tr>
                  )}
                  {todayTx.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {tx.time}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold">
                          {tx.product_brand.replace(" LPG", "")}
                        </span>
                        <br />
                        <span className="text-[10px] text-muted-foreground">
                          SN: {tx.id}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant={
                            tx.sale_type === "Refill" ? "secondary" : "default"
                          }
                          className="text-[10px] font-mono"
                        >
                          {tx.sale_type === "Refill"
                            ? "Refill Only"
                            : "Full Package"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-semibold">
                        {tx.qty}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">
                        TK {tx.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {inventory.map((inv) => (
              <div key={inv.brand} className="bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="section-label text-[10px]">
                    STOCK: {inv.brand.replace(" LPG", "").toUpperCase()}
                  </span>
                </div>
                <p className="text-3xl font-bold font-mono">
                  {inv.full_bottles}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    Units
                  </span>
                </p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(inv.full_bottles / inv.total_bottles) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-primary rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono tracking-wider text-primary-foreground/70">
                GROSS PROFIT (TODAY)
              </p>
              <p className="text-2xl font-bold font-mono text-primary-foreground">
                TK {todayProfit.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary-foreground/40" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySales;
