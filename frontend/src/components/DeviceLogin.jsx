import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/apiClient.js";
import { useAuth } from "./AuthContext.jsx";

const DeviceLogin = () => {
  const { user, authLoading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState("");

  const deviceCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("code") || "").trim().toUpperCase();
  }, []);

  useEffect(() => {
    if (!deviceCode) setMessage("This device link is missing its code.");
  }, [deviceCode]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const result = await login(username, password);
      if (!result.success) setMessage(result.error || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const approveDevice = async () => {
    setSubmitting(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/auth/device/approve/", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ deviceCode }),
      });
      if (!response) {
        setMessage("Sign in on this browser before approving the Roku.");
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "This device code is no longer available.");
        return;
      }
      setApproved(true);
    } catch {
      setMessage("Unable to reach CWorld. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <PageShell><Panel><Status text="Checking your CWorld session..." /></Panel></PageShell>;
  }

  if (!deviceCode) {
    return <PageShell><Panel><Status text={message} /></Panel></PageShell>;
  }

  if (approved) {
    return (
      <PageShell>
        <Panel>
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <span className="text-3xl" aria-hidden="true">✓</span>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">CearaWorld</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Roku connected</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/60">
            This screen can be closed. Your Roku will continue automatically.
          </p>
        </Panel>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <Panel>
          <Eyebrow />
          <h1 className="text-3xl font-semibold tracking-tight text-white">Connect your Roku</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">Sign in to approve this device.</p>
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/70 focus:bg-white/[0.09]"
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              className="h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/70 focus:bg-white/[0.09]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full cursor-pointer rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-[#10211d] transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in and continue"}
            </button>
          </form>
          {message && <p className="mt-5 text-sm text-rose-300">{message}</p>}
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Panel>
        <Eyebrow />
        <h1 className="text-3xl font-semibold tracking-tight text-white">Connect your Roku</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Approve this Roku for <span className="font-medium text-white">{user.username}</span>.
        </p>
        <div className="mt-8 rounded-lg border border-white/10 bg-white/[0.05] px-4 py-3 text-center font-mono text-lg tracking-[0.2em] text-emerald-200">
          {deviceCode}
        </div>
        <button
          type="button"
          onClick={approveDevice}
          disabled={submitting}
          className="mt-5 h-12 w-full cursor-pointer rounded-lg bg-emerald-300 px-4 text-sm font-semibold text-[#10211d] transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "Connecting..." : "Approve Roku"}
        </button>
        {message && <p className="mt-5 text-sm text-rose-300">{message}</p>}
      </Panel>
    </PageShell>
  );
};

const Eyebrow = () => (
  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/75">CearaWorld</p>
);

const PageShell = ({ children }) => (
  <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-[#0e1515] px-5 py-8 text-white">
    {children}
  </main>
);

const Panel = ({ children }) => (
  <section className="w-full max-w-md rounded-xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-9">
    {children}
  </section>
);

const Status = ({ text }) => <p className="text-sm leading-6 text-white/65">{text}</p>;

export default DeviceLogin;
