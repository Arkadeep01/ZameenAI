/* ========================================================================== */
/* CITIZEN PORTAL — SHARED SURFACE / BUTTON STYLE HELPERS                      */
/*                                                                             */
/* These are plain class-string builders, NOT components. Existing <button>,    */
/* <a> and TanStack <Link> elements keep working exactly as before — only the */
/* presentation is centralised so height, radius, weight, focus rings and       */
/* hover behaviour cannot drift between pages.                                  */
/* ========================================================================== */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

/* -------------------------------------------------------------------------- */
/* SURFACE (card)                                                             */
/* -------------------------------------------------------------------------- */

/** Canonical card: white, 1px hairline border, 12px radius, restrained shadow. */
export const surface =
  "rounded-xl border border-[#D9E2EC] bg-white shadow-xs";

/** Canonical card with the standard responsive inner padding. */
export const surfacePadded = `${surface} p-5 sm:p-6`;

/** Inset / sub-surface used inside a card. */
export const insetSurface =
  "rounded-lg border border-[#D9E2EC] bg-[#F6F8FB]";

/** Card that is a link/click target — adds the shared hover affordance. */
export const surfaceInteractive = `${surface} transition-shadow duration-150 hover:shadow-md`;

/* -------------------------------------------------------------------------- */
/* BUTTONS                                                                    */
/* -------------------------------------------------------------------------- */

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-[#062B52] text-white hover:bg-[#0C396E] active:bg-[#083868]",
  secondary:
    "border border-[#D9E2EC] bg-white text-[#062B52] hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  warning: "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  ghost: "text-[#1261A8] hover:bg-[#EAF3FC] active:bg-[#D9EBF3]",
};

const SIZE: Record<ButtonSize, string> = {
  // 36px — dense toolbars / table actions
  sm: "min-h-[36px] gap-1.5 rounded-lg px-3 py-1.5 text-xs",
  // 44px — default interactive target (WCAG 2.5.5 / touch friendly)
  md: "min-h-[44px] gap-2 rounded-lg px-4 py-2.5 text-sm",
  // 48px — primary page-level call to action
  lg: "min-h-[48px] gap-2 rounded-lg px-5 py-3 text-sm",
};

const BASE =
  "inline-flex w-fit items-center justify-center font-semibold whitespace-nowrap " +
  "transition-colors duration-150 select-none " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1261A8] " +
  "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none";

/**
 * Build the class string for a Citizen Portal button.
 * @example className={buttonClass("primary","md")}
 */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
): string {
  return `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${extra}`.trim();
}

/* -------------------------------------------------------------------------- */
/* FORM CONTROLS                                                              */
/* -------------------------------------------------------------------------- */

/** Canonical text input / select / textarea shell. */
export const fieldClass =
  "w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-[#062B52] " +
  "placeholder:text-slate-400 outline-none transition " +
  "focus:border-[#1261A8] focus:ring-2 focus:ring-[#1261A8]/20";

/* -------------------------------------------------------------------------- */
/* LAYOUT                                                                     */
/* -------------------------------------------------------------------------- */

/** Standard vertical rhythm between page sections. */
export const sectionGap = "space-y-5 sm:space-y-6";

/** Section eyebrow / kicker above a heading. */
export const eyebrowClass =
  "text-[11px] font-bold uppercase tracking-wider text-[#607089]";

/** Card / section heading. */
export const cardHeadingClass =
  "text-base font-bold tracking-tight text-[#062B52] sm:text-lg";
