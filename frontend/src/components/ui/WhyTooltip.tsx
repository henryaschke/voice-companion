import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WhyTooltipProps {
  explanation: string;
}

export function WhyTooltip({ explanation }: WhyTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Warum sehe ich das?</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{explanation}</p>
      </TooltipContent>
    </Tooltip>
  );
}
