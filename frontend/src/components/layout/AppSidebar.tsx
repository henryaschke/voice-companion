import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  MessageCircle,
  ShoppingBag,
  Settings,
  Heart,
  Phone,
  Menu,
  X,
  Bell,
  User,
  Users,
  BarChart3,
  Share2,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { detailedNotifications } from "@/data/mockData";
import { usePortal } from "@/contexts/PortalContext";
import { PortalSwitcher } from "./PortalSwitcher";

const familyNavigation = [
  { name: "Übersicht", href: "/", icon: Home },
  { name: "Gespräche", href: "/conversations", icon: MessageCircle },
  { name: "Benachrichtigungen", href: "/notifications", icon: Bell },
  { name: "Bestellungen", href: "/services", icon: ShoppingBag },
  { name: "Persönlicher Kontext", href: "/personal-context", icon: User },
  { name: "Person hinzufügen", href: "/add-user", icon: UserPlus },
  { name: "Einstellungen", href: "/settings", icon: Settings },
];

const careHomeNavigation = [
  { name: "Bewohnerübersicht", href: "/care/residents", icon: Users },
  { name: "Einblicke", href: "/care/insights", icon: BarChart3 },
  { name: "Familienfreigaben", href: "/care/family-sharing", icon: Share2 },
  { name: "Bewohner:in hinzufügen", href: "/care/add-resident", icon: UserPlus },
  { name: "Einstellungen", href: "/care/settings", icon: Settings },
];

const doctorNavigation = [
  { name: "Patient:innen", href: "/doctor/patients", icon: Users },
  { name: "Patient:in hinzufügen", href: "/doctor/add-patient", icon: UserPlus },
  { name: "Einstellungen", href: "/doctor/settings", icon: Settings },
];

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { currentPortal, setCurrentPortal } = usePortal();

  // Sync portal state with current route
  useEffect(() => {
    if (location.pathname.startsWith("/care")) {
      setCurrentPortal("pflegeeinrichtung");
    } else if (location.pathname.startsWith("/doctor")) {
      setCurrentPortal("arzt");
    } else if (!location.pathname.startsWith("/care") && !location.pathname.startsWith("/doctor") && currentPortal !== "familie") {
      setCurrentPortal("familie");
    }
  }, [location.pathname, setCurrentPortal, currentPortal]);

  const navigation = currentPortal === "familie" 
    ? familyNavigation 
    : currentPortal === "pflegeeinrichtung"
    ? careHomeNavigation
    : doctorNavigation;
  const unreadNotifications = detailedNotifications.filter((n) => !n.read).length;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50",
          "flex flex-col w-[280px] flex-shrink-0",
          "transition-transform duration-300 ease-in-out",
          "lg:sticky",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo and Portal Switcher */}
        <div className="p-4 border-b border-sidebar-border space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <h1 className="font-display text-lg font-semibold text-sidebar-foreground">
              VoiceCompanion
            </h1>
          </div>
          <PortalSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            const showBadge =
              item.href === "/notifications" && unreadNotifications > 0 && currentPortal === "familie";

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {showBadge && (
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                    {unreadNotifications}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Help section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-sidebar-foreground">
                Hilfe benötigt?
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Unser Team ist für Sie da.
            </p>
            <Button size="sm" variant="outline" className="w-full text-xs">
              Kontakt aufnehmen
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}