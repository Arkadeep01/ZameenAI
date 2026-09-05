

import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
  ChevronDown,
  Landmark,
  User,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

type UserType = "government" | "citizen";

interface LoginPageProps {
  onSwitchToSignup?: () => void;
  /** Called after a (simulated) successful sign-in. */
  onLoginSuccess?: (userType: UserType) => void;
}

// Dummy/demo credentials for testing — no real backend involved.
const DEMO_CREDENTIALS: Record<
  UserType,
  { email: string; password: string }
> = {
  government: {
    email: "officer.demo@zameenai.gov.in",
    password: "Demo@123",
  },
  citizen: {
    email: "citizen@test.com",
    password: "citizen",
  },
};

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup, onLoginSuccess }) => {
  const [userType, setUserType] = useState<UserType>("government");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fillDemoCredentials = () => {
    setEmail(DEMO_CREDENTIALS[userType].email);
    setPassword(DEMO_CREDENTIALS[userType].password);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email/user ID and password.");
      return;
    }

    // Citizen / Landowner must use ONLY the configured credentials.
    if (
      userType === "citizen" &&
      (
        email.trim().toLowerCase() !== "citizen@test.com" ||
        password !== "citizen"
      )
    ) {
      setError("Invalid Citizen / Landowner email or password.");
      return;
    }

    setIsSubmitting(true);

    // Keep the existing demo login behavior.
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);

      setTimeout(() => {
        onLoginSuccess?.(userType);
      }, 700);
    }, 900);
  };
  const handleNicSso = () => {
    setError(null);
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => onLoginSuccess?.("government"), 700);
    }, 900);
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
          alt="Aerial view of green farmland"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-slate-900/30" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
              alt="Emblem of India"
              className="h-12 w-12"
            />
            <div className="leading-tight">
              <p className="font-semibold text-slate-800 text-sm">Government of India</p>
              <p className="text-slate-600 text-xs">
                Digital India <span className="mx-1">|</span> for a Developed India
              </p>
            </div>
          </div>

          <div>
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="text-emerald-950">Zameen</span>
              <span className="text-emerald-600">AI</span>
              <span className="inline-block ml-1 align-top text-emerald-500">🍃</span>
            </h1>
            <p className="mt-4 text-xl font-semibold text-emerald-950 max-w-md">
              Real-Time Intelligent Land Acquisition, Digitization, Validation &amp; Management System
            </p>
            <p className="mt-4 text-slate-700">Bringing Clarity to Land Acquisition and Records</p>

            <div className="mt-10 grid grid-cols-4 gap-6 max-w-lg">
              <Feature icon={<DocIcon />} label="Digitize" sub="Legacy Records" />
              <Feature icon={<ShieldCheck className="h-6 w-6 text-emerald-800" />} label="Validate" sub="with AI" />
              <Feature icon={<PinIcon />} label="Monitor" sub="End-to-End" />
              <Feature icon={<User className="h-6 w-6 text-emerald-800" />} label="Empower" sub="Citizens" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white drop-shadow-sm leading-tight">
              Land Records.
              <br />A Stronger Tomorrow.
            </h2>
            <div className="mt-3 h-0.5 w-16 bg-white/80" />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 flex-col">
        <div className="flex items-center justify-end gap-6 px-6 py-5 sm:px-12">
          <button type="button" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <HelpCircle className="h-4 w-4" />
            Need Help?
          </button>
          <button type="button" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            English
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <p className="text-slate-800 font-medium">Welcome to</p>
              <h2 className="text-3xl font-extrabold tracking-tight">
                <span className="text-emerald-950">Zameen</span>
                <span className="text-emerald-600">AI</span>
                <span className="ml-1 text-emerald-500">🍃</span>
              </h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to continue</p>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <TabButton
                active={userType === "government"}
                onClick={() => {
                  setUserType("government");
                  setError(null);
                }}
                icon={<Landmark className="h-4 w-4" />}
                label="Government User"
              />
              <TabButton
                active={userType === "citizen"}
                onClick={() => {
                  setUserType("citizen");
                  setError(null);
                }}
                icon={<User className="h-4 w-4" />}
                label="Citizen / Landowner"
              />
            </div>

            {/* Demo credentials helper */}
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Use demo {userType === "government" ? "government" : "citizen"} credentials
            </button>

            {success ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">Signed in successfully</p>
                  <p className="mt-1 text-sm text-emerald-700">Redirecting to your dashboard…</p>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Official Email / User ID
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="email"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your official email or user ID"
                        disabled={isSubmitting}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={isSubmitting}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                      {error}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      Remember me
                    </label>
                    <a href="#" className="font-medium text-emerald-700 hover:text-emerald-800">
                      Forgot Password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-950 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                        <span aria-hidden>→</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-400">OR</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleNicSso}
                  disabled={isSubmitting}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-300 px-4 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                    alt=""
                    className="h-8 w-8"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">Login with NIC (Government SSO)</span>
                    <span className="block text-xs text-slate-500">Secure Access for Government Users (demo)</span>
                  </span>
                </button>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span>
                    A secure and trusted platform for a transparent India
                    <br />
                    <span className="block text-center">Ministry of Rural Development | Government of India</span>
                  </span>
                </div>

                {onSwitchToSignup && (
                  <p className="mt-6 text-center text-sm text-slate-500">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToSignup}
                      className="font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Create Account
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${active
        ? "border-emerald-700 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      }`}
  >
    {icon}
    {label}
  </button>
);

const Feature: React.FC<{ icon: React.ReactNode; label: string; sub: string }> = ({ icon, label, sub }) => (
  <div className="flex flex-col items-center text-center gap-2">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">{icon}</div>
    <div>
      <p className="text-sm font-semibold text-emerald-950">{label}</p>
      <p className="text-xs text-slate-600">{sub}</p>
    </div>
  </div>
);

const DocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-800">
    <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" />
    <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-800">
    <path
      d="M12 22s7-7.58 7-12.5A7 7 0 105 9.5C5 14.42 12 22 12 22z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export default LoginPage;