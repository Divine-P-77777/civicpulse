import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import FeaturesSection from '@/components/FeaturesSection';
import KnowledgeEngineSection from '@/components/KnowledgeEngineSection';
import FooterSection from '@/components/FooterSection';

export default function Home() {
  return (
    <main>
      <Header />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <KnowledgeEngineSection />
      <FooterSection />
    </main>
  );
}
