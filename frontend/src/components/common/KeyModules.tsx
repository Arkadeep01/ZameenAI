import React from 'react';
import { KEY_MODULES } from '../../utils/portalData';
import { KeyModuleInfo, Language } from '../../utils/types';
import { 
  FileSearch, 
  ShieldCheck, 
  MapPin, 
  BarChart3, 
  ArrowUpRight, 
  Sparkles, 
  Layers, 
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface KeyModulesProps {
  lang: Language;
  onSelectModule: (module: KeyModuleInfo) => void;
}

export default function KeyModules({ lang, onSelectModule }: KeyModulesProps) {
  const isHi = lang === 'hi';

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileSearch':
        return <FileSearch className="w-5 h-5 text-[#003366]" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-[#003366]" />;
      case 'MapPin':
        return <MapPin className="w-5 h-5 text-[#003366]" />;
      case 'BarChart3':
        return <BarChart3 className="w-5 h-5 text-[#003366]" />;
      default:
        return <Sparkles className="w-5 h-5 text-[#003366]" />;
    }
  };

  return (
    <section id="key-modules" className="py-12 md:py-16 bg-slate-50 p-6 sm:p-10 border-t border-b border-slate-200">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block mb-1">
              {isHi ? 'प्रणाली आर्किटेक्चर' : 'Architecture'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              {isHi ? 'ज़मीन एआई मुख्य प्रणाली घटक' : 'Core System Modules'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
              {isHi
                ? 'वैधानिक परिशुद्धता, स्थानिक जीआईएस संरेखण और निर्बाध अंतर-विभागीय कार्यप्रवाह हेतु विशेषीकृत डिजिटल इंजन।'
                : 'Automated RoR/Jamabandi parsing, RBAC access controls, PFMS DBT integration, and real-time interactive GIS pipelines.'}
            </p>
          </div>
          <div className="text-xs font-medium text-slate-400">
            Certified ISO 27001 & STQC Compliant
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KEY_MODULES.map((module) => (
            <div
              key={module.id}
              className="group bg-white p-5 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between text-left"
            >
              <div>
                {/* Header Icon + Tag */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100/80 transition-colors">
                    {getModuleIcon(module.icon)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {isHi ? module.tagHi : module.tag}
                  </span>
                </div>

                {/* Module Title */}
                <h4 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-[#003366] transition-colors">
                  {isHi ? module.titleHi : module.title}
                </h4>

                {/* One-line Description */}
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  {isHi ? module.descriptionHi : module.description}
                </p>

                {/* Highlighted Benchmark Metric */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-mono font-bold text-slate-800 text-xs">
                    {module.sampleMetric}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {isHi ? module.sampleMetricLabelHi : module.sampleMetricLabel}
                  </div>
                </div>
              </div>

              {/* Action Button: Explore Preview */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectModule(module)}
                  className="w-full py-2 px-3 rounded bg-slate-100 hover:bg-[#003366] hover:text-white text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>{isHi ? 'पूर्वावलोकन एवं सिमुलेशन' : 'Inspect Module Spec'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
