import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Asset, AssetCreate, CurrentUser, Reading, RiskScore, TokenResponse } from "./types";

// Auth
export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const { data } = await api.post<TokenResponse>("/auth/login", body);
      localStorage.setItem("access_token", data.access_token);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
};

export const useMe = () =>
  useQuery<CurrentUser>({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
    retry: false,
  });

// Assets
export const useAssets = () =>
  useQuery<Asset[]>({ queryKey: ["assets"], queryFn: async () => (await api.get("/assets/")).data });

export const useAsset = (id: string) =>
  useQuery<Asset>({ queryKey: ["assets", id], queryFn: async () => (await api.get(`/assets/${id}`)).data });

export const useCreateAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AssetCreate) => (await api.post<Asset>("/assets/", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

export const useDeleteAsset = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/assets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });
};

// Readings
export const useReadings = (assetId?: string) =>
  useQuery<Reading[]>({
    queryKey: ["readings", assetId],
    queryFn: async () =>
      (await api.get("/readings/", { params: assetId ? { asset_id: assetId } : {} })).data,
  });

export const useCreateReading = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Reading> & { asset_id: string; recorded_at: string }) =>
      (await api.post<Reading>("/readings/", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["readings"] }),
  });
};

export const useUploadCsv = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return (await api.post<{ inserted: number }>("/readings/upload-csv", form)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["readings"] });
      qc.invalidateQueries({ queryKey: ["risk-scores"] });
    },
  });
};

// Risk scores
export const useLatestRiskScores = () =>
  useQuery<RiskScore[]>({
    queryKey: ["risk-scores", "latest"],
    queryFn: async () => (await api.get("/risk-scores/latest")).data,
    refetchInterval: 30_000,
  });

export const useRiskScores = (assetId?: string) =>
  useQuery<RiskScore[]>({
    queryKey: ["risk-scores", assetId],
    queryFn: async () =>
      (await api.get("/risk-scores/", { params: assetId ? { asset_id: assetId } : {} })).data,
  });
