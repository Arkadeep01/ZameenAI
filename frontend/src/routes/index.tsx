import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import Header from '../components/common/header';
import Hero from '../components/common/Hero';
import TrustBar from '../components/common/TrustBar';
import ProblemToSolution from '../components/common/ProblemToSolution';
import KeyModules from '../components/common/KeyModules';
import StakeholderPathways from '../components/common/StakeholderPathways';
import TransparencyStats from '../components/common/TransparencyStats';
import Footer from '../components/common/Footer';
import OfficialLoginModal from '../components/common/OfficialLoginModal';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const isHi = false; // Would come from context in real app

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
    // Only '/citizen/dashboard' exists today. There's no government dashboard
    // route yet, so we just close the modal (no navigate) for government users
    // rather than sending them to a 404. Once you add
    // src/routes/government.dashboard.tsx (same pattern as citizen.dashboard.tsx),
    // uncomment the else-branch navigate below.
    if (userType === 'citizen') {
      navigate({ to: '/citizen/dashboard' });
    } else {
      // navigate({ to: '/government/dashboard' });
      setAuthModalOpen(false);
    }
  };

  return (
    <div>
      <Header
        lang="en"
        onLanguageChange={() => {}}
        onOpenCitizenModal={() => {}}
        onOpenOfficialLogin={openOfficialLogin}
        fontSize="normal"
        onFontSizeChange={() => {}}
        highContrast={false}
        onToggleHighContrast={() => {}}
      />
      <Hero
        lang="en"
        onOpenCitizenModal={() => navigate({ to: '/uploads' })}
        onOpenOfficialLogin={openOfficialLogin}
      />
      <TrustBar lang="en" />
      <ProblemToSolution lang={isHi ? 'hi' : 'en'} />
      <KeyModules
        lang="en"
        onSelectModule={(module: any) => {}}
      />
      <StakeholderPathways
        lang="en"
        onOpenOfficialLogin={openOfficialLogin}
        onOpenCitizenModal={() => {}}
      />
      <TransparencyStats
        lang="en"
        onOpenCitizenModal={() => {}}
      />
      <Footer
        lang="en"
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