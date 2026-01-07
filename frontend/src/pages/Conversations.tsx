import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { conversations } from "@/data/mockData";
import { Conversation, TranscriptEntry } from "@/types/dashboard";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  MessageCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  ChevronRight,
  X,
  Smile,
  Meh,
  Frown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const sentimentConfig = {
  positiv: {
    icon: Smile,
    label: "Positiv",
    className: "bg-status-positive/10 text-status-positive border-status-positive/20",
  },
  neutral: {
    icon: Meh,
    label: "Neutral",
    className: "bg-muted text-muted-foreground border-border",
  },
  besorgt: {
    icon: Frown,
    label: "Besorgt",
    className: "bg-status-warning/10 text-status-warning-foreground border-status-warning/20",
  },
};

const Conversations = () => {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  return (
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl lg:text-4xl font-semibold text-foreground">
            Gespräche
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Alle Unterhaltungen mit Margarete im Überblick.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Conversations List */}
          <div className="space-y-4">
            {conversations.map((conversation, index) => {
              const sentiment = sentimentConfig[conversation.sentiment];
              const SentimentIcon = sentiment.icon;
              const isSelected = selectedConversation?.id === conversation.id;

              return (
                <motion.button
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl border transition-all duration-200",
                    isSelected
                      ? "bg-primary/5 border-primary/30 shadow-md"
                      : "bg-card border-border hover:border-primary/20 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      conversation.type === "inbound"
                        ? "bg-secondary"
                        : "bg-primary/10"
                    )}>
                      {conversation.type === "inbound" ? (
                        <PhoneIncoming className="w-5 h-5 text-secondary-foreground" />
                      ) : (
                        <PhoneOutgoing className="w-5 h-5 text-primary" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium text-foreground">
                          {format(conversation.date, "EEEE, d. MMMM", { locale: de })}
                        </p>
                        <ChevronRight className={cn(
                          "w-5 h-5 text-muted-foreground transition-transform",
                          isSelected && "rotate-90"
                        )} />
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {conversation.duration} Min.
                        </span>
                        <span>·</span>
                        <span>
                          {conversation.type === "inbound" ? "Eingehend" : "Ausgehend"}
                        </span>
                      </div>

                      <p className="text-sm text-foreground/80 line-clamp-2 mb-3">
                        {conversation.summary}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={sentiment.className}>
                          <SentimentIcon className="w-3 h-3 mr-1" />
                          {sentiment.label}
                        </Badge>
                        {conversation.topics.slice(0, 2).map((topic) => (
                          <Badge key={topic} variant="secondary" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Transcript Panel */}
          <AnimatePresence mode="wait">
            {selectedConversation ? (
              <motion.div
                key={selectedConversation.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden lg:sticky lg:top-8"
              >
                {/* Header */}
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      Gesprächsprotokoll
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedConversation.date, "d. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Transcript */}
                <ScrollArea className="h-[500px]">
                  <div className="p-5 space-y-4">
                    {selectedConversation.transcript.map((entry, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex gap-3",
                          entry.speaker === "agent" ? "flex-row" : "flex-row-reverse"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium",
                          entry.speaker === "agent"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-secondary-foreground"
                        )}>
                          {entry.speaker === "agent" ? "AI" : "M"}
                        </div>
                        <div className={cn(
                          "max-w-[80%] p-4 rounded-2xl",
                          entry.speaker === "agent"
                            ? "bg-muted rounded-tl-md"
                            : "bg-primary/10 rounded-tr-md"
                        )}>
                          <p className="text-sm text-foreground leading-relaxed">
                            {entry.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {entry.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border p-12 flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  Gespräch auswählen
                </h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Wählen Sie ein Gespräch aus der Liste, um das vollständige Protokoll zu sehen.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Conversations;
