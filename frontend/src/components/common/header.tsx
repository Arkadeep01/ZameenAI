import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import GovernmentEmblem from '../common/GovernmentEmblem';
import logo from '../../../assets/logo.png';
import { PORTAL_LINKS } from '../../utils/portals';
import { Language } from '../../utils/types';
import { 
  UserCheck, 
  Search, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ChevronRight,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';

interface HeaderProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenCitizenModal: () => void;
  onOpenOfficialLogin: (roleId?: string) => void;
  fontSize: 'normal' | 'large' | 'larger';
  onFontSizeChange: (size: 'normal' | 'large' | 'larger') => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
}

export default function Header({
  lang,
  onLanguageChange,
  onOpenCitizenModal,
  onOpenOfficialLogin,
  fontSize,
  onFontSizeChange,
  highContrast,
  onToggleHighContrast,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [portalsOpen, setPortalsOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const portalsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isHi = lang === 'hi';
  const isBn = lang === 'bn';

  // Single Overview entry — every dashboard opens exactly once via the
  // Role Portals menu (no duplicate dashboard links in the navbar).
  const navLinks = [
    { id: 'hero', label: isHi ? 'सिंहावलोकन' : isBn ? 'দৃষ্টিপাত' : 'Overview', to: '/', hash: 'hero', kind: 'section' as const },
  ];

  // Navbar search → exact Find-My-Land page, query carried as ?q=
  const submitNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = navQuery.trim();
    setMobileMenuOpen(false);
    setPortalsOpen(false);
    navigate({ to: '/find-my-land', search: q ? { q } : {} });
  };

  const startUploading = () => {
    window.location.hash = '/uploads';
  };

  // Scroll-spy only highlights Overview (hero) and the Role Portals
  // dropdown (stakeholder section) — everything else is a dashboard route.
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'stakeholder-pathways'];
      const scrollPos = window.scrollY + 120;
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close portals dropdown on outside click / Escape
  useEffect(() => {
    if (!portalsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (portalsRef.current && !portalsRef.current.contains(e.target as Node)) {
        setPortalsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPortalsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [portalsOpen]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      {/* 1. Official Tricolor Accent Micro-Line */}
      <div className="h-0.75 w-full flex">
        <div className="h-full w-1/3 bg-[#ff9933]" title="Saffron" />
        <div className="h-full w-1/3 bg-white" title="White" />
        <div className="h-full w-1/3 bg-[#138808]" title="Green" />
      </div>

      {/* 2. Top GIGW Government Identity & Accessibility Micro-Bar */}
      <div className="bg-slate-900 text-slate-300 text-[11px] border-b border-slate-800 px-4 py-1">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Official Government Identity */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide">
              {isHi ? 'भारत सरकार' : isBn ? 'ভারত সরকার' : 'GOVERNMENT OF INDIA'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 hidden sm:inline">
              {isHi ? 'ग्रामीण विकास मंत्रालय (DoLR)' : isBn ? 'গ্রামীন উন্নয়ন মন্ত্রণালয় (DoLR)' : 'Ministry of Rural Development (DoLR)'}
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline text-[10px] uppercase font-mono">
              DILRMP 2.0 National Framework
            </span>
          </div>

          {/* Accessibility & Language Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Standard anchor is maintained here for native screen-reader skip link behavior */}
            <a 
              href="#main-content" 
              className="hidden lg:inline-block text-slate-400 hover:text-white transition-colors underline underline-offset-2 text-[10px]"
            >
              {isHi ? 'मुख्य विषय पर जाएं' : isBn ? 'মূল বিষয়ে যান' : 'Skip to main content'}
            </a>

            {/* Font Size Adjusters — hidden on phones to save space */}
            <div className="hidden sm:flex items-center border border-slate-700 rounded bg-slate-800 overflow-hidden">
              <button
                onClick={() => onFontSizeChange('normal')}
                title="Standard Text Size"
                className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                  fontSize === 'normal' ? 'bg-[#003366] text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                A-
              </button>
              <button
                onClick={() => onFontSizeChange('large')}
                title="Medium Text Size"
                className={`px-1.5 py-0.5 text-[10px] font-bold border-x border-slate-700 transition-colors ${
                  fontSize === 'large' ? 'bg-[#003366] text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                A
              </button>
              <button
                onClick={() => onFontSizeChange('larger')}
                title="Larger Text Size"
                className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                  fontSize === 'larger' ? 'bg-[#003366] text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                A+
              </button>
            </div>

            {/* High Contrast Toggle — hidden on phones to save space */}
            <button
              onClick={onToggleHighContrast}
              title="Toggle High Contrast"
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 border border-slate-700 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[10px]"
            >
              {highContrast ? <Sun className="w-3 h-3 text-[#ff9933]" /> : <Moon className="w-3 h-3 text-slate-400" />}
              <span className="hidden sm:inline">{highContrast ? 'Normal' : 'Contrast'}</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center border border-slate-700 rounded bg-slate-800 overflow-hidden">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-0.5 font-bold text-[10px] transition-colors ${
                  lang === 'en' ? 'bg-[#003366] text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => onLanguageChange('hi')}
                className={`px-2 py-0.5 font-bold text-[10px] transition-colors ${
                  lang === 'hi' ? 'bg-[#003366] text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => onLanguageChange('bn')}
                className={`px-2 py-0.5 font-bold text-[10px] transition-colors ${
                  lang === 'bn' ? 'bg-[#003366] text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Header Bar: Brand + Navigation + System Status + Dominant Login CTA */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Logo + Emblem + ZameenAI Identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <Link to="/" hash="hero" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <img
              src={logo}
              alt="ZameenAI logo"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-contain ring-1 ring-slate-200 shadow-xs"
            />
            <span className="hidden md:flex items-center pr-2.5 border-r border-slate-200">
              <GovernmentEmblem className="h-9 w-auto text-slate-800" />
            </span>
          </Link>

          <Link to="/" hash="hero" className="flex flex-col group min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-2xl font-black tracking-tight text-[#003366] leading-none whitespace-nowrap">
                Zameen<span className="text-slate-900">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-slate-100 text-[#003366] border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#138808]" />
                Gov.in
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 tracking-normal mt-0.5 hidden lg:block">
              {isHi
                ? 'राष्ट्रीय भूमि अधिग्रहण एवं अभिलेख प्रबंधन मंच'
                : isBn
                ? 'জাতীয় ভূমি অর্জন ও রেকর্ড ম্যানেজমেন্ট প্ল্যাটফর্ম'
                : 'National Land Acquisition & Records Infrastructure'}
            </span>
          </Link>
        </div>

        {/* Center: Overview + Searchbar + Role Portals (no duplicate dashboard links) */}
        <nav className="hidden xl:flex items-center gap-2 min-w-0 flex-1 justify-center px-4">
          {navLinks.map((link) => {
            const isActive = link.kind === 'section' && activeSection === link.id;
            const cls = `px-2 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
              isActive
                ? 'text-[#003366] bg-blue-50/80 font-bold shadow-[inset_0_-2px_0_#003366]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`;
            return link.kind === 'section' ? (
              <Link key={link.id} to={link.to} hash={link.hash} className={cls}>
                {link.label}
              </Link>
            ) : (
              <Link key={link.id} to={link.to} className={cls}>
                {link.label}
              </Link>
            );
          })}
          {/* Navbar searchbar — Khasra / Survey No. / Notification ID */}
          <form
            onSubmit={submitNavSearch}
            role="search"
            className="flex h-9 w-full max-w-55 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 transition-colors focus-within:border-[#003366] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100"
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <input
              type="search"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder={isHi ? 'खसरा / सर्वे नं. खोजें…' : isBn ? 'খসরা / সার্ভে নং খুঁজুন…' : 'Search Khasra / Survey No.…'}
              aria-label="Search land records"
              className="w-full min-w-0 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
            />
          </form>
          {/* Role Portals dropdown — each entry opens its own dashboard */}
          <div ref={portalsRef} className="relative">
            <button
              type="button"
              onClick={() => setPortalsOpen((v) => !v)}
              className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                portalsOpen || activeSection === 'stakeholder-pathways'
                  ? 'text-[#003366] bg-blue-50/80 font-bold shadow-[inset_0_-2px_0_#003366]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              aria-haspopup="menu"
              aria-expanded={portalsOpen}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{isHi ? 'रोल पोर्टल' : isBn ? 'রোল পোর্টাল' : 'Role Portals'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${portalsOpen ? 'rotate-180' : ''}`} />
            </button>
            {portalsOpen && (
              <div className="absolute right-0 top-full mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="menu">
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Role Portals — click to open dashboard
                  </p>
                </div>
                <div className="max-h-[380px] overflow-y-auto p-2">
                  {PORTAL_LINKS.map((p) => (
                    <Link
                      key={p.route}
                      to={p.route}
                      onClick={() => setPortalsOpen(false)}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-sky-50 transition-colors"
                    >
                      <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain ring-1 ring-slate-200" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-bold text-slate-800">{p.name}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{p.desc}</span>
                      </span>
                      <span className="shrink-0 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#003366]">
                        {p.badge}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right: Status Indicator + Dominant Portal Login */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Live System Status Indicator — only on very wide screens to protect navbar space */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-[#138808] animate-pulse" />
            <span className="font-medium">{isHi ? 'एनआईसी क्लाउड लाइव' : isBn ? 'এনআইসি ক্লাউড লাইভ' : 'NIC Cloud Live'}</span>
          </div>

          {/* Dominant Primary Action: Portal Login — icon-only on phones */}
          <button
            type="button"
            onClick={() => onOpenOfficialLogin()}
            className="inline-flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-slate-900 rounded-md transition-colors shadow-sm cursor-pointer h-9 active:scale-[0.98]"
          >
            <UserCheck className="w-4 h-4 text-white" />
            <span className="tracking-wide uppercase hidden min-[420px]:inline">{isHi ? 'पोर्टल लॉगिन' : isBn ? 'পোর্টাল লগইন' : 'Portal Login'}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 4. Mobile Navigation Dropdown — internally scrollable so long portal list never pushes the page */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-4 py-4 space-y-3 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
            {isHi ? 'पोर्टल नेविगेशन' : isBn ? 'পোর্টাল নেভিগেশন' : 'Platform Navigation'}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => (
              link.kind === 'section' ? (
                <Link
                  key={link.id}
                  to={link.to}
                  hash={link.hash}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#003366] hover:bg-slate-50 rounded-md flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              ) : (
                <Link
                  key={link.id}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#003366] hover:bg-slate-50 rounded-md flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              )
            ))}
          </div>

          {/* Mobile navbar searchbar */}
          <form
            onSubmit={submitNavSearch}
            role="search"
            className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-[#003366] focus-within:bg-white"
          >
            <Search className="w-4 h-4 shrink-0 text-slate-400" />
            <input
              type="search"
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder={isHi ? 'खसरा / सर्वे नं. खोजें…' : isBn ? 'খসরা / সার্ভে নং খুঁজুন…' : 'Search Khasra / Survey No.…'}
              aria-label="Search land records"
              className="w-full min-w-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </form>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 pt-1">
            Role Portals — open dashboard
          </div>
          <div className="grid grid-cols-1 gap-1">
            {PORTAL_LINKS.map((p) => (
              <Link
                key={p.route}
                to={p.route}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md flex items-center gap-3 hover:bg-sky-50"
              >
                <img src={logo} alt="" className="h-7 w-7 rounded-md object-contain ring-1 ring-slate-200" />
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[13px] font-bold text-slate-800">{p.name}</span>
                  <span className="block truncate text-[11px] text-slate-500">{p.desc}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                startUploading();
              }}
              className="w-full py-2.5 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-200 rounded-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-600" />
              <span>{isHi ? 'अपलोडिंग शुरू करें' : isBn ? 'আপলোডিং শুরু করুন' : 'Start Uploading'}</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenOfficialLogin();
              }}
              className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#003366] hover:bg-slate-900 rounded-md flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-white" />
              <span>{isHi ? 'जन परिचय अधिकारी लॉगिन' : isBn ? 'জন পরিচয় অফিসার লগইন' : 'Official Portal Login (SSO)'}</span>
            </button>
          </div>
          </div>
        </div>
      )}
    </header>
  );
}