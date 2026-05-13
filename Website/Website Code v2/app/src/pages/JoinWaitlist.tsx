import { useState, useEffect } from 'react';
import { SectionReveal } from '@/components/SectionReveal';
import { Mail, CheckCircle } from 'lucide-react';

function getQueryParam(name: string): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name) || '';
}

export function JoinWaitlist() {
  const [submitted, setSubmitted] = useState(false);

  // Hidden UTM fields
  const [utmData] = useState({
    utm_source: getQueryParam('utm_source'),
    utm_medium: getQueryParam('utm_medium'),
    utm_campaign: getQueryParam('utm_campaign'),
    utm_content: getQueryParam('utm_content'),
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    landing_page: typeof window !== 'undefined' ? window.location.href : '',
  });

  // Update landing page on mount
  useEffect(() => {
    utmData.landing_page = window.location.href;
    utmData.referrer = document.referrer;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally send the data to your backend
    // console.log('Form submitted with UTM data:', utmDataState);
    setSubmitted(true);
  };

  return (
    <main className="pt-[70px]">
      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Join the Waitlist
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Be the first to know when S.A.M opens in Manhattan. No commitment, just updates.
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Form Section */}
      <section className="section-padding bg-white">
        <div className="container-custom max-w-xl">
          <SectionReveal>
            {submitted ? (
              <div className="bg-[#D6EAF8] rounded-xl p-10 text-center">
                <CheckCircle className="w-16 h-16 text-[#1A5276] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#1A5276] mb-3">
                  You're on the list!
                </h2>
                <p className="text-[#333333]">
                  We'll be in touch as we get closer to opening in Manhattan.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-[#F8FAFC] rounded-xl p-8">
                {/* Hidden UTM fields */}
                <input type="hidden" name="utm_source" value={utmData.utm_source} />
                <input type="hidden" name="utm_medium" value={utmData.utm_medium} />
                <input type="hidden" name="utm_campaign" value={utmData.utm_campaign} />
                <input type="hidden" name="utm_content" value={utmData.utm_content} />
                <input type="hidden" name="referrer" value={utmData.referrer} />
                <input type="hidden" name="landing_page" value={utmData.landing_page} />

                <div className="space-y-6">
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#333333] mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7F8C8D]" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        className="w-full pl-10 pr-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276] bg-white"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  {/* Parent First Name */}
                  <div>
                    <label htmlFor="parentName" className="block text-sm font-medium text-[#333333] mb-2">
                      Parent First Name *
                    </label>
                    <input
                      type="text"
                      id="parentName"
                      name="parentName"
                      required
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276] bg-white"
                      placeholder="First name"
                    />
                  </div>

                  {/* Child's Grade Level */}
                  <div>
                    <label htmlFor="gradeLevel" className="block text-sm font-medium text-[#333333] mb-2">
                      Child's Grade Level *
                    </label>
                    <select
                      id="gradeLevel"
                      name="gradeLevel"
                      required
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276] bg-white"
                    >
                      <option value="">Select grade level</option>
                      <option value="pre-k">Pre-K</option>
                      <option value="kindergarten">Kindergarten</option>
                      <option value="1">Grade 1</option>
                      <option value="2">Grade 2</option>
                      <option value="3">Grade 3</option>
                      <option value="4">Grade 4</option>
                      <option value="5">Grade 5</option>
                      <option value="6">Grade 6</option>
                      <option value="7">Grade 7</option>
                      <option value="8">Grade 8</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Optional Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-[#333333] mb-2">
                      Anything you'd like us to know? <span className="text-[#7F8C8D] font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={3}
                      className="w-full px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276] bg-white resize-none"
                      placeholder="Tell us a bit about your child..."
                    />
                  </div>

                  {/* Submit */}
                  <button type="submit" className="btn-primary w-full">
                    Join the Waitlist
                  </button>

                  {/* Consent line */}
                  <p className="text-xs text-[#7F8C8D] text-center">
                    We'll email you launch updates and occasional articles on the method. Unsubscribe anytime.
                  </p>
                </div>
              </form>
            )}
          </SectionReveal>
        </div>
      </section>
    </main>
  );
}
