import { type FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAsset, useCreateReading, useReadings, useRiskScores } from "../api/queries";
import { RiskBadge } from "../components/RiskBadge";

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const asset = useAsset(id!);
  const readings = useReadings(id);
  const riskScores = useRiskScores(id);
  const createReading = useCreateReading();

  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().slice(0, 16),
    temperature_c: "",
    vibration_mm_s: "",
    pressure_bar: "",
    flow_rate_m3h: "",
    operating_hours: "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await createReading.mutateAsync({
      asset_id: id!,
      recorded_at: new Date(form.recorded_at).toISOString(),
      temperature_c: form.temperature_c ? Number(form.temperature_c) : undefined,
      vibration_mm_s: form.vibration_mm_s ? Number(form.vibration_mm_s) : undefined,
      pressure_bar: form.pressure_bar ? Number(form.pressure_bar) : undefined,
      flow_rate_m3h: form.flow_rate_m3h ? Number(form.flow_rate_m3h) : undefined,
      operating_hours: form.operating_hours ? Number(form.operating_hours) : undefined,
    });
    setForm((f) => ({ ...f, temperature_c: "", vibration_mm_s: "", pressure_bar: "" }));
  };

  const latestScore = riskScores.data?.[0];

  const chartData = [...(readings.data ?? [])]
    .slice(0, 50)
    .reverse()
    .map((r) => ({
      time: new Date(r.recorded_at).toLocaleDateString(),
      temperature: r.temperature_c,
      vibration: r.vibration_mm_s,
      pressure: r.pressure_bar,
    }));

  if (asset.isLoading) return <p className="p-6 text-sm text-slate-500">Loading…</p>;
  if (!asset.data) return <p className="p-6 text-sm text-red-500">Asset not found</p>;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{asset.data.name}</h1>
          <p className="text-sm capitalize text-slate-500">
            {asset.data.asset_type.replace("_", " ")} · {asset.data.location ?? "No location"}
          </p>
        </div>
        {latestScore && (
          <div className="text-right">
            <p className="mb-1 text-xs text-slate-500">Latest risk score</p>
            <RiskBadge probability={latestScore.risk_probability} />
          </div>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-8 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">Sensor Readings</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temperature" stroke="#3b82f6" dot={false} name="Temp °C" />
              <Line type="monotone" dataKey="vibration" stroke="#f59e0b" dot={false} name="Vibration mm/s" />
              <Line type="monotone" dataKey="pressure" stroke="#10b981" dot={false} name="Pressure bar" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Manual reading entry */}
      <div className="mb-8 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Add Reading</h2>
        <form onSubmit={submit} className="grid grid-cols-3 gap-3">
          {[
            { key: "recorded_at", label: "Date/Time", type: "datetime-local", required: true },
            { key: "temperature_c", label: "Temperature (°C)", type: "number" },
            { key: "vibration_mm_s", label: "Vibration (mm/s)", type: "number" },
            { key: "pressure_bar", label: "Pressure (bar)", type: "number" },
            { key: "flow_rate_m3h", label: "Flow Rate (m³/h)", type: "number" },
            { key: "operating_hours", label: "Operating Hours", type: "number" },
          ].map(({ key, label, type, required }) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">{label}{required ? " *" : ""}</span>
              <input
                type={type}
                required={required}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded border px-2 py-1.5 text-sm"
                step={type === "number" ? "any" : undefined}
              />
            </label>
          ))}
          <div className="col-span-3 flex gap-2">
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">
              Save Reading
            </button>
          </div>
        </form>
      </div>

      {/* Readings history */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-slate-800">Reading History</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Temp °C</th>
              <th className="px-4 py-3">Vibration</th>
              <th className="px-4 py-3">Pressure</th>
              <th className="px-4 py-3">Flow</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {(readings.data ?? []).slice(0, 50).map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-700">{new Date(r.recorded_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-600">{r.temperature_c ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{r.vibration_mm_s ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{r.pressure_bar ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">{r.flow_rate_m3h ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-slate-400">{r.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
