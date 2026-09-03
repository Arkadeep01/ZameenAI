import React, { useState } from 'react';
import { STAKEHOLDER_PERSONAS } from '../../utils/portalData';
import { Language, PersonaInfo } from '../../utils/types';
import { 
  X, 
  UserCheck, 
  ShieldCheck, 
  Key, 
  Lock, 
  Fingerprint, 
  Building2, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Smartphone,
  Award,
  AlertCircle
} from 'lucide-react';
import GovernmentEmblem from './GovernmentEmblem';

interface OfficialLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  initialRoleId?: string;
}

export default function OfficialLoginModal({
  isOpen,
  onClose,
  lang,
  initialRoleId = 'lao',
}: OfficialLoginModalProps) {
  const isHi = lang === 'hi';
  const officialPersonas = STAKEHOLDER_PERSONAS.filter(p => p.id !== 'citizen');
  
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    initialRoleId === 'citizen' ? 'lao' : initialRoleId
  );
  const [loginMethod, setLoginMethod] = useState<'parichay' | 'otp' | 'dsc'>('parichay');
  const [isSimulatingAuth, setIsSimulatingAuth] = useState(false);
  const [authenticatedView, setAuthenticatedView] = useState(false);

  if (!isOpen) return null;

  const currentPersona = officialPersonas.find(p => p.id === selectedRoleId) || officialPersonas[0];

  const getSampleEmail = (roleId: string) => {
    switch (roleId) {
      case 'pia': return 'nhai.delhi.corridor@nic.in';
      case 'field-officer': return 'amin.jewar.rev@up.gov.in';
      case 'lao': return 'lao.revenue.up@nic.in';
      case 'approver': return 'cala.dm.collector@nic.in';
      case 'executive': return 'mord.secretary.infra@gov.in';
      case 'admin': return 'dilrmp.nic.admin@gov.in';
      default: return 'officer.portal@gov.in';
    }
  };

  const handleSimulateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulatingAuth(true);
    setTimeout(() => {
      setIsSimulatingAuth(false);
      setAuthenticatedView(true);
    }, 900);
  };

  const handleReset = () => {
    setAuthenticatedView(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden text-slate-900">
        {/* Tricolor Stripe */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#FF9933]" />
          <div className="h-full w-1/3 bg-white" />
          <div className="h-full w-1/3 bg-[#138808]" />
        </div>

        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <GovernmentEmblem className="h-9 w-auto text-amber-400" />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-sans font-bold text-base tracking-wide text-white">
                  {isHi ? 'जन परिचय / मेरी पहचान - एकल साइन ऑन' : 'Jan Parichay / MeriPehchan SSO'}
                </h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-200 border border-blue-800">
                  Gov SSO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isHi ? 'राष्ट्रीय भूमि अधिग्रहण एवं अभिलेख प्रबंधन अधिकृत अधिकारी पोर्टल' : 'Official Portal for National Land Acquisition Officers & Executives'}
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6">
          {!authenticatedView ? (
            <div className="space-y-5">
              {/* Persona Selector Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {isHi ? '1. अपनी अधिकृत शासकीय भूमिका चुनें:' : '1. Select Your Official Designated Role:'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
                  {officialPersonas.map((persona) => {
                    const isSelected = persona.id === selectedRoleId;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => setSelectedRoleId(persona.id)}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-[#003366] text-white border-[#003366] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-mono text-[11px]">{persona.roleCode}</span>
                        <span className="text-[9px] font-normal line-clamp-1">
                          {persona.title.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Role Authority Box */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs">
                <div className="p-2 rounded bg-white border border-slate-300 shrink-0">
                  <UserCheck className="w-5 h-5 text-[#003366]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {isHi ? currentPersona.titleHi : currentPersona.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300">
                      {isHi ? currentPersona.badgeHi : currentPersona.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {isHi ? currentPersona.descriptionHi : currentPersona.description}
                  </p>
                  <div className="text-[10px] text-slate-500 font-medium pt-0.5">
                    {isHi ? 'शासकीय संवर्ग:' : 'Cadre:'} <span className="font-bold text-slate-800">{isHi ? currentPersona.primaryEntityHi : currentPersona.primaryEntity}</span>
                  </div>
                </div>
              </div>

              {/* Authentication Mode Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  {isHi ? '2. प्रमाणन विधि चुनें:' : '2. Choose Authentication Protocol:'}
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('parichay')}
                    className={`py-2 px-3 rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      loginMethod === 'parichay'
                        ? 'bg-[#003366] text-white border-[#003366]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Jan Parichay SSO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('otp')}
                    className={`py-2 px-3 rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      loginMethod === 'otp'
                        ? 'bg-[#003366] text-white border-[#003366]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Aadhaar OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('dsc')}
                    className={`py-2 px-3 rounded-md border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      loginMethod === 'dsc'
                        ? 'bg-[#003366] text-white border-[#003366]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Digital Token (DSC)</span>
                  </button>
                </div>
              </div>

              {/* Mock Input Fields */}
              <form onSubmit={handleSimulateLogin} className="space-y-3">
                {loginMethod === 'parichay' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {isHi ? 'शासकीय ईमेल / एनआईसी उपयोगकर्ता नाम:' : 'Official Gov/NIC Email ID:'}
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={getSampleEmail(selectedRoleId)}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {isHi ? 'पासवर्ड / 2FA सुरक्षा कुंजी:' : 'Password / 2FA Security Token:'}
                      </label>
                      <input
                        type="password"
                        readOnly
                        value="••••••••••••••••"
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-800"
                      />
                    </div>
                  </>
                )}

                {loginMethod === 'otp' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {isHi ? 'आधार से जुड़ा अधिकृत मोबाइल नंबर:' : 'Aadhaar-Linked Official Mobile:'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value="+91 98710 ••••• (Verified NIC Database)"
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-800"
                    />
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                      {isHi ? 'सुरक्षित ओटीपी आपके पंजीकृत नंबर पर भेजा जाएगा' : 'Secure 6-digit OTP will be dispatched via Gov-SMS gateway'}
                    </span>
                  </div>
                )}

                {loginMethod === 'dsc' && (
                  <div className="p-3 bg-slate-100 rounded border border-slate-300 text-xs text-slate-700 space-y-1">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-emerald-700" />
                      <span>Class 3 Digital Signature Certificate (DSC) Detected</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Token Serial: NIC-CCA-2025-IND-8841 • Issued by National Informatics Centre CA.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSimulatingAuth}
                  className="w-full py-2.5 px-4 bg-[#003366] hover:bg-blue-900 text-white rounded text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  {isSimulatingAuth ? (
                    <span>{isHi ? 'एनआईसी क्लाउड सर्वर से सत्यापित हो रहा है...' : 'Authenticating with NIC MeghRaj Cloud...'}</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-blue-200" />
                      <span>{isHi ? `${currentPersona.roleCode} के रूप में सुरक्षित प्रवेश करें` : `Authenticate & Access ${currentPersona.roleCode} Workspace`}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Authenticated Simulation View */
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      {isHi ? 'सफल शासकीय प्रमाणीकरण' : 'Authenticated Official Session'}
                    </span>
                    <h4 className="text-base font-bold text-emerald-950 mt-0.5">
                      {isHi ? currentPersona.titleHi : currentPersona.title} ({currentPersona.roleCode})
                    </h4>
                    <p className="text-emerald-900 mt-1">
                      Logged in as: <span className="font-mono font-semibold">{getSampleEmail(selectedRoleId)}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-white text-emerald-900 border border-emerald-300 font-bold shrink-0">
                  NIC-256-Bit
                </span>
              </div>

              {/* Sample Official Actions Queue */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    {isHi ? 'प्रतीक्षित कार्य एवं वैधानिक फाइलें:' : 'Pending Statutory Action Items:'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#003366] font-bold text-[10px]">
                    4 Pending Filings
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">NH-44 Jewar Expressway Link - Sec 15 Objections Scrutiny</div>
                      <div className="text-[11px] text-slate-500">12 Hearing Notices scheduled under RFCTLARR Act</div>
                    </div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-900 rounded font-semibold text-[10px]">
                      Action Due in 3 Days
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Western DFC Package 4 - Award Sanction Requisition</div>
                      <div className="text-[11px] text-slate-500">Joint Measurement Survey signed by Field Patwari</div>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-900 rounded font-semibold text-[10px]">
                      Ready for CALA Signoff
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleReset}
                  className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline cursor-pointer"
                >
                  {isHi ? 'भूमिका बदलें' : 'Switch Role Credentials'}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold cursor-pointer"
                >
                  {isHi ? 'सत्र समाप्त / बंद करें' : 'Close Sandbox Session'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Security Note Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>MeitY & NIC G2G Guidelines Compliant</span>
          </div>
          <span>CERT-In Audited 2026</span>
        </div>
      </div>
    </div>
  );
}
