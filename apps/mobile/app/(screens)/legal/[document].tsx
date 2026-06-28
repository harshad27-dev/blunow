import { useLocalSearchParams } from "expo-router";

import {
  InfoParagraph,
  SettingsScreen,
} from "@/components/settings/SettingsUi";

const DOCUMENTS = {
  help: {
    title: "Help centre",
    sections: [
      ["Getting started", "Complete your profile, choose your preferences, and use Discover or Matches to connect with people who feel right for you."],
      ["Safety", "Use the report and block actions whenever an interaction feels unsafe. Blocking immediately removes direct social connections."],
      ["Account support", "For login, verification, or account recovery issues, contact support@datebl.app and include the email attached to your account."],
    ],
  },
  terms: {
    title: "Terms of service",
    sections: [
      ["Eligibility", "You must be at least 18 years old and legally able to use this service."],
      ["Your responsibilities", "Keep your account secure, provide authentic information, and do not misuse other members' content or personal information."],
      ["Content and enforcement", "You retain ownership of your content. Datebl may restrict or remove content and accounts that violate these terms or create safety risks."],
      ["Account closure", "You may deactivate or permanently delete your account from Account settings."],
    ],
  },
  guidelines: {
    title: "Community guidelines",
    sections: [
      ["Be respectful", "Harassment, threats, hate speech, stalking, and unwanted sexual content are not allowed."],
      ["Be authentic", "Do not impersonate others, misrepresent your identity, scam members, or manipulate engagement."],
      ["Protect privacy", "Never publish another person's private information or intimate media without clear consent."],
      ["Report concerns", "Use in-app reporting for unsafe profiles, posts, stories, comments, or messages. Urgent danger should be reported to local authorities."],
    ],
  },
} as const;

export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{
    document: keyof typeof DOCUMENTS;
  }>();
  const content = DOCUMENTS[document] || DOCUMENTS.help;

  return (
    <SettingsScreen title={content.title}>
      {content.sections.map(([title, body]) => (
        <InfoParagraph key={title} title={title}>
          {body}
        </InfoParagraph>
      ))}
    </SettingsScreen>
  );
}
