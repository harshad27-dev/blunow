import type { Ionicons } from "@expo/vector-icons";

export const DISCOVER_SCREEN_PADDING = 20;
export const DAILY_CURATED_MATCH_LIMIT = 5;

export const FALLBACK_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=90";

export type ExploreFilter = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type TrendingPost = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  likes: string;
  height: number;
  trendingScore?: number;
};

export const EXPLORE_FILTERS: ExploreFilter[] = [
  { label: "For you", icon: "sparkles" },
  { label: "Nearby", icon: "location" },
  { label: "Trending", icon: "flame" },
  { label: "Dating", icon: "heart" },
  { label: "Friends", icon: "people" },
];

export const TRENDING_POSTS: TrendingPost[] = [
  {
    id: "post-1",
    title: "Weekend plans?",
    subtitle: "People are sharing easy first-message ideas",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=90",
    likes: "2.4k",
    height: 236,
  },
  {
    id: "post-2",
    title: "Cafe hopping",
    subtitle: "Trending around your city",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=90",
    likes: "980",
    height: 178,
  },
  {
    id: "post-3",
    title: "New people nearby",
    subtitle: "Fresh profiles joined today",
    image:
      "https://images.unsplash.com/photo-1524503033411-c9566986fc8f?auto=format&fit=crop&w=900&q=90",
    likes: "1.8k",
    height: 196,
  },
  {
    id: "post-4",
    title: "Evening walks",
    subtitle: "Simple plans, real talks",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=90",
    likes: "740",
    height: 246,
  },
];

