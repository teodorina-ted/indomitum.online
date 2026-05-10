/**
 * API client for the Indomitum Express backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null }> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { data: null, error: body?.error || `Request failed (${res.status})` };
    return { data: body as T, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || "Network error" };
  }
}

// ── Auth ──────────────────────────────────────────────────

export interface AuthResponse {
  user: { id: string; email: string };
  profile?: any;
  roles?: string[];
  token: string;
}

export interface MeResponse {
  user: { id: string; email: string };
  profile: any;
  roles: string[];
}

export const api = {
  // Auth
  signup: (
    email: string,
    password: string,
    full_name: string,
    role: string,
    organization_name?: string,
    organization_id?: string,
  ) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name, role, organization_name, organization_id }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<MeResponse>("/auth/me"),

  resetPassword: (email: string) =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) }),

  updatePassword: (current_password: string, new_password: string) =>
    request("/auth/update-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  deleteAccount: () => request("/auth/delete-account", { method: "DELETE" }),

  // Profiles
  getProfile: (userId: string) => request(`/profiles/${userId}`),
  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    request("/profiles", { method: "PUT", body: JSON.stringify(data) }),
  getProfilesByIds: (userIds: string[]) =>
    request<Record<string, string>>("/profiles/batch", {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds }),
    }),

  // Organizations
  getMyOrganization: () => request<any>("/organizations/mine"),
  getOrgMembers: () => request<any[]>("/organizations/mine/members"),
  joinOrganization: (organization_id: string) =>
    request("/organizations/join", { method: "POST", body: JSON.stringify({ organization_id }) }),

  // Seeds
  getSeeds: () => request<any[]>("/seeds"),
  getSeed: (id: string) => request(`/seeds/${id}`),
  getSeedBySeedId: (seedId: string) => request(`/seeds/by-seed-id/${encodeURIComponent(seedId)}`),
  createSeed: (data: any) =>
    request("/seeds", { method: "POST", body: JSON.stringify(data) }),
  updateSeed: (id: string, data: any) =>
    request(`/seeds/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSeed: (id: string) => request(`/seeds/${id}`, { method: "DELETE" }),
  deleteSeeds: (ids: string[]) =>
    request("/seeds/batch-delete", { method: "POST", body: JSON.stringify({ ids }) }),
  checkSeedExists: (seedId: string) =>
    request(`/seeds/exists/${encodeURIComponent(seedId)}`),
  lookupSeedIds: (seedIds: string[]) =>
    request<Record<string, string>>("/seeds/lookup-ids", {
      method: "POST",
      body: JSON.stringify({ seed_ids: seedIds }),
    }),

  // Seed history
  getSeedHistory: (seedId: string) => request(`/seeds/${seedId}/history`),

  // Recycle bin
  getBin: () => request<any[]>("/bin"),
  restoreSeed: (id: string) => request(`/bin/${id}/restore`, { method: "POST" }),
  restoreSeeds: (ids: string[]) =>
    request("/bin/batch-restore", { method: "POST", body: JSON.stringify({ ids }) }),
  permanentDeleteSeeds: (ids: string[]) =>
    request("/bin/batch-delete", { method: "POST", body: JSON.stringify({ ids }) }),

  // Orders
  getOrders: () => request<any[]>("/orders"),
  createOrder: (data: any) =>
    request("/orders", { method: "POST", body: JSON.stringify(data) }),
  updateOrderStatus: (
    id: string,
    status: string,
    notes?: string,
    tracking_code?: string,
    tracking_url?: string,
  ) =>
    request(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, notes, tracking_code, tracking_url }),
    }),
  deleteOrder: (id: string) => request(`/orders/${id}`, { method: "DELETE" }),
  getOrderItems: (orderId: string) => request<any[]>(`/orders/${orderId}/items`),
  getOrderHistory: (orderId: string) => request<any[]>(`/orders/${orderId}/history`),

  // Buyer seeds (DB-persisted favorites)
  getBuyerSeeds: () => request<any[]>("/buyer-seeds"),
  assignBuyerSeed: (data: { seed_id: string; quantity: number; notes?: string }) =>
    request("/buyer-seeds", { method: "POST", body: JSON.stringify(data) }),
  removeBuyerSeed: (id: string) =>
    request(`/buyer-seeds/${id}`, { method: "DELETE" }),
  getAssignedSeedUuids: () => request<string[]>("/buyer-seeds/assigned-uuids"),

  // File upload
  uploadImage: async (
    file: File,
    seedId: string,
  ): Promise<{ url: string | null; error: string | null }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("seed_id", seedId);
    try {
      const res = await fetch(`${API_BASE}/upload/seed-image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) return { url: null, error: body?.error || "Upload failed" };
      return { url: body.url, error: null };
    } catch (err: any) {
      return { url: null, error: err.message };
    }
  },
};
