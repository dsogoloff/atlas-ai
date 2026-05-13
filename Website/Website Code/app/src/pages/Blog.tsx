import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Tag } from 'lucide-react';
import { SectionReveal, StaggerContainer, StaggerItem } from '@/components/SectionReveal';
import { blogPosts } from '@/data/blog';

const categories = ['All', 'Singapore Math', 'Parenting Tips', 'Education', 'Student Spotlights'];

export function Blog() {
  return (
    <main className="pt-[70px]">
      {/* Hero Section */}
      <section className="bg-[#1A5276] py-16 md:py-24">
        <div className="container-custom text-center">
          <SectionReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              S.A.M Blog
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Insights, tips, and resources to help your child excel in math
            </p>
          </SectionReveal>
        </div>
      </section>

      {/* Categories */}
      <section className="py-6 bg-[#F8FAFC] border-b border-gray-200">
        <div className="container-custom">
          <SectionReveal>
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((category, index) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    index === 0
                      ? 'bg-[#1A5276] text-white'
                      : 'bg-white text-[#333333] hover:bg-[#D6EAF8]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <StaggerItem key={post.id}>
                <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 group h-full flex flex-col">
                  <div className="overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-xs text-[#E67E22] bg-[#E67E22]/10 px-2 py-1 rounded">
                        <Tag className="w-3 h-3" />
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#7F8C8D]">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-[#1A5276] mb-3 line-clamp-2 group-hover:text-[#E67E22] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-[#7F8C8D] mb-4 flex-1 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-2 text-[#1A5276] font-medium hover:gap-3 transition-all"
                    >
                      Read More <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-padding bg-[#D6EAF8]">
        <div className="container-custom">
          <SectionReveal className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-[#1A5276] mb-4">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-[#333333] mb-6">
              Get the latest math tips, parenting advice, and S.A.M updates delivered to your inbox
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1A5276]"
              />
              <button type="submit" className="btn-primary">
                Subscribe
              </button>
            </form>
          </SectionReveal>
        </div>
      </section>
    </main>
  );
}
