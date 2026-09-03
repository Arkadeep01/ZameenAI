import React from 'react';
import { TRUST_PARTNERS } from '../../utils/portalData';
import { Language } from '../../utils/types';
import { Shield, Building, Landmark, Server, Map, Layers } from 'lucide-react';

interface TrustBarProps {
  lang: Language;
}

export default function TrustBar({ lang }: TrustBarProps) {
  const isHi = lang === 'hi';

  const partnerIcons = [
    <Landmark key="gov" className="w-5 h-5 text-[#003366]" />,
    <Layers key="lrms" className="w-5 h-5 text-[#138808]" />,
    <Building key="mord" className="w-5 h-5 text-slate-800" />,
    <Server key="nic" className="w-5 h-5 text-[#004a99]" />,
    <Map key="bhunaksha" className="w-5 h-5 text-[#ff9933]" />,
  ];

  return (
    <section id="trust-bar" className="bg-slate-100/70 border-b border-slate-200 py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-3.5">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            {isHi 
              ? 'राष्ट्रीय संस्थागत एकीकरण एवं स्वामित्व' 
              : 'Institutional Framework, Ownership & National Integration'}
          </p>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TRUST_PARTNERS.map((partner, idx) => (
            <div
              key={partner.name}
              className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded bg-slate-50 border border-slate-200 shadow-2xs">
                  {partnerIcons[idx % partnerIcons.length]}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {isHi ? partner.badgeHi : partner.badge}
                </span>
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                  {partner.name}
                </h2>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                  {isHi ? partner.titleHi : partner.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Legal Assurance Subtext */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-slate-500 text-center font-medium">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#138808]" />
            {isHi ? 'डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) अधिनियम 2023 से आच्छादित' : 'Protected under Digital Personal Data Protection (DPDP) Act 2023'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9933]" />
            {isHi ? 'राष्ट्रीय सूचना विज्ञान केंद्र (NIC) टियर-IV सुरक्षित डेटा सेंटर में होस्टेड' : 'Hosted securely on National Informatics Centre (NIC) MeghRaj Cloud'}
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#003366]" />
            {isHi ? '28 राज्यों एवं 8 केंद्र शासित प्रदेशों के राजस्व पोर्टल्स से सीधे संबद्ध' : 'Integrated with 28 State & UT Revenue & Registration Portals'}
          </span>
        </div>
      </div>
    </section>
  );
}
