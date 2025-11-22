// src/components/ui/LineChart.tsx
"use client";

import React from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumberWithAbbreviations } from "@/lib/formatters";

interface LineChartComponentProps {
  data: unknown[];
  xAxisKey: string;
  yAxisKey: string;
  currencySymbol?: string | null;
}

export const LineChartComponent: React.FC<LineChartComponentProps> = ({
  data,
  xAxisKey,
  yAxisKey,
  currencySymbol = "$",
}) => {
  // Create a key based on data to force re-render when data changes
  const dataKey = JSON.stringify(data);

  return (
    <div className="h-20 w-full">
      <ResponsiveContainer width="100%" height="100%" key={dataKey}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 5, bottom: -10 }}>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground))",
              fontSize: "12px",
              borderRadius: "0.5rem",
            }}
            formatter={(value: number) => [
              `${currencySymbol}${formatNumberWithAbbreviations(value, 2)}`,
              yAxisKey.charAt(0).toUpperCase() + yAxisKey.slice(1),
            ]}
          />
          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            fontSize={11}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={11}
            width={40}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value: number) =>
              formatNumberWithAbbreviations(value, 0)
            }
            domain={["dataMin", "dataMax"]}
          />
          <Line
            type="monotone"
            dataKey={yAxisKey}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
