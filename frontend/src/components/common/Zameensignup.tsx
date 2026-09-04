// import React, { useState } from "react";
// import {
//   User,
//   Mail,
//   Phone,
//   IdCard,
//   Building2,
//   Lock,
//   Eye,
//   EyeOff,
//   HelpCircle,
//   ChevronDown,
//   ChevronLeft,
//   Landmark,
//   ShieldCheck,
//   Users,
//   Leaf,
// } from "lucide-react";

// type UserType = "government" | "citizen";

// interface SignupPageProps {
//   onSwitchToLogin?: () => void;
// }

// const DEPARTMENTS = [
//   "Revenue Department",
//   "Rural Development",
//   "Land Records & Survey",
//   "Urban Development",
//   "Public Works Department",
// ];

// const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin }) => {
//   const [userType, setUserType] = useState<UserType>("government");
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [agreed, setAgreed] = useState(false);

//   const [form, setForm] = useState({
//     fullName: "",
//     email: "",
//     mobile: "",
//     employeeId: "",
//     department: "",
//     password: "",
//     confirmPassword: "",
//   });

//   const update =
//     (field: keyof typeof form) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
//       setForm((f) => ({ ...f, [field]: e.target.value }));

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!agreed) return;
//     // Wire up to your registration flow here
//     console.log({ userType, ...form });
//   };

//   return (
//     <div className="min-h-screen w-full flex bg-white">
//       {/* Left panel */}
//       <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
//         <img
//           src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
//           alt="Aerial view of green farmland"
//           className="absolute inset-0 h-full w-full object-cover"
//         />
//         <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-slate-900/30" />

//         <div className="relative z-10 flex flex-col justify-between p-12 w-full">
//           <div className="flex items-center gap-3">
//             <img
//               src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
//               alt="Emblem of India"
//               className="h-12 w-12"
//             />
//             <div className="leading-tight">
//               <p className="font-semibold text-slate-800 text-sm">Government of India</p>
//               <p className="text-slate-600 text-xs">
//                 Digital India <span className="mx-1">|</span> for a Developed India
//               </p>
//             </div>
//           </div>

//           <div>
//             <h1 className="text-5xl font-extrabold tracking-tight">
//               <span className="text-emerald-950">Zameen</span>
//               <span className="text-emerald-600">AI</span>
//               <Leaf className="inline-block ml-1 h-8 w-8 text-emerald-500 -translate-y-3" fill="currentColor" />
//             </h1>
//             <p className="mt-4 text-xl font-semibold text-emerald-950 max-w-md">
//               Real-Time Intelligent Land Acquisition, Digitization, Validation &amp; Management System
//             </p>
//             <p className="mt-4 text-slate-700">Bringing Clarity to Land Acquisition and Records</p>

//             <div className="mt-10 grid grid-cols-4 gap-6 max-w-lg">
//               <Feature icon={<DocIcon />} label="Digitize" sub="Legacy Records" />
//               <Feature icon={<ShieldCheck className="h-6 w-6 text-emerald-800" />} label="Validate" sub="with AI" />
//               <Feature icon={<PinIcon />} label="Monitor" sub="End-to-End" />
//               <Feature icon={<Users className="h-6 w-6 text-emerald-800" />} label="Empower" sub="Citizens" />
//             </div>
//           </div>

//           <div>
//             <h2 className="text-3xl font-bold text-white drop-shadow-sm leading-tight">
//               Land Records.
//               <br />A Stronger Tomorrow.
//             </h2>
//             <div className="mt-3 h-0.5 w-16 bg-white/80" />
//           </div>
//         </div>
//       </div>

//       {/* Right panel */}
//       <div className="flex w-full lg:w-1/2 flex-col">
//         <div className="flex items-center justify-between px-6 py-5 sm:px-12">
//           <button
//             onClick={onSwitchToLogin}
//             className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
//           >
//             <ChevronLeft className="h-4 w-4" />
//             Back to Login
//           </button>
//           <div className="flex items-center gap-6">
//             <button className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
//               <HelpCircle className="h-4 w-4" />
//               Need Help?
//             </button>
//             <button className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
//               English
//               <ChevronDown className="h-4 w-4" />
//             </button>
//           </div>
//         </div>

//         <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-12">
//           <div className="w-full max-w-xl">
//             <div className="mb-8">
//               <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-1.5">
//                 Create Your Account
//                 <Leaf className="h-5 w-5 text-emerald-500" fill="currentColor" />
//               </h2>
//               <p className="mt-2 text-sm text-slate-500">
//                 Join ZameenAI and be a part of a transparent, digital and citizen-centric land management ecosystem.
//               </p>
//             </div>

//             {/* Tabs */}
//             <div className="grid grid-cols-2 gap-3 mb-6">
//               <TabButton
//                 active={userType === "government"}
//                 onClick={() => setUserType("government")}
//                 icon={<Landmark className="h-4 w-4" />}
//                 label="Government User"
//                 sub="(Invite / Official Registration)"
//               />
//               <TabButton
//                 active={userType === "citizen"}
//                 onClick={() => setUserType("citizen")}
//                 icon={<User className="h-4 w-4" />}
//                 label="Citizen / Landowner"
//                 sub="(Self Registration)"
//               />
//             </div>

//             <form onSubmit={handleSubmit} className="space-y-5">
//               <Field label="Full Name" htmlFor="fullName">
//                 <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                 <input
//                   id="fullName"
//                   type="text"
//                   value={form.fullName}
//                   onChange={update("fullName")}
//                   placeholder="Enter your full name"
//                   className={inputClass}
//                 />
//               </Field>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
//                 <Field label="Official Email ID" htmlFor="email">
//                   <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                   <input
//                     id="email"
//                     type="email"
//                     value={form.email}
//                     onChange={update("email")}
//                     placeholder="Enter your official email"
//                     className={inputClass}
//                   />
//                 </Field>

//                 <Field label="Mobile Number" htmlFor="mobile">
//                   <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                   <input
//                     id="mobile"
//                     type="tel"
//                     value={form.mobile}
//                     onChange={update("mobile")}
//                     placeholder="Enter your mobile number"
//                     className={inputClass}
//                   />
//                 </Field>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
//                 <Field label="Employee/Officer ID (Optional)" htmlFor="employeeId">
//                   <IdCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                   <input
//                     id="employeeId"
//                     type="text"
//                     value={form.employeeId}
//                     onChange={update("employeeId")}
//                     placeholder="Enter your employee ID"
//                     className={inputClass}
//                   />
//                 </Field>

//                 <Field label="Department / Organization" htmlFor="department">
//                   <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                   <select
//                     id="department"
//                     value={form.department}
//                     onChange={update("department")}
//                     className={`${inputClass} appearance-none bg-white`}
//                   >
//                     <option value="" disabled>
//                       Select department
//                     </option>
//                     {DEPARTMENTS.map((d) => (
//                       <option key={d} value={d}>
//                         {d}
//                       </option>
//                     ))}
//                   </select>
//                   <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                 </Field>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
//                 <Field label="Password" htmlFor="password">
//                   <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                   <input
//                     id="password"
//                     type={showPassword ? "text" : "password"}
//                     value={form.password}
//                     onChange={update("password")}
//                     placeholder="Create a password"
//                     className={`${inputClass} pr-10`}
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword((v) => !v)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
//                     aria-label={showPassword ? "Hide password" : "Show password"}
//                   >
//                     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 </Field>

//                 <Field label="Confirm Password" htmlFor="confirmPassword">
//                   <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                   <input
//                     id="confirmPassword"
//                     type={showConfirmPassword ? "text" : "password"}
//                     value={form.confirmPassword}
//                     onChange={update("confirmPassword")}
//                     placeholder="Confirm your password"
//                     className={`${inputClass} pr-10`}
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowConfirmPassword((v) => !v)}
//                     className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
//                     aria-label={showConfirmPassword ? "Hide password" : "Show password"}
//                   >
//                     {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                   </button>
//                 </Field>
//               </div>

//               <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer select-none">
//                 <input
//                   type="checkbox"
//                   checked={agreed}
//                   onChange={(e) => setAgreed(e.target.checked)}
//                   className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
//                 />
//                 <span>
//                   I agree to the{" "}
//                   <a href="#" className="font-medium text-emerald-700 hover:text-emerald-800">
//                     Terms of Use
//                   </a>{" "}
//                   and{" "}
//                   <a href="#" className="font-medium text-emerald-700 hover:text-emerald-800">
//                     Privacy Policy
//                   </a>
//                 </span>
//               </label>

//               <button
//                 type="submit"
//                 disabled={!agreed}
//                 className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-950 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
//               >
//                 Create Account
//                 <span aria-hidden>→</span>
//               </button>
//             </form>

//             <p className="mt-6 text-center text-sm text-slate-500">
//               Already have an account?{" "}
//               <button onClick={onSwitchToLogin} className="font-medium text-emerald-700 hover:text-emerald-800">
//                 Sign In
//               </button>
//             </p>

//             <div className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-100 pt-6 text-center">
//               <Trust icon={<ShieldCheck className="h-5 w-5 text-slate-400" />} label="Secure & Encrypted" sub="Government Grade Security" />
//               <Trust icon={<Users className="h-5 w-5 text-slate-400" />} label="Trusted by Citizens" sub="For a Transparent India" />
//               <Trust icon={<Leaf className="h-5 w-5 text-slate-400" />} label="Digital India" sub="Towards a Smarter Bharat" />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// const inputClass =
//   "w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100";

// const Field: React.FC<{ label: string; htmlFor: string; children: React.ReactNode }> = ({
//   label,
//   htmlFor,
//   children,
// }) => (
//   <div>
//     <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
//       {label}
//     </label>
//     <div className="relative">{children}</div>
//   </div>
// );

// const TabButton: React.FC<{
//   active: boolean;
//   onClick: () => void;
//   icon: React.ReactNode;
//   label: string;
//   sub: string;
// }> = ({ active, onClick, icon, label, sub }) => (
//   <button
//     type="button"
//     onClick={onClick}
//     className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
//       active
//         ? "border-emerald-700 bg-emerald-50 text-emerald-900"
//         : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
//     }`}
//   >
//     <span className="flex items-center gap-2">
//       {icon}
//       {label}
//     </span>
//     <span className={`text-xs font-normal ${active ? "text-emerald-700" : "text-slate-400"}`}>{sub}</span>
//   </button>
// );

// const Feature: React.FC<{ icon: React.ReactNode; label: string; sub: string }> = ({ icon, label, sub }) => (
//   <div className="flex flex-col items-center text-center gap-2">
//     <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/70">{icon}</div>
//     <div>
//       <p className="text-sm font-semibold text-emerald-950">{label}</p>
//       <p className="text-xs text-slate-600">{sub}</p>
//     </div>
//   </div>
// );

// const Trust: React.FC<{ icon: React.ReactNode; label: string; sub: string }> = ({ icon, label, sub }) => (
//   <div className="flex flex-col items-center gap-1">
//     {icon}
//     <p className="text-xs font-semibold text-slate-700">{label}</p>
//     <p className="text-[11px] text-slate-400">{sub}</p>
//   </div>
// );

// const DocIcon = () => (
//   <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-800">
//     <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.6" />
//     <path d="M14 2v5h5" stroke="currentColor" strokeWidth="1.6" />
//   </svg>
// );

// const PinIcon = () => (
//   <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-emerald-800">
//     <path
//       d="M12 22s7-7.58 7-12.5A7 7 0 105 9.5C5 14.42 12 22 12 22z"
//       stroke="currentColor"
//       strokeWidth="1.6"
//     />
//     <circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
//   </svg>
// );

// export default SignupPage;




import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  IdCard,
  Building2,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
  ChevronDown,
  ChevronLeft,
  Landmark,
  ShieldCheck,
  Users,
  Leaf,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

type UserType = "government" | "citizen";

interface SignupPageProps {
  onSwitchToLogin?: () => void;
  /** Called after a (simulated) successful registration. */
  onSignupSuccess?: (userType: UserType) => void;
}

const DEPARTMENTS = [
  "Revenue Department",
  "Rural Development",
  "Land Records & Survey",
  "Urban Development",
  "Public Works Department",
];

// Dummy/demo form data for one-click testing — no real backend involved.
const DEMO_FORM: Record<UserType, {
  fullName: string;
  email: string;
  mobile: string;
  employeeId: string;
  department: string;
  password: string;
  confirmPassword: string;
}> = {
  government: {
    fullName: "Anjali Sharma",
    email: "anjali.sharma.demo@zameenai.gov.in",
    mobile: "9876543210",
    employeeId: "LAO-DL-00214",
    department: "Revenue Department",
    password: "Demo@123",
    confirmPassword: "Demo@123",
  },
  citizen: {
    fullName: "Ramesh Kumar",
    email: "ramesh.kumar.demo@gmail.com",
    mobile: "9123456780",
    employeeId: "",
    department: "",
    password: "Demo@123",
    confirmPassword: "Demo@123",
  },
};

const SignupPage: React.FC<SignupPageProps> = ({ onSwitchToLogin, onSignupSuccess }) => {
  const [userType, setUserType] = useState<UserType>("government");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    employeeId: "",
    department: "",
    password: "",
    confirmPassword: "",
  });

  const update =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const fillDemoData = () => {
    setForm(DEMO_FORM[userType]);
    setAgreed(true);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim() || !form.email.trim() || !form.mobile.trim() || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("Please accept the Terms of Use and Privacy Policy.");
      return;
    }

    setIsSubmitting(true);

    // Simulated network call — swap this block for a real API call.
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => onSignupSuccess?.(userType), 800);
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
              <Leaf className="inline-block ml-1 h-8 w-8 text-emerald-500 -translate-y-3" fill="currentColor" />
            </h1>
            <p className="mt-4 text-xl font-semibold text-emerald-950 max-w-md">
              Real-Time Intelligent Land Acquisition, Digitization, Validation &amp; Management System
            </p>
            <p className="mt-4 text-slate-700">Bringing Clarity to Land Acquisition and Records</p>

            <div className="mt-10 grid grid-cols-4 gap-6 max-w-lg">
              <Feature icon={<DocIcon />} label="Digitize" sub="Legacy Records" />
              <Feature icon={<ShieldCheck className="h-6 w-6 text-emerald-800" />} label="Validate" sub="with AI" />
              <Feature icon={<PinIcon />} label="Monitor" sub="End-to-End" />
              <Feature icon={<Users className="h-6 w-6 text-emerald-800" />} label="Empower" sub="Citizens" />
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
        <div className="flex items-center justify-between px-6 py-5 sm:px-12">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Login
          </button>
          <div className="flex items-center gap-6">
            <button type="button" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
              <HelpCircle className="h-4 w-4" />
              Need Help?
            </button>
            <button type="button" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
              English
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-12">
          <div className="w-full max-w-xl">
            {success ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 py-16 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-900">Account created successfully</p>
                  <p className="mt-1 text-sm text-emerald-700">Taking you to sign in…</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-1.5">
                    Create Your Account
                    <Leaf className="h-5 w-5 text-emerald-500" fill="currentColor" />
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Join ZameenAI and be a part of a transparent, digital and citizen-centric land management ecosystem.
                  </p>
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
                    sub="(Invite / Official Registration)"
                  />
                  <TabButton
                    active={userType === "citizen"}
                    onClick={() => {
                      setUserType("citizen");
                      setError(null);
                    }}
                    icon={<User className="h-4 w-4" />}
                    label="Citizen / Landowner"
                    sub="(Self Registration)"
                  />
                </div>

                {/* Demo data helper */}
                <button
                  type="button"
                  onClick={fillDemoData}
                  className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Fill demo {userType === "government" ? "government" : "citizen"} details
                </button>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Field label="Full Name" htmlFor="fullName">
                    <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="fullName"
                      type="text"
                      value={form.fullName}
                      onChange={update("fullName")}
                      placeholder="Enter your full name"
                      disabled={isSubmitting}
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Official Email ID" htmlFor="email">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={update("email")}
                        placeholder="Enter your official email"
                        disabled={isSubmitting}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Mobile Number" htmlFor="mobile">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="mobile"
                        type="tel"
                        value={form.mobile}
                        onChange={update("mobile")}
                        placeholder="Enter your mobile number"
                        disabled={isSubmitting}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Employee/Officer ID (Optional)" htmlFor="employeeId">
                      <IdCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="employeeId"
                        type="text"
                        value={form.employeeId}
                        onChange={update("employeeId")}
                        placeholder="Enter your employee ID"
                        disabled={isSubmitting}
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Department / Organization" htmlFor="department">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <select
                        id="department"
                        value={form.department}
                        onChange={update("department")}
                        disabled={isSubmitting}
                        className={`${inputClass} appearance-none bg-white`}
                      >
                        <option value="" disabled>
                          Select department
                        </option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Password" htmlFor="password">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={update("password")}
                        placeholder="Create a password"
                        disabled={isSubmitting}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>

                    <Field label="Confirm Password" htmlFor="confirmPassword">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={update("confirmPassword")}
                        placeholder="Confirm your password"
                        disabled={isSubmitting}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </Field>
                  </div>

                  {error && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
                      {error}
                    </p>
                  )}

                  <label className="flex items-start gap-2 text-sm text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      disabled={isSubmitting}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>
                      I agree to the{" "}
                      <a href="#" className="font-medium text-emerald-700 hover:text-emerald-800">
                        Terms of Use
                      </a>{" "}
                      and{" "}
                      <a href="#" className="font-medium text-emerald-700 hover:text-emerald-800">
                        Privacy Policy
                      </a>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-950 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      <>
                        Create Account
                        <span aria-hidden>→</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Sign In
                  </button>
                </p>

                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-100 pt-6 text-center">
                  <Trust icon={<ShieldCheck className="h-5 w-5 text-slate-400" />} label="Secure & Encrypted" sub="Government Grade Security" />
                  <Trust icon={<Users className="h-5 w-5 text-slate-400" />} label="Trusted by Citizens" sub="For a Transparent India" />
                  <Trust icon={<Leaf className="h-5 w-5 text-slate-400" />} label="Digital India" sub="Towards a Smarter Bharat" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50";

const Field: React.FC<{ label: string; htmlFor: string; children: React.ReactNode }> = ({
  label,
  htmlFor,
  children,
}) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1.5">
      {label}
    </label>
    <div className="relative">{children}</div>
  </div>
);

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}> = ({ active, onClick, icon, label, sub }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
      active
        ? "border-emerald-700 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
    }`}
  >
    <span className="flex items-center gap-2">
      {icon}
      {label}
    </span>
    <span className={`text-xs font-normal ${active ? "text-emerald-700" : "text-slate-400"}`}>{sub}</span>
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

const Trust: React.FC<{ icon: React.ReactNode; label: string; sub: string }> = ({ icon, label, sub }) => (
  <div className="flex flex-col items-center gap-1">
    {icon}
    <p className="text-xs font-semibold text-slate-700">{label}</p>
    <p className="text-[11px] text-slate-400">{sub}</p>
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

export default SignupPage;