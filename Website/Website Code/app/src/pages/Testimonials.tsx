import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';
import { testimonials } from '@/data/testimonials';
import { Quote, Star } from 'lucide-react';

export function Testimonials() {
  return (
    <main className="pt-[70px]">
      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What Parents Say
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Real stories from Global SAM families who have experienced the S.A.M difference
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-[#D6EAF8]">
        <div className="container-custom">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '98%', label: 'Parent Satisfaction' },
              { value: '4.9', label: 'Average Rating' },
              { value: '500+', label: 'Global SAM Families' },
              { value: '85%', label: 'Referral Rate' },
            ].map((stat, index) => (
              <StaggerItem key={index}>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-[#1A5276]">{stat.value}</div>
                  <div className="text-[#7F8C8D] text-sm">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Parent Testimonials
            </h2>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 text-[#E67E22]" fill="#E67E22" />
              ))}
            </div>
            <p className="text-[#7F8C8D]">Rated 4.9 out of 5 by over 500 Global SAM families</p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <StaggerItem key={testimonial.id}>
                <div className="bg-[#F8FAFC] rounded-xl p-6 h-full flex flex-col">
                  <Quote className="w-10 h-10 text-[#E67E22] mb-4" />
                  <p className="text-[#333333] mb-6 flex-1 italic leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="mt-auto pt-4 border-t border-gray-200">
                    <p className="font-semibold text-[#1A5276]">{testimonial.author}</p>
                    <p className="text-sm text-[#7F8C8D]">{testimonial.childInfo}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Video Testimonials Placeholder */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Video Stories
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              Hear directly from parents and students about their S.A.M journey
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[1, 2].map((video) => (
              <SectionReveal key={video} delay={video * 0.2}>
                <div className="bg-[#1A5276] rounded-xl aspect-video flex items-center justify-center cursor-pointer hover:bg-[#1A5276]/90 transition-colors">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 5.84a.5.5 0 01.77-.42l7.15 4.16a.5.5 0 010 .84l-7.15 4.16a.5.5 0 01-.77-.42V5.84z" />
                      </svg>
                    </div>
                    <p className="font-medium">Coming Soon</p>
                    <p className="text-white/60 text-sm">Video testimonial {video}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
