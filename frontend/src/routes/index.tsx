import { createFileRoute, useNavigate } from '@tanstack/react-router';

import Header from '../components/common/header';
import Hero from '../components/common/Hero';
import TrustBar from '../components/common/TrustBar';
import ProblemToSolution from '../components/common/ProblemToSolution';
import KeyModules from '../components/common/KeyModules';
import StakeholderPathways from '../components/common/StakeholderPathways';
import TransparencyStats from '../components/common/TransparencyStats';
import Footer from '../components/common/Footer';

export const Route = createFileRoute('/')({
  component: HomePage,
});

const TICKER_NOTICES = [
  { text: 'Gazette: RFCTLARR Act Section 11(1) notification published for Delhi-Amritsar-Katra Expressway Package 4', textHi: 'राजपत्र: दिल्ली-अमृतसर-कटरा एक्सप्रेसवे पैकेज 4 हेतु धारा 11(1) अधिसूचना जारी' },
  { text: 'Digital India Land Records: 28 States successfully onboarded on ZameenAI Unified RoR Grid', textHi: 'डिजिटल इंडिया भूमि अभिलेख: 28 राज्य ज़मीन एआई एकीकृत आरओआर ग्रिड पर सफलतापूर्वक जुड़े' },
  { text: 'PFMS Direct Disbursal: Over ₹68,000 Crore credited directly to verified Aadhaar-linked farmer accounts', textHi: 'पीएफएमएस प्रत्यक्ष अंतरण: 68,000 करोड़ रुपये से अधिक सीधे किसानों के बैंक खातों में अंतरित' },
  { text: 'DILRMP Advisory: Drone-assisted aerial LiDAR survey completed for 1,200 km railway freight alignment', textHi: 'डीआईएलआरएमपी परामर्श: 1,200 किमी रेल कॉरिडोर हेतु ड्रोन-आधारित लिडार सर्वेक्षण संपन्न' },
];

const HERO_CONTENT = {
  tagline: {
    en: 'Bringing Clarity to Land Acquisition and Records',
    hi: 'भूमि अधिग्रहण एवं अभिलेखों में पारदर्शिता और स्पष्टता',
  },
  missionStatement: {
    en: 'A unified, AI-driven platform for end-to-end land acquisition monitoring and intelligent land-record digitization',
    hi: 'संपूर्ण भूमि अधिग्रहण निगरानी एवं बौद्धिक भू-अभिलेख डिजिटलीकरण हेतु एक एकीकृत, एआई-संचालित राष्ट्रीय मंच',
  },
  officialCta: {
    en: 'Official Login',
    hi: 'अधिकारी लॉगिन',
  },
  officialCtaSub: {
    en: 'For PIAs, LAOs, CALA & District Magistrates',
    hi: 'पीआईए, एलएओ, सीएएलए एवं जिलाधिकारियों हेतु',
  },
  citizenCta: {
    en: 'Start Uploading',
    hi: 'शुरू करें अपलोडिंग',
  },
  citizenCtaSub: {
    en: 'Begin the next phase of the land-record digitization workflow',
    hi: 'भूमि-रिकॉर्ड डिजिटलीकरण कार्यflow की अगली चरण प्रारंभ करें',
  },
};

function HomePage() {
  const navigate = useNavigate();
  const isHi = false; // Would come from context in real app

  const handleQuickSearch = (query: string) => {
    // Would open citizen status modal
  };

  return (
    <div>
      <Header
        lang="en"
        onLanguageChange={() => {}}
        onOpenCitizenModal={() => {}}
        onOpenOfficialLogin={() => {}}
        fontSize="normal"
        onFontSizeChange={() => {}}
        highContrast={false}
        onToggleHighContrast={() => {}}
      />
      <Hero
        lang="en"
        onOpenCitizenModal={() => navigate({ to: '/uploads' })}
        onOpenOfficialLogin={() => {}}
      />
      <TrustBar lang="en" />
      <ProblemToSolution lang={isHi ? 'hi' : 'en'} />
      <KeyModules
        lang="en"
        onSelectModule={(module: any) => {}}
      />
      <StakeholderPathways
        lang="en"
        onOpenOfficialLogin={() => {}}
        onOpenCitizenModal={() => {}}
      />
      <TransparencyStats
        lang="en"
        onOpenCitizenModal={() => {}}
      />
      <Footer
        lang="en"
        onOpenCitizenModal={() => {}}
        onOpenOfficialLogin={() => {}}
      />
    </div>
  );
}
