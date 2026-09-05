import React, { useState } from 'react';
import { KeyModuleInfo, Language } from '../../utils/types';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  BarChart3, 
  CheckCircle2, 
  Layers, 
  FileText, 
  Cpu, 
  Eye, 
  Lock,
  ArrowRight
} from 'lucide-react';

interface ModuleDetailModalProps {
  module: KeyModuleInfo | null;
  onClose: () => void;
  lang: Language;
}

export default function ModuleDetailModal({
  module,
  onClose,
  lang,
}: ModuleDetailModalProps) {
  if (!module) return null;
  const isHi = lang === 'hi';
  const isBn = lang === 'bn';

  const [activeTab, setActiveTab] = useState<'overview' | 'simulation'>('overview');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full my-auto overflow-hidden text-slate-900">
        {/* Top Tricolor Accent */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#FF9933]" />
          <div className="h-full w-1/3 bg-white" />
          <div className="h-full w-1/3 bg-[#138808]" />
        </div>

        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-slate-800 text-[#ff9933] border border-slate-700">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                {isHi ? 'प्रणाली विशिष्टता' : isBn ? 'সিস্টেম মডিউল স্পেসিফিকেশন' : 'System Module Specification'}
              </span>
              <h3 className="font-sans font-bold text-base sm:text-lg text-white">
                {isHi ? module.titleHi : isBn ? module.titleBn : module.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-1.5 px-3 rounded transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#003366] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isHi ? 'सिंहावलोकन एवं कार्यप्रणाली' : isBn ? 'আর্কিটেকচারাল ওভারভিউ' : 'Architectural Overview'}
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`py-1.5 px-3 rounded transition-colors cursor-pointer ${
              activeTab === 'simulation'
                ? 'bg-[#003366] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isHi ? 'लाइव सिमुलेशन पूर्वावलोकन' : isBn ? 'লাইভ ইন্টারেক্টিভ ডেমো' : 'Live Interactive Demo'}
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {/* Mission Summary */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-[#003366] tracking-wider block mb-1">
                  {isHi ? 'मूल उद्देश्य:' : isBn ? 'মূল অপারেশনাল উদ্দেশ্য:' : 'Core Operational Purpose:'}
                </span>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">
                  {isHi ? module.descriptionHi : isBn ? module.descriptionBn : module.description}
                </p>
              </div>

              {/* Detailed Points */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  {isHi ? 'तकनीकी एवं वैधानिक क्षमताएं:' : 'Statutory & Technical Specifications:'}
                </span>
                <ul className="space-y-2 text-slate-700">
                  {(isHi ? module.detailsHi : isBn ? module.detailsBn : module.details).map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-3 rounded bg-slate-50 border border-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-[#138808] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benchmark Metric Box */}
              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#003366]">
                    {isHi ? 'प्रमाणित बेंचमार्क' : isBn ? 'প্রমাণিত কোইলিটি এসএলএ:' : 'Certified Quality SLA:'}
                  </span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {isHi ? module.sampleMetricLabelHi : isBn ? module.sampleMetricLabelBn : module.sampleMetricLabel}
                  </div>
                </div>
                <div className="font-mono text-lg font-black text-[#003366]">
                  {module.sampleMetric}
                </div>
              </div>
            </div>
          ) : (
            /* Simulation View */
            <div className="space-y-4">
              {module.id === 'ai-extraction' && (
                <div className="space-y-3">
                  <div className="text-slate-700 text-xs">
                    {isHi
                      ? 'हस्तलिखित देवनागरी/क्षेत्रीय भाषा खतौनी का न्यूरल ओसीआर एवं म्यूटेशन विसंगति पहचान:'
                      : isBn
                      ? 'নমুনা এক্সট্রাকশন: ঐতিহাসিক পেপার RoR বনাম স্ট্রাকচারড জামিন এআই JSON গ্রিড:'
                      : 'Sample Extraction: Historical Paper RoR vs. Structured ZameenAI JSON Grid:'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 font-mono text-[11px]">
                      <div className="text-slate-500 font-bold mb-1 pb-1 border-b border-slate-200">
                        RAW SCANNED JAMABANDI (1984)
                      </div>
                      <div className="text-slate-600 space-y-1">
                        <p>गाटा सं: 142/2 (अंश)</p>
                        <p>खातेदार: रामस्वरूप सिंह सुत ईश्वर सिंह</p>
                        <p>क्षेत्रफल: 0.8420 हे0</p>
                        <p className="text-amber-800 font-bold">आदेश: बंधक बैंक ऑफ बड़ौदा (ऋण विलेख)</p>
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-300 font-mono text-[11px]">
                      <div className="text-emerald-800 font-bold mb-1 pb-1 border-b border-emerald-200 flex items-center justify-between">
                        <span>ZAMEEN-AI VALIDATED</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-950 px-1 rounded">Confidence 99.8%</span>
                      </div>
                      <div className="text-emerald-950 space-y-1">
                        <p>khasra_normalized: "142/2"</p>
                        <p>owner_uid: "RAMSWAROOP-SINGH"</p>
                        <p>share_fraction: "1/1 (Sole)"</p>
                        <p>encumbrance_status: "No active court injunction"</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {module.id === 'rbac-workflow' && (
                <div className="space-y-3">
                  <div className="text-slate-700 text-xs">
                    {isHi
                      ? 'आरएफसीटीएलएआरआर अधिनियम 2013 के अंतर्गत 5-स्तरीय अनुमोदन श्रृंखला:'
                      : isBn
                      ? 'স্ট্যাটুটি ৫-টিয়ার হায়ারার্কিক্যাল অনুমোদন ওয়ার্কফ্লো ডিজিটাল স্বাক্ষরসহ:'
                      : 'Statutory 5-Tier Hierarchical Approval Workflow with Digital Signature:'}
                  </div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#138808] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                        <span className="font-bold text-slate-800">Field Patwari & Surveyor (JMS Ground Survey)</span>
                      </div>
                      <span className="text-emerald-700 font-semibold text-[11px]">DSC Signed</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#138808] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                        <span className="font-bold text-slate-800">Land Acquisition Officer / LAO (Sec 15 Objections Scrutiny)</span>
                      </div>
                      <span className="text-emerald-700 font-semibold text-[11px]">Draft Award Cleared</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#003366] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                        <span className="font-bold text-slate-800">Competent Authority Land Acquisition (CALA) / DM</span>
                      </div>
                      <span className="text-[#003366] font-semibold text-[11px] animate-pulse">Final Sanction Active</span>
                    </div>
                  </div>
                </div>
              )}

              {module.id === 'gis-spatial' && (
                <div className="space-y-3">
                  <div className="text-slate-700 text-xs">
                    {isHi ? 'उपग्रह कैडस्ट्रल ओवरले एवं बफर जोन विश्लेषण:' : isBn ? 'স্যাটেলাইট ক্যাডাস্ট্রাল ওভারলে এবং অর্জন করিডোর বাফার বিশ্লেষণ:' : 'Satellite Cadastre Overlay & Acquisition Corridor Buffer Analysis:'}
                  </div>
                  <div className="p-4 bg-slate-900 text-slate-200 rounded-lg border border-slate-700 font-mono text-xs space-y-2">
                    <div className="flex justify-between border-b border-slate-800 pb-1.5 text-[11px]">
                      <span className="text-amber-400">GIS Layer: Bhunaksha Cadastral + Sentinel 2A</span>
                      <span className="text-emerald-400">Resolution: 0.5m/px</span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded border border-slate-800 text-[11px] space-y-1">
                      <p>• Corridor Centerline: NH-44 Chainage Km 42+200 to 58+400</p>
                      <p>• Right-of-Way (RoW) Width: 60.0 meters statutory</p>
                      <p>• Intersecting Cadastral Parcels: 142 Parcels Identified</p>
                      <p className="text-emerald-400 font-bold">• Boundary Conflict Rate: 0.0% (Clean Geometric Separation)</p>
                    </div>
                  </div>
                </div>
              )}

              {module.id === 'exec-dashboard' && (
                <div className="space-y-3">
                  <div className="text-slate-700 text-xs">
                    {isHi ? 'राष्ट्रीय स्तर पर राज्यवार प्रगति एवं मुआवजा संवितरण संकेतक:' : isBn ? 'জাতীয় egunفيذي মনিটরিং ও PFMS ফান্ড ভেলোসিটি ককপিট:' : 'National Executive Monitoring & PFMS Fund Velocity Cockpit:'}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold">TOP VELOCITY STATES</span>
                      <div className="mt-1 space-y-1 font-semibold text-slate-800 text-xs">
                        <p>1. Uttar Pradesh (98.2% on schedule)</p>
                        <p>2. Maharashtra (96.4% on schedule)</p>
                        <p>3. Gujarat (95.8% on schedule)</p>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold">PFMS ESCROW LIQUIDITY</span>
                      <div className="mt-1 space-y-1 text-xs">
                        <p className="font-bold text-slate-900">₹12,450 Cr Committed</p>
                        <p className="text-emerald-700 font-semibold">100% Direct DBT Execution</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>{isHi ? 'भारत सरकार डिजिटल सार्वजनिक अवसंरचना (DPI)' : isBn ? 'ভারত সরকার ডিজিটাল পাবলিক ইনফ্রাস্ট্রাকচার (DPI)' : 'Government of India Digital Public Infrastructure (DPI)'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold cursor-pointer"
          >
            {isHi ? 'बंद करें' : isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
