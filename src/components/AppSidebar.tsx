import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  FileBarChart,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Monthly Overview", icon: LayoutDashboard },
  { to: "/daily-sales", label: "Daily Sales Entry", icon: ShoppingCart },
  { to: "/stock", label: "Stock Management", icon: Package },
  { to: "/commission", label: "Commission", icon: DollarSign },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/month-summary", label: "Update Summary", icon: Settings },
];

const AppSidebar = () => {
  return (
    <aside className="w-56 min-h-screen bg-card border-r flex flex-col justify-between">
      <div>
        <div className="p-5 border-b">
          <h1 className="text-lg font-bold font-mono tracking-tight text-primary">
            LPG COMMAND
          </h1>
          <p className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground">
            PRECISION CONTROL
          </p>
        </div>
        <nav className="p-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse-subtle" />
          <span className="text-[10px] font-mono tracking-wider text-muted-foreground">
            SYSTEM STATUS: ACTIVE
          </span>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
