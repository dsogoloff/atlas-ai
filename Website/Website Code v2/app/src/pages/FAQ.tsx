import { SectionReveal } from '@/components/SectionReveal';
import { faqItems } from '@/data/faq';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function FAQ() {
  // FAQPage Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };

  return (
    <main className="pt-[70px]">
      {/* FAQPage Schema Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Find answers to common questions about S.A.M and our programs
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-3xl">
          <SectionReveal>
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-[#F8FAFC] rounded-lg px-6 border-none"
                >
                  <AccordionTrigger className="text-left text-[#1A5276] font-semibold hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#333333] pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SectionReveal>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom text-center">
          <SectionReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Still Have Questions?
            </h2>
            <p className="text-[#7F8C8D] text-lg mb-8 max-w-2xl mx-auto">
              We're here to help. Contact us with any questions about the method.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+12125551234" className="btn-primary">
                Call Us: (212) 555-1234
              </a>
              <a href="mailto:info@samnewyork.com" className="btn-secondary">
                Email Us
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>
    </main>
  );
}
