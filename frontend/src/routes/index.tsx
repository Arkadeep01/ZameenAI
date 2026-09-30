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
import { useAuth } from '../auth/AuthProvider';
import { roleHome } from '../auth/permissions';
import { KeyModuleInfo } from '../utils/types';

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lang, setLang] = useState<'en' | 'hi' | 'bn'>('en');
  const [selectedModule, setSelectedModule] = useState<KeyModuleInfo | null>(null);

  // Official Login / Signup modal state — shared across Header, Hero,
  // StakeholderPathways and Footer so they all open the SAME modal.
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  const openOfficialLogin = (roleId?: string) => {
    setPendingRoleId(roleId ?? null);
    setAuthView("login");
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userType: "government" | "citizen", role?: string) => {
    // Route to the AUTHENTICATED user's own portal. The persona picked on the
    // landing page is a display hint only — it must never decide navigation,
    // otherwise a user could be pushed toward another role's portal.
    //
    // `role` comes from the sign-in response. `user` from the auth context is
    // not yet refreshed at this point in the same tick, so it is only a
    // fallback for callers that cannot supply the role.
    setAuthModalOpen(false);
    const authenticatedRole = role ?? user?.role;
    const home = roleHome(authenticatedRole);
    if (home) {
      navigate({ to: home });
    } else if (userType === 'citizen') {
      navigate({ to: '/citizen/dashboard' });
    } else {
      navigate({ to: '/desk-validator' });
    }
    setPendingRoleId(null);
  };

  return (
    <div className="overflow-x-clip">
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
        onOpenCitizenModal={() => navigate({ to: '/citizen/dashboard' })}
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
        onOpenCitizenModal={() => navigate({ to: '/citizen/dashboard' })}
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
