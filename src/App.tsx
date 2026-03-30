import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DailySales from "@/pages/DailySales";
import StockManagement from "@/pages/StockManagement";
import Reports from "@/pages/Reports";
import Commission from "@/pages/Commission";
import MonthSummaryUpdate from "@/pages/MonthSummaryUpdate";
import MonthlyInvoice from "@/pages/MonthlyInvoice";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/daily-sales" element={<DailySales />} />
            <Route path="/stock" element={<StockManagement />} />
            <Route path="/commission" element={<Commission />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/month-summary" element={<MonthSummaryUpdate />} />
            <Route path="/monthly-invoice" element={<MonthlyInvoice />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
