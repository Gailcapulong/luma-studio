import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { GalleryShowcaseSection } from "@/components/GalleryShowcaseSection";
import { HomeHeroSection } from "@/components/HomeheroSection";
import { Testimonials } from "@/components/Testimonials";
import Image from "next/image";
import { PricingTable } from "@clerk/nextjs";
import { PricingSection } from "@/components/PricingSection";


export default function Home() {
  return (
    <main className="min-h-screen bg-background p-3 sm:p-4 lg:p-5">
      
      <HomeHeroSection />

      <GalleryShowcaseSection />
      <HowItWorksSection />

      <PricingSection />

      <Testimonials />

      <Footer />

    </main>
  );
}
