import React from 'react';
import { STAKEHOLDER_PERSONAS } from '../../utils/portalData';
import { PersonaInfo, Language } from '../../utils/types';
import { 
  Users, 
  UserCheck, 
  ArrowRight, 
  Building, 
  MapPin, 
  FileCheck, 
  Award, 
  TrendingUp, 
  ShieldAlert, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface StakeholderPathwaysProps {
  lang: Language;
  onOpenOfficialLogin: (roleId: string) => void;
  onOpenCitizenModal: () => void;
}

export default function StakeholderPathways({
  lang,
  onOpenOfficialLogin,
  onOpenCitizenModal,
}: StakeholderPathwaysProps) {
  const isHi = lang === 'hi';
  const isBn = lang === 'bn';

  const getPersonaIcon = (roleCode: string) => {
    switch (roleCode) {
      case 'PIA':
        return <Building className="w-5 h-5 text-[#003366]" />;
      case 'FIELD':
        return <MapPin className="w-5 h-5 text-[#004a99]" />;
      case 'LAO':
        return <FileCheck className="w-5 h-5 text-[#003366]" />;
      case 'CALA/DM':
        return <Award className="w-5 h-5 text-[#003366]" />;
      case 'EXEC':
        return <TrendingUp className="w-5 h-5 text-[#004a99]" />;
      case 'CITIZEN':
        return <Users className="w-5 h-5 text-[#138808]" />;
      case 'ADMIN':
        return <ShieldAlert className="w-5 h-5 text-slate-700" />;
      default:
        return <UserCheck className="w-5 h-5 text-[#003366]" />;
    }
  };

  const handleRoleAction = (persona: PersonaInfo) => {
    if (persona.id === 'citizen') {
      onOpenCitizenModal();
    } else {
      onOpenOfficialLogin(persona.id);
    }
  };

  return (
    <section id="stakeholder-pathways" className="py-12 md:py-16 bg-[#f8fafc] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest block mb-1">
              {isHi ? 'भूमिका-विशिष्ट कार्यक्षेत्र' : isBn ? 'ভূমিকা-নির্দিষ্ট কর্মক্ষেত্র' : 'Portals & Access'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              {isHi ? 'सात प्रमुख हितधारक प्रवेश द्वार' : isBn ? 'সাতটি প্রধান স্টেকহোল্ডার পথ' : 'Stakeholder Pathways'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-2xl">
              {isHi
                ? 'प्रस्ताव प्रस्तुत करने वाली एजेंसियों से लेकर क्षेत्रीय पटवारी, जिला मजिस्ट्रेट एवं आम नागरिकों तक - प्रत्येक हेतु समर्पित सुरक्षित लॉगिन।'
                : isBn
                ? 'প্রস্তাব জমা দেওয়া এজেন্সি থেকে ফিল্ড পটোয়ারি, জেলা মেজিস্ট্রেট এবং সাধারণ নাগরিক পর্যন্ত - প্রতিটি জন্য নিযুক্ত সুরক্ষিত লগইন।'
                : 'Role-specific authenticated portals via Jan Parichay SSO for officials and transparent tracking for citizens.'}
            </p>
          </div>
          <div className="text-xs font-medium text-slate-400">
            Jan Parichay National Single Sign-On (NSSO)
          </div>
        </div>

        {/* 7 Personas Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {STAKEHOLDER_PERSONAS.map((persona) => {
            const isCitizen = persona.id === 'citizen';

            return (
              <div
                key={persona.id}
                className={`border border-slate-200 rounded-xl p-6 bg-white relative overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-left ${
                  isCitizen ? 'xl:col-span-2' : ''
                }`}
              >
                {/* Decorative corner accent from Sleek theme */}
                <div
                  className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-4 -mt-4 z-0 pointer-events-none ${
                    isCitizen ? 'bg-green-50' : 'bg-blue-50'
                  }`}
                />

                <div className="relative z-10">
                  {/* Top Bar: Icon + Role Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 shadow-2xs">
                      {getPersonaIcon(persona.roleCode)}
                    </div>
                    <span
                      className={`font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase border ${
                        isCitizen
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-blue-50 text-[#003366] border-blue-200'
                      }`}
                    >
                      {persona.roleCode}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold uppercase tracking-widest block mb-1 ${
                      isCitizen ? 'text-[#138808]' : 'text-[#003366]'
                    }`}
                  >
                    {isCitizen
                      ? (isHi ? 'नागरिक एवं भू-स्वामी' : isBn ? 'নাগরিক ও ভূমালিক' : 'Citizens & Landowners')
                      : (isHi ? 'शासकीय अधिकारी' : isBn ? 'সরকারি কর্মকর্তা' : 'Government Officials')}
                  </span>

                  {/* Title & Subtitle */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                    {isHi ? persona.titleHi : isBn ? persona.titleBn : persona.title}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {isHi ? persona.subtitleHi : isBn ? persona.subtitleBn : persona.subtitle}
                  </p>

                  {/* Primary Entity / Dept */}
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    <span>{isHi ? 'संबद्धता:' : isBn ? 'অংশীদারিত্ব:' : 'Affiliation:'}</span>
                    <span className="text-slate-800">{isHi ? persona.primaryEntityHi : isBn ? persona.primaryEntityBn : persona.primaryEntity}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    {isHi ? persona.descriptionHi : isBn ? persona.descriptionBn : persona.description}
                  </p>

                  {/* Key Responsibilities Chips */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      {isHi ? 'मुख्य वैधानिक उत्तरदायित्व:' : isBn ? 'প্রধান বৈধানিক দায়িত্ব:' : 'Statutory Key Responsibilities:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(isHi ? persona.keyResponsibilitiesHi : isBn ? persona.keyResponsibilitiesBn : persona.keyResponsibilities).map((item, rIdx) => (
                        <span
                          key={rIdx}
                          className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Role Specific Login CTA */}
                <div className="mt-5 pt-3 border-t border-slate-100 relative z-10">
                  <button
                    type="button"
                    onClick={() => handleRoleAction(persona)}
                    className={`w-full py-2.5 px-4 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs ${
                      isCitizen
                        ? 'bg-[#138808] hover:bg-green-700 text-white'
                        : 'bg-[#003366] hover:bg-blue-900 text-white'
                    }`}
                  >
                    <span>
                      {isCitizen
                        ? (isHi ? 'खसरा / सर्वे संख्या खोजें' : isBn ? 'খসরা / সার্ভে নম্বর খুঁজুন' : 'Search Survey / Khasra No.')
                        : (isHi ? `${persona.roleCode} परिचयं लॉगिन (SSO)` : isBn ? `${persona.roleCode} পরিচয় লগইন (SSO)` : `Parichay SSO Login (${persona.roleCode})`)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
