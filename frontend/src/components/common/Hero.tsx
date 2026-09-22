import React, { useState, useEffect } from 'react';
import { HERO_CONTENT, TICKER_NOTICES } from '../../utils/portalData';
import { Language } from '../../utils/types';
import { 
  ShieldCheck, 
  Search, 
  UserCheck, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Building2, 
  MapPin, 
  Clock, 
  Bell, 
  Sparkles,
  Lock,
  Layers,
  Database,
  ExternalLink
} from 'lucide-react';

interface HeroProps {
  lang: Language;
  onOpenCitizenModal: (query?: string) => void;
  onOpenOfficialLogin: () => void;
}

export default function Hero({ lang, onOpenCitizenModal, onOpenOfficialLogin }: HeroProps) {
  const isHi = lang === 'hi';
  const isBn = lang === 'bn';
  const [quickKhasra, setQuickKhasra] = useState('');
  const [tickerIndex, setTickerIndex] = useState(0);

  // Auto-cycling gazette ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKER_NOTICES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenCitizenModal(quickKhasra.trim() || '142/2');
  };

  return (
    <section id="hero" className="relative bg-gradient-to-r from-[#003366] to-[#004a99] text-white border-b border-slate-200 overflow-hidden">
      {/* Subtle Sleek Geometric Ambient Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* 1. Live Statutory Gazette / Notification Ticker */}
      <div className="bg-[#002244] text-blue-100 text-xs px-4 py-1.5 border-b border-blue-900/60 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] bg-[#ff9933] px-2.5 py-0.5 rounded text-white shrink-0 shadow-xs">
            <Bell className="w-3 h-3 text-white animate-pulse" />
            <span>{isHi ? 'राजपत्र सूचना' : isBn ? 'রাজপত্র বিজ্ঞপ্তি' : 'Official Gazette'}</span>
          </div>
          <div className="overflow-hidden whitespace-nowrap text-xs text-blue-100 font-medium">
            <span className="inline-block transition-all duration-500 ease-in-out">
              {isHi ? TICKER_NOTICES[tickerIndex].textHi : isBn ? TICKER_NOTICES[tickerIndex].textBn : TICKER_NOTICES[tickerIndex].text}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-auto text-[11px] text-blue-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{isHi ? 'केंद्रीय पोर्टल लाइव' : isBn ? 'কেন্দ্রীয় পোর্টাল লাইভ' : 'Central Server Sync Active'}</span>
          </div>
        </div>
      </div>

      {/* Main Hero Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column (7 cols): Official Tagline, Mission, Dual CTAs & Trust Badges */}
          <div className="lg:col-span-7 space-y-6">
            {/* Government Mandate Badge */}
            <span className="inline-block px-3 py-1 rounded-full bg-blue-400/20 text-blue-100 text-[10px] font-bold tracking-widest uppercase border border-blue-300/20 shadow-2xs">
              {isHi
                ? 'डिजिटल इंडिया भू-अभिलेख आधुनिकीकरण कार्यक्रम (DILRMP) • अगली पीढ़ी का भू-सुशासन'
                : isBn
                ? 'ডিজিটাল ইন্ডিয়া ভূমি রেকর্ড আধুনিকীকরণ প্রোগ্রাম (DILRMP) • পরবর্তী প্রজন্মের ভূ-শাসন'
                : 'Next-Gen Land Governance • DILRMP Initiative'}
            </span>

            {/* Tagline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              {isHi ? HERO_CONTENT.tagline.hi : isBn ? HERO_CONTENT.tagline.bn : HERO_CONTENT.tagline.en}
            </h1>

            {/* Mission Statement */}
            <p className="text-sm sm:text-base text-blue-100/80 leading-relaxed font-normal max-w-2xl">
              {isHi ? HERO_CONTENT.missionStatement.hi : isBn ? HERO_CONTENT.missionStatement.bn : HERO_CONTENT.missionStatement.en}
            </p>

            {/* Two Primary CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              {/* CTA 1: Official Login */}
              <button
                id="hero-official-login-btn"
                onClick={() => onOpenOfficialLogin()}
                className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded font-bold text-sm bg-[#ff9933] hover:bg-orange-600 text-white shadow-xl transition-all cursor-pointer border-none"
              >
                <UserCheck className="w-4 h-4 text-white" />
                <div className="flex flex-col items-start leading-tight text-left">
                  <span>{isHi ? HERO_CONTENT.officialCta.hi : isBn ? HERO_CONTENT.officialCta.bn : 'Official Login (PIAs/LAOs)'}</span>
                  <span className="text-[10px] font-normal text-orange-100">
                    {isHi ? HERO_CONTENT.officialCtaSub.hi : isBn ? HERO_CONTENT.officialCtaSub.bn : HERO_CONTENT.officialCtaSub.en}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5 text-white" />
              </button>

              {/* CTA 2: Check My Land Status */}
              <button
                id="hero-citizen-status-btn"
                onClick={() => onOpenCitizenModal()}
                className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded font-bold text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-md transition-all cursor-pointer"
              >
                <Search className="w-4 h-4 text-white" />
                <div className="flex flex-col items-start leading-tight text-left">
                  <span>{isHi ? HERO_CONTENT.citizenCta.hi : isBn ? HERO_CONTENT.citizenCta.bn : HERO_CONTENT.citizenCta.en}</span>
                  <span className="text-[10px] font-normal text-blue-200">
                    {isHi ? HERO_CONTENT.citizenCtaSub.hi : isBn ? HERO_CONTENT.citizenCtaSub.bn : HERO_CONTENT.citizenCtaSub.en}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 ml-1 text-white transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Quick Citizen Khasra Inline Search Bar */}
            <div className="pt-1">
              <form
                onSubmit={handleQuickSearch}
                className="bg-white/10 backdrop-blur-md p-2 sm:p-2.5 rounded-xl border border-white/20 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl"
              >
                <div className="flex items-center gap-2 flex-1 px-2.5 py-1 text-white text-xs">
                  <MapPin className="w-4 h-4 text-blue-200 shrink-0" />
                  <input
                    type="text"
                    value={quickKhasra}
                    onChange={(e) => setQuickKhasra(e.target.value)}
                    placeholder={isHi ? "खसरा / सर्वे संख्या या अधिसूचना आईडी दर्ज करें (उदा. 142/2)" : isBn ? "খসরা / সার্ভে নম্বর বা বিজ্ঞপ্তি আইডি লিখুন (যেমন 142/2)" : "Enter Khasra / Survey No. or Notification ID (e.g. 142/2)"}
                    className="w-full bg-transparent text-white placeholder:text-blue-200/60 focus:outline-hidden text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#ff9933] hover:bg-orange-600 text-white rounded text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isHi ? "ट्रैक करें" : isBn ? "ট্র্যাক করুন" : "Track Parcel"}</span>
                </button>
              </form>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-blue-200/80 flex-wrap">
                <span className="font-semibold text-blue-100">{isHi ? "त्वरित उदाहरण:" : isBn ? "ত্বরিত উদাহরণ:" : "Quick Demo:"}</span>
                <button
                  type="button"
                  onClick={() => onOpenCitizenModal('142/2')}
                  className="text-white underline decoration-blue-300 hover:text-[#ff9933] cursor-pointer transition-colors"
                >
                  Khasra 142/2 (Jewar Airport)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onOpenCitizenModal('88/A/1')}
                  className="text-white underline decoration-blue-300 hover:text-[#ff9933] cursor-pointer transition-colors"
                >
                  Survey 88/A/1 (Pune Ring Road)
                </button>
              </div>
            </div>

            {/* Official Security Seals & Statutory Frameworks */}
            <div className="pt-2 border-t border-white/15 flex flex-wrap items-center gap-4 text-xs text-blue-100/90">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">{isHi ? 'एसटीक्यूसी (STQC) प्रमाणित' : isBn ? 'এসটিকিউসি (STQC) অনুমোদিত' : 'STQC Certified Portal'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#ff9933]" />
                <span className="font-medium">{isHi ? 'डीपीडीपी अधिनियम 2023 अनुपालन' : isBn ? 'ডিপিডিপি আইন ২০২৩ সুরক্ষিত' : 'DPDP Act 2023 Protected'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-200" />
                <span className="font-medium">{isHi ? 'भूमि अधिग्रहण अधिनियम 2013' : isBn ? 'আরএফসিটিএলএআরআর আইন ২০১৩ ফ্রেমওয়ার্ক' : 'RFCTLARR Act 2013 Framework'}</span>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Live Telemetry Snapshot / Government Acquisition Cockpit */}
          <div className="lg:col-span-5 relative">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl overflow-hidden relative text-white">
              {/* Window Header */}
              <div className="bg-[#002244]/80 px-4 py-3 text-white flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs font-semibold tracking-wider uppercase text-blue-100">
                    {isHi ? 'राष्ट्रीय भूमि अधिग्रहण ग्रिड - लाइव ट्रैकर' : isBn ? 'জাতীয় ভূমি অর্জন গ্রিড - লাইভ ট্র্যাকার' : 'National Land Acquisition Grid - Live'}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/50">
                  NIC-Cloud-Secure
                </span>
              </div>

              {/* Window Body */}
              <div className="p-5 space-y-4 text-xs text-blue-50 bg-slate-900/30">
                {/* Sample Active Notified Project Banner */}
                <div className="p-3 rounded-lg bg-white/10 border border-white/15 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <Layers className="w-3.5 h-3.5 text-[#ff9933]" />
                      <span>NH-44 Corridor & Freight Express Hub</span>
                    </div>
                    <p className="text-[11px] text-blue-200 mt-0.5">
                      {isHi ? 'अधिसूचना संख्या: LA-UP-2025-0842 • 84.6 हेक्टेयर' : isBn ? 'বিজ্ঞপ্তি নম্বর: LA-UP-2025-0842 • ৮৪.৬ হেক্টেয়ার' : 'Notification ID: LA-UP-2025-0842 • 84.6 Ha'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">
                    Sec 19 Cleared
                  </span>
                </div>

                {/* Milestone Stepper */}
                <div>
                  <div className="text-[11px] font-bold text-blue-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>{isHi ? 'वैधानिक अधिग्रहण चरण' : isBn ? 'বিধানগত অর্জন পাইপলাইন' : 'Statutory Acquisition Pipeline'}</span>
                    <span className="text-emerald-300 font-semibold">{isHi ? 'चरण 4/5: पंचाट घोषणा' : isBn ? 'পর্যায় ৪/৫: পঞ্চাট ঘোষণা' : 'Stage 4/5: Award Stage'}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center font-semibold text-[10px]">
                    <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Sec 4/11
                    </div>
                    <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      JMS Survey
                    </div>
                    <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Sec 19 Decl.
                    </div>
                    <div className="p-1.5 rounded bg-[#ff9933] text-slate-950 font-bold border border-orange-300 animate-pulse">
                      Award & Calc
                    </div>
                    <div className="p-1.5 rounded bg-white/5 text-blue-200/60 border border-white/10">
                      DBT Payout
                    </div>
                  </div>
                </div>

                {/* AI Jamabandi Extraction Telemetry */}
                <div className="p-3 rounded-lg bg-white/10 border border-white/15 space-y-2">
                  <div className="flex items-center justify-between">
<span className="font-semibold text-white flex items-center gap-1.5">
                       <Sparkles className="w-3.5 h-3.5 text-[#ff9933]" />
                       {isHi ? 'एआई जमाबंदी सत्यापन परिशुद्धता' : isBn ? 'এআই জমাবন্দি যাচাইকরণ নির্ভুলতা' : 'AI Record Digitization Accuracy'}
                     </span>
                    <span className="font-mono font-bold text-emerald-300 text-xs">99.8% F1 Score</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-400 h-2 rounded-full w-[99.8%]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-blue-200/80 pt-0.5">
                    <span>{isHi ? '14 भारतीय भाषाओं में हस्तलिखित ओसीआर' : isBn ? '১৪টি ভারতীয় ভাষায় হস্তলিখিত ওসিআর' : 'Multilingual handwritten OCR'}</span>
                    <span className="font-medium text-emerald-300">0 Mutation Conflicts</span>
                  </div>
                </div>

                {/* Live Direct Benefit Transfer Tracker */}
                <div className="p-3 rounded-lg bg-white/10 border border-white/15">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-100 font-medium">
                      {isHi ? 'पीएफएमएस प्रत्यक्ष लाभ अंतरण (DBT)' : isBn ? 'পিএফএমএস ডাইরেক্ট বেনিফিট ট্রান্সফার (ডিবিটি)' : 'PFMS Direct Benefit Transfer'}
                    </span>
                    <span className="font-bold text-white">₹68,420 Cr Disbursed</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isHi ? '100% आधार से जुड़े बैंक खातों में सीधा भुगतान' : isBn ? '১০০% আধার-জোড়া অ্যাকাউন্ট যাচাইকৃত' : '100% Aadhaar-seeded accounts verified'}</span>
                  </div>
                </div>

                {/* Interactive Action within Cockpit */}
                <button
                  onClick={() => onOpenCitizenModal('142/2')}
                  className="w-full py-2 bg-white/15 hover:bg-white/25 text-white rounded border border-white/30 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-blue-200" />
                  <span>{isHi ? 'लाइव केस LA-UP-2025-0842 खोलें' : isBn ? 'নমুনা পারসেল LA-UP-2025-0842 পরিদর্শন করুন' : 'Inspect Sample Parcel LA-UP-2025-0842'}</span>
                </button>
              </div>

              {/* Window Footer Security Bar */}
              <div className="bg-[#002244]/80 px-4 py-2 text-[10px] text-blue-200/80 border-t border-white/10 flex items-center justify-between">
                <span>{isHi ? 'डिजिटली हस्ताक्षरित एवं एनआईसी द्वारा प्रमाणित' : isBn ? 'ডিজিটালি স্বাক্ষরিত এবং এনআইসি দ্বারা অনুমোদিত' : 'Digitally Signed & Certified by NIC'}</span>
                <span className="font-mono text-blue-300">SHA-256 Validated</span>
              </div>
            </div>

            {/* Floating AI Validation Pill (Signature Element from Sleek Design) */}
            <div className="hidden sm:block absolute -bottom-4 -right-3 bg-white p-3 rounded-lg shadow-2xl border border-slate-200 text-slate-900 z-10">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">AI Validation</div>
              <div className="text-xs font-black text-[#003366]">99.4% Accuracy</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
