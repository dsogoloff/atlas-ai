import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Home } from '@/pages/Home';
import { WhySAM } from '@/pages/WhySAM';
import { Programs } from '@/pages/Programs';
import { SingaporeMath } from '@/pages/SingaporeMath';
import { Testimonials } from '@/pages/Testimonials';
import { About } from '@/pages/About';
import { FAQ } from '@/pages/FAQ';
import { Blog } from '@/pages/Blog';
import { JoinWaitlist } from '@/pages/JoinWaitlist';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/why-sam" element={<WhySAM />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/singapore-math" element={<SingaporeMath />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/join-waitlist" element={<JoinWaitlist />} />
            <Route path="/book-assessment" element={<JoinWaitlist />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
