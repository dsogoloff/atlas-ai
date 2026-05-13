export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  slug: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Understanding the Singapore Math Bar Model Method",
    excerpt: "Discover how visual representation helps children solve complex word problems with confidence and clarity. The bar model method is a powerful tool that transforms abstract problems into visual puzzles.",
    date: "April 1, 2026",
    category: "Singapore Math",
    image: "/images/blog/blog-1.jpg",
    slug: "singapore-math-bar-model-method"
  },
  {
    id: 2,
    title: "5 Ways to Make Math Fun at Home",
    excerpt: "Simple activities and games that reinforce mathematical thinking while creating positive associations with learning. Turn everyday moments into opportunities for mathematical discovery.",
    date: "March 28, 2026",
    category: "Parenting Tips",
    image: "/images/blog/blog-2.jpg",
    slug: "make-math-fun-at-home"
  },
  {
    id: 3,
    title: "Why Conceptual Understanding Beats Memorization",
    excerpt: "Research shows that children who understand the 'why' behind math concepts perform better and retain knowledge longer than those who simply memorize procedures.",
    date: "March 20, 2026",
    category: "Education",
    image: "/images/blog/blog-3.jpg",
    slug: "conceptual-understanding-vs-memorization"
  }
];
