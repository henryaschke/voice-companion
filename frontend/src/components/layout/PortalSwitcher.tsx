import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Users, Home, Check, Stethoscope } from "lucide-react";
import { usePortal, PortalType } from "@/contexts/PortalContext";
import { cn } from "@/lib/utils";

const portals: { id: PortalType; name: string; description: string; icon: React.ElementType; defaultRoute: string }[] = [
  {
    id: "familie",
    name: "Familienportal",
    description: "Für Angehörige",
    icon: Home,
    defaultRoute: "/",
  },
  {
    id: "pflegeeinrichtung",
    name: "Pflegeeinrichtung",
    description: "Für Mitarbeitende",
    icon: Users,
    defaultRoute: "/care/residents",
  },
  {
    id: "arzt",
    name: "Ärzt:innen",
    description: "Für Ärzt:innen",
    icon: Stethoscope,
    defaultRoute: "/doctor/patients",
  },
];

export function PortalSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { currentPortal, setCurrentPortal } = usePortal();

  const currentPortalConfig = portals.find((p) => p.id === currentPortal)!;
  const CurrentIcon = currentPortalConfig.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
          "hover:bg-sidebar-accent/50 group",
          isOpen && "bg-sidebar-accent/50"
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <CurrentIcon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">
            {currentPortalConfig.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentPortalConfig.description}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute left-0 right-0 top-full mt-2 z-50",
                "bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
              )}
            >
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Portal wechseln
                </p>
                {portals.map((portal) => {
                  const Icon = portal.icon;
                  const isSelected = portal.id === currentPortal;

                  return (
                    <button
                      key={portal.id}
                      onClick={() => {
                        setCurrentPortal(portal.id);
                        navigate(portal.defaultRoute);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors",
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isSelected ? "bg-primary/20" : "bg-muted"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-primary" : "text-foreground"
                          )}
                        >
                          {portal.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {portal.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
