import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CircleAlert,
  CircleCheck,
  Lock,
  Navigation,
  Save,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { PortalCard } from "../components/portal/PortalLayout";
import {
  AREA_VERDICT_OPTIONS,
  assetOptions,
  BOUNDARY_OPTIONS,
  BOUNDARY_SIDES,
  PHOTO_SLOTS,
  wizardSteps,
} from "../features/fieldOfficer/fieldOfficerData";
import { useFieldOfficer } from "../features/fieldOfficer/FieldOfficerStore";
import { FieldLabel, FilterSelect, RadioCard, TextInput } from "../features/fieldOfficer/fieldOfficerUi";

export const Route = createFileRoute("/field-officer/verify")({
  component: FieldOfficerVerify,
});

/**
 * Nine-step ground-verification wizard (PRD journey step 4).
 *
 * Wizard state lives in `FieldOfficerStore` so the assignments table, the map
 * screen and this route all observe the same selected parcel and answers.
 */
function FieldOfficerVerify() {
  const navigate = useNavigate();
  const {
    online,
    selected,
    selectedId,
    wStep,
    setWStep,
    submitted,
    setSubmitted,
    setAssignments,
    parcelVerdict,
    setParcelVerdict,
    possession,
    setPossession,
    areaVerdict,
    setAreaVerdict,
    boundaries,
    setBoundaries,
    gps,
    setGps,
    photos,
    setPhotos,
    assets,
    setAssets,
    remarks,
    setRemarks,
  } = useFieldOfficer();

  const go = (to: string) => () => navigate({ to });
  const pct = Math.round((wStep / 9) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={go("/field-officer/assignments")} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"><ArrowLeft size={14} /> Assignments</button>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"><Save size={13} /> Save Draft</button>
      </div>

      <PortalCard>
        <p className="font-mono text-[10px] font-black uppercase tracking-widest text-emerald-800">{selected.project}</p>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-black text-slate-900">Ground Verification: Khasra {selected.khasra}</h1>
          <p className="text-xs text-slate-500">Due: <span className="font-mono font-bold text-slate-800">{selected.due}</span> <span className="mx-1">·</span> <span className="font-bold text-amber-700">{selected.priority} Priority</span></p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs lg:grid-cols-4">
          {[["Village / District", `${selected.village.replace("Mauza ", "")}, ${selected.district}`], ["Recorded Owner", selected.owner], ["Official Area", selected.areaBigha], ["Khata Number", selected.khata]].map(([l, v]) => (
            <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold leading-snug text-slate-800">{v}</p></div>
          ))}
        </div>
      </PortalCard>

      <PortalCard className="mt-4 !p-4">
        <p className="flex items-center justify-between text-xs font-bold text-slate-800">Step {wStep} of 9: {wizardSteps[wStep - 1]} <span className="font-mono text-[11px] font-medium text-slate-400">{pct}% Complete</span></p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-800 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {wizardSteps.map((s, i) => (
            <button key={s} onClick={() => setWStep(i + 1)} className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${i + 1 === wStep ? "bg-emerald-900 text-white" : i + 1 < wStep ? "bg-emerald-50 text-emerald-900" : "bg-slate-50 text-slate-400"}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${i + 1 < wStep ? "border-emerald-700" : "border-current"}`}>{i + 1 < wStep ? "✓" : i + 1}</span> {s}
            </button>
          ))}
        </div>
      </PortalCard>

      {!submitted ? (
        <PortalCard className="mt-4">
          {wStep === 1 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 1: Parcel Identity Verification</h2>
              <p className="mt-0.5 text-xs text-slate-500">Verify that the physical field on ground matches the assigned cadastral entry.</p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center justify-between text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Lock size={13} /> Authoritative Land Record Reference (Read-Only)</span><span className="font-mono text-[10px] font-medium text-slate-400">ROR Ref: ROR-UP-VNS-PIN-9021</span></p>
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-xs sm:grid-cols-3">
                  {[["Khasra / Survey No", selected.khasra], ["Khata Number", selected.khata], ["Village / Tehsil", `${selected.village.replace("Mauza ", "")}, Pindra`], ["Recorded Area", `${selected.areaBigha} (${selected.areaHa.replace("Hectare", "Ha")})`], ["Land Classification", "Fasli 1432 - Irrigated Agricultural"], ["Project Reference", "NHAI/VRR-P2/SEC4/143"]].map(([l, v]) => (
                    <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p></div>
                  ))}
                </div>
              </div>
              <FieldLabel><span className="mt-4 block text-sm">Does the physical parcel correspond to the assigned parcel?</span></FieldLabel>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <RadioCard selected={parcelVerdict === "Verified"} onClick={() => setParcelVerdict("Verified")} title="Verified" desc="Ground location matches cadastral survey sheet" />
                <RadioCard selected={parcelVerdict === "Mismatch"} onClick={() => setParcelVerdict("Mismatch")} title="Mismatch" desc="Discrepancy in location or numbering" />
                <RadioCard selected={parcelVerdict === "Unable to Verify"} onClick={() => setParcelVerdict("Unable to Verify")} title="Unable to Verify" desc="Physical access obstructed / markers missing" />
              </div>
              <div className="mt-4"><FieldLabel>Field Officer Remarks</FieldLabel>
                <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Record any observation regarding survey stones, boundary stones, or village sajra alignment…" rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
              </div>
            </>
          )}

          {wStep === 2 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 2: Ownership Verification</h2>
              <p className="mt-0.5 text-xs text-slate-500">Check physical possession on ground against digitized revenue register.</p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center justify-between text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Lock size={13} /> Digitized Ownership Information (Read-Only)</span><span className="font-mono text-[10px] font-medium text-slate-400">Mutation Ref: MUT/2012/33102/REV</span></p>
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 text-xs sm:grid-cols-2">
                  {[["Recorded Khatedar / Owner", selected.owner], ["Parent / Spouse Name", "Late Chhote Lal Yadav"], ["Ownership Type", "Joint"], ["Mutation Date", "2012-04-18"]].map(([l, v]) => (
                    <div key={l}><p className="text-[10px] uppercase tracking-wider text-slate-400">{l}</p><p className="mt-0.5 font-bold text-slate-800">{v}</p></div>
                  ))}
                </div>
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] italic leading-relaxed text-slate-600">Note: The Field Officer cannot directly overwrite authoritative ownership records. Any discrepancies found on ground will be logged as an official Discrepancy Report.</p>
              </div>
              <FieldLabel><span className="mt-4 block text-sm">Ground Possession Status</span></FieldLabel>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <RadioCard selected={possession === "Confirmed"} onClick={() => setPossession("Confirmed")} title="Confirmed" desc="Recorded owner is in peaceful possession" />
                <RadioCard selected={possession === "Mismatch"} onClick={() => setPossession("Mismatch")} title="Mismatch" desc="Third-party occupant or disputed succession" />
                <RadioCard selected={possession === "Unable to Verify"} onClick={() => setPossession("Unable to Verify")} title="Unable to Verify" desc="Occupant absent during field visit" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><FieldLabel>Person in Physical Possession on Ground</FieldLabel><TextInput value={selected.owner} placeholder="Occupant name" /></div>
                <div><FieldLabel>Relationship to Recorded Owner</FieldLabel><TextInput value="Self (Recorded Owner)" placeholder="Relationship" /></div>
              </div>
              <label className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
                <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-emerald-800" /> Unrecorded tenancy, civil court litigation, or family partition dispute observed
              </label>
              <div className="mt-4"><FieldLabel>Ownership Verification Notes</FieldLabel>
                <textarea placeholder="State occupant statements, witness names, or ground possession context…" rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
              </div>
            </>
          )}

          {wStep === 3 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 3: Land Details Verification</h2>
              <p className="mt-0.5 text-xs text-slate-500">Verify physical land use, visible assets, cultivation, and ground condition.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><FieldLabel>Verified Ground Land Use</FieldLabel><FilterSelect label="Agricultural (Farming/Crops)" /></div>
                <div><FieldLabel>Cultivation &amp; Farming Status</FieldLabel><FilterSelect label="Active Cultivation (Standing Crop)" /></div>
              </div>
              <div className="mt-3"><FieldLabel>Active Crop or Vegetation Type (if applicable)</FieldLabel><TextInput value="Paddy / Seasonal Grain" /></div>
              <FieldLabel><span className="mt-4 block">Visible Structures &amp; Physical Assets on Ground</span></FieldLabel>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {assetOptions.map((a) => (
                  <label key={a} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700">
                    <input type="checkbox" checked={assets.includes(a)} onChange={() => setAssets((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))} className="h-3.5 w-3.5 accent-emerald-800" /> {a}
                  </label>
                ))}
              </div>
              <FieldLabel><span className="mt-4 block">Ground Area Alignment (Recorded: {selected.areaBigha})</span></FieldLabel>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {AREA_VERDICT_OPTIONS.map((o) => (
                  <button key={o} onClick={() => setAreaVerdict(o)} className={`rounded-xl border px-2 py-2.5 text-[11px] font-semibold ${areaVerdict === o ? "border-emerald-800 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-500"}`}>{o}</button>
                ))}
              </div>
              <div className="mt-4"><FieldLabel>Land Condition Observations</FieldLabel>
                <textarea placeholder="Describe soil elevation, irrigation channel availability, or structural details…" rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
              </div>
            </>
          )}

          {wStep === 4 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 4: Boundary Verification</h2>
              <p className="mt-0.5 text-xs text-slate-500">Inspect physical boundaries on North, South, East, and West cardinal directions.</p>
              <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-900 p-4" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
                <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-white"><span className="rounded bg-white/10 px-2 py-1">CADASTRAL SHEET: RAMNAGAR · Khasra {selected.khasra} | {selected.areaBigha}</span><span className="inline-flex items-center gap-1 rounded border border-amber-400/50 bg-amber-500/15 px-2 py-1 text-amber-300"><Lock size={11} /> Official Boundary Locked (Read-Only)</span></p>
                <svg viewBox="0 0 560 220" className="mx-auto mt-1 w-full max-w-[560px]">
                  <rect x={110} y={20} width={340} height={180} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="7 5" opacity={0.85} />
                  <g transform="rotate(-5 280 120)" fontSize={10} textAnchor="middle" fontWeight={700}>
                    <rect x={130} y={70} width={100} height={90} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                    <text x={180} y={118} fill="#cbd5e1">140/2</text>
                    <rect x={230} y={40} width={120} height={50} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                    <text x={290} y={68} fill="#cbd5e1">141</text>
                    <rect x={230} y={90} width={130} height={90} fill="rgba(52,211,153,.22)" stroke="#34d399" strokeWidth={2} />
                    <text x={295} y={132} fill="#fff" fontSize={12}>Khasra {selected.khasra}</text>
                    <text x={295} y={146} fill="#a7f3d0" fontSize={9}>{selected.areaBigha}</text>
                    <circle cx={295} cy={140} r={12} fill="rgba(96,165,250,.25)" stroke="#60a5fa" strokeDasharray="3 3" />
                    <circle cx={295} cy={140} r={4.5} fill="#60a5fa" stroke="#fff" strokeWidth={2} />
                    <rect x={360} y={80} width={100} height={100} fill="rgba(148,163,184,.25)" stroke="#64748b" />
                    <text x={410} y={128} fill="#cbd5e1">PWD Road</text>
                    <rect x={230} y={180} width={130} height={32} fill="rgba(148,163,184,.2)" stroke="#64748b" />
                    <text x={295} y={200} fill="#cbd5e1">Khasra 143</text>
                    {[[230, 90], [360, 90], [230, 180], [360, 180]].map(([x, y]) => (<circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill="#fff" />))}
                  </g>
                </svg>
                <p className="font-mono text-[11px] text-emerald-300">⊕ Parcel Center: 25.26590°N, 83.02520°E <span className="ml-2 text-sky-300">Acc: ±2.1m</span></p>
              </div>
              <div className="mt-4 space-y-3">
                {BOUNDARY_SIDES.map(([side, adj]) => (
                  <div key={side} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-xs font-bold text-slate-800">◉ {side} <span className="font-medium text-slate-400">({adj})</span></p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
                      {BOUNDARY_OPTIONS.map((o) => (
                        <button key={o} onClick={() => setBoundaries((b) => ({ ...b, [side]: o }))} className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${boundaries[side] === o ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-200 bg-white text-slate-500"}`}>{o}</button>
                      ))}
                    </div>
                    <input placeholder={`Notes on ${side.toLowerCase()} marks, bunds, encroachment, or dispute…`} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none placeholder:text-slate-400" />
                  </div>
                ))}
              </div>
              <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-medium text-slate-700">
                <input type="checkbox" className="mt-0.5 h-3.5 w-3.5 accent-amber-600" /> Physical boundary encroachment into government land, chakmarg, or adjoining parcel observed
              </label>
            </>
          )}

          {wStep === 5 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 5: GPS Ground Verification</h2>
              <p className="mt-0.5 text-xs text-slate-500">Acquire certified hardware GPS coordinates at the center or key boundary marker of the parcel.</p>
              {!gps && (
                <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[11px] font-medium text-red-700"><CircleAlert size={14} /> Please capture GPS coordinates before proceeding to photo evidence.</p>
              )}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center justify-between text-xs font-bold text-slate-700"><span className="flex items-center gap-1.5"><Navigation size={13} className="text-emerald-800" /> Active Satellite Signal Status</span><span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">{gps ? "Locked ±2.1m" : "Awaiting Capture"}</span></p>
                <p className={`mt-2.5 rounded-lg border border-dashed px-3 py-3 text-center font-mono text-[11px] ${gps ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 text-slate-400"}`}>
                  {gps ?? "No GPS point captured yet for this session. Stand at the parcel marker and press “Capture Current Location”."}
                </p>
                <button onClick={() => setGps(`25.26780°N, 83.02450°E · Acc ±2.1m · ${new Date().toLocaleString("en-IN")}`)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 py-3 text-xs font-bold text-white hover:bg-emerald-800"><Navigation size={14} /> Capture Current Location</button>
              </div>
            </>
          )}

          {wStep === 6 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 6: Photo Evidence</h2>
              <p className="mt-0.5 text-xs text-slate-500">Capture geo-tagged ground photos. Stored offline until sync is available.</p>
              {!online && (
                <p className="mt-4 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-800"><WifiOff size={14} /> Offline mode — photos are saved to the encrypted local buffer ({photos.length} staged).</p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PHOTO_SLOTS.map((slot) => {
                  const added = photos.includes(slot);
                  return (
                    <button key={slot} onClick={() => setPhotos((p) => (p.includes(slot) ? p.filter((x) => x !== slot) : [...p, slot]))} className={`flex items-center gap-2.5 rounded-xl border p-3 text-left ${added ? "border-emerald-700 bg-emerald-50" : "border-dashed border-slate-300 bg-white"}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${added ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-400"}`}>{added ? <CircleCheck size={18} /> : <Camera size={18} />}</span>
                      <span><span className="block text-xs font-bold text-slate-800">{slot}</span><span className="block font-mono text-[10px] text-slate-400">{added ? "Geo-tagged · queued for sync" : "Tap to capture (simulated)"}</span></span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {wStep === 7 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 7: Asset Verification</h2>
              <p className="mt-0.5 text-xs text-slate-500">Confirm the structures and physical assets observed on ground.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {assetOptions.map((a) => (
                  <label key={a} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${assets.includes(a) ? "border-emerald-700 bg-emerald-50 font-bold text-emerald-900" : "border-slate-200 text-slate-700"}`}>
                    <input type="checkbox" checked={assets.includes(a)} onChange={() => setAssets((s) => (s.includes(a) ? s.filter((x) => x !== a) : [...s, a]))} className="h-3.5 w-3.5 accent-emerald-800" /> {a}
                  </label>
                ))}
              </div>
              {assets.length === 0 && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">No structures selected — parcel recorded as vacant agricultural land.</p>}
            </>
          )}

          {wStep === 8 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 8: Witness Statements</h2>
              <p className="mt-0.5 text-xs text-slate-500">Record two independent village witnesses present during ground verification.</p>
              <div className="mt-4 space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="rounded-xl border border-slate-200 p-3.5">
                    <p className="text-xs font-bold text-slate-800">Witness {n}</p>
                    <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div><FieldLabel>Full Name</FieldLabel><TextInput value="" placeholder="e.g. Hari Shankar Mishra" /></div>
                      <div><FieldLabel>Phone / Village</FieldLabel><TextInput value="" placeholder="e.g. Ramnagar" /></div>
                    </div>
                    <div className="mt-2.5"><FieldLabel>Statement</FieldLabel>
                      <textarea placeholder="Occupant / boundary confirmation statement…" rows={2} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs outline-none placeholder:text-slate-400 focus:border-emerald-600" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {wStep === 9 && (
            <>
              <h2 className="text-base font-black text-slate-900">Step 9: Review &amp; Submit</h2>
              <p className="mt-0.5 text-xs text-slate-500">Confirm the ground report before transmitting to the revenue database. Submitted records are immutable.</p>
              <div className="mt-4 space-y-2 text-xs">
                {[
                  ["Parcel Identity", parcelVerdict],
                  ["Possession", possession],
                  ["Area Alignment", areaVerdict],
                  ["Boundaries", (["North", "South", "East", "West"] as const).map((s) => `${s}: ${boundaries[s]}`).join(" · ")],
                  ["GPS", gps ?? "Not captured"],
                  ["Photos", photos.length > 0 ? `${photos.length} staged (${photos.join(", ")})` : "None staged"],
                  ["Assets", assets.length > 0 ? assets.join(", ") : "Vacant agricultural land"],
                ].map(([l, v]) => (
                  <div key={l as string} className="flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 sm:flex-row sm:gap-3">
                    <span className="w-32 shrink-0 font-bold text-slate-500">{l as string}</span>
                    <span className="font-medium text-slate-800">{v as string}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setSubmitted(true);
                  setAssignments((list) => list.map((a) => (a.id === selected.id ? { ...a, status: "Submitted" } : a)));
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 py-3 text-xs font-bold text-white hover:bg-emerald-800"
              >
                <ShieldCheck size={15} /> Submit Ground Report {online ? "(Online)" : "(Save Offline)"}
              </button>
            </>
          )}
        </PortalCard>
      ) : (
        <PortalCard className="mt-4 border-emerald-200 bg-emerald-50/50 text-center">
          <CircleCheck size={36} className="mx-auto text-emerald-700" />
          <h2 className="mt-2 text-lg font-black text-slate-900">Ground Report Submitted</h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-600">Khasra {selected.khasra} ({selected.id}) saved {online ? "and transmitted" : "to the offline buffer — it will sync automatically"} . Reference: VER-2026-UP-{selectedId.slice(-4)}.</p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <button onClick={go("/field-officer/completed")} className="rounded-xl bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white">View Completed Records</button>
            <button onClick={go("/field-officer/assignments")} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700">Back to Assignments</button>
          </div>
        </PortalCard>
      )}

      {!submitted && (
        <div className="mt-4 flex items-center justify-between">
          <button disabled={wStep === 1} onClick={() => setWStep((s) => Math.max(1, s - 1))} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-40"><ArrowLeft size={13} /> Previous Step</button>
          {wStep < 9 && (
            <button onClick={() => setWStep((s) => Math.min(9, s + 1))} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white">Proceed to Step {wStep + 1} <ArrowRight size={13} /></button>
          )}
        </div>
      )}
    </div>
  );
}
