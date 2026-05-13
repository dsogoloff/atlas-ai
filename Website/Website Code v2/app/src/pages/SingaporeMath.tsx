import { Link } from 'react-router-dom';
import { Check, TrendingUp, Brain, Lightbulb, Globe } from 'lucide-react';
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';

const whyItWorks = [
  {
    title: 'Focus on Mastery',
    description: 'Students spend more time on fewer topics, ensuring deep understanding before moving on.',
    icon: Brain,
  },
  {
    title: 'Visual Learning',
    description: 'The CPA approach makes abstract concepts concrete and accessible to all learners.',
    icon: Lightbulb,
  },
  {
    title: 'Problem-Solving First',
    description: 'Students learn to think critically and apply math to real-world situations.',
    icon: TrendingUp,
  },
  {
    title: 'Global Success',
    description: 'Used by over 60 countries and proven to produce top-performing students.',
    icon: Globe,
  },
];

const barModelExamples = [
  {
    problem: 'Tom has 24 apples. He gives away 8 apples. How many apples does Tom have left?',
    approach: 'Students draw a bar representing 24, divide it to show 8 given away, and see the remaining 16 visually.',
    image: '/images/barmodel/bar-model-1.png',
  },
  {
    problem: 'There are 3 times as many girls as boys in a class. If there are 12 boys, how many students are there?',
    approach: 'Students draw bars showing the ratio relationship, making the multiplicative structure visible.',
    image: '/images/barmodel/bar-model-2.png',
  },
];

export function SingaporeMath() {
  return (
    <main className="pt-[70px]">
      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              What is Singapore Math?
            </h1>
            <p className="text-white/80 text-lg max-w-3xl mx-auto">
              The world's most effective math curriculum, consistently producing top-performing students
              through a focus on deep conceptual understanding and problem-solving
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Introduction */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <SectionReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
                A Revolutionary Approach to Math Education
              </h2>
              <p className="text-[#333333] mb-4">
                Singapore Math is a teaching method based on the national mathematics curriculum of Singapore,
                which has consistently ranked at the top of international assessments like TIMSS and PISA.
              </p>
              <p className="text-[#333333] mb-4">
                Developed in the 1980s, this approach transformed Singapore from a country with mediocre math
                performance to one that produces the world's top math students. Today, it's used in over 60
                countries and has been adopted by leading schools worldwide.
              </p>
              <p className="text-[#333333]">
                The key to Singapore Math's success is its focus on mastery rather than memorization.
                Students don't just learn procedures—they understand why math works the way it does.
              </p>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-[#D6EAF8] rounded-xl p-6">
                <h3 className="text-xl font-semibold text-[#1A5276] mb-4">
                  Key Principles
                </h3>
                <div className="space-y-4">
                  {[
                    'Teach to mastery, not test preparation',
                    'Focus on problem-solving, not rote memorization',
                    'Use visual models to build understanding',
                    'Progress from concrete to abstract thinking',
                    'Develop mathematical thinking and communication',
                  ].map((principle, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-[#E67E22] flex-shrink-0 mt-0.5" />
                      <span className="text-[#333333]">{principle}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Why It Works */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Why Singapore Math Works
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              The research-backed principles that make Singapore Math the gold standard in mathematics education
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyItWorks.map((item, index) => (
              <StaggerItem key={index}>
                <div className="bg-white rounded-xl p-6 text-center h-full">
                  <div className="w-16 h-16 bg-[#D6EAF8] rounded-full flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-[#1A5276]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A5276] mb-2">{item.title}</h3>
                  <p className="text-[#7F8C8D] text-sm">{item.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Bar Model Method */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              The Bar Model Method
            </h2>
            <p className="text-[#7F8C8D] max-w-3xl mx-auto">
              One of Singapore Math's most powerful tools, the bar model method helps students visualize
              complex word problems and understand the relationships between quantities
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {barModelExamples.map((example, index) => (
              <SectionReveal key={index} delay={index * 0.2}>
                <div className="bg-[#F8FAFC] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#1A5276] mb-4">Example {index + 1}</h3>
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <p className="text-[#333333] font-medium mb-2">Problem:</p>
                    <p className="text-[#7F8C8D]">{example.problem}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 mb-4 border border-[#D6EAF8] flex items-center justify-center">
                    <img
                      src={example.image}
                      alt={`Bar model illustration for example ${index + 1}`}
                      className="w-full max-w-xs h-auto object-contain"
                    />
                  </div>
                  <div className="bg-[#D6EAF8] rounded-lg p-4">
                    <p className="text-[#1A5276] font-medium mb-2">Bar Model Approach:</p>
                    <p className="text-[#333333]">{example.approach}</p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>

          <SectionReveal className="text-center mt-8" delay={0.4}>
            <Link to="/programs" className="btn-primary">
              Explore Our Programs
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* TIMSS Rankings */}
      <section className="section-padding bg-[#1A5276]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Proven Results: TIMSS Rankings
            </h2>
            <p className="text-white/80 max-w-3xl mx-auto">
              The Trends in International Mathematics and Science Study (TIMSS) has consistently ranked
              Singapore at the top for mathematics achievement
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { year: '1995', rank: '#1', note: 'First TIMSS' },
              { year: '2003', rank: '#1', note: 'Continued Leadership' },
              { year: '2015', rank: '#1', note: 'Two Decades' },
              { year: '2023', rank: '#1', note: 'Still Top Tier' },
            ].map((item, index) => (
              <StaggerItem key={index}>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-[#E67E22] mb-2">{item.rank}</div>
                  <div className="text-white font-semibold mb-1">{item.year}</div>
                  <div className="text-white/60 text-sm">{item.note}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <SectionReveal className="text-center mt-8" delay={0.4}>
            <p className="text-white/60 text-sm">
              Source: TIMSS International Mathematics Reports
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-[#F8FAFC]">
        <div className="container-custom text-center">
          <SectionReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Give Your Child the Singapore Math Advantage
            </h2>
            <p className="text-[#7F8C8D] text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of families who have discovered the transformative power of Singapore Math
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
