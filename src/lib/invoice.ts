/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction, CompanyInfo, MonthSummary } from "./types";

export const generateInvoice = (
  company: CompanyInfo,
  month: MonthSummary,
  transactions: Transaction[],
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, pageWidth / 2, 25, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(company.address, pageWidth / 2, 32, { align: "center" });

  // Line
  doc.setDrawColor(37, 55, 105);
  doc.setLineWidth(0.8);
  doc.line(14, 37, pageWidth - 14, 37);

  // Invoice title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Monthly Invoice — ${month.month_label}`, 14, 47);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageWidth - 14,
    47,
    { align: "right" },
  );

  // Summary box
  const summaryY = 55;
  doc.setFillColor(240, 243, 250);
  doc.roundedRect(14, summaryY, pageWidth - 28, 32, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const cols = [
    {
      label: "Gross Revenue",
      value: `TK ${month.gross_revenue.toLocaleString()}`,
    },
    {
      label: "Buying Cost",
      value: `TK ${month.total_buying_cost.toLocaleString()}`,
    },
    {
      label: "Expenses",
      value: `TK ${month.operating_expenses.toLocaleString()}`,
    },
    { label: "Net Profit", value: `TK ${month.net_profit.toLocaleString()}` },
  ];

  cols.forEach((col, i) => {
    const x = 22 + i * 44;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(col.label, x, summaryY + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(col.value, x, summaryY + 22);
  });

  // Transactions table
  const tableData = transactions.map((tx) => [
    tx.date,
    tx.product_brand,
    tx.sale_type,
    String(tx.qty),
    `TK ${tx.revenue.toLocaleString()}`,
    `TK ${tx.profit.toLocaleString()}`,
    tx.status,
  ]);

  autoTable(doc, {
    startY: summaryY + 40,
    head: [["Date", "Product", "Type", "Qty", "Revenue", "Profit", "Status"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [37, 55, 105],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(
    `© ${new Date().getFullYear()} ${company.name}. Operational Precision Secured.`,
    pageWidth / 2,
    finalY,
    { align: "center" },
  );

  doc.save(`Invoice_${month.month_id}.pdf`);
};
