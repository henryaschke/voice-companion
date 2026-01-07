import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { lovedOne, addressAndServices, consentSettings } from "@/data/mockData";
import {
  Phone,
  Heart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressServicesSection } from "@/components/settings/AddressServicesSection";
import { ConsentSection } from "@/components/settings/ConsentSection";

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Einstellungen
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Anrufpräferenzen, Dienste und Datenschutz verwalten.
          </p>
        </div>

        <div className="space-y-8">
          {/* Call Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Anrufeinstellungen
                </h2>
                <p className="text-sm text-muted-foreground">
                  Wann und wie oft soll angerufen werden?
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="frequency" className="text-foreground">
                  Anrufhäufigkeit
                </Label>
                <Select defaultValue={lovedOne.preferences.callFrequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="täglich">Täglich</SelectItem>
                    <SelectItem value="zweimal_täglich">Zweimal täglich</SelectItem>
                    <SelectItem value="wöchentlich">Wöchentlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-foreground">
                  Bevorzugte Uhrzeit
                </Label>
                <Select defaultValue={lovedOne.preferences.preferredTime}>
                  <SelectTrigger id="time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">09:00 Uhr</SelectItem>
                    <SelectItem value="10:00">10:00 Uhr</SelectItem>
                    <SelectItem value="11:00">11:00 Uhr</SelectItem>
                    <SelectItem value="14:00">14:00 Uhr</SelectItem>
                    <SelectItem value="15:00">15:00 Uhr</SelectItem>
                    <SelectItem value="16:00">16:00 Uhr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Emergency Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Notfallkontakt
                </h2>
                <p className="text-sm text-muted-foreground">
                  Wer wird im Notfall kontaktiert?
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="emergency-name" className="text-foreground">
                  Name
                </Label>
                <Input
                  id="emergency-name"
                  defaultValue={lovedOne.emergencyContact.name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-relation" className="text-foreground">
                  Beziehung
                </Label>
                <Input
                  id="emergency-relation"
                  defaultValue={lovedOne.emergencyContact.relation}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="emergency-phone" className="text-foreground">
                  Telefonnummer
                </Label>
                <Input
                  id="emergency-phone"
                  type="tel"
                  defaultValue={lovedOne.emergencyContact.phone}
                />
              </div>
            </div>
          </motion.div>

          {/* Address & Services - NEW */}
          <AddressServicesSection data={addressAndServices} />

          {/* Notifications Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Phone className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Benachrichtigungen
                </h2>
                <p className="text-sm text-muted-foreground">
                  Welche Hinweise möchten Sie erhalten?
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { id: "missed", label: "Verpasste Anrufe", desc: "Wenn ein geplanter Anruf nicht entgegengenommen wird", default: true },
                { id: "concerns", label: "Wiederholte Sorgen", desc: "Wenn das gleiche Thema mehrfach erwähnt wird", default: true },
                { id: "engagement", label: "Niedrige Aktivität", desc: "Wenn die Gesprächszeit deutlich sinkt", default: true },
                { id: "positive", label: "Positive Momente", desc: "Besonders schöne Gespräche und Fortschritte", default: false },
                { id: "weekly", label: "Wöchentliche Zusammenfassung", desc: "Jeden Sonntag per E-Mail", default: true },
              ].map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.default} />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Consent Settings - NEW */}
          <ConsentSection settings={consentSettings} />

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex justify-end"
          >
            <Button size="lg" className="px-8">
              <Heart className="w-4 h-4 mr-2" />
              Änderungen speichern
            </Button>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
