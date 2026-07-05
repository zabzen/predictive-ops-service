import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../api/queries";
import { InfoIcon } from "../components/InfoIcon";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await login.mutateAsync({ email, password });
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-1.5">
          <h1 className="text-2xl font-bold text-slate-900">Predictive Ops Service</h1>
          <InfoIcon id="login.authFlow" />
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </label>
        <label className="mb-6 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </label>
        {login.isError && <p className="mb-4 text-sm text-red-600">Invalid credentials</p>}
        <button
          type="submit"
          disabled={login.isPending}
          className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
