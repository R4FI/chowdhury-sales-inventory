import { Bell, Settings, Package, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const AppHeader = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed");
    } else {
      toast.success("Logged out successfully");
      navigate("/login");
    }
  };

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <span className="section-label text-sm tracking-[0.15em]">
          INDUSTRIAL LPG FLOW
        </span>
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
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
