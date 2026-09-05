import React from 'react';
import { PROBLEM_SOLUTION_STEPS } from '../../utils//portalData';
import { Language } from '../../utils/types';
import { Layers, Cpu, LayoutDashboard, ArrowRight, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

interface ProblemToSolutionProps {
  lang: Language;
}

export default function ProblemToSolution({ lang }: ProblemToSolutionProps) {
  const isHi = lang === 'hi';
  const isBn = lang === 'bn';

  const getStepIcon = (iconName: string, idx: number) => {
    switch (idx) {
      case 0:
        return <Layers className="w-4 h-4 text-red-600" />;
      case 1:
        return <Cpu className="w-4 h-4 text-[#003366]" />;
      case 2:
        return <LayoutDashboard className="w-4 h-4 text-[#138808]" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-600" />;
    }
  };

  const getBadgeIcon = (idx: number) => {
    if (idx === 0) return <AlertTriangle className="w-3.5 h-3.5 text-red-600" />;
    if (idx === 1) return <Sparkles className="w-3.5 h-3.5 text-[#003366]" />;
    return <CheckCircle2 className="w-3.5 h-3.5 text-[#138808]" />;
  };

  return (
    <section id="problem-solution" className="py-12 md:py-16 bg-slate-50/60 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
            <span>{isHi ? 'प्रक्रियात्मक परिवर्तन' : isBn ? 'প্রক্রিয়াগত পরিবর্তন' : 'The Strategic Paradigm Shift'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {isHi
              ? 'अव्यवस्थित अभिलेखों से एकीकृत डिजिटल सुशासन तक'
              : isBn
              ? 'খণ্ডিত রেকর্ড থেকে یکকৃত জাতীয় গ্রিড পর্যন্ত'
              : 'From Fragmented Records to a Unified National Grid'}
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            {isHi
              ? 'पारंपरिक कागजी राजस्व जटिलताओं को अत्याधुनिक एआई एवं स्थानिक मानचित्रण द्वारा पारदर्शी जन-हितैषी प्रणाली में रूपांतरण।'
              : isBn
              ? 'নিউরেল এআই পার্সিং, জিওস্পেশিয়াল সিঙ্ক্রোনাইজেশন এবং পারদর্শী নাগরিক বিতরণের মাধ্যমে শতাব্দী পুরনো রাজस्व জটিলতাগুলো পাট করা।'
              : 'How ZameenAI bridges centuries-old revenue complexities with neural AI parsing, geospatial synchronization, and transparent citizen payout.'}
          </p>
        </div>

        {/* 3-Column Progression Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {PROBLEM_SOLUTION_STEPS.map((step, idx) => {
            const isFirst = idx === 0;
            const isMiddle = idx === 1;
            const isLast = idx === 2;

            return (
              <div
                key={step.stepNumber}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Step Marker & Status Badge */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isFirst
                          ? 'bg-red-100 text-red-600'
                          : isMiddle
                          ? 'bg-blue-100 text-[#003366]'
                          : 'bg-green-100 text-[#138808]'
                      }`}>
                        {getStepIcon(step.icon, idx)}
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        STEP {step.stepNumber}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isFirst
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : isMiddle
                          ? 'bg-blue-50 text-[#003366] border border-blue-200'
                          : 'bg-green-50 text-[#138808] border border-green-200'
                      }`}
                    >
                      {getBadgeIcon(idx)}
                      <span>{isHi ? step.statusBadgeHi : isBn ? step.statusBadgeBn : step.statusBadge}</span>
                    </span>
                  </div>

                  {/* Title & Tag */}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {isHi ? step.tagHi : isBn ? step.tagBn : step.tag}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mt-0.5 mb-2.5">
                    {isHi ? step.titleHi : isBn ? step.titleBn : step.title}
                  </h3>

                  {/* Bullet Points */}
                  <ul className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    {(isHi ? step.pointsHi : isBn ? step.pointsBn : step.points).map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2">
                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          isFirst ? 'bg-red-500' : isMiddle ? 'bg-[#003366]' : 'bg-[#138808]'
                        }`} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bottom Transition Indicator */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400">
                  <span>
                    {isFirst
                      ? isHi ? 'पारंपरिक अड़चनें' : isBn ? 'ঐতিহাসিক বাধাগুলো' : 'Historical Obstacles'
                      : isMiddle
                      ? isHi ? 'मशीन लर्निंग समाधान' : isBn ? 'অ্যালগরিদমিক ইনজেশন' : 'Algorithmic Ingestion'
                      : isHi ? 'अंतिम सुशासन' : isBn ? 'প্রত্যক্ষ বৈধানিক বিতরণ' : 'Direct Statutory Payout'}
                  </span>
                  {idx < 2 && (
                    <span className="hidden md:flex items-center gap-1 text-slate-400 font-semibold">
                      <span>{isHi ? 'अगला चरण' : isBn ? 'পরিবর্তিত হয়' : 'Transforms into'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
