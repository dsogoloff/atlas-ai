import { Check } from 'lucide-react';
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';
import { programs } from '@/data/programs';

export function Programs() {
  // Course Schema for each program
  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "S.A.M Singapore Math Programs",
    "description": "Comprehensive math enrichment programs based on the Singapore Math curriculum for children ages 4-14",
    "provider": {
      "@type": "Organization",
      "name": "S.A.M New York",
      "sameAs": "https://samnewyork.com"
    },
    "hasCourseInstance": programs.map(program => ({
      "@type": "CourseInstance",
      "name": program.title,
      "description": program.description,
      "courseMode": ["onsite", "online"],
      "instructor": {
        "@type": "Person",
        "name": "S.A.M Certified Trainer"
      }
    })),
    "offers": {
      "@type": "Offer",
      "price": "299",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <main className="pt-[70px]">
      {/* Course Schema Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }}
      />

      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Our Programs
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Comprehensive math enrichment programs designed for every age and skill level
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Programs Grid */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Programs by Grade Level
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              Each program is carefully designed to build upon previous knowledge while introducing new concepts at the right pace
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {programs.map((program) => (
              <StaggerItem key={program.id}>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="h-64 sm:h-full">
                      <img
                        src={program.image}
                        alt={program.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6">
                      <span className="text-sm text-[#E67E22] font-medium">{program.ageRange}</span>
                      <h3 className="text-xl font-semibold text-[#1A5276] mt-1 mb-3">{program.title}</h3>
                      <p className="text-[#7F8C8D] text-sm mb-4">{program.description}</p>
                      <div className="space-y-2">
                        {program.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-[#333333] text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Curriculum Compatibility */}
      <section className="section-padding bg-[#1A5276]">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <SectionReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Complements All School Curricula
              </h2>
              <p className="text-white/80 mb-6">
                S.A.M's Singapore Math program is designed to enhance and complement what your child 
                learns in school, regardless of whether they attend public, private, charter, or homeschool.
              </p>
              <div className="space-y-3">
                {['Public Schools', 'Private Schools', 'Charter Schools', 'Homeschool Programs'].map((type) => (
                  <div key={type} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-[#E67E22]" />
                    <span className="text-white">{type}</span>
                  </div>
                ))}
              </div>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-xl font-semibold text-[#1A5276] mb-4">
                  Why S.A.M Works Alongside School
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <div className="w-8 h-8 bg-[#D6EAF8] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#1A5276] font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#333333]">Deeper Understanding</h4>
                      <p className="text-[#7F8C8D] text-sm">We focus on conceptual mastery, not just procedures</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-8 h-8 bg-[#D6EAF8] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#1A5276] font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#333333]">Problem-Solving Skills</h4>
                      <p className="text-[#7F8C8D] text-sm">Heuristics that apply to any math curriculum</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-8 h-8 bg-[#D6EAF8] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#1A5276] font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#333333]">Individualized Pace</h4>
                      <p className="text-[#7F8C8D] text-sm">Each student progresses at their optimal speed</p>
                    </div>
                  </li>
                </ul>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>
    </main>
  );
}
