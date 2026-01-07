import { motion } from "framer-motion";
import { MapPin, Building2, Stethoscope, Accessibility, HelpCircle, Info } from "lucide-react";
import { AddressAndServices } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AddressServicesSectionProps {
  data: AddressAndServices;
}

export function AddressServicesSection({ data }: AddressServicesSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <MapPin className="w-5 h-5 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Adresse & Dienste
            </h2>
            <p className="text-sm text-muted-foreground">
              Informationen für Bestellungen und Dienstleistungen
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm">
              <strong>Warum sehe ich das?</strong><br />
              Diese Daten werden ausschließlich verwendet, um Bestellungen (Lebensmittel, Taxi, Medikamente) korrekt auszuführen – nicht für medizinische Zwecke.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Info Banner */}
      <div className="bg-secondary/50 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-secondary-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-secondary-foreground">
          Diese Informationen werden nur verwendet, um angeforderte Dienste (wie Lebensmittellieferungen oder Taxifahrten) korrekt auszuführen. Sie werden nicht für medizinische Entscheidungen genutzt.
        </p>
      </div>

      <div className="space-y-6">
        {/* Home Address */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">
              Wohnadresse
            </Label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="street" className="text-xs text-muted-foreground">
                Straße & Hausnummer
              </Label>
              <Input
                id="street"
                defaultValue={data.homeAddress.street}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode" className="text-xs text-muted-foreground">
                Postleitzahl
              </Label>
              <Input
                id="postalCode"
                defaultValue={data.homeAddress.postalCode}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs text-muted-foreground">
                Stadt
              </Label>
              <Input
                id="city"
                defaultValue={data.homeAddress.city}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        {/* Pharmacy */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">
              Bevorzugte Apotheke
            </Label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pharmacyName" className="text-xs text-muted-foreground">
                Name der Apotheke
              </Label>
              <Input
                id="pharmacyName"
                defaultValue={data.preferredPharmacy.name}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacyPhone" className="text-xs text-muted-foreground">
                Telefonnummer
              </Label>
              <Input
                id="pharmacyPhone"
                type="tel"
                defaultValue={data.preferredPharmacy.phone}
                className="bg-background"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="pharmacyAddress" className="text-xs text-muted-foreground">
                Adresse
              </Label>
              <Input
                id="pharmacyAddress"
                defaultValue={data.preferredPharmacy.address}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        {/* Doctor */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">
              Hausarzt
            </Label>
            <span className="text-xs text-muted-foreground">(nur Name, keine medizinischen Daten)</span>
          </div>
          <Input
            defaultValue={data.doctorName}
            placeholder="Name des Hausarztes"
            className="bg-background"
          />
        </div>

        {/* Mobility Notes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">
              Hinweise zur Mobilität
            </Label>
          </div>
          <Textarea
            defaultValue={data.mobilityNotes}
            placeholder="z.B. Wohnung im Erdgeschoss, nutzt Rollator, bevorzugt Taxi bei Regen..."
            className="min-h-[80px] resize-none bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Hilft bei der Planung von Taxifahrten und Lieferungen.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
