import React from 'react';
import { TRANSPARENCY_KPIS } from '../../utils/portalData';
import { Language } from '../../utils/types';
import { TrendingUp, CheckCircle, ShieldCheck, FileCheck, ArrowUpRight } from 'lucide-react';

interface TransparencyStatsProps {
  lang: Language;
  onOpenCitizenModal: () => void;
}

export default function TransparencyStats({ lang, onOpenCitizenModal }: TransparencyStatsProps) {
  const isHi = lang === 'hi';
  const isBn = lang === 'bn';

  const getValueColor = (idx: number) => {
    switch (idx) {
      case 0:
      case 1:
        return 'text-[#003366]';
      case 2:
        return 'text-[#138808]';
      case 3:
      default:
        return 'text-orange-500';
    }
  };

  return (
    <section id="transparency-stats" className="py-12 md:py-14 bg-white border-b border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Strip Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-5 border-b border-slate-100 gap-4">
          <div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block mb-1">
              {isHi ? 'राष्ट्रीय सूचकांक' : isBn ? 'জাতীয় সূচক' : 'Live Analytics'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              {isHi ? 'भूमि अधिग्रहण वास्तविक समय संकेतक' : isBn ? 'জাতীয় স্বচ্ছতা ও প্রভাব মেট্রিক্স' : 'National Transparency & Impact Metrics'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {isHi
                ? 'पीएफएमएस, राज्य भू-अभिलेख और राष्ट्रीय जीआईएस ग्रिड से स्वचालित रूप से समन्वित।'
                : isBn
                ? 'সেন্ট্রাল পিএফএমএস ট্রেজারি, রাজ্য ভূমি রেজিস্ট্রি এবং ভূনকশা জিআইএস সার্ভারের সাথে সরাসরি সিঙ্ক্রোনাইজড।'
                : 'Directly synchronized with Central PFMS Treasury, State Land Registries, and Bhunaksha GIS servers.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{isHi ? 'डेटा लाइव अपडेट: 24 घंटे सक्रिय' : isBn ? 'ডেটা লাইভ আপডেট: ২৪ ঘণ্টা সক্রিয়' : 'Central Server Live Synced'}</span>
          </div>
        </div>

        {/* 4 KPIs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRANSPARENCY_KPIS.map((kpi, idx) => (
            <div
              key={kpi.id}
              className="bg-slate-50/70 rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="uppercase tracking-wider font-bold text-[10px]">
                    {isHi ? kpi.unitHi : isBn ? kpi.unitBn : kpi.unit}
                  </span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div className={`text-3xl sm:text-4xl font-black tracking-tight font-mono ${getValueColor(idx)}`}>
                  {kpi.value}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 mt-1.5 leading-snug">
                  {isHi ? kpi.labelHi : isBn ? kpi.labelBn : kpi.label}
                </h3>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 leading-relaxed">
                {isHi ? kpi.subtextHi : isBn ? kpi.subtextBn : kpi.subtext}
              </div>
            </div>
          ))}
        </div>

        {/* Real-time statutory assurance bar */}
        <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#003366] shrink-0" />
            <div>
              <span className="font-bold text-slate-800 block">
                {isHi ? '100% प्रत्यक्ष लाभ अंतरण (DBT) गारंटी' : isBn ? '১০০% ডাইরেক্ট বেনিফিট ট্রান্সফার (ডিবিটি) গ্যারান্টি' : 'Zero Leakage Direct Benefit Transfer (DBT) Guarantee'}
              </span>
              <span className="text-slate-500 text-[11px]">
                {isHi
                  ? 'सभी मुआवजा भुगतान भारतीय रिजर्व बैंक एवं पीएफएमएस के माध्यम से सीधे भू-स्वामी के बैंक खाते में जमा होते हैं।'
                  : isBn
                  ? 'সব ক্ষতিপূরণ বিতরণ RBI এবং PFMS-এর মাধ্যমে সরাসরি যাচাইকৃত ভূমালিকের ব্যাংক অ্যাকাউন্টে ইলেক্ট্রনিকভাবে করা হয়।'
                  : 'All land compensation awards are disbursed electronically through RBI & PFMS directly into the verified landowner bank accounts.'}
              </span>
            </div>
          </div>
          <button
            onClick={onOpenCitizenModal}
            className="shrink-0 px-4 py-2 rounded bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>{isHi ? 'मेरी मुआवजा राशि जांचें' : isBn ? 'আমার ক্ষতিপূরণ যাচাই করুন' : 'Verify My Land Award'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
