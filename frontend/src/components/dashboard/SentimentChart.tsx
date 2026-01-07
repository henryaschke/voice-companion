import { motion } from "framer-motion";
import { SentimentData } from "@/types/dashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SentimentChartProps {
  data: SentimentData[];
}

export function SentimentChart({ data }: SentimentChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-sm"
    >
      <div className="mb-6">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Stimmung & Aktivität
        </h3>
        <p className="text-sm text-muted-foreground">
          Verlauf der letzten 7 Tage
        </p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ paddingTop: "20px" }}
            />
            <Line
              type="monotone"
              dataKey="sentiment"
              name="Stimmung"
              stroke="hsl(var(--chart-1))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--chart-1))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="activity"
              name="Aktivität"
              stroke="hsl(var(--chart-2))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
