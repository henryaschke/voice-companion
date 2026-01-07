import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PersonalContextSection } from "@/components/dashboard/PersonalContextSection";
import { personalContext } from "@/data/mockData";
import { Sparkles } from "lucide-react";

const PersonalContext = () => {
  return (
    <DashboardLayout>
      <div className="w-full space-y-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">
            Persönlicher Kontext
          </h1>
          <p className="text-muted-foreground mt-2">
            Lebendige Notizen über Margarete
          </p>
        </div>

        {/* Reassurance Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-accent/20 rounded-2xl p-5 lg:p-6"
        >
          <p className="text-sm lg:text-base text-foreground/90 leading-relaxed">
            Kleine Hinweise reichen schon. Sie können jederzeit etwas ergänzen oder ändern – 
            es gibt hier kein „fertig" oder „richtig".
          </p>
        </motion.div>

        {/* Personal Context Section */}
        <PersonalContextSection context={personalContext} />

        {/* AI Usage Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-muted/30 rounded-2xl p-5 lg:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Die KI nutzt diese Hinweise behutsam, um Gespräche persönlicher zu gestalten – 
                nicht, um Entscheidungen zu treffen.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default PersonalContext;
