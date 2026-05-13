import { Check, Clock, Users, FileText, Star, Phone, Calendar, MapPin } from 'lucide-react';
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';

const whatToExpect = [
  {
    title: 'Comprehensive Evaluation',
    description: 'Your child will work through a series of age-appropriate math problems that assess their current skill level.',
    icon: FileText,
  },
  {
    title: 'Learning Style Assessment',
    description: 'We observe how your child approaches problems to understand their unique learning style.',
    icon: Users,
  },
  {
    title: 'Parent Consultation',
    description: 'You\'ll receive a detailed report and personalized recommendations for your child\'s learning path.',
    icon: Star,
  },
];

const benefits = [
  'Identify your child\'s strengths and areas for improvement',
  'Understand your child\'s learning style',
  'Receive a personalized learning plan',
  'Learn how S.A.M can help your child excel',
  'No obligation to enroll',
];

export function BookAssessment() {
  // Event Schema for Assessment
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": "Free Math Assessment - S.A.M New York",
    "description": "A comprehensive, no-obligation assessment to discover your child's math potential and create a personalized learning plan.",
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/MixedEventAttendanceMode",
    "organizer": {
      "@type": "Organization",
      "name": "S.A.M New York",
      "url": "https://samnewyork.com"
    },
    "location": [
      {
        "@type": "Place",
        "name": "S.A.M New York Center",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "1161 First Avenue",
          "addressLocality": "New York",
          "addressRegion": "NY",
          "postalCode": "10065",
          "addressCountry": "US"
        }
      },
      {
        "@type": "VirtualLocation",
        "url": "https://samnewyork.com/book-assessment"
      }
    ],
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "validFrom": "2026-04-01",
      "description": "Free assessment with no obligation to enroll"
    }
  };

  return (
    <main className="pt-[70px]">
      {/* Event Schema Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />

      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Book a Free Assessment
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Discover your child's math potential with our comprehensive, no-obligation assessment
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* What to Expect */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              What to Expect
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              Our assessment is designed to be a positive, stress-free experience for your child
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {whatToExpect.map((item, index) => (
              <StaggerItem key={index}>
                <div className="text-center">
                  <div className="w-20 h-20 bg-[#D6EAF8] rounded-full flex items-center justify-center mx-auto mb-6">
                    <item.icon className="w-10 h-10 text-[#1A5276]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1A5276] mb-3">{item.title}</h3>
                  <p className="text-[#333333]">{item.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Assessment Details */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <SectionReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-6">
                Assessment Details
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#D6EAF8] rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-[#1A5276]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A5276] mb-1">Duration</h3>
                    <p className="text-[#333333]">45-60 minutes, depending on your child's age and pace</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#D6EAF8] rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-[#1A5276]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A5276] mb-1">Who Should Attend</h3>
                    <p className="text-[#333333]">Both parent and child. Parents participate in the consultation portion.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#D6EAF8] rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-[#1A5276]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A5276] mb-1">Location</h3>
                    <p className="text-[#333333]">At our Manhattan center or online via video call</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#D6EAF8] rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-[#1A5276]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A5276] mb-1">Scheduling</h3>
                    <p className="text-[#333333]">Available Monday-Saturday. Book online or call us.</p>
                  </div>
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-white rounded-xl p-8 shadow-sm">
                <h3 className="text-2xl font-semibold text-[#1A5276] mb-6">
                  Benefits of the Assessment
                </h3>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[#333333]">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-[#D6EAF8] rounded-lg">
                  <p className="text-[#1A5276] font-medium text-center">
                    The assessment is completely free with no obligation to enroll
                  </p>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="max-w-2xl mx-auto">
            <div className="bg-[#F8FAFC] rounded-xl p-8">
              <h2 className="text-3xl font-bold text-[#1A5276] mb-2 text-center">
                Book Your Assessment
              </h2>
              <p className="text-[#7F8C8D] text-center mb-8">
                Fill out the form below and we'll contact you to schedule
              </p>

              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Parent's Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Child's Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
                      placeholder="Emma Smith"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
                      placeholder="(212) 555-1234"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Child's Age *
                    </label>
                    <select
                      required
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
                    >
                      <option value="">Select age</option>
                      <option value="4">4 years old</option>
                      <option value="5">5 years old</option>
                      <option value="6">6 years old</option>
                      <option value="7">7 years old</option>
                      <option value="8">8 years old</option>
                      <option value="9">9 years old</option>
                      <option value="10">10 years old</option>
                      <option value="11">11 years old</option>
                      <option value="12">12 years old</option>
                      <option value="13">13+ years old</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Preferred Format
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
                    >
                      <option value="in-person">In-Person at Center</option>
                      <option value="online">Online Video Call</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Message (Optional)
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
                    placeholder="Tell us about your child's current math experience or any questions you have..."
                  />
                </div>

                <button type="submit" className="btn-primary w-full">
                  Request Assessment
                </button>
              </form>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Contact Info */}
      <section className="section-padding bg-[#1A5276]">
        <div className="container-custom text-center">
          <SectionReveal>
            <h2 className="text-3xl font-bold text-white mb-6">
              Prefer to Call?
            </h2>
            <p className="text-white/80 mb-6">
              Our team is ready to answer your questions and help you schedule an assessment
            </p>
            <a
              href="tel:+12125551234"
              className="inline-flex items-center gap-3 bg-white text-[#1A5276] px-8 py-4 rounded-md font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              <Phone className="w-6 h-6" />
              (212) 555-1234
            </a>
          </SectionReveal>
        </div>
      </section>
    </main>
  );
}
