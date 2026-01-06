"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: number;
  name: string;
  email?: string;
};

type Invoice = {
  id: number;
  client_id: number;
  title: string;
  amount: number;
  is_paid: boolean;
};

export default function Dashboard() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [clientId, setClientId] = useState<number | "">("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadAll = async () => {
    if (!token) return;

    const [clientsRes, invoicesRes] = await Promise.all([
      fetch(`${apiUrl}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${apiUrl}/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (!clientsRes.ok || !invoicesRes.ok) {
      localStorage.removeItem("token");
      router.push("/login");
      return;
    }

    const clientsData = await clientsRes.json();
    const invoicesData = await invoicesRes.json();

    setClients(clientsData);
    setInvoices(invoicesData);
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAmount = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount || 0),
    0
  );

  const unpaidAmount = invoices
    .filter((inv) => !inv.is_paid)
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  const addClient = async () => {
    if (!token || !name.trim()) return;

    const res = await fetch(`${apiUrl}/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!res.ok) return;

    const created = (await res.json()) as Client;
    setClients((prev) => [created, ...prev]);
    setName("");
  };

  const addInvoice = async () => {
    if (!token || !clientId || !title.trim() || !amount) return;

    const res = await fetch(`${apiUrl}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        client_id: clientId,
        title: title.trim(),
        amount: Number(amount),
      }),
    });

    if (!res.ok) return;

    const created = (await res.json()) as Invoice;
    setInvoices((prev) => [created, ...prev]);
    setTitle("");
    setAmount("");
    setClientId("");
  };

  const togglePaid = async (invoiceId: number) => {
    if (!token) return;

    const res = await fetch(`${apiUrl}/invoices/${invoiceId}/toggle-paid`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return;

    const updated = (await res.json()) as Invoice;

    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? updated : inv))
    );
  };

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button onClick={logout} className="border px-4 py-2 rounded">
          Logout
        </button>
      </div>

      <div className="flex gap-4 mb-10">
        <div className="border p-4 rounded w-40">
          <div className="text-sm opacity-70">Total</div>
          <div className="text-3xl font-semibold">${totalAmount}</div>
        </div>

        <div className="border p-4 rounded w-40">
          <div className="text-sm opacity-70">Unpaid</div>
          <div className="text-3xl font-semibold">${unpaidAmount}</div>
        </div>

        <button onClick={loadAll} className="border px-4 py-2 rounded h-fit">
          Refresh
        </button>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Add Client</h2>
        <div className="flex gap-3">
          <input
            className="border p-2 w-80 rounded"
            placeholder="Client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={addClient} className="border px-4 py-2 rounded">
            Add
          </button>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-2">Clients</h3>
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id} className="border p-3 rounded flex justify-between">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm opacity-70">{c.email || "—"}</div>
              </div>
              <div className="text-sm opacity-70">#{c.id}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-3">Add Invoice</h2>
        <div className="flex gap-3 items-center">
          <select
            className="border p-2 rounded"
            value={clientId}
            onChange={(e) =>
              setClientId(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            className="border p-2 rounded w-64"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="border p-2 rounded w-40"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <button onClick={addInvoice} className="border px-4 py-2 rounded">
            Add
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Invoices</h2>
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="border p-3 rounded flex justify-between">
              <div>
                {inv.title} — ${inv.amount}
              </div>
              <button
                onClick={() => togglePaid(inv.id)}
                className="border px-4 py-1 rounded"
              >
                {inv.is_paid ? "Paid" : "Unpaid"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}


