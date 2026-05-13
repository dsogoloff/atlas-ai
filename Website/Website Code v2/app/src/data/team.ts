export interface TeamMember {
  id: number;
  name: string;
  title: string;
  bio: string;
  image: string;
}

export const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Dr. Rebecca Thompson",
    title: "Founder & Center Director",
    bio: "Dr. Thompson holds a Ph.D. in Mathematics Education from Columbia University and has over 15 years of experience in Singapore Math instruction. As a mother of two, she understands the importance of building both mathematical excellence and a love for learning. She founded SAM New York to bring the world's most effective math program to families across the city.",
    image: "/images/team/team-founder.jpg"
  },
  {
    id: 2,
    name: "James Martinez",
    title: "Academic Director",
    bio: "James is a certified Singapore Math trainer with a Master's in Education from NYU. He has trained over 100 educators in the CPA approach and is passionate about making math accessible to every child. His expertise in curriculum development ensures that each student receives personalized instruction tailored to their learning style.",
    image: "/images/team/team-director.jpg"
  },
  {
    id: 3,
    name: "Emily Chen",
    title: "Lead Trainer",
    bio: "Emily brings enthusiasm and creativity to every lesson. With a background in early childhood education and specialized training in Singapore Math, she excels at making complex concepts simple and fun. Her students consistently show remarkable improvement in both skills and confidence.",
    image: "/images/team/team-trainer.jpg"
  }
];
