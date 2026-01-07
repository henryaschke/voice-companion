import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { usePortal } from "@/contexts/PortalContext";
import { useToast } from "@/hooks/use-toast";
import { createSenior, createPatient, CreatePersonPayload } from "@/api/people";
import { 
  User, 
  Phone, 
  MapPin, 
  Users, 
  Pill, 
  MessageSquare,
  ChevronRight,
  Check,
  ArrowLeft,
  Heart,
  Calendar,
  ClipboardList,
  Home,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

type PortalType = "familie" | "pflegeeinrichtung" | "arzt";

interface StepConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

// Portal-specific step configurations
const getStepsForPortal = (portal: PortalType): StepConfig[] => {
  switch (portal) {
    case "familie":
      return [
        { id: "basics", label: "Grunddaten", icon: User, description: "Name, Alter und Foto" },
        { id: "emergency", label: "Notfallkontakt", icon: Phone, description: "Kontaktperson für Notfälle" },
        { id: "preferences", label: "Anrufpräferenzen", icon: MessageSquare, description: "Wie und wann soll angerufen werden" },
        { id: "context", label: "Persönlicher Kontext", icon: Heart, description: "Interessen, Routinen und Gesprächsthemen" },
        { id: "services", label: "Adresse & Services", icon: MapPin, description: "Wohnadresse und Dienstleister" },
        { id: "review", label: "Überprüfen", icon: Check, description: "Daten bestätigen" },
      ];
    case "pflegeeinrichtung":
      return [
        { id: "basics", label: "Grunddaten", icon: User, description: "Persönliche Informationen" },
        { id: "living", label: "Wohnsituation", icon: Home, description: "Standort, Zimmer und Pflegegrad" },
        { id: "contact", label: "Bezugspersonen", icon: Users, description: "Angehörige und Kontaktpersonen" },
        { id: "communication", label: "Kommunikation", icon: MessageSquare, description: "Sprache und Präferenzen" },
        { id: "medical", label: "Medizinische Infos", icon: Pill, description: "Diagnosen, Medikamente, Allergien" },
        { id: "review", label: "Überprüfen", icon: Check, description: "Daten bestätigen" },
      ];
    case "arzt":
      return [
        { id: "basics", label: "Grunddaten", icon: User, description: "Name, Alter und Wohnsituation" },
        { id: "appointments", label: "Termine", icon: Calendar, description: "Letzter und nächster Besuch" },
        { id: "signals", label: "Beobachtungsbereiche", icon: ClipboardList, description: "Welche Signale verfolgt werden sollen" },
        { id: "review", label: "Überprüfen", icon: Check, description: "Daten bestätigen" },
      ];
    default:
      return [];
  }
};

export default function AddUser() {
  const navigate = useNavigate();
  const { currentPortal } = usePortal();
  const steps = getStepsForPortal(currentPortal);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Unified form state for all portals
  const [formData, setFormData] = useState({
    // Common basics
    vollstaendigerName: "",
    telefonnummer: "",
    geburtsdatum: "",
    alter: "",
    geschlecht: "",
    
    // Familie: Emergency contact
    notfallkontaktName: "",
    notfallkontaktTelefon: "",
    notfallkontaktBeziehung: "",
    
    // Familie: Preferences
    anrufhaeufigkeit: "",
    bevorzugteZeit: "",
    sprache: "Deutsch",
    
    // Familie: Personal context
    beschreibung: "",
    wichtigePersonen: "",
    interessen: "",
    routinen: "",
    gespraechsthemen: "",
    sensibilitaeten: "",
    
    // Familie: Address & services
    strasse: "",
    stadt: "",
    plz: "",
    apothekeName: "",
    apothekenAdresse: "",
    apothekenTelefon: "",
    arztName: "",
    mobilitaetshinweise: "",
    
    // Pflegeeinrichtung: Living situation
    standort: "",
    zimmernummer: "",
    wohnform: "",
    einzugsdatum: "",
    pflegegrad: "",
    
    // Pflegeeinrichtung: Contact persons
    bezugsperson1Name: "",
    bezugsperson1Beziehung: "",
    bezugsperson1Telefon: "",
    bezugsperson2Name: "",
    bezugsperson2Beziehung: "",
    bezugsperson2Telefon: "",
    angehoerigeEingebunden: false,
    
    // Pflegeeinrichtung: Communication
    bevorzugteAnrufzeiten: "",
    dialekt: "",
    hoergeraet: false,
    sehbeeintraechtigung: false,
    
    // Pflegeeinrichtung: Medical
    medikamente: "",
    diagnosen: "",
    allergien: "",
    mobilitaet: "",
    ernaehrung: "",
    
    // Arzt: Living situation
    wohnsituation: "",
    
    // Arzt: Appointments
    letzterBesuch: "",
    naechsterTermin: "",
    
    // Arzt: Signal categories
    beobachteSchlaf: true,
    beobachteStimmung: true,
    beobachteEngagement: true,
    beobachteMedikation: true,
    signalNotizen: "",
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPortalLabel = () => {
    switch (currentPortal) {
      case "familie": return "Familienmitglied";
      case "pflegeeinrichtung": return "Bewohner:in";
      case "arzt": return "Patient:in";
      default: return "Person";
    }
  };

  const getBackPath = () => {
    switch (currentPortal) {
      case "familie": return "/";
      case "pflegeeinrichtung": return "/care/residents";
      case "arzt": return "/doctor/patients";
      default: return "/";
    }
  };

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const nextStep = () => {
    if (!isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.vollstaendigerName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.telefonnummer.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie eine Telefonnummer ein.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build the payload for the API
      const payload: CreatePersonPayload = {
        display_name: formData.vollstaendigerName.trim(),
        phone_e164: formData.telefonnummer.trim(),
        age: formData.alter ? parseInt(formData.alter, 10) : null,
        language: formData.sprache || "de",
        consent_recording: false,  // Default safe value
        retention_days: 30,        // Default value
        personal_context: {
          short_description: formData.beschreibung || undefined,
          interests: formData.interessen || undefined,
          important_people: formData.wichtigePersonen || undefined,
          preferred_topics: formData.gespraechsthemen || undefined,
          daily_routines: formData.routinen || undefined,
          sensitivities: formData.sensibilitaeten || undefined,
          // Care home / clinical fields
          diagnoses: formData.diagnosen || undefined,
          medications: formData.medikamente || undefined,
          allergies: formData.allergien || undefined,
          mobility: formData.mobilitaet || undefined,
          nutrition: formData.ernaehrung || undefined,
        },
        address: {
          street_house_number: formData.strasse || undefined,
          postal_code: formData.plz || undefined,
          city: formData.stadt || undefined,
        },
      };

      // Call the appropriate API based on portal
      if (currentPortal === "familie") {
        await createSenior(payload);
      } else if (currentPortal === "pflegeeinrichtung" || currentPortal === "arzt") {
        // For MVP: care home and doctor also use patients endpoint
        await createPatient(payload);
      } else {
        await createSenior(payload);
      }

      toast({
        title: "Erfolgreich gespeichert",
        description: `${formData.vollstaendigerName} wurde erfolgreich angelegt.`,
      });

      navigate(getBackPath());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten.";
      toast({
        title: "Fehler beim Speichern",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================
  // FAMILIENPORTAL STEPS
  // =====================
  const renderFamilieBasics = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vollstaendigerName">Vollständiger Name *</Label>
          <Input
            id="vollstaendigerName"
            value={formData.vollstaendigerName}
            onChange={(e) => updateField("vollstaendigerName", e.target.value)}
            placeholder="z.B. Erika Mustermann"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefonnummer">Telefonnummer *</Label>
          <Input
            id="telefonnummer"
            type="tel"
            value={formData.telefonnummer}
            onChange={(e) => updateField("telefonnummer", e.target.value)}
            placeholder="z.B. 0171 1234567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="alter">Alter</Label>
          <Input
            id="alter"
            type="number"
            value={formData.alter}
            onChange={(e) => updateField("alter", e.target.value)}
            placeholder="z.B. 78"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
          <Input
            id="geburtsdatum"
            type="date"
            value={formData.geburtsdatum}
            onChange={(e) => updateField("geburtsdatum", e.target.value)}
          />
        </div>
      </div>
    </>
  );

  const renderFamilieEmergency = () => (
    <>
      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        Diese Person wird im Notfall kontaktiert und erhält wichtige Benachrichtigungen.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="notfallkontaktName">Name</Label>
          <Input
            id="notfallkontaktName"
            value={formData.notfallkontaktName}
            onChange={(e) => updateField("notfallkontaktName", e.target.value)}
            placeholder="z.B. Thomas Mustermann"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notfallkontaktBeziehung">Beziehung</Label>
          <Input
            id="notfallkontaktBeziehung"
            value={formData.notfallkontaktBeziehung}
            onChange={(e) => updateField("notfallkontaktBeziehung", e.target.value)}
            placeholder="z.B. Sohn"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notfallkontaktTelefon">Telefonnummer</Label>
        <Input
          id="notfallkontaktTelefon"
          value={formData.notfallkontaktTelefon}
          onChange={(e) => updateField("notfallkontaktTelefon", e.target.value)}
          placeholder="z.B. 0171 1234567"
        />
      </div>
    </>
  );

  const renderFamiliePreferences = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="anrufhaeufigkeit">Anrufhäufigkeit *</Label>
          <Select value={formData.anrufhaeufigkeit} onValueChange={(v) => updateField("anrufhaeufigkeit", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="täglich">Täglich</SelectItem>
              <SelectItem value="zweimal_täglich">Zweimal täglich</SelectItem>
              <SelectItem value="wöchentlich">Wöchentlich</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bevorzugteZeit">Bevorzugte Uhrzeit</Label>
          <Input
            id="bevorzugteZeit"
            value={formData.bevorzugteZeit}
            onChange={(e) => updateField("bevorzugteZeit", e.target.value)}
            placeholder="z.B. 10:00 Uhr vormittags"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="sprache">Sprache</Label>
        <Input
          id="sprache"
          value={formData.sprache}
          onChange={(e) => updateField("sprache", e.target.value)}
          placeholder="z.B. Deutsch"
        />
      </div>
    </>
  );

  const renderFamilieContext = () => (
    <>
      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        Diese Informationen helfen der KI, Gespräche persönlich und relevant zu gestalten.
      </p>
      <div className="space-y-2">
        <Label htmlFor="beschreibung">Kurze Beschreibung</Label>
        <Textarea
          id="beschreibung"
          value={formData.beschreibung}
          onChange={(e) => updateField("beschreibung", e.target.value)}
          placeholder="z.B. Erika ist eine lebhafte 78-jährige Witwe, die gerne über ihre Enkel spricht..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wichtigePersonen">Wichtige Personen</Label>
        <Textarea
          id="wichtigePersonen"
          value={formData.wichtigePersonen}
          onChange={(e) => updateField("wichtigePersonen", e.target.value)}
          placeholder="z.B. Thomas (Sohn), Anna (Enkelin), Max (Enkel)"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">Namen und Beziehung, kommagetrennt</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="interessen">Interessen & Hobbys</Label>
          <Textarea
            id="interessen"
            value={formData.interessen}
            onChange={(e) => updateField("interessen", e.target.value)}
            placeholder="z.B. Stricken, Gartenarbeit, Kreuzworträtsel"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="routinen">Tägliche Routinen</Label>
          <Textarea
            id="routinen"
            value={formData.routinen}
            onChange={(e) => updateField("routinen", e.target.value)}
            placeholder="z.B. Morgens Kaffee, nachmittags Spaziergang"
            rows={2}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gespraechsthemen">Bevorzugte Gesprächsthemen</Label>
          <Textarea
            id="gespraechsthemen"
            value={formData.gespraechsthemen}
            onChange={(e) => updateField("gespraechsthemen", e.target.value)}
            placeholder="z.B. Familie, Wetter, Nachrichten"
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sensibilitaeten">Sensibilitäten / Themen vermeiden</Label>
          <Textarea
            id="sensibilitaeten"
            value={formData.sensibilitaeten}
            onChange={(e) => updateField("sensibilitaeten", e.target.value)}
            placeholder="z.B. Krankheit des verstorbenen Ehemannes"
            rows={2}
          />
        </div>
      </div>
    </>
  );

  const renderFamilieServices = () => (
    <>
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Wohnadresse
        </h4>
        <div className="space-y-2">
          <Label htmlFor="strasse">Straße und Hausnummer</Label>
          <Input
            id="strasse"
            value={formData.strasse}
            onChange={(e) => updateField("strasse", e.target.value)}
            placeholder="z.B. Musterstraße 12"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plz">PLZ</Label>
            <Input
              id="plz"
              value={formData.plz}
              onChange={(e) => updateField("plz", e.target.value)}
              placeholder="z.B. 12345"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stadt">Stadt</Label>
            <Input
              id="stadt"
              value={formData.stadt}
              onChange={(e) => updateField("stadt", e.target.value)}
              placeholder="z.B. Berlin"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Bevorzugte Apotheke</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="apothekeName">Name</Label>
            <Input
              id="apothekeName"
              value={formData.apothekeName}
              onChange={(e) => updateField("apothekeName", e.target.value)}
              placeholder="z.B. Löwen-Apotheke"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apothekenTelefon">Telefon</Label>
            <Input
              id="apothekenTelefon"
              value={formData.apothekenTelefon}
              onChange={(e) => updateField("apothekenTelefon", e.target.value)}
              placeholder="z.B. 030 1234567"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="apothekenAdresse">Adresse</Label>
          <Input
            id="apothekenAdresse"
            value={formData.apothekenAdresse}
            onChange={(e) => updateField("apothekenAdresse", e.target.value)}
            placeholder="z.B. Hauptstraße 5, 12345 Berlin"
          />
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="arztName">Hausarzt</Label>
          <Input
            id="arztName"
            value={formData.arztName}
            onChange={(e) => updateField("arztName", e.target.value)}
            placeholder="z.B. Dr. Schmidt"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobilitaetshinweise">Mobilitätshinweise</Label>
          <Input
            id="mobilitaetshinweise"
            value={formData.mobilitaetshinweise}
            onChange={(e) => updateField("mobilitaetshinweise", e.target.value)}
            placeholder="z.B. nutzt Gehstock"
          />
        </div>
      </div>
    </>
  );

  // ============================
  // PFLEGEEINRICHTUNG STEPS
  // ============================
  const renderPflegeBasics = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vollstaendigerName">Vollständiger Name *</Label>
          <Input
            id="vollstaendigerName"
            value={formData.vollstaendigerName}
            onChange={(e) => updateField("vollstaendigerName", e.target.value)}
            placeholder="z.B. Maria Theresia Müller"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefonnummer">Telefonnummer *</Label>
          <Input
            id="telefonnummer"
            type="tel"
            value={formData.telefonnummer}
            onChange={(e) => updateField("telefonnummer", e.target.value)}
            placeholder="z.B. 0171 1234567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
          <Input
            id="geburtsdatum"
            type="date"
            value={formData.geburtsdatum}
            onChange={(e) => updateField("geburtsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="geschlecht">Geschlecht</Label>
          <Select value={formData.geschlecht} onValueChange={(v) => updateField("geschlecht", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weiblich">Weiblich</SelectItem>
              <SelectItem value="männlich">Männlich</SelectItem>
              <SelectItem value="divers">Divers</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alter">Alter</Label>
          <Input
            id="alter"
            type="number"
            value={formData.alter}
            onChange={(e) => updateField("alter", e.target.value)}
            placeholder="z.B. 82"
          />
        </div>
      </div>
    </>
  );

  const renderPflegeLiving = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="standort">Standort / Einrichtung *</Label>
          <Input
            id="standort"
            value={formData.standort}
            onChange={(e) => updateField("standort", e.target.value)}
            placeholder="z.B. Seniorenresidenz Am Park"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zimmernummer">Zimmernummer *</Label>
          <Input
            id="zimmernummer"
            value={formData.zimmernummer}
            onChange={(e) => updateField("zimmernummer", e.target.value)}
            placeholder="z.B. 12"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wohnform">Wohnform</Label>
          <Select value={formData.wohnform} onValueChange={(v) => updateField("wohnform", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pflegeheim">Pflegeheim</SelectItem>
              <SelectItem value="betreutes-wohnen">Betreutes Wohnen</SelectItem>
              <SelectItem value="tagespflege">Tagespflege</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="einzugsdatum">Einzugsdatum</Label>
          <Input
            id="einzugsdatum"
            type="date"
            value={formData.einzugsdatum}
            onChange={(e) => updateField("einzugsdatum", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pflegegrad">Pflegegrad</Label>
          <Select value={formData.pflegegrad} onValueChange={(v) => updateField("pflegegrad", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Kein Pflegegrad</SelectItem>
              <SelectItem value="1">Pflegegrad 1</SelectItem>
              <SelectItem value="2">Pflegegrad 2</SelectItem>
              <SelectItem value="3">Pflegegrad 3</SelectItem>
              <SelectItem value="4">Pflegegrad 4</SelectItem>
              <SelectItem value="5">Pflegegrad 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  const renderPflegeContact = () => (
    <>
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-foreground">Hauptbezugsperson</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bezugsperson1Name">Name</Label>
            <Input
              id="bezugsperson1Name"
              value={formData.bezugsperson1Name}
              onChange={(e) => updateField("bezugsperson1Name", e.target.value)}
              placeholder="z.B. Thomas Müller"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bezugsperson1Beziehung">Beziehung</Label>
            <Input
              id="bezugsperson1Beziehung"
              value={formData.bezugsperson1Beziehung}
              onChange={(e) => updateField("bezugsperson1Beziehung", e.target.value)}
              placeholder="z.B. Sohn"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bezugsperson1Telefon">Telefon</Label>
            <Input
              id="bezugsperson1Telefon"
              value={formData.bezugsperson1Telefon}
              onChange={(e) => updateField("bezugsperson1Telefon", e.target.value)}
              placeholder="z.B. 0171 1234567"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">Weitere Bezugsperson (optional)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bezugsperson2Name">Name</Label>
            <Input
              id="bezugsperson2Name"
              value={formData.bezugsperson2Name}
              onChange={(e) => updateField("bezugsperson2Name", e.target.value)}
              placeholder="z.B. Anna Müller"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bezugsperson2Beziehung">Beziehung</Label>
            <Input
              id="bezugsperson2Beziehung"
              value={formData.bezugsperson2Beziehung}
              onChange={(e) => updateField("bezugsperson2Beziehung", e.target.value)}
              placeholder="z.B. Tochter"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bezugsperson2Telefon">Telefon</Label>
            <Input
              id="bezugsperson2Telefon"
              value={formData.bezugsperson2Telefon}
              onChange={(e) => updateField("bezugsperson2Telefon", e.target.value)}
              placeholder="z.B. 0172 7654321"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div>
          <Label htmlFor="angehoerigeEingebunden" className="text-sm font-medium">
            Angehörige aktiv eingebunden
          </Label>
          <p className="text-xs text-muted-foreground">
            Erhalten Zusammenfassungen und Benachrichtigungen
          </p>
        </div>
        <Switch
          id="angehoerigeEingebunden"
          checked={formData.angehoerigeEingebunden}
          onCheckedChange={(v) => updateField("angehoerigeEingebunden", v)}
        />
      </div>
    </>
  );

  const renderPflegeCommunication = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bevorzugteAnrufzeiten">Bevorzugte Anrufzeiten</Label>
          <Input
            id="bevorzugteAnrufzeiten"
            value={formData.bevorzugteAnrufzeiten}
            onChange={(e) => updateField("bevorzugteAnrufzeiten", e.target.value)}
            placeholder="z.B. Vormittags (9-11 Uhr)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dialekt">Sprache / Dialekt</Label>
          <Input
            id="dialekt"
            value={formData.dialekt}
            onChange={(e) => updateField("dialekt", e.target.value)}
            placeholder="z.B. Deutsch, Plattdeutsch"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <Label htmlFor="hoergeraet" className="text-sm">Hörgerät</Label>
          <Switch
            id="hoergeraet"
            checked={formData.hoergeraet}
            onCheckedChange={(v) => updateField("hoergeraet", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <Label htmlFor="sehbeeintraechtigung" className="text-sm">Sehbeeinträchtigung</Label>
          <Switch
            id="sehbeeintraechtigung"
            checked={formData.sehbeeintraechtigung}
            onCheckedChange={(v) => updateField("sehbeeintraechtigung", v)}
          />
        </div>
      </div>
    </>
  );

  const renderPflegeMedical = () => (
    <>
      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        Diese Informationen sind optional und helfen der KI, Gespräche anzupassen. 
        Es handelt sich nicht um eine medizinische Dokumentation.
      </p>

      <div className="space-y-2">
        <Label htmlFor="diagnosen">Relevante Diagnosen</Label>
        <Textarea
          id="diagnosen"
          value={formData.diagnosen}
          onChange={(e) => updateField("diagnosen", e.target.value)}
          placeholder="z.B. Bluthochdruck (seit 2015), Diabetes Typ 2 (seit 2018)"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="medikamente">Medikamente</Label>
        <Textarea
          id="medikamente"
          value={formData.medikamente}
          onChange={(e) => updateField("medikamente", e.target.value)}
          placeholder="z.B. Metoprolol 50mg morgens, Pantoprazol 20mg abends"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Name, Dosierung und Einnahmezeit je Medikament
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allergien">Allergien / Unverträglichkeiten</Label>
        <Input
          id="allergien"
          value={formData.allergien}
          onChange={(e) => updateField("allergien", e.target.value)}
          placeholder="z.B. Penicillin, Laktose"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mobilitaet">Mobilität</Label>
          <Select value={formData.mobilitaet} onValueChange={(v) => updateField("mobilitaet", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="selbststaendig">Selbstständig</SelectItem>
              <SelectItem value="gehhilfe">Mit Gehhilfe</SelectItem>
              <SelectItem value="rollstuhl">Rollstuhl</SelectItem>
              <SelectItem value="bettlaegerig">Bettlägerig</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ernaehrung">Ernährung</Label>
          <Select value={formData.ernaehrung} onValueChange={(v) => updateField("ernaehrung", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normalkost</SelectItem>
              <SelectItem value="pueriert">Püriert</SelectItem>
              <SelectItem value="diabetiker">Diabetikerkost</SelectItem>
              <SelectItem value="sonde">Sondenernährung</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  // ==================
  // ARZTPORTAL STEPS
  // ==================
  const renderArztBasics = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vollstaendigerName">Vollständiger Name *</Label>
          <Input
            id="vollstaendigerName"
            value={formData.vollstaendigerName}
            onChange={(e) => updateField("vollstaendigerName", e.target.value)}
            placeholder="z.B. Hans Schmidt"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefonnummer">Telefonnummer *</Label>
          <Input
            id="telefonnummer"
            type="tel"
            value={formData.telefonnummer}
            onChange={(e) => updateField("telefonnummer", e.target.value)}
            placeholder="z.B. 0171 1234567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="alter">Alter</Label>
          <Input
            id="alter"
            type="number"
            value={formData.alter}
            onChange={(e) => updateField("alter", e.target.value)}
            placeholder="z.B. 72"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wohnsituation">Wohnsituation</Label>
          <Select value={formData.wohnsituation} onValueChange={(v) => updateField("wohnsituation", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zuhause">Zuhause (allein)</SelectItem>
              <SelectItem value="zuhause-partner">Zuhause (mit Partner:in)</SelectItem>
              <SelectItem value="zuhause-familie">Zuhause (bei Familie)</SelectItem>
              <SelectItem value="betreut">Betreutes Wohnen</SelectItem>
              <SelectItem value="pflegeheim">Pflegeheim</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  const renderArztAppointments = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="letzterBesuch">Letzter Arztbesuch</Label>
          <Input
            id="letzterBesuch"
            type="date"
            value={formData.letzterBesuch}
            onChange={(e) => updateField("letzterBesuch", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="naechsterTermin">Nächster Termin</Label>
          <Input
            id="naechsterTermin"
            type="date"
            value={formData.naechsterTermin}
            onChange={(e) => updateField("naechsterTermin", e.target.value)}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        Der nächste Termin bestimmt, für welches Gespräch die KI-Zusammenfassung vorbereitet wird.
      </p>
    </>
  );

  const renderArztSignals = () => (
    <>
      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        Wählen Sie, welche Bereiche die KI in Gesprächen beobachten und im Briefing zusammenfassen soll.
      </p>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <Label htmlFor="beobachteSchlaf" className="text-sm font-medium">Schlaf</Label>
            <p className="text-xs text-muted-foreground">Erwähnungen von Schlafqualität, Müdigkeit</p>
          </div>
          <Switch
            id="beobachteSchlaf"
            checked={formData.beobachteSchlaf}
            onCheckedChange={(v) => updateField("beobachteSchlaf", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <Label htmlFor="beobachteStimmung" className="text-sm font-medium">Stimmung</Label>
            <p className="text-xs text-muted-foreground">Emotionale Hinweise, Freude, Sorgen</p>
          </div>
          <Switch
            id="beobachteStimmung"
            checked={formData.beobachteStimmung}
            onCheckedChange={(v) => updateField("beobachteStimmung", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <Label htmlFor="beobachteEngagement" className="text-sm font-medium">Gesprächsengagement</Label>
            <p className="text-xs text-muted-foreground">Gesprächslänge, Teilnahmebereitschaft</p>
          </div>
          <Switch
            id="beobachteEngagement"
            checked={formData.beobachteEngagement}
            onCheckedChange={(v) => updateField("beobachteEngagement", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div>
            <Label htmlFor="beobachteMedikation" className="text-sm font-medium">Medikamenteneinnahme</Label>
            <p className="text-xs text-muted-foreground">Erwähnungen zur Einnahme oder Vergessen</p>
          </div>
          <Switch
            id="beobachteMedikation"
            checked={formData.beobachteMedikation}
            onCheckedChange={(v) => updateField("beobachteMedikation", v)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signalNotizen">Zusätzliche Hinweise</Label>
        <Textarea
          id="signalNotizen"
          value={formData.signalNotizen}
          onChange={(e) => updateField("signalNotizen", e.target.value)}
          placeholder="z.B. Besonders auf Erwähnungen von Schmerzen achten"
          rows={2}
        />
      </div>
    </>
  );

  // ==============
  // REVIEW STEPS
  // ==============
  const renderFamilieReview = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" /> Grunddaten
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {formData.vollstaendigerName || "–"}</div>
          <div><span className="text-muted-foreground">Telefon:</span> {formData.telefonnummer || "–"}</div>
          <div><span className="text-muted-foreground">Alter:</span> {formData.alter || "–"}</div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Phone className="w-4 h-4" /> Notfallkontakt
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {formData.notfallkontaktName || "–"}</div>
          <div><span className="text-muted-foreground">Beziehung:</span> {formData.notfallkontaktBeziehung || "–"}</div>
          <div><span className="text-muted-foreground">Telefon:</span> {formData.notfallkontaktTelefon || "–"}</div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Präferenzen
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Anrufhäufigkeit:</span> {formData.anrufhaeufigkeit || "–"}</div>
          <div><span className="text-muted-foreground">Bevorzugte Zeit:</span> {formData.bevorzugteZeit || "–"}</div>
        </div>
      </div>

      {formData.interessen && (
        <div className="p-4 rounded-lg bg-muted/30 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Heart className="w-4 h-4" /> Persönlicher Kontext
          </h4>
          <div className="text-sm">
            <div><span className="text-muted-foreground">Interessen:</span> {formData.interessen}</div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Mit dem Speichern bestätigen Sie, dass die Daten korrekt erfasst wurden.
      </p>
    </div>
  );

  const renderPflegeReview = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" /> Grunddaten
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {formData.vollstaendigerName || "–"}</div>
          <div><span className="text-muted-foreground">Telefon:</span> {formData.telefonnummer || "–"}</div>
          <div><span className="text-muted-foreground">Geburtsdatum:</span> {formData.geburtsdatum || "–"}</div>
          <div><span className="text-muted-foreground">Geschlecht:</span> {formData.geschlecht || "–"}</div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Home className="w-4 h-4" /> Wohnsituation
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Standort:</span> {formData.standort || "–"}</div>
          <div><span className="text-muted-foreground">Zimmer:</span> {formData.zimmernummer || "–"}</div>
          <div><span className="text-muted-foreground">Pflegegrad:</span> {formData.pflegegrad || "–"}</div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" /> Bezugsperson
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {formData.bezugsperson1Name || "–"}</div>
          <div><span className="text-muted-foreground">Beziehung:</span> {formData.bezugsperson1Beziehung || "–"}</div>
        </div>
      </div>

      {(formData.medikamente || formData.diagnosen) && (
        <div className="p-4 rounded-lg bg-muted/30 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Pill className="w-4 h-4" /> Medizinische Infos
          </h4>
          <div className="text-sm space-y-1">
            {formData.diagnosen && <div><span className="text-muted-foreground">Diagnosen:</span> {formData.diagnosen}</div>}
            {formData.medikamente && <div><span className="text-muted-foreground">Medikamente:</span> {formData.medikamente}</div>}
            {formData.allergien && <div><span className="text-muted-foreground">Allergien:</span> {formData.allergien}</div>}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Mit dem Speichern bestätigen Sie, dass die Daten korrekt erfasst wurden.
      </p>
    </div>
  );

  const renderArztReview = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <User className="w-4 h-4" /> Grunddaten
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {formData.vollstaendigerName || "–"}</div>
          <div><span className="text-muted-foreground">Telefon:</span> {formData.telefonnummer || "–"}</div>
          <div><span className="text-muted-foreground">Alter:</span> {formData.alter || "–"}</div>
          <div><span className="text-muted-foreground">Wohnsituation:</span> {formData.wohnsituation || "–"}</div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Termine
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Letzter Besuch:</span> {formData.letzterBesuch || "–"}</div>
          <div><span className="text-muted-foreground">Nächster Termin:</span> {formData.naechsterTermin || "–"}</div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/30 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Beobachtungsbereiche
        </h4>
        <div className="flex flex-wrap gap-2 text-sm">
          {formData.beobachteSchlaf && <span className="px-2 py-1 bg-primary/10 text-primary rounded">Schlaf</span>}
          {formData.beobachteStimmung && <span className="px-2 py-1 bg-primary/10 text-primary rounded">Stimmung</span>}
          {formData.beobachteEngagement && <span className="px-2 py-1 bg-primary/10 text-primary rounded">Engagement</span>}
          {formData.beobachteMedikation && <span className="px-2 py-1 bg-primary/10 text-primary rounded">Medikation</span>}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Mit dem Speichern bestätigen Sie, dass die Daten korrekt erfasst wurden.
      </p>
    </div>
  );

  // Render the correct step content based on portal and current step
  const renderStepContent = () => {
    const stepId = currentStep?.id;

    if (currentPortal === "familie") {
      switch (stepId) {
        case "basics": return renderFamilieBasics();
        case "emergency": return renderFamilieEmergency();
        case "preferences": return renderFamiliePreferences();
        case "context": return renderFamilieContext();
        case "services": return renderFamilieServices();
        case "review": return renderFamilieReview();
      }
    }

    if (currentPortal === "pflegeeinrichtung") {
      switch (stepId) {
        case "basics": return renderPflegeBasics();
        case "living": return renderPflegeLiving();
        case "contact": return renderPflegeContact();
        case "communication": return renderPflegeCommunication();
        case "medical": return renderPflegeMedical();
        case "review": return renderPflegeReview();
      }
    }

    if (currentPortal === "arzt") {
      switch (stepId) {
        case "basics": return renderArztBasics();
        case "appointments": return renderArztAppointments();
        case "signals": return renderArztSignals();
        case "review": return renderArztReview();
      }
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(getBackPath())}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              {getPortalLabel()} hinzufügen
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Erfassen Sie die Basisinformationen für die KI-gestützte Betreuung
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 overflow-x-auto">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStepIndex(index)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                    isActive && "bg-primary/10 text-primary",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary/20 text-primary",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground mx-2 hidden sm:block shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {currentStep?.label}
            </CardTitle>
            <CardDescription>
              {currentStep?.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={isFirstStep || isSubmitting}
          >
            Zurück
          </Button>
          <Button
            onClick={isLastStep ? handleSubmit : nextStep}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : isLastStep ? (
              "Speichern"
            ) : (
              "Weiter"
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
