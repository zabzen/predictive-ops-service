interface Props {
  probability: number;
}

export function RiskBadge({ probability }: Props) {
  const pct = Math.round(probability * 100);
  const level = probability >= 0.7 ? "high" : probability >= 0.4 ? "medium" : "low";
  const colors = {
    high: "bg-red-100 text-red-800 border-red-300",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    low: "bg-green-100 text-green-800 border-green-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${colors[level]}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${level === "high" ? "bg-red-500" : level === "medium" ? "bg-yellow-500" : "bg-green-500"}`}
      />
      {pct}% risk
    </span>
  );
}
