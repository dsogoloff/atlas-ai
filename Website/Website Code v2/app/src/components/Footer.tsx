import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Linkedin, MapPin, Phone, Mail } from 'lucide-react';

const footerLinks = {
  about: [
    { name: 'Home', href: '/' },
    { name: 'Why S.A.M', href: '/why-sam' },
    { name: 'About Us', href: '/about' },
    { name: 'Our Team', href: '/about' },
    { name: 'Careers', href: '#' },
  ],
  programs: [
    { name: 'Math Programs', href: '/programs' },
    { name: 'Pre-K & Kindergarten', href: '/programs' },
    { name: 'Grades 1-2', href: '/programs' },
    { name: 'Grades 3-6', href: '/programs' },
    { name: 'Grades 7-8', href: '/programs' },
  ],
  resources: [
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Testimonials', href: '/testimonials' },
    { name: 'Singapore Math', href: '/singapore-math' },
  ],
};

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
  { name: 'YouTube', icon: Youtube, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-[#1A1A2E] text-white">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-6">
              <img 
                src="/images/sam-logo.png" 
                alt="S.A.M New York"
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-white/70 mb-6 max-w-sm">
              Seriously Addictive Mathematics - The world's largest Singapore Math enrichment program, now in New York.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#E67E22] transition-colors duration-300"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* About Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">About S.A.M</h4>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Programs</h4>
            <ul className="space-y-3">
              {footerLinks.programs.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white/70 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#E67E22] mt-0.5 flex-shrink-0" />
                <span className="text-white/70">
                  1161 First Avenue<br />
                  New York, NY 10065
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#E67E22] flex-shrink-0" />
                <a href="tel:+12125551234" className="text-white/70 hover:text-white transition-colors">
                  (212) 555-1234
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#E67E22] flex-shrink-0" />
                <a href="mailto:info@samnewyork.com" className="text-white/70 hover:text-white transition-colors">
                  info@samnewyork.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Seriously Addictive Mathematics New York. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link to="#" className="text-white/50 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="#" className="text-white/50 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
