import React, { useState, useEffect } from 'react';
import { SAMPLE_LAND_RECORDS } from '../../utils/portalData';
import { LandRecordStatus, Language } from '../../utils/types';
import { 
  X, 
  Search, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Download, 
  FileText, 
  ShieldCheck, 
  AlertCircle,
  Building,
  CreditCard,
  Printer,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface CitizenStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  initialQuery?: string;
}

export default function CitizenStatusModal({
  isOpen,
  onClose,
  lang,
  initialQuery = '',
}: CitizenStatusModalProps) {
  const isHi = lang === 'hi';
  const [searchQuery, setSearchQuery] = useState(initialQuery || '142/2');
  const [selectedRecord, setSelectedRecord] = useState<LandRecordStatus>(SAMPLE_LAND_RECORDS[0]);
  const [stateFilter, setStateFilter] = useState('All');
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      const match = SAMPLE_LAND_RECORDS.find(
        r => r.khasraNo.toLowerCase().includes(initialQuery.toLowerCase()) ||
             r.notificationId.toLowerCase().includes(initialQuery.toLowerCase())
      );
      if (match) setSelectedRecord(match);
    }
  }, [initialQuery]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    const match = SAMPLE_LAND_RECORDS.find(
      r => r.khasraNo.toLowerCase().includes(query) ||
           r.notificationId.toLowerCase().includes(query) ||
           r.village.toLowerCase().includes(query) ||
           r.landownerName.toLowerCase().includes(query)
    );
    if (match) {
      setSelectedRecord(match);
    } else {
      // Pick first as fallback with updated query
      setSelectedRecord({
        ...SAMPLE_LAND_RECORDS[0],
        khasraNo: searchQuery || 'Custom',
        notificationId: `LA-REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }
  };

  const handleSelectRecord = (record: LandRecordStatus) => {
    setSelectedRecord(record);
    setSearchQuery(record.khasraNo);
  };

  const handlePrint = () => {
    window.print();
  };

  const stages = [
    { title: 'Sec 11(1) Notified', titleHi: 'धारा 11(1) अधिसूचना' },
    { title: 'Joint Measurement (JMS)', titleHi: 'संयुक्त माप सर्वेक्षण' },
    { title: 'Sec 19 Declaration', titleHi: 'धारा 19 वैधानिक घोषणा' },
    { title: 'Award Inquiry & Calc', titleHi: 'पंचाट सुनवाई एवं गणना' },
    { title: 'Compensation Disbursed', titleHi: 'मुआवजा डीबीटी अंतरण' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden text-slate-900">
        {/* Modal Top Bar (Tricolor + Official Header) */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#FF9933]" />
          <div className="h-full w-1/3 bg-white" />
          <div className="h-full w-1/3 bg-[#138808]" />
        </div>

        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base tracking-wide">
                {isHi ? 'नागरिक भूमि अधिग्रहण स्थिति एवं मुआवजा सत्यापन' : 'Citizen Land Status & Compensation Tracker'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isHi ? 'भूमि अधिग्रहण, पुनर्वासन एवं पुनर्व्यवस्थापन में उचित प्रतिकर का अधिकार अधिनियम, 2013' : 'Right to Fair Compensation & Transparency in Land Acquisition (RFCTLARR) Act, 2013'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Search Inputs & Presets */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isHi ? "खसरा संख्या, सर्वे नंबर या अधिसूचना आईडी दर्ज करें..." : "Enter Khasra / Survey No. or Notification ID..."}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#003366]"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-[#003366] hover:bg-blue-900 text-white text-xs sm:text-sm font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{isHi ? "अभिलेख खोजें" : "Track Record"}</span>
              </button>
            </form>

            {/* Quick Record Selection Buttons */}
            <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-500 font-medium">{isHi ? "सत्यापित उदाहरण:" : "Verified Examples:"}</span>
              {SAMPLE_LAND_RECORDS.map((rec) => (
                <button
                  key={rec.notificationId}
                  type="button"
                  onClick={() => handleSelectRecord(rec)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
                    selectedRecord.notificationId === rec.notificationId
                      ? 'bg-blue-50 text-[#003366] border-blue-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Khasra {rec.khasraNo} ({rec.village}, {rec.state})
                </button>
              ))}
            </div>
          </div>

          {/* Record Details Result */}
          {selectedRecord && (
            <div className="space-y-6">
              {/* Card 1: Primary Land Record Snapshot */}
              <div className="border border-stone-200 rounded-xl p-5 bg-white shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-300">
                        {selectedRecord.notificationId}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {isHi ? 'अधिसूचना तिथि:' : 'Notified:'} {selectedRecord.dateNotified}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-stone-900 mt-1">
                      Khasra No. {selectedRecord.khasraNo} • {selectedRecord.village}, {selectedRecord.tehsil}, {selectedRecord.district} ({selectedRecord.state})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{selectedRecord.currentStage}</span>
                    </span>
                  </div>
                </div>

                {/* Grid of Key Attributes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">{isHi ? 'भू-स्वामी / खातेदार:' : 'Registered Landowner:'}</span>
                    <span className="font-bold text-stone-900 mt-0.5 block">{selectedRecord.landownerName}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">{isHi ? 'अधिग्रहीत रकबा:' : 'Notified Area:'}</span>
                    <span className="font-bold text-stone-900 mt-0.5 block">{selectedRecord.notifiedAreaHectares} Hectares (~{Math.round(selectedRecord.notifiedAreaHectares * 3.95)} Bigha)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">{isHi ? 'संबद्ध राष्ट्रीय परियोजना:' : 'Affiliated Project:'}</span>
                    <span className="font-bold text-stone-900 mt-0.5 block line-clamp-2">{selectedRecord.projectAffiliation}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-500 block text-[11px]">{isHi ? 'डीबीटी पीएफएमएस स्थिति:' : 'DBT Payment Track:'}</span>
                    <span className="font-bold text-emerald-700 mt-0.5 block">{selectedRecord.dbtPaymentStatus}</span>
                  </div>
                </div>

                {/* Acquisition Milestone Stepper */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
                    {isHi ? 'आरएफसीटीएलएआरआर अधिनियम 2013 वैधानिक प्रगति चरण:' : 'Statutory RFCTLARR Act 2013 Lifecycle Progress:'}
                  </span>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-semibold">
                    {stages.map((stg, sIdx) => {
                      const isComplete = sIdx + 1 <= selectedRecord.stageIndex;
                      const isCurrent = sIdx + 1 === selectedRecord.stageIndex;

                      return (
                        <div
                          key={sIdx}
                          className={`p-2 rounded border flex flex-col items-center justify-center gap-1 ${
                            isComplete
                              ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                              : 'bg-stone-100 text-stone-400 border-stone-200'
                          } ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}
                        >
                          <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-white border border-stone-300">
                            {isComplete ? '✓' : sIdx + 1}
                          </span>
                          <span className="leading-tight">
                            {isHi ? stg.titleHi : stg.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card 2: Compensation Calculation Breakdown (Under RFCTLARR Act 2013) */}
              <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-800" />
                    <h5 className="font-bold text-stone-900 text-sm sm:text-base">
                      {isHi ? 'मुआवजा पंचाट गणना विवरण (प्रथम अनुसूची)' : 'Compensation Award Calculation (Schedule I)'}
                    </h5>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                    Total: {selectedRecord.compensationCalculated}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">{isHi ? 'बाजार मूल्य (सर्कल रेट x 1.5):' : 'Basic Market Value:'}</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">50% Base Component</span>
                    <span className="text-[10px] text-slate-400">As per District Collector Circle Rate</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">{isHi ? '100% सोलेशियम (अनिवार्य):' : '100% Solatium Guarantee:'}</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{selectedRecord.solatiumComponent}</span>
                    <span className="text-[10px] text-slate-400">RFCTLARR Sec 30(1) Statutory</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">{isHi ? 'यूटीआर / पीएफएमएस संदर्भ:' : 'PFMS UTR Reference:'}</span>
                    <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block break-all">
                      {selectedRecord.utrReference}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Direct Bank Credit</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded border border-slate-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    {isHi
                      ? 'मुआवजा सीधे भू-स्वामी के आधार से जुड़े बैंक खाते में इलेक्ट्रॉनिक रूप से अंतरित किया जाता है। किसी भी मध्यस्थ की आवश्यकता नहीं है।'
                      : 'Compensation is electronically remitted through PFMS into the Aadhaar-seeded account with Zero Intermediary deduction.'}
                  </span>
                </div>
              </div>

              {/* Actions & Print Slip */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isHi ? 'प्रमाणित पर्ची प्रिंट करें' : 'Print Certified Status Slip'}</span>
                  </button>
                  <button
                    onClick={() => alert(isHi ? 'डिजिटल रूप से हस्ताक्षरित पंचाट प्रति डाउनलोड हो रही है...' : 'Downloading digitally signed Award Order copy...')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isHi ? 'ई-पंचाट डाउनलोड' : 'Download E-Award PDF'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">{isHi ? 'कोई विसंगति है?' : 'Have an objection or claim?'}</span>
                  <button
                    onClick={() => alert(isHi ? 'धारा 15 के तहत ऑनलाइन ई-आपत्ति फॉर्म खुल रहा है...' : 'Opening Online Section 15 Objection Form...')}
                    className="font-bold text-[#003366] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{isHi ? 'ई-आपत्ति दर्ज करें (Sec 15)' : 'File E-Objection (Sec 15)'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{isHi ? 'एनआईसी नेशनल लैंड रजिस्ट्री डेटाबेस से वास्तविक समय सिंक' : 'Synchronized real-time with NIC National Land Registry DB'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            {isHi ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
