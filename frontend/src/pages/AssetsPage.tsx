import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAssets, useCreateAsset, useDeleteAsset, useUploadCsv } from "../api/queries";
import type { AssetType } from "../api/types";
import { useMe } from "../api/queries";
import { InfoIcon } from "../components/InfoIcon";

const ASSET_TYPES: AssetType[] = ["pump", "compressor", "motor", "turbine", "heat_exchanger", "other"];

export function AssetsPage() {
  const assets = useAssets();
  const me = useMe();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();
  const uploadCsv = useUploadCsv();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", asset_type: "pump" as AssetType, location: "" });
  const [showForm, setShowForm] = useState(false);

  const isAdmin = me.data?.role === "admin";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await createAsset.mutateAsync({ ...form, location: form.location || undefined });
    setForm({ name: "", asset_type: "pump", location: "" });
    setShowForm(false);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadCsv.mutateAsync(file);
    alert(`Inserted ${result.inserted} readings`);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Assets</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <div className="flex items-center gap-1">
              <label className="cursor-pointer rounded border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                Upload CSV
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
              <InfoIcon id="assets.csvUpload" />
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Add Asset
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Pump A"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                Type * <InfoIcon id="assets.assetTypeField" />
              </span>
              <select
                value={form.asset_type}
                onChange={(e) => setForm((f) => ({ ...f, asset_type: e.target.value as AssetType }))}
                className="w-full rounded border px-2 py-1.5 text-sm"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Location</span>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Hall 1"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded border px-3 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {uploadCsv.isError && (
        <p className="mb-4 text-sm text-red-600">CSV upload failed. Check column format.</p>
      )}

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {assets.isLoading ? (
          <p className="p-6 text-sm text-slate-500">Loading…</p>
        ) : (assets.data?.length ?? 0) === 0 ? (
          <p className="p-6 text-sm text-slate-500">No assets yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">
                  <span className="flex items-center gap-1">
                    Added <InfoIcon id="assets.addedColumn" />
                  </span>
                </th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {assets.data?.map((asset) => (
                <tr key={asset.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/assets/${asset.id}`} className="text-blue-600 hover:underline">
                      {asset.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{asset.asset_type.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.location ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(asset.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => confirm("Delete asset?") && deleteAsset.mutate(asset.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
