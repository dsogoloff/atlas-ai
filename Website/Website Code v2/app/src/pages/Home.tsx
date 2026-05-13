import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Check, X, Quote, MapPin, Star, ExternalLink } from 'lucide-react';
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';
import { StatCounter } from '@/components/StatCounter';
import { testimonials } from '@/data/testimonials';
import { programs } from '@/data/programs';
import { blogPosts } from '@/data/blog';

const heroSlides = [
  {
    id: 1,
    image: '/images/hero/hero-1.jpg',
    title: "The World's #1 Singapore Math Program – Now in New York",
    cta: { text: 'Join the waitlist', href: '/join-waitlist' },
  },
  {
    id: 2,
    image: '/images/hero/hero-2.jpg',
    title: 'Give Your Child the #1 Math Advantage in the World',
    cta: { text: 'Learn Why Singapore Math', href: '/singapore-math' },
  },
  {
    id: 3,
    image: '/images/hero/hero-3.jpg',
    title: 'Singapore Math for Ages 4–14 in Manhattan',
    cta: { text: 'View Programs', href: '/programs' },
  },
];

const comparisonFeatures = [
  { feature: 'Teaching Approach', sam: 'Problem-solving emphasis', others: 'Memorization and drilling' },
  { feature: 'Learning Method', sam: 'CPA (Concrete-Pictorial-Abstract)', others: 'Lecture-based' },
  { feature: 'Trainer Style', sam: 'Coaching approach', others: 'Tell-and-give-knowledge' },
  { feature: 'Learning Plan', sam: 'Individual learning plan', others: 'One-size-fits-all' },
  { feature: 'Class Size', sam: 'Low ratio (max 5)', others: 'Large groups' },
];

const benefitCards = [
  {
    title: 'Strong Foundation',
    description: 'Build solid math understanding through conceptual learning that lasts a lifetime.',
  },
  {
    title: 'Confident and Motivated',
    description: 'Children develop confidence through guided discovery and positive reinforcement.',
  },
  {
    title: 'Independent and Self-Disciplined',
    description: 'Good study habits that foster lifelong learning and academic success.',
  },
  {
    title: 'Prepared for the Future',
    description: 'Critical thinking skills that extend far beyond the math classroom.',
  },
];

const localPartners = [
  { name: 'Kids Corner Bookstore', category: 'Bookstore' },
  { name: 'Little Gym Upper West Side', category: 'Fitness' },
  { name: 'West Side Pediatrics', category: 'Healthcare' },
  { name: 'Manhattan Toy Library', category: 'Library' },
];

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <main>
      {/* Hero Section */}
      <section className="relative h-screen min-h-[600px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroSlides[currentSlide].image})` }}
            />
            <div className="absolute inset-0 bg-black/50" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 h-full flex items-center">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl"
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  {heroSlides[currentSlide].title}
                </h1>
                <Link
                  to={heroSlides[currentSlide].cta.href}
                  className="btn-primary inline-block"
                >
                  {heroSlides[currentSlide].cta.text}
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Slide Navigation */}
        <div className="absolute bottom-8 left-0 right-0 z-10">
          <div className="container-custom flex items-center justify-between">
            <div className="flex gap-2">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={prevSlide}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={nextSlide}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Counter Bar */}
      <section className="bg-[#1A5276] py-12 md:py-16">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <StatCounter value={15} suffix="+" label="Years" delay={0} />
            <StatCounter value={20} suffix="+" label="Countries" delay={200} />
            <StatCounter value={200} suffix="+" label="Centers" delay={400} />
            <StatCounter value={30000} suffix="+" label="Students" delay={600} />
          </div>
          <p className="text-center text-white/80 text-lg">
            The world's largest Singapore Math enrichment program, now in New York
          </p>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Let Your Child Enjoy And Excel In Math
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              Since 2010, multi-award-winning S.A.M has helped children aged 4–12 develop knowledge, 
              skills, and a positive attitude toward learning to succeed in school and beyond.
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {benefitCards.map((card, index) => (
              <StaggerItem key={index}>
                <div className="bg-[#D6EAF8] rounded-xl p-6 h-full hover:shadow-lg transition-shadow duration-300">
                  <h3 className="text-xl font-semibold text-[#1A5276] mb-3">{card.title}</h3>
                  <p className="text-[#333333]">{card.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <SectionReveal className="text-center mt-8" delay={0.4}>
            <Link
              to="/why-sam"
              className="inline-flex items-center gap-2 text-[#1A5276] font-semibold hover:gap-3 transition-all"
            >
              Learn More <ArrowRight className="w-5 h-5" />
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* Programs Overview Section */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">Our Programs</h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              Tailored math enrichment programs designed for every age and skill level
            </p>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {programs.map((program) => (
              <StaggerItem key={program.id}>
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                  <div className="overflow-hidden">
                    <img
                      src={program.image}
                      alt={program.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-sm text-[#E67E22] font-medium">{program.ageRange}</span>
                    <h3 className="text-lg font-semibold text-[#1A5276] mt-1 mb-2">{program.title}</h3>
                    <p className="text-[#7F8C8D] text-sm mb-4 flex-1">{program.description}</p>
                    <Link
                      to="/programs"
                      className="inline-flex items-center gap-1 text-[#1A5276] font-medium text-sm hover:gap-2 transition-all"
                    >
                      Learn More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              How S.A.M Compares to Traditional Math Tutoring
            </h2>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="overflow-x-auto">
              <table className="w-full max-w-4xl mx-auto">
                <thead>
                  <tr className="border-b-2 border-[#1A5276]">
                    <th className="text-left py-4 px-4 text-[#333333] font-semibold">Feature</th>
                    <th className="text-center py-4 px-4 bg-[#1A5276] text-white font-semibold rounded-t-lg">S.A.M</th>
                    <th className="text-center py-4 px-4 text-[#7F8C8D] font-semibold">Others</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-4 px-4 text-[#333333]">{item.feature}</td>
                      <td className="py-4 px-4 bg-[#D6EAF8]/30 text-center">
                        <div className="flex items-center justify-center gap-2 text-[#1A5276]">
                          <Check className="w-5 h-5 text-green-500" />
                          <span className="font-medium">{item.sam}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-[#7F8C8D]">
                        <div className="flex items-center justify-center gap-2">
                          <X className="w-5 h-5 text-red-400" />
                          <span>{item.others}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding bg-[#D6EAF8]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              What Parents Say
            </h2>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.slice(0, 3).map((testimonial) => (
              <StaggerItem key={testimonial.id}>
                <div className="bg-white rounded-xl p-6 shadow-sm h-full">
                  <Quote className="w-8 h-8 text-[#E67E22] mb-4" />
                  <p className="text-[#333333] mb-4 italic">"{testimonial.quote}"</p>
                  <div className="mt-auto">
                    <p className="font-semibold text-[#1A5276]">{testimonial.author}</p>
                    <p className="text-sm text-[#7F8C8D]">{testimonial.childInfo}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <SectionReveal className="text-center mt-8" delay={0.4}>
            <Link
              to="/testimonials"
              className="inline-flex items-center gap-2 text-[#1A5276] font-semibold hover:gap-3 transition-all"
            >
              Read All Testimonials <ArrowRight className="w-5 h-5" />
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* Google Reviews Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Google Reviews
            </h2>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-6 h-6 text-[#E67E22]" fill="#E67E22" />
              ))}
            </div>
            <p className="text-[#7F8C8D]">
              <span className="font-semibold text-[#1A5276]">4.8 (351)</span> out of 5 based on reviews from U.S. families
            </p>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="bg-[#F8FAFC] rounded-xl p-8 max-w-2xl mx-auto text-center">
              <p className="text-[#333333] mb-6">
                We're building our Google Reviews! Be one of the first to share your S.A.M experience 
                and help other New York families discover the benefits of Singapore Math.
              </p>
              <a
                href="https://business.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#1A5276] font-semibold hover:text-[#E67E22] transition-colors"
              >
                Leave a Review on Google <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Video Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              See How Singapore Math Works
            </h2>
            <p className="text-[#7F8C8D] max-w-2xl mx-auto">
              Discover the CPA approach that has made Singapore Math the world's most effective math curriculum
            </p>
          </SectionReveal>

          <SectionReveal delay={0.2}>
            <div className="max-w-3xl mx-auto">
              <div className="relative aspect-video rounded-xl overflow-hidden">
                <iframe
                  src="https://www.youtube.com/embed/BwTg_KR5uk4"
                  title="See How Singapore Math Works"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Local Context Section */}
      <section className="section-padding bg-[#F8FAFC]">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">
              Serving Families Across New York
            </h2>
          </SectionReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SectionReveal>
              <div className="bg-white rounded-xl p-6">
                <h3 className="text-xl font-semibold text-[#1A5276] mb-4">Our Flagship Center</h3>
                <div className="bg-[#D6EAF8] rounded-lg p-4 mb-4">
                  <p className="text-[#1A5276] font-medium text-lg">1161 First Avenue</p>
                  <p className="text-[#333333]">New York, NY 10065</p>
                  <a href="tel:+12125551234" className="text-[#E67E22] font-medium">(212) 555-1234</a>
                </div>

                <h3 className="text-xl font-semibold text-[#1A5276] mt-6 mb-4">Hours</h3>
                <div className="space-y-2 text-[#333333]">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>3:00 PM - 7:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>Closed</span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-[#1A5276] mt-6 mb-4">Our Local Partners</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {localPartners.map((partner) => (
                    <div key={partner.name} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#1A5276]" />
                      <div>
                        <span className="text-[#333333] text-sm">{partner.name}</span>
                        <span className="text-[#7F8C8D] text-xs block">{partner.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-white rounded-xl p-6 h-full">
                <h3 className="text-xl font-semibold text-[#1A5276] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Visit Our Center
                </h3>
                <div className="aspect-video rounded-lg overflow-hidden mb-4">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3021.5!2d-73.9598!3d40.7635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQ1JzQ4LjYiTiA3M8KwNTcnMzUuMyJX!5e0!3m2!1sen!2sus!4v1609459200000!5m2!1sen!2sus&q=1161+First+Avenue+New+York+NY+10065"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="S.A.M New York - 1161 First Avenue"
                  />
                </div>
                <p className="text-[#333333] text-center">
                  1161 First Avenue<br />
                  New York, NY 10065
                </p>
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary mt-4 w-full text-center block"
                >
                  Get Directions
                </a>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* Blog Preview Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1A5276] mb-4">Latest from the Blog</h2>
          </SectionReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogPosts.map((post) => (
              <StaggerItem key={post.id}>
                <article className="bg-[#F8FAFC] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 group">
                  <div className="overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-medium text-[#E67E22] bg-[#E67E22]/10 px-2 py-1 rounded">
                        {post.category}
                      </span>
                      <span className="text-xs text-[#7F8C8D]">{post.date}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-[#1A5276] mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-[#7F8C8D] text-sm line-clamp-3 mb-4">{post.excerpt}</p>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-[#1A5276] font-medium text-sm hover:gap-2 transition-all"
                    >
                      Read More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <SectionReveal className="text-center mt-8" delay={0.4}>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-[#1A5276] font-semibold hover:gap-3 transition-all"
            >
              View All Articles <ArrowRight className="w-5 h-5" />
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="bg-[#1A5276] py-16 md:py-20">
        <div className="container-custom text-center">
          <SectionReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Give Your Child a Head Start
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Book a free assessment today and discover how S.A.M can help your child excel in math
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
