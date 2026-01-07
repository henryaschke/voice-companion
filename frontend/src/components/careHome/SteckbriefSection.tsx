import { ChevronDown, User, Users, Clock, MessageSquare, Pill, Activity, AlertCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Steckbrief } from "@/types/careHome";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SteckbriefSectionProps {
  steckbrief: Steckbrief;
}

export function SteckbriefSection({ steckbrief }: SteckbriefSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-foreground">Steckbrief</h3>
                <p className="text-xs text-muted-foreground">
                  Manuell gepflegte Basisinformationen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {steckbrief.rufname || steckbrief.vollstaendigerName.split(" ")[0]} · {steckbrief.wohnform}
                {steckbrief.pflegegrad && ` · PG ${steckbrief.pflegegrad}`}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t border-border">
            {/* Explanation */}
            <p className="text-xs text-muted-foreground py-3 border-b border-border/50">
              Diese Informationen helfen der KI, Gespräche korrekt und persönlich zu führen. 
              Sie basieren nicht auf Gesprächsanalyse.
            </p>

            <div className="grid gap-4 pt-4">
              {/* Grunddaten */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Grunddaten
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    <span className="text-foreground">{steckbrief.vollstaendigerName}</span>
                  </div>
                  {steckbrief.rufname && (
                    <div>
                      <span className="text-muted-foreground">Rufname:</span>{" "}
                      <span className="text-foreground">{steckbrief.rufname}</span>
                    </div>
                  )}
                  {steckbrief.geburtsdatum && (
                    <div>
                      <span className="text-muted-foreground">Geburtsdatum:</span>{" "}
                      <span className="text-foreground">{steckbrief.geburtsdatum}</span>
                    </div>
                  )}
                  {steckbrief.alter && (
                    <div>
                      <span className="text-muted-foreground">Alter:</span>{" "}
                      <span className="text-foreground">{steckbrief.alter} Jahre</span>
                    </div>
                  )}
                  {steckbrief.geschlecht && (
                    <div>
                      <span className="text-muted-foreground">Geschlecht:</span>{" "}
                      <span className="text-foreground capitalize">{steckbrief.geschlecht}</span>
                    </div>
                  )}
                  {steckbrief.pflegegrad && (
                    <div>
                      <span className="text-muted-foreground">Pflegegrad:</span>{" "}
                      <span className="text-foreground">{steckbrief.pflegegrad}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Wohn- & Lebenssituation */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Wohn- & Lebenssituation
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Standort:</span>{" "}
                    <span className="text-foreground">{steckbrief.standort}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Zimmer:</span>{" "}
                    <span className="text-foreground">{steckbrief.zimmernummer}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Wohnform:</span>{" "}
                    <span className="text-foreground">{steckbrief.wohnform}</span>
                  </div>
                  {steckbrief.einzugsdatum && (
                    <div>
                      <span className="text-muted-foreground">Einzug:</span>{" "}
                      <span className="text-foreground">{steckbrief.einzugsdatum}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sozialer Kontext */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Sozialer Kontext
                </h4>
                <div className="text-sm space-y-1">
                  {steckbrief.bezugspersonen.length > 0 ? (
                    <div className="space-y-1">
                      {steckbrief.bezugspersonen.map((person, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-foreground">{person.name}</span>
                          <span className="text-muted-foreground">({person.relationship})</span>
                          {person.telefon && (
                            <span className="text-muted-foreground text-xs">· {person.telefon}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Keine Bezugspersonen hinterlegt</span>
                  )}
                  <div className="pt-1">
                    <span className="text-muted-foreground">Angehörige eingebunden:</span>{" "}
                    <span className="text-foreground">
                      {steckbrief.angehoerigeEingebunden ? "Ja" : "Nein"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kommunikationspräferenzen */}
              {(steckbrief.bevorzugteAnrufzeiten || steckbrief.sprache || steckbrief.hoergeraet || steckbrief.sehbeeintraechtigung) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" />
                    Kommunikation
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {steckbrief.bevorzugteAnrufzeiten && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Anrufzeiten:</span>{" "}
                        <span className="text-foreground">{steckbrief.bevorzugteAnrufzeiten}</span>
                      </div>
                    )}
                    {steckbrief.sprache && (
                      <div>
                        <span className="text-muted-foreground">Sprache:</span>{" "}
                        <span className="text-foreground">{steckbrief.sprache}</span>
                      </div>
                    )}
                    {steckbrief.hoergeraet && (
                      <div>
                        <span className="text-muted-foreground">Hörgerät:</span>{" "}
                        <span className="text-foreground">Ja</span>
                      </div>
                    )}
                    {steckbrief.sehbeeintraechtigung && (
                      <div>
                        <span className="text-muted-foreground">Sehbeeinträchtigung:</span>{" "}
                        <span className="text-foreground">Ja</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medizinische Basisinformationen */}
              {(steckbrief.medikamente?.length || steckbrief.diagnosen?.length || steckbrief.allergien?.length || steckbrief.mobilitaet || steckbrief.ernaehrung) && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Pill className="w-3 h-3" />
                    Medizinische Basisinformationen
                  </h4>
                  
                  {/* Diagnosen */}
                  {steckbrief.diagnosen && steckbrief.diagnosen.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Diagnosen:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {steckbrief.diagnosen.map((diagnose, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-foreground text-xs"
                          >
                            {diagnose.bezeichnung}
                            {diagnose.seit && <span className="text-muted-foreground ml-1">(seit {diagnose.seit})</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medikamente */}
                  {steckbrief.medikamente && steckbrief.medikamente.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Medikamente:</span>
                      <div className="grid gap-1">
                        {steckbrief.medikamente.map((med, index) => (
                          <div
                            key={index}
                            className="text-sm flex items-start gap-2"
                          >
                            <Pill className="w-3 h-3 text-muted-foreground mt-1 shrink-0" />
                            <div>
                              <span className="text-foreground font-medium">{med.name}</span>
                              <span className="text-muted-foreground"> {med.dosierung}</span>
                              <span className="text-muted-foreground"> · {med.einnahmezeit}</span>
                              {med.hinweis && (
                                <span className="text-muted-foreground text-xs ml-1">({med.hinweis})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Allergien */}
                  {steckbrief.allergien && steckbrief.allergien.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-destructive" />
                        Allergien:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {steckbrief.allergien.map((allergie, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-medium"
                          >
                            {allergie}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mobilität & Ernährung */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {steckbrief.mobilitaet && (
                      <div className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Mobilität:</span>{" "}
                        <span className="text-foreground">{steckbrief.mobilitaet}</span>
                      </div>
                    )}
                    {steckbrief.ernaehrung && (
                      <div>
                        <span className="text-muted-foreground">Ernährung:</span>{" "}
                        <span className="text-foreground">{steckbrief.ernaehrung}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer note */}
            <p className="text-[10px] text-muted-foreground/60 mt-4 pt-3 border-t border-border/50">
              Nicht aus Gesprächen abgeleitet · Letzte Aktualisierung durch Pflegepersonal
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}