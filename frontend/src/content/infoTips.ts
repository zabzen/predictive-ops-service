export type InfoId =
  | "dashboard.summaryCards"
  | "dashboard.riskTable"
  | "assets.assetTypeField"
  | "assets.csvUpload"
  | "assets.addedColumn"
  | "assetDetail.sensorChart"
  | "assetDetail.addReadingForm"
  | "assetDetail.sourceColumn"
  | "login.authFlow";

interface InfoTip {
  technical: string;
  business: string;
}

export const INFO_TIPS: Record<InfoId, InfoTip> = {
  "dashboard.summaryCards": {
    technical:
      "Computed client-side from the latest /risk-scores/latest response. \"High Risk\" counts scores with risk_probability >= 0.7; \"Avg Risk\" is the mean probability across all scored assets.",
    business:
      "0.7 is the threshold ops teams use to flag an asset for inspection this week. These numbers refresh whenever the dashboard reloads - they are a snapshot, not a live feed.",
  },
  "dashboard.riskTable": {
    technical:
      "Row color comes from RiskBadge (>=0.7 red/high, >=0.4 yellow/medium, else green/low). The table refetches every 30s (refetchInterval in useLatestRiskScores). model_version identifies which inference run produced the score.",
    business:
      "This table is the primary triage view. The 30s refresh means a new inference run can change an asset's row without a manual reload. model_version lets you correlate a risk score back to a specific model release if results look off.",
  },
  "assets.assetTypeField": {
    technical:
      "Fixed enum: pump, compressor, motor, turbine, heat_exchanger, other (AssetType in backend app/models/asset.py). No free text or custom types are allowed.",
    business:
      "The asset type doesn't currently change scoring logic, but keeping it accurate helps with fleet reporting and future model specialization per equipment class.",
  },
  "assets.csvUpload": {
    technical:
      "Required columns: asset_id, recorded_at. Optional: temperature_c, vibration_mm_s, pressure_bar, flow_rate_m3h, operating_hours. Every asset_id in the file must already exist under your tenant or the whole upload is rejected.",
    business:
      "Use this to bulk-load historical sensor readings for assets you've already created. If you get an \"unknown asset_id\" error, create the asset first - this endpoint never creates new assets.",
  },
  "assets.addedColumn": {
    technical:
      "This is created_at - the timestamp the asset row was inserted into the database. It is not commissioned_at (equipment install date), which isn't shown in this table.",
    business:
      "Use this to see when an asset was registered in the system, not when the physical equipment went into service.",
  },
  "assetDetail.sensorChart": {
    technical:
      "Plots the last 50 readings for this asset, reversed to oldest-to-newest for the X axis. Three series: temperature (°C), vibration (mm/s), pressure (bar).",
    business:
      "This is a recent-trend view, not the full history - use the Reading History table below for older data.",
  },
  "assetDetail.addReadingForm": {
    technical:
      "Only Date/Time is required; all sensor fields are optional. Readings submitted here are tagged source: \"manual\" server-side, distinct from csv_upload and api_pull.",
    business:
      "Use this for one-off manual spot checks. Because sensor fields are optional, you can log a partial reading (e.g. just temperature) without needing every value.",
  },
  "assetDetail.sourceColumn": {
    technical:
      "Three possible values: manual (entered via this page's Add Reading form), csv_upload (bulk-imported via the Assets page), api_pull (ingested from an external system/integration).",
    business:
      "Useful for auditing data provenance - e.g. spotting whether a suspicious reading was a manual typo or came from an automated feed.",
  },
  "login.authFlow": {
    technical:
      "POST /auth/login checks the submitted password against the user's bcrypt hash (app/auth.py verify_password). On success the backend issues a JWT (HS256, signed with SECRET_KEY) embedding the user id, tenant_id, and role, expiring after ACCESS_TOKEN_EXPIRE_MINUTES. The frontend stores it in localStorage and attaches it as a Bearer header on every request (api/client.ts); a 401 clears the token and redirects back here.",
    business:
      "Your tenant and role are baked into the token at login time, so a role change only takes effect after you sign out and back in. The token stays valid for a fixed window regardless of activity - there's no idle timeout, and no way to revoke a single token early short of rotating SECRET_KEY.",
  },
};
