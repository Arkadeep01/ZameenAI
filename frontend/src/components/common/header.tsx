import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import GovernmentEmblem from '../common/GovernmentEmblem';
import { Language } from '../../utils/types';
import { 
  UserCheck, 
  Search, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  ChevronRight
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
  const isHi = lang === 'hi';

  const navLinks = [
    { id: 'hero', label: isHi ? 'सिंहावलोकन' : 'Overview' },
    { id: 'transparency-stats', label: isHi ? 'राष्ट्रीय संकेतक' : 'Executive KPIs' },
    { id: 'workflow', label: isHi ? 'अधिग्रहण कार्यप्रवाह' : 'Statutory Workflow' },
    { id: 'ai-intelligence', label: isHi ? 'एआई इंटेलिजेंस' : 'AI Intelligence' },
    { id: 'architecture', label: isHi ? 'मंच आर्किटेक्चर' : 'Platform Architecture' },
    { id: 'stakeholder-pathways', label: isHi ? 'हितधारक प्रवेश' : 'Role Portals' },
  ];

  const startUploading = () => {
    window.location.hash = '/uploads';
  };

  // We keep the scroll listener because TanStack router active props 
  // track URL paths, whereas scroll spying requires DOM position tracking.
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'transparency-stats', 'workflow', 'ai-intelligence', 'architecture', 'stakeholder-pathways'];
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
              {isHi ? 'भारत सरकार' : 'GOVERNMENT OF INDIA'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 hidden sm:inline">
              {isHi ? 'ग्रामीण विकास मंत्रालय (DoLR)' : 'Ministry of Rural Development (DoLR)'}
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline text-[10px] uppercase font-mono">
              DILRMP 2.0 National Framework
            </span>
          </div>

          {/* Accessibility & Language Controls */}
          <div className="flex items-center gap-3">
            {/* Standard anchor is maintained here for native screen-reader skip link behavior */}
            <a 
              href="#main-content" 
              className="hidden lg:inline-block text-slate-400 hover:text-white transition-colors underline underline-offset-2 text-[10px]"
            >
              {isHi ? 'मुख्य विषय पर जाएं' : 'Skip to main content'}
            </a>

            {/* Font Size Adjusters */}
            <div className="flex items-center border border-slate-700 rounded bg-slate-800 overflow-hidden">
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

            {/* High Contrast Toggle */}
            <button
              onClick={onToggleHighContrast}
              title="Toggle High Contrast"
              className="flex items-center gap-1 px-2 py-0.5 border border-slate-700 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[10px]"
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
            </div>
          </div>
        </div>
      </div>

      {/* 3. Primary Header Bar: Brand + Navigation + System Status + Dominant Login CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Emblem + ZameenAI Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="pr-3 border-r border-slate-200 hidden sm:flex items-center">
            <GovernmentEmblem className="h-9 w-auto text-slate-800" />
          </div>

          <Link to="/" hash="hero" className="flex flex-col group">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#003366] leading-none">
                Zameen<span className="text-slate-900">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-slate-100 text-[#003366] border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#138808]" />
                Gov.in
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 tracking-normal mt-0.5 hidden sm:block">
              {isHi
                ? 'राष्ट्रीय भूमि अधिग्रहण एवं अभिलेख प्रबंधन मंच'
                : 'National Land Acquisition & Records Infrastructure'}
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <Link
                key={link.id}
                to="/"
                hash={link.id}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  isActive
                    ? 'text-[#003366] bg-blue-50/80 font-bold border-b-2 border-[#003366]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Status Indicator + Secondary Citizen Search + Dominant Portal Login */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Live System Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <span className="w-2 h-2 rounded-full bg-[#138808] animate-pulse" />
            <span className="font-medium">{isHi ? 'एनआईसी क्लाउड लाइव' : 'NIC Cloud Live'}</span>
          </div>

          {/* Start Uploading CTA */}
          <button
            type="button"
            onClick={startUploading}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-2xs cursor-pointer h-9"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Start Uploading</span>
          </button>

          {/* Dominant Primary Action: Portal Login */}
          <button
            type="button"
            onClick={() => onOpenOfficialLogin()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-slate-900 rounded-md transition-colors shadow-sm cursor-pointer h-9 active:scale-[0.98]"
          >
            <UserCheck className="w-4 h-4 text-white" />
            <span className="tracking-wide uppercase">{isHi ? 'पोर्टल लॉगिन' : 'Portal Login'}</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 4. Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 shadow-lg">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
            {isHi ? 'पोर्टल नेविगेशन' : 'Platform Navigation'}
          </div>
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                to="/"
                hash={link.id}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#003366] hover:bg-slate-50 rounded-md flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
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
              <span>Start Uploading</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenOfficialLogin();
              }}
              className="w-full py-2.5 px-3 text-xs font-bold text-white bg-[#003366] hover:bg-slate-900 rounded-md flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-white" />
              <span>{isHi ? 'जन परिचय अधिकारी लॉगिन' : 'Official Portal Login (SSO)'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}