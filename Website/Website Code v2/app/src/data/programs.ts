export interface Program {
  id: string;
  title: string;
  ageRange: string;
  description: string;
  features: string[];
  image: string;
}

export const programs: Program[] = [
  {
    id: "pre-k",
    title: "Pre-K & Kindergarten",
    ageRange: "Ages 4–6",
    description: "Build early math foundations through play-based learning with concrete manipulatives and engaging activities.",
    features: [
      "Number sense and counting",
      "Pattern recognition",
      "Shape and spatial awareness",
      "Introduction to addition and subtraction"
    ],
    image: "/images/programs/program-prek.jpg"
  },
  {
    id: "grades-1-2",
    title: "Grades 1–2",
    ageRange: "Ages 6–8",
    description: "Develop core mathematical concepts and problem-solving skills through the CPA approach. Introduction to heuristics, including bar model.",
    features: [
      "Place value mastery",
      "Addition and subtraction strategies",
      "Introduction to multiplication and division",
      "Basic word problem solving"
    ],
    image: "/images/programs/program-grades1-2.jpg"
  },
  {
    id: "grades-3-6",
    title: "Grades 3–6",
    ageRange: "Ages 8–12",
    description: "Master advanced concepts and heuristics including the bar model method for complex problem solving.",
    features: [
      "Fractions and decimals",
      "Bar model method",
      "20 problem-solving heuristics",
      "Multi-step word problems"
    ],
    image: "/images/programs/program-grades3-6.jpg"
  },
  {
    id: "grades-7-8",
    title: "Grades 7–8",
    ageRange: "Ages 12–14",
    description: "Prepare for high school with pre-algebra concepts and competitive math problem-solving strategies.",
    features: [
      "Pre-algebra foundations",
      "Ratio and proportion",
      "Percentage applications"
    ],
    image: "/images/programs/program-grades7-8.jpg"
  }
];
