import { BrowserRouter, Navigate, Route, Routes, Link, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMe } from "./api/queries";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AssetsPage } from "./pages/AssetsPage";
import { AssetDetailPage } from "./pages/AssetDetailPage";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } });

function Nav() {
  const me = useMe();
  const loc = useLocation();
  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/assets", label: "Assets" },
  ];
  return (
    <header className="border-b bg-white px-6 py-3 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <nav className="flex items-center gap-6">
          <span className="font-bold text-blue-700">PredictiveOps</span>
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium ${loc.pathname === to ? "text-blue-600" : "text-slate-600 hover:text-slate-900"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {me.data && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{me.data.email}</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
              {me.data.role}
            </span>
            <button
              onClick={() => { localStorage.removeItem("access_token"); window.location.href = "/login"; }}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const me = useMe();
  if (me.isLoading) return null;
  if (!me.data) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <div className="min-h-screen bg-slate-50">
              <Nav />
              <main className="mx-auto max-w-6xl px-6 py-8">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/assets/:id" element={<AssetDetailPage />} />
                </Routes>
              </main>
            </div>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
