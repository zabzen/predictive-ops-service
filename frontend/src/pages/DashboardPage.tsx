import { useAssets, useLatestRiskScores } from "../api/queries";
import { RiskBadge } from "../components/RiskBadge";
import { InfoIcon } from "../components/InfoIcon";
import { Link } from "react-router-dom";
import type { Asset } from "../api/types";

export function DashboardPage() {
  const assets = useAssets();
  const scores = useLatestRiskScores();

  const assetById = new Map<string, Asset>((assets.data ?? []).map((a) => [a.id, a]));

  const sorted = [...(scores.data ?? [])].sort(
    (a, b) => b.risk_probability - a.risk_probability
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Risk Dashboard</h1>

      {/* Summary cards */}
      <div className="mb-2 flex items-center gap-1.5">
        <h2 className="text-sm font-medium text-slate-600">Summary</h2>
        <InfoIcon id="dashboard.summaryCards" />
      </div>
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: "Total Assets", value: assets.data?.length ?? "—" },
          {
            label: "High Risk",
            value: (scores.data ?? []).filter((s) => s.risk_probability >= 0.7).length,
            className: "text-red-600",
          },
          {
            label: "Avg Risk",
            value:
              scores.data && scores.data.length > 0
                ? `${Math.round((scores.data.reduce((s, r) => s + r.risk_probability, 0) / scores.data.length) * 100)}%`
                : "—",
          },
        ].map(({ label, value, className }) => (
          <div key={label} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`text-3xl font-bold text-slate-900 ${className ?? ""}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Risk table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-slate-800">Assets by Risk</h2>
            <InfoIcon id="dashboard.riskTable" />
          </div>
        </div>
        {scores.isLoading || assets.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No risk scores yet. Add assets, upload readings, then run the inference job.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Scored at</th>
                <th className="px-4 py-3">Model</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((score) => {
                const asset = assetById.get(score.asset_id);
                return (
                  <tr key={score.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <Link to={`/assets/${score.asset_id}`} className="text-blue-600 hover:underline">
                        {asset?.name ?? score.asset_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">{asset?.asset_type?.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-600">{asset?.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      <RiskBadge probability={score.risk_probability} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(score.scored_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{score.model_version}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
