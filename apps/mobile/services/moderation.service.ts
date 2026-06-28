import { api } from "./api";

export type ReportContentType =
  | "POST"
  | "COMMENT"
  | "STORY"
  | "MESSAGE"
  | "CONFESSION"
  | "USER";

export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "INAPPROPRIATE_CONTENT"
  | "FAKE_PROFILE"
  | "HATE_SPEECH"
  | "OTHER";

export const moderationService = {
  report: async (payload: {
    contentId: string;
    contentType: ReportContentType;
    reportedId?: string;
    reason: ReportReason;
    description?: string;
  }) => {
    const response = await api.post("/moderation/reports", payload);
    return response.data;
  },
};
