import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type PortalType = "familie" | "pflegeeinrichtung" | "arzt";

interface PortalContextType {
  currentPortal: PortalType;
  setCurrentPortal: (portal: PortalType) => void;
  switchPortal: (portal: PortalType) => void;
  portalConfig: {
    name: string;
    description: string;
  };
}

const portalConfigs: Record<PortalType, { name: string; description: string }> = {
  familie: {
    name: "Familienportal",
    description: "Für Angehörige",
  },
  pflegeeinrichtung: {
    name: "Pflegeeinrichtung",
    description: "Für Mitarbeitende",
  },
  arzt: {
    name: "Ärzt:innen",
    description: "Für Ärzt:innen",
  },
};

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [currentPortal, setCurrentPortal] = useState<PortalType>("familie");

  return (
    <PortalContext.Provider
      value={{
        currentPortal,
        setCurrentPortal,
        switchPortal: setCurrentPortal,
        portalConfig: portalConfigs[currentPortal],
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return context;
}

// Hook to sync portal state with current route
export function usePortalRouteSync() {
  const location = useLocation();
  const { currentPortal, setCurrentPortal } = usePortal();

  useEffect(() => {
    if (location.pathname.startsWith("/care")) {
      if (currentPortal !== "pflegeeinrichtung") {
        setCurrentPortal("pflegeeinrichtung");
      }
    } else if (location.pathname.startsWith("/doctor")) {
      if (currentPortal !== "arzt") {
        setCurrentPortal("arzt");
      }
    } else {
      if (currentPortal !== "familie") {
        setCurrentPortal("familie");
      }
    }
  }, [location.pathname, setCurrentPortal, currentPortal]);
}
