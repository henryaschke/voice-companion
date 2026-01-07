import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, Plus } from "lucide-react";
import { PersonalContext } from "@/types/dashboard";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PersonalContextSectionProps {
  context: PersonalContext;
}

export function PersonalContextSection({ context }: PersonalContextSectionProps) {
  const [showOptional, setShowOptional] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  return (
    <div className="space-y-6">
      {/* Recommended Section - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card rounded-2xl border border-border p-5 lg:p-6"
      >
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-primary/80 uppercase tracking-wide">
              Empfohlen
            </span>
            <span className="text-xs text-muted-foreground">– Start hier</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Short Description */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Wer ist diese Person?
            </label>
            <Textarea
              defaultValue={context.description}
              placeholder="Ein paar Stichpunkte reichen – z.B. Persönlichkeit, Alltag, was sie mag..."
              className="min-h-[100px] resize-none bg-background/50 border-border/60 placeholder:text-muted-foreground/50"
            />
            <p className="text-xs text-muted-foreground">
              Kurze Notizen helfen der KI, den richtigen Ton zu treffen.
            </p>
          </div>

          {/* Important People */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Wichtige Menschen
            </label>
            <p className="text-xs text-muted-foreground -mt-1">
              Namen und Beziehungen, die in Gesprächen vorkommen könnten
            </p>
            <div className="space-y-2">
              {context.importantPeople.map((person, index) => (
                <div key={index} className="flex gap-3">
                  <Input
                    defaultValue={person.name}
                    placeholder="Name"
                    className="flex-1 bg-background/50 border-border/60 placeholder:text-muted-foreground/50"
                  />
                  <Input
                    defaultValue={person.relationship}
                    placeholder="Wer ist das? (z.B. Enkelin)"
                    className="flex-1 bg-background/50 border-border/60 placeholder:text-muted-foreground/50"
                  />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Plus className="w-4 h-4 mr-1" />
                Weitere Person
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Optional Section - Collapsible */}
      <div>
        <button
          onClick={() => setShowOptional(!showOptional)}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-2xl transition-colors",
            showOptional 
              ? "bg-card border border-border" 
              : "bg-muted/30 hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Optional
            </span>
            <span className="text-xs text-muted-foreground">– Jederzeit ergänzen</span>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            showOptional && "rotate-180"
          )} />
        </button>

        <AnimatePresence>
          {showOptional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-t-0 border-border rounded-b-2xl p-5 lg:p-6 space-y-6">
                {/* Interests */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Interessen & Hobbys
                  </label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Woran hat sie Freude?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {context.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1.5 bg-muted/50">
                        {interest}
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-muted-foreground hover:text-foreground">
                      <Plus className="w-4 h-4 mr-1" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>

                {/* Preferred Topics */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Worüber spricht sie gerne?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {context.preferredTopics.map((topic, index) => (
                      <Badge key={index} variant="outline" className="px-3 py-1.5">
                        {topic}
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-8 px-3 text-muted-foreground hover:text-foreground">
                      <Plus className="w-4 h-4 mr-1" />
                      Thema
                    </Button>
                  </div>
                </div>

                {/* Routines */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Tagesablauf & Gewohnheiten
                  </label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Typische Abläufe, die die KI kennen sollte
                  </p>
                  <div className="space-y-2">
                    {context.routines.map((routine, index) => (
                      <Input
                        key={index}
                        defaultValue={routine}
                        placeholder="z.B. Frühstück um 8:00 Uhr"
                        className="bg-background/50 border-border/60 placeholder:text-muted-foreground/50"
                      />
                    ))}
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Plus className="w-4 h-4 mr-1" />
                      Routine
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sensitive Topics - Separate Collapsible */}
      <div>
        <button
          onClick={() => setShowSensitive(!showSensitive)}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-2xl transition-colors",
            showSensitive 
              ? "bg-card border border-border" 
              : "bg-muted/20 hover:bg-muted/30"
          )}
        >
          <div>
            <span className="text-sm text-muted-foreground">
              Dinge, bei denen wir vorsichtig sein sollen
            </span>
            <span className="text-xs text-muted-foreground/60 ml-2">(optional)</span>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            showSensitive && "rotate-180"
          )} />
        </button>

        <AnimatePresence>
          {showSensitive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-t-0 border-border rounded-b-2xl p-5 lg:p-6">
                <p className="text-xs text-muted-foreground mb-4">
                  Gibt es Themen, die die KI behutsam behandeln oder vermeiden sollte?
                </p>
                <div className="space-y-3">
                  {context.sensitivities.map((sensitivity, index) => (
                    <Textarea
                      key={index}
                      defaultValue={sensitivity}
                      placeholder="z.B. Thema X kann emotional sein..."
                      className="min-h-[70px] resize-none bg-background/50 border-border/60 placeholder:text-muted-foreground/50"
                    />
                  ))}
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Plus className="w-4 h-4 mr-1" />
                    Weiteren Hinweis
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
