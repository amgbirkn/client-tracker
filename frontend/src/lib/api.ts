const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request<T>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };

  if (opts.auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export type TokenResponse = { access_token: string; token_type: string };
export type Client = { id: number; name: string; email?: string | null; created_at: string };
export type Invoice = {
  id: number;
  client_id: number;
  title: string;
  amount: number;
  due_date?: string | null;
  is_paid: boolean;
  created_at: string;
};

export function login(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  return fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }).then(async (res) => {
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as TokenResponse;
  });
}

export function listClients() {
  return request<Client[]>("/clients", { auth: true });
}

export function createClient(name: string, email?: string) {
  return request<Client>("/clients", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ name, email: email || null }),
  });
}

export function listInvoices() {
  return request<Invoice[]>("/invoices", { auth: true });
}

export function createInvoice(client_id: number, title: string, amount: number, due_date?: string) {
  return request<Invoice>("/invoices", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ client_id, title, amount, due_date: due_date || null }),
  });
}

export function toggleInvoicePaid(invoice_id: number) {
  return request<Invoice>(`/invoices/${invoice_id}/toggle-paid`, {
    method: "PATCH",
    auth: true,
  });
}

