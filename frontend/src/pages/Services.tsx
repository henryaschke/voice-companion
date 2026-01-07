import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { serviceOrders } from "@/data/mockData";
import { ServiceOrder } from "@/types/dashboard";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Pill,
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const typeConfig = {
  essen: {
    icon: UtensilsCrossed,
    label: "Essen",
    color: "bg-chart-4/10 text-chart-4",
  },
  lebensmittel: {
    icon: ShoppingCart,
    label: "Lebensmittel",
    color: "bg-chart-2/10 text-chart-2",
  },
  taxi: {
    icon: Car,
    label: "Taxi",
    color: "bg-chart-5/10 text-chart-5",
  },
  medikamente: {
    icon: Pill,
    label: "Medikamente",
    color: "bg-chart-3/10 text-chart-3",
  },
  sonstiges: {
    icon: Package,
    label: "Sonstiges",
    color: "bg-muted text-muted-foreground",
  },
};

const statusConfig = {
  angefragt: {
    icon: Clock,
    label: "Angefragt",
    className: "bg-muted text-muted-foreground border-border",
  },
  bestätigt: {
    icon: CheckCircle,
    label: "Bestätigt",
    className: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  },
  unterwegs: {
    icon: Truck,
    label: "Unterwegs",
    className: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  geliefert: {
    icon: CheckCircle,
    label: "Geliefert",
    className: "bg-status-positive/10 text-status-positive border-status-positive/20",
  },
  abgeschlossen: {
    icon: CheckCircle,
    label: "Abgeschlossen",
    className: "bg-secondary text-secondary-foreground border-border",
  },
};

const Services = () => {
  const activeOrders = serviceOrders.filter(
    (order) => !["geliefert", "abgeschlossen"].includes(order.status)
  );
  const completedOrders = serviceOrders.filter(
    (order) => ["geliefert", "abgeschlossen"].includes(order.status)
  );

  const renderOrder = (order: ServiceOrder, index: number) => {
    const type = typeConfig[order.type];
    const status = statusConfig[order.status];
    const TypeIcon = type.icon;
    const StatusIcon = status.icon;

    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="bg-card rounded-2xl border border-border p-5 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            type.color
          )}>
            <TypeIcon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-medium text-foreground">
                  {order.description}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {type.label} · {format(order.requestedAt, "d. MMM, HH:mm 'Uhr'", { locale: de })}
                </p>
              </div>
              <Badge variant="outline" className={status.className}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>

            {order.details && (
              <p className="text-sm text-foreground/80 bg-muted/50 rounded-lg p-3 mt-3">
                {order.details}
              </p>
            )}

            {order.completedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Abgeschlossen: {format(order.completedAt, "d. MMM, HH:mm 'Uhr'", { locale: de })}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Bestellungen & Dienste
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Alle von Margarete angeforderten Dienste.
          </p>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          {Object.entries(typeConfig).map(([key, config]) => {
            const count = serviceOrders.filter((o) => o.type === key).length;
            const Icon = config.icon;
            return (
              <div
                key={key}
                className="bg-card rounded-xl border border-border p-4 text-center"
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2",
                  config.color
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-display font-semibold text-foreground">
                  {count}
                </p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            );
          })}
        </motion.div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse-gentle" />
              Aktive Bestellungen
            </h2>
            <div className="space-y-4">
              {activeOrders.map((order, index) => renderOrder(order, index))}
            </div>
          </div>
        )}

        {/* Completed Orders */}
        {completedOrders.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-4">
              Abgeschlossene Bestellungen
            </h2>
            <div className="space-y-4 opacity-80">
              {completedOrders.map((order, index) => renderOrder(order, index))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Services;
