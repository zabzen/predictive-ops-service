export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: "admin" | "viewer";
  tenant_id: string;
}

export type AssetType = "pump" | "compressor" | "motor" | "turbine" | "heat_exchanger" | "other";

export interface Asset {
  id: string;
  tenant_id: string;
  name: string;
  asset_type: AssetType;
  location: string | null;
  description: string | null;
  commissioned_at: string | null;
  created_at: string;
}

export interface AssetCreate {
  name: string;
  asset_type: AssetType;
  location?: string;
  description?: string;
}

export interface Reading {
  id: string;
  asset_id: string;
  tenant_id: string;
  recorded_at: string;
  source: "manual" | "csv_upload" | "api_pull";
  temperature_c: number | null;
  vibration_mm_s: number | null;
  pressure_bar: number | null;
  flow_rate_m3h: number | null;
  operating_hours: number | null;
  created_at: string;
}

export interface RiskScore {
  id: string;
  asset_id: string;
  tenant_id: string;
  model_version: string;
  scored_at: string;
  risk_probability: number;
  forecast_horizon_days: number;
  feature_contributions: string | null;
  notes: string | null;
  created_at: string;
}
