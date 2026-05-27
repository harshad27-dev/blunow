import { Ionicons } from "@expo/vector-icons";

export type MatchProfile = {
  id: string;
  name: string;
  lastName: string;
  age: number;
  city: string;
  distance: string;
  occupation: string;
  online: boolean;
  verified: boolean;
  quote: string;
  imageUrl: string;
  interests: string[];
  matchScore: number;
  chatRequests: number;
  alreadyLikedMe?: boolean;
};

export const suggestedProfiles: MatchProfile[] = [
  {
    id: "julia-siti",
    name: "Julia",
    lastName: "Siti",
    age: 24,
    city: "Bali, Indonesia",
    distance: "2.4 km away",
    occupation: "Marketing Manager",
    online: true,
    verified: true,
    quote: "Sunsets, good coffee and deep conversations",
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=92",
    interests: ["Modeling", "Football", "Fashion", "Gym", "Sushi", "Chinese"],
    matchScore: 95,
    chatRequests: 4,
    alreadyLikedMe: true,
  },
  {
    id: "maya-chen",
    name: "Maya",
    lastName: "Chen",
    age: 26,
    city: "Bengaluru, India",
    distance: "5.8 km away",
    occupation: "Product Designer",
    online: true,
    verified: true,
    quote: "Live music, ramen nights and people who make simple plans feel special",
    imageUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1200&q=92",
    interests: ["Music", "Travel", "Design", "Coffee", "Ramen", "Art"],
    matchScore: 88,
    chatRequests: 2,
  },
  {
    id: "aarav-mehta",
    name: "Aarav",
    lastName: "Mehta",
    age: 27,
    city: "Hyderabad, India",
    distance: "8.1 km away",
    occupation: "Founder",
    online: false,
    verified: false,
    quote: "Football debates, late dinners and calm rooms in loud cities",
    imageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=92",
    interests: ["Startups", "Football", "Food", "Fitness", "Movies"],
    matchScore: 82,
    chatRequests: 1,
  },
];

export const interestMeta: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  art: { icon: "color-palette", color: "#F97316" },
  chinese: { icon: "language", color: "#8B5CF6" },
  coffee: { icon: "cafe", color: "#C8A86B" },
  design: { icon: "sparkles", color: "#A855F7" },
  fashion: { icon: "shirt", color: "#EC4899" },
  fitness: { icon: "barbell", color: "#2DD4BF" },
  football: { icon: "football", color: "#6FBF8A" },
  food: { icon: "restaurant", color: "#F97316" },
  gym: { icon: "barbell", color: "#2DD4BF" },
  modeling: { icon: "sparkles", color: "#FBBF24" },
  movies: { icon: "videocam", color: "#38BDF8" },
  music: { icon: "musical-notes", color: "#EC4899" },
  ramen: { icon: "restaurant", color: "#F97316" },
  startups: { icon: "rocket", color: "#A855F7" },
  sushi: { icon: "fast-food", color: "#CF6679" },
  travel: { icon: "airplane", color: "#38BDF8" },
};
