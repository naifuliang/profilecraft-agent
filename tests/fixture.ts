import type { ProfileDocument } from "../src/profile.js";

export const strongProfile: ProfileDocument = {
  fullName: "Jordan Lee",
  headline: "Product Engineering Leader | Building reliable AI platforms that help teams ship faster",
  about:
    "I lead product engineering teams that turn ambiguous customer problems into dependable software. Over the past decade, my teams have launched AI platforms used by 25,000 professionals and reduced release lead time by 40%. I care about practical strategy, healthy engineering systems, and measurable customer outcomes. Connect with me to compare notes on product engineering, platform design, or responsible AI delivery.",
  location: "Singapore",
  industry: "Software",
  experience: [
    {
      title: "Director of Product Engineering",
      company: "Example Labs",
      startDate: "2022-01",
      description:
        "Led a multidisciplinary organization that launched an AI workflow platform for 25,000 professionals, improved availability to 99.95%, and shortened release lead time by 40%.",
    },
  ],
  education: [{ school: "Example University", degree: "BSc", field: "Computer Science" }],
  skills: [
    "AI platforms",
    "Product engineering",
    "Engineering leadership",
    "Distributed systems",
    "Platform strategy",
    "Responsible AI",
    "Team development",
    "Reliability",
    "Product discovery",
    "Technical strategy",
  ],
  featured: [{ title: "Building Reliable AI Platforms", url: "https://example.com/case-study" }],
};
