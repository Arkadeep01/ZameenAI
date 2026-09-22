import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import Header from '../components/common/header';
import Hero from '../components/common/Hero';
import TrustBar from '../components/common/TrustBar';
import ProblemToSolution from '../components/common/ProblemToSolution';
import KeyModules from '../components/common/KeyModules';
import ModuleDetailModal from '../components/common/ModuleDetailModal';
import StakeholderPathways from '../components/common/StakeholderPathways';
import TransparencyStats from '../components/common/TransparencyStats';
import Footer from '../components/common/Footer';
import OfficialLoginModal from '../components/common/OfficialLoginModal';
import { KeyModuleInfo } from '../utils/types';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'hi' | 'bn'>('en');
  const [selectedModule, setSelectedModule] = useState<KeyModuleInfo | null>(null);

  // Official Login / Signup modal state — shared across Header, Hero,
  // StakeholderPathways and Footer so they all open the SAME modal.
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const openOfficialLogin = (_roleId?: string) => {
    setAuthView('login');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userType: 'government' | 'citizen') => {
    // Demo login succeeded — route by role.
    // Citizen hub redirects /citizen → /citizen/dashboard.
    // Government officials land on the upload / digitization workspace.
    setAuthModalOpen(false);
    if (userType === 'citizen') {
      navigate({ to: '/citizen' });
    } else {
      navigate({ to: '/' });
    }
  };

  return (
    <div>
      <Header
        lang={lang}
        onLanguageChange={setLang}
        onOpenCitizenModal={() => {}}
        onOpenOfficialLogin={openOfficialLogin}
        fontSize="normal"
        onFontSizeChange={() => {}}
        highContrast={false}
        onToggleHighContrast={() => {}}
      />
      <Hero
        lang={lang}
        onOpenCitizenModal={() => navigate({ to: '/uploads' })}
        onOpenOfficialLogin={openOfficialLogin}
      />
      <TrustBar lang={lang} />
      <ProblemToSolution lang={lang} />
      <KeyModules
        lang={lang}
        onSelectModule={(module: KeyModuleInfo) => setSelectedModule(module)}
      />
      <ModuleDetailModal
        module={selectedModule}
        onClose={() => setSelectedModule(null)}
        lang={lang}
      />
      <StakeholderPathways
        lang={lang}
        onOpenOfficialLogin={openOfficialLogin}
        onOpenCitizenModal={() => {}}
      />
      <TransparencyStats
        lang={lang}
        onOpenCitizenModal={() => {}}
      />
      <Footer
        lang={lang}
        onOpenCitizenModal={() => {}}
        onOpenOfficialLogin={openOfficialLogin}
      />

      <OfficialLoginModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        view={authView}
        onViewChange={setAuthView}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
