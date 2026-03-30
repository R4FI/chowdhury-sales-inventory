import jsPDF from "jspdf";
import { MonthSummary } from "./types";

interface MonthlyInvoiceData {
  invoiceNumber: string;
  month: MonthSummary;
  bottlesSold: number;
}

export const generateMonthlyInvoice = (data: MonthlyInvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Logo placeholder
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text("YOUR", 20, 20);
  doc.text("LOGO", 20, 26);

  // Invoice number
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`NO. ${data.invoiceNumber}`, pageWidth - 20, 20, { align: "right" });

  // Title
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("INVOICE", 20, 60);

  // Date
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
    20,
    75,
  );

  // From and Billed To section
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;
  const startY = 95;

  // Billed to
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Billed to:", leftCol, startY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Industrial LPG Customer", leftCol, startY + 7);
  doc.text("123 Anywhere St., Any City", leftCol, startY + 14);
  doc.text("customer@email.com", leftCol, startY + 21);

  // From
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("From:", rightCol, startY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Industrial LPG Flow", rightCol, startY + 7);
  doc.text("123 Anywhere St., Any City", rightCol, startY + 14);
  doc.text("business@email.com", rightCol, startY + 21);

  // Summary table
  const tableStartY = startY + 40;

  // Table header
  doc.setFillColor(220, 220, 220);
  doc.rect(20, tableStartY, pageWidth - 40, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("Item", 25, tableStartY + 8);
  doc.text("Quantity", pageWidth / 2 - 10, tableStartY + 8, { align: "right" });
  doc.text("Price", pageWidth - 70, tableStartY + 8, { align: "right" });
  doc.text("Amount", pageWidth - 25, tableStartY + 8, { align: "right" });

  // Table rows
  let currentY = tableStartY + 20;
  doc.setFont("helvetica", "normal");

  // Bottles sold
  doc.text(`LPG Bottles (${data.month.month_label})`, 25, currentY);
  doc.text(String(data.bottlesSold), pageWidth / 2 - 10, currentY, {
    align: "right",
  });
  doc.text("-", pageWidth - 70, currentY, { align: "right" });
  doc.text(
    `TK ${data.month.gross_revenue.toLocaleString()}`,
    pageWidth - 25,
    currentY,
    { align: "right" },
  );

  currentY += 10;
  doc.text("Operating Expenses", 25, currentY);
  doc.text("-", pageWidth / 2 - 10, currentY, { align: "right" });
  doc.text("-", pageWidth - 70, currentY, { align: "right" });
  doc.text(
    `TK ${(data.month.total_buying_cost + data.month.operating_expenses).toLocaleString()}`,
    pageWidth - 25,
    currentY,
    { align: "right" },
  );

  // Total line
  currentY += 15;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2, currentY, pageWidth - 20, currentY);

  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total", pageWidth - 70, currentY, { align: "right" });
  doc.text(
    `TK ${data.month.net_profit.toLocaleString()}`,
    pageWidth - 25,
    currentY,
    { align: "right" },
  );

  // Summary boxes
  currentY += 25;
  const boxWidth = (pageWidth - 60) / 2;

  // Gross Revenue box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(20, currentY, boxWidth, 25, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Gross Revenue", 25, currentY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(
    `TK ${data.month.gross_revenue.toLocaleString()}`,
    25,
    currentY + 18,
  );

  // Total Expenses box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(30 + boxWidth, currentY, boxWidth, 25, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Total Expenses", 35 + boxWidth, currentY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(
    `TK ${(data.month.total_buying_cost + data.month.operating_expenses).toLocaleString()}`,
    35 + boxWidth,
    currentY + 18,
  );

  // Payment method and note
  currentY += 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("Payment method:", 20, currentY);
  doc.setFont("helvetica", "normal");
  doc.text("Cash", 60, currentY);

  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Note:", 20, currentY);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", 60, currentY);

  // Save PDF
  doc.save(`Monthly_Invoice_${data.month.month_id}.pdf`);
};
