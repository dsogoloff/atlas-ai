import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Phone } from 'lucide-react';
import { useScrollPosition } from '@/hooks/useScrollPosition';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'Why S.A.M', href: '/why-sam' },
  { name: 'Programs', href: '/programs' },
  { name: 'Singapore Math', href: '/singapore-math' },
  { name: 'About', href: '/about' },
  { name: 'Blog', href: '/blog' },
  { name: 'FAQ', href: '/faq' },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isScrolled } = useScrollPosition();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // On non-home pages, always use white background (not transparent)
  const navHasSolidBg = isScrolled || !isHomePage;

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navHasSolidBg
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-transparent'
        }`}
      >
        <div className="container-custom">
          <nav className="flex items-center justify-between h-[70px]">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src="/images/sam-logo.png"
                alt="S.A.M New York"
                className="h-12 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`text-[15px] font-medium transition-colors duration-200 relative group ${
                    navHasSolidBg
                      ? isActive(link.href)
                        ? 'text-[#1A5276]'
                        : 'text-[#333333] hover:text-[#1A5276]'
                      : isActive(link.href)
                      ? 'text-white'
                      : 'text-white/90 hover:text-white'
                  }`}
                >
                  {link.name}
                  <span className={`absolute -bottom-1 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${
                    navHasSolidBg ? 'bg-[#1A5276]' : 'bg-white'
                  } ${isActive(link.href) ? 'w-full' : ''}`} />
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="hidden lg:flex items-center gap-4">
              <a
                href="tel:+12125551234"
                className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                  navHasSolidBg ? 'text-[#1A5276]' : 'text-white'
                }`}
              >
                <Phone className="w-4 h-4" />
                (212) 555-1234
              </a>
              <Link
                to="/join-waitlist"
                className="btn-primary text-sm py-2.5 px-5"
              >
                Join the waitlist
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2 transition-colors duration-200 ${
                navHasSolidBg ? 'text-[#1A5276]' : 'text-white'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="absolute right-0 top-0 h-full w-[280px] bg-white shadow-xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
            >
              <div className="p-6 pt-20">
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`text-lg font-medium block py-2 ${
                          isActive(link.href)
                            ? 'text-[#1A5276]'
                            : 'text-[#333333]'
                        }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </nav>
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <a
                    href="tel:+12125551234"
                    className="flex items-center gap-2 text-[#1A5276] font-medium mb-4"
                  >
                    <Phone className="w-5 h-5" />
                    (212) 555-1234
                  </a>
                  <Link
                    to="/join-waitlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary block text-center"
                  >
                    Join the waitlist
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
