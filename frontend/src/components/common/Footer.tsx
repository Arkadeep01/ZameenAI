import React from 'react';
import GovernmentEmblem from './GovernmentEmblem';
import { Language } from '../../utils/types';
import { 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  HelpCircle, 
  ExternalLink,
  Lock,
  Globe,
  Award
} from 'lucide-react';

interface FooterProps {
  lang: Language;
  onOpenCitizenModal: () => void;
  onOpenOfficialLogin: () => void;
}

export default function Footer({ lang, onOpenCitizenModal, onOpenOfficialLogin }: FooterProps) {
  const isHi = lang === 'hi';

  return (
    <footer id="footer" className="bg-slate-900 text-slate-300 border-t border-slate-800 text-xs">
      {/* 1. Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-8 border-b border-slate-800">
          {/* Col 1 (4 cols): Official Brand & Government Authority */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <GovernmentEmblem className="h-12 w-auto text-amber-500" />
              <div>
                <div className="text-xl font-bold text-white tracking-tight flex items-center">
                  <span className="text-[#ff9933]">Zameen</span>
                  <span className="text-emerald-400 ml-0.5">AI</span>
                </div>
                <div className="text-xs text-slate-400">
                  {isHi ? 'राष्ट्रीय भूमि अधिग्रहण एवं अभिलेख मंच' : 'National Land Acquisition & Records Portal'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {isHi ? 'डिजिटल इंडिया • भारत सरकार' : 'Digital India • Government of India'}
                </div>
              </div>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              {isHi
                ? 'ज़मीन एआई भारत सरकार के ग्रामीण विकास मंत्रालय (भूमि संसाधन विभाग) की एक पहल है, जिसका उद्देश्य भूमि अधिग्रहण एवं भू-अभिलेखों के डिजिटलीकरण में पूर्ण पारदर्शिता एवं स्पष्टता लाना है।'
                : 'ZameenAI is a flagship initiative under the Digital India Land Records Modernization Programme (DILRMP), Department of Land Resources, Ministry of Rural Development, Government of India.'}
            </p>

            <div className="flex flex-wrap gap-2 text-[10px] font-mono">
              <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">
                GIGW 3.0 Compliant
              </span>
              <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-emerald-400">
                CERT-In Audited
              </span>
              <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-orange-400">
                MeghRaj NIC Cloud
              </span>
            </div>
          </div>

          {/* Col 2 (3 cols): RTI & Grievance Redressal (CPGRAMS / Land Samadhan) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 pb-1 border-b border-slate-800">
              {isHi ? 'सूचना का अधिकार एवं जन शिकायत' : 'RTI & Citizen Grievance'}
            </h3>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a 
                  href="https://rtionline.gov.in" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                  <span>{isHi ? 'सूचना का अधिकार (RTI Act 2005)' : 'Right to Information (RTI Online)'}</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://pgportal.gov.in" 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
                  <span>{isHi ? 'केंद्रीकृत जन शिकायत (CPGRAMS)' : 'Centralized Grievance (CPGRAMS)'}</span>
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenCitizenModal}
                  className="hover:text-white transition-colors flex items-center gap-1.5 text-left cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isHi ? 'भूमि समाधान एवं ई-आपत्ति (Sec 15)' : 'Land Samadhan & E-Objection (Sec 15)'}</span>
                </button>
              </li>
              <li>
                <span className="text-[11px] text-slate-500 block pt-1">
                  {isHi ? 'लोक सूचना अधिकारी (PIO):' : 'Nodal PIO (Land Resources):'}
                  <br />
                  <span className="text-slate-300">Shri R. K. Sharma, Director (DILRMP)</span>
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3 (3 cols): Data Privacy & Legal Framework */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 pb-1 border-b border-slate-800">
              {isHi ? 'डेटा गोपनीयता एवं वैधानिक व्यवस्था' : 'Data Privacy & Framework'}
            </h3>
            <div className="space-y-2 text-slate-400 text-xs">
              <p className="leading-relaxed">
                <strong className="text-white block mb-0.5">
                  {isHi ? 'डीपीडीपी अधिनियम 2023 अनुपालन:' : 'DPDP Act 2023 Protection:'}
                </strong>
                {isHi
                  ? 'नागरिकों एवं भू-स्वामियों के समस्त भू-अभिलेख एवं व्यक्तिगत डेटा डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के तहत भारत में स्थित राष्ट्रीय डेटा केंद्रों में पूर्णतः सुरक्षित हैं।'
                  : 'All land records, ownership deeds, and Aadhaar-seeded compensation data are processed and hosted within the sovereign boundaries of the Republic of India.'}
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <Lock className="w-3.5 h-3.5" />
                <span>{isHi ? '256-बिट एंड-टू-एंड एन्क्रिप्शन' : 'End-to-End Cryptographic Encryption'}</span>
              </div>
            </div>
          </div>

          {/* Col 4 (2 cols): Government Contact & Helpdesk */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 pb-1 border-b border-slate-800">
              {isHi ? 'शासकीय संपर्क' : 'Official Contact'}
            </h3>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span className="leading-tight">
                  {isHi
                    ? 'भूमि संसाधन विभाग, कृषि भवन, नई दिल्ली - 110001'
                    : 'Dept. of Land Resources, Krishi Bhawan, New Delhi - 110001'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="font-mono text-white font-bold">1800-11-2336</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="font-mono text-xs">helpdesk-zameenai@nic.in</span>
              </div>
              <div className="pt-2">
                <button
                  onClick={onOpenOfficialLogin}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-300 border border-slate-700 rounded text-[11px] font-bold transition-colors w-full cursor-pointer text-center"
                >
                  {isHi ? 'अधिकारी हेल्पडेस्क लॉगिन' : 'Officer Helpdesk Portal'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Institutional Links Strip */}
        <div className="py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="https://www.india.gov.in" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
              <span>National Portal of India</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a href="https://dolr.gov.in" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
              <span>DoLR Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a href="https://digitalindia.gov.in" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
              <span>Digital India</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a href="https://bhunaksha.nic.in" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
              <span>Bhunaksha GIS</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <a href="https://pfms.nic.in" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
              <span>PFMS Portal</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>

          <div className="text-slate-500">
            {isHi ? 'अंतिम अद्यतन:' : 'Page Last Updated:'} <span className="text-slate-300 font-mono">03 Sept 2026</span>
          </div>
        </div>

        {/* 3. Sleek Theme Bottom Strip */}
        <div className="pt-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-xs">
          <div>
            <span className="font-bold text-white">ZameenAI</span> • {isHi ? 'ग्रामीण विकास मंत्रालय, भारत सरकार की एक पहल' : 'An initiative of Ministry of Rural Development, Govt. of India'}
          </div>
          <div className="flex flex-wrap space-x-6 text-slate-400">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); }} className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); }} className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#grievance" onClick={(e) => { e.preventDefault(); }} className="hover:text-white transition-colors">Helpdesk & Grievance</a>
            <a href="#api" onClick={(e) => { e.preventDefault(); }} className="hover:text-white transition-colors">API Docs</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
