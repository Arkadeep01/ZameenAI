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
import { KeyModuleInfo } from '../utils/types';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'en' | 'hi' | 'bn'>('en');
  const [selectedModule, setSelectedModule] = useState<KeyModuleInfo | null>(null);

  const handleQuickSearch = (query: string) => {
    // Would open citizen status modal
  };

  return (
    <div>
      <Header
        lang={lang}
        onLanguageChange={setLang}
        onOpenCitizenModal={() => {}}
        onOpenOfficialLogin={() => {}}
        fontSize="normal"
        onFontSizeChange={() => {}}
        highContrast={false}
        onToggleHighContrast={() => {}}
      />
      <Hero
        lang={lang}
        onOpenCitizenModal={() => navigate({ to: '/uploads' })}
        onOpenOfficialLogin={() => {}}
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
        onOpenOfficialLogin={() => {}}
        onOpenCitizenModal={() => {}}
      />
      <TransparencyStats
        lang={lang}
        onOpenCitizenModal={() => {}}
      />
      <Footer
        lang={lang}
        onOpenCitizenModal={() => {}}
        onOpenOfficialLogin={() => {}}
      />
    </div>
  );
}