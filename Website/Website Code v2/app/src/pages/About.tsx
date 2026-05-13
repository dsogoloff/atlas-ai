import { Award, BookOpen, Users, Heart, Target, Globe } from 'lucide-react';
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';

const milestones = [
  {
    year: '2010',
    events: [{ text: 'S.A.M. is founded and starts program R&D' }],
  },
  {
    year: '2012',
    events: [{ text: 'Opens 1st center in Singapore' }],
  },
  {
    year: '2013',
    events: [
      { text: 'Opens 1st overseas center in Thailand' },
      { text: 'Promising SME 500 Award SG', isAward: true },
      { text: 'Best Math Program Award SG', isAward: true },
    ],
  },
  {
    year: '2014',
    events: [{ text: 'Best Math Program Award IN', isAward: true }],
  },
  {
    year: '2015',
    events: [{ text: 'Best Math Program Award MY', isAward: true }],
  },
  {
    year: '2016',
    events: [
      { text: 'Opens 100th center, is in 12 countries' },
      { text: 'FLA Franchise Award SG', isAward: true },
    ],
  },
  {
    year: '2017',
    events: [
      { text: 'DBD Franchise Quality Award TH', isAward: true },
      { text: 'Best Math Program Award SG', isAward: true },
    ],
  },
  {
    year: '2018',
    events: [{ text: 'Best Math Program Award IN', isAward: true }],
  },
  {
    year: '2020',
    events: [
      { text: 'Opens 200th center, is in 20 countries' },
      { text: 'Best Math Program Award SG', isAward: true },
    ],
  },
  {
    year: '2023',
    events: [
      { text: 'Best Math Program Award MY', isAward: true },
      { text: 'GE Franchise Founders Award USA', isAward: true },
    ],
  },
  {
    year: '2024',
    events: [{ text: 'Best Math Program Award SG', isAward: true }],
  },
  {
    year: '2025',
    events: [{ text: 'ABO Education Franchise Award SG', isAward: true }],
  },
  {
    year: '2026',
    events: [{ text: 'Launched in New York City' }],
  },
];

const values = [
  {
    title: 'Excellence',
    description: 'We strive for the highest standards in everything we do, from curriculum development to student support.',
    icon: Award,
  },
  {
    title: 'Individualized Learning',
    description: 'Every child is unique, and we tailor our approach to meet each student\'s specific needs and pace.',
    icon: Users,
  },
  {
    title: 'Passion for Math',
    description: 'We believe math can be enjoyable and work to instill a genuine love for learning in every student.',
    icon: Heart,
  },
  {
    title: 'Continuous Growth',
    description: 'Learning is a lifelong journey, and we\'re committed to helping students develop growth mindsets.',
    icon: Target,
  },
];

export function About() {
  return (
    <main className="pt-[70px]">
      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              About S.A.M New York
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Bringing the world's most effective math program to families across New York City
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <SectionReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
                Our Mission
              </h2>
              <p className="text-[#333333] mb-4">
                At S.A.M New York, our mission is to empower every child with the mathematical
                foundation and problem-solving skills they need to succeed in school and beyond.
                We believe that with the right approach, every child can excel in math.
              </p>
              <p className="text-[#333333] mb-4">
                We are committed to making the renowned Singapore Math methodology accessible
                to New York families, helping children develop not just computational skills,
                but deep conceptual understanding and critical thinking abilities.
              </p>
              <p className="text-[#333333]">
                Our goal is to transform the way children experience math—from a source of
                anxiety to a source of confidence and joy.
              </p>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-[#D6EAF8] rounded-xl p-6">
                <h3 className="text-xl font-semibold text-[#1A5276] mb-3">
                  Why We Do What We Do
                </h3>
                <p className="text-[#333333]">
                  Every child deserves to feel confident in their mathematical abilities.
                  When we help a child understand math deeply, we're not just improving their
                  grades—we're opening doors to their future.
                </p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Our Values
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              The principles that guide everything we do at S.A.M New York
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <StaggerItem key={index}>
                <div className="bg-white rounded-xl p-6 text-center h-full">
                  <div className="w-16 h-16 bg-[#D6EAF8] rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-[#1A5276]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A5276] mb-2">{value.title}</h3>
                  <p className="text-[#7F8C8D] text-sm">{value.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Certifications */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Certifications & Training
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              Our trainers are certified professionals with extensive training in Singapore Math methodology
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'S.A.M Certified', desc: 'Complete S.A.M trainer certification program' },
              { title: 'Singapore Math', desc: 'Training in CPA methodology' },
              { title: 'Child Development', desc: 'Understanding age-appropriate learning' },
              { title: 'Continuous Ed', desc: 'Ongoing professional development' },
            ].map((cert, index) => (
              <StaggerItem key={index}>
                <div className="bg-white rounded-xl p-6 text-center">
                  <BookOpen className="w-10 h-10 text-[#E67E22] mx-auto mb-3" />
                  <h3 className="font-semibold text-[#1A5276] mb-1">{cert.title}</h3>
                  <p className="text-[#7F8C8D] text-sm">{cert.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* History Timeline */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Our Journey
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              From a single center in Singapore to a global network of over 200 centers
            </p>
          </SectionReveal>

          <div className="max-w-3xl mx-auto">
            {milestones.map((milestone, index) => (
              <SectionReveal key={index} delay={index * 0.05}>
                <div className="flex gap-6 mb-2 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-sm bg-[#1A5276]">
                      {milestone.year}
                    </div>
                    {index < milestones.length - 1 && (
                      <div className="w-0.5 h-full bg-[#D6EAF8] mt-2" />
                    )}
                  </div>
                  <div className="pb-4 pt-2">
                    {milestone.events.map((event, eIdx) => (
                      <div key={eIdx} className={`mb-1 ${event.isAward ? 'text-sm italic text-[#E67E22]' : 'text-[#333333]'}`}>
                        {event.text}
                      </div>
                    ))}
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Global Network */}
      <section className="section-padding bg-[#1A5276]">
        <div className="container-custom text-center">
          <SectionReveal>
            <Globe className="w-16 h-16 text-[#E67E22] mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Part of a Global Network
            </h2>
            <p className="text-white/80 max-w-3xl mx-auto mb-8">
              S.A.M New York is proud to be part of Seriously Addictive Mathematics,
              the world's largest Singapore Math enrichment program with over 200 centers
              in more than 20 countries.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {[
                { value: '200+', label: 'Centers' },
                { value: '20+', label: 'Countries' },
                { value: '30,000+', label: 'Students' },
                { value: '15+', label: 'Years' },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-[#E67E22]">{stat.value}</div>
                  <div className="text-white/70 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>
    </main>
  );
}
