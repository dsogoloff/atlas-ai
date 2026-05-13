import { Link } from 'react-router-dom';
import { Check, BookOpen, Users, Lightbulb, Target } from 'lucide-react';
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';

const methodologySteps = [
  {
    title: 'Concrete',
    description: 'Students use physical manipulatives like blocks, counters, and other hands-on materials to understand mathematical concepts.',
    icon: Users,
  },
  {
    title: 'Pictorial',
    description: 'Students transition to drawing diagrams and visual representations, including the famous bar model method.',
    icon: BookOpen,
  },
  {
    title: 'Abstract',
    description: 'Students work with numbers and symbols, having built a deep conceptual understanding through concrete and pictorial stages.',
    icon: Lightbulb,
  },
];

const heuristics = [
  'Draw a diagram',
  'Make a systematic list',
  'Use equations',
  'Guess and check',
  'Look for patterns',
  'Work backwards',
  'Simplify the problem',
  'Solve part of the problem',
  'Draw a table',
  'Make suppositions',
  'Use before-after concept',
  'Restate the problem',
];

const awardImages = [
  { src: '/images/awards/award-2013-psme.png', alt: 'Promising SME 500 Award Singapore 2013' },
  { src: '/images/awards/award-2013-pw.jpg', alt: 'Best Math Program Award Singapore 2013' },
  { src: '/images/awards/award-2015-rc.jpg', alt: 'Best Math Program Award Malaysia 2015' },
  { src: '/images/awards/award-2016-fla.jpg', alt: 'FLA Franchise Award Singapore 2016' },
  { src: '/images/awards/award-2017-yp.jpg', alt: 'Best Math Program Award Singapore 2017' },
  { src: '/images/awards/award-2017-dbd.png', alt: 'DBD Franchise Quality Award Thailand 2017' },
  { src: '/images/awards/award-2020-tnap.png', alt: 'Best Math Program Award Singapore 2020' },
  { src: '/images/awards/award-2023-mh.png', alt: 'Best Math Program Award Malaysia 2023' },
  { src: '/images/awards/award-2024-tap.png', alt: 'Best Math Program Award Singapore 2024' },
];

export function WhySAM() {
  return (
    <main className="pt-[70px]">
      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Choose S.A.M?
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              The world's most effective math program, built on the Singapore Math methodology
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* CPA Methodology Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              The CPA Approach
            </h2>
            <p className="text-[#7F8C8D] max-w-3xl mx-auto">
              Highly effective 3-stage approach for students to learn and understand math concepts.
              Fun and hands-on activities are used to introduce new topics in an engaging and meaningful way.
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {methodologySteps.map((step, index) => (
              <StaggerItem key={index}>
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#D6EAF8] rounded-full flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-10 h-10 text-[#1A5276]" />
                  </div>
                  <h3 className="text-2xl font-semibold text-[#1A5276] mb-3">{step.title}</h3>
                  <p className="text-[#333333]">{step.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Problem Solving Heuristics */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <SectionReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
                20 Problem-Solving Heuristics
              </h2>
              <p className="text-[#333333] mb-6">
                S.A.M students learn a comprehensive set of problem-solving strategies that help them
                tackle even the most challenging word problems with confidence.
              </p>
              <p className="text-[#333333] mb-6">
                The bar model method, one of our most powerful tools, allows students to visualize
                complex relationships and transform abstract problems into manageable visual representations.
              </p>
              <Link to="/programs" className="btn-primary inline-block">
                Explore Our Programs
              </Link>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-[#1A5276] mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6 text-[#E67E22]" />
                  Heuristics Your Child Will Master
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {heuristics.map((heuristic, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-[#333333] text-sm">{heuristic}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <span className="text-[#7F8C8D] text-sm italic">and others...</span>
                  </div>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Recognized Excellence
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              S.A.M has received numerous awards and recognition for our innovative approach to math education
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-4">
            {awardImages.map((award, index) => (
              <StaggerItem key={index}>
                <div className="flex items-center justify-center">
                  <img
                    src={award.src}
                    alt={award.alt}
                    className="w-full max-w-[100px] h-auto object-contain hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* TIMSS Results */}
      <section className="section-padding bg-[#1A5276]">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <SectionReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Singapore Ranked #1 in Math
              </h2>
              <p className="text-white/80 mb-6">
                In the Trends in International Mathematics and Science Study (TIMSS),
                Singapore has consistently ranked among the top countries in mathematics education.
              </p>
              <p className="text-white/80 mb-6">
                The Singapore Math curriculum, which forms the foundation of S.A.M's program,
                has been proven to produce exceptional results year after year.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#E67E22]">#1</div>
                  <div className="text-white/70 text-sm">Global Ranking</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#E67E22]">20+</div>
                  <div className="text-white/70 text-sm">Years at Top</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#E67E22]">60+</div>
                  <div className="text-white/70 text-sm">Countries Using</div>
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-xl font-semibold text-[#1A5276] mb-4">
                  TIMSS Math Scores 2023 (Grade 4)
                </h3>
                <div className="space-y-4">
                  {[
                    { country: 'Singapore', score: 615, color: '#E67E22' },
                    { country: 'Taiwan', score: 607, color: '#1A5276' },
                    { country: 'S. Korea', score: 594, color: '#7F8C8D' },
                    { country: 'United States', score: 517, color: '#7F8C8D' },
                  ].map((item) => (
                    <div key={item.country}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[#333333] font-medium">{item.country}</span>
                        <span className="text-[#1A5276] font-semibold">{item.score}</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${(item.score / 650) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#7F8C8D] mt-4">
                  Source: TIMSS 2023 International Results in Mathematics
                </p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-[#F8FAFC]">
        <div className="container-custom text-center">
          <SectionReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Ready to Give Your Child the S.A.M Advantage?
            </h2>
            <p className="text-[#7F8C8D] text-lg mb-8 max-w-2xl mx-auto">
              Book a free assessment and see how our proven methodology can help your child excel in math
            </p>
            <Link to="/join-waitlist" target="_blank" className="btn-primary text-lg px-10 py-4">
              Join the waitlist
            </Link>
          </SectionReveal>
        </div>
      </section>
    </main>
  );
}
