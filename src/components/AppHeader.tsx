import { Bell, Settings, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AppHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <span className="section-label text-sm tracking-[0.15em]">INDUSTRIAL LPG FLOW</span>
        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
          📅 Feb 2025
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Settings className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => navigate("/stock")} className="gap-2">
          <Package className="h-4 w-4" />
          RESTOCK
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
