import { Prisma } from "@prisma/client";
import { UsersRepository } from "../models/users.repository";
import { eventBus } from "../../../events/event-bus";
import { EVENTS } from "../../../events/event-constants";

export class ProfileService {
  private usersRepository = new UsersRepository();

  async updateProfile(
    userId: string,
    data: {
      username?: string;
      bio?: string;
      age?: number;
      birthDate?: string;
      gender?: string;
      sexuality?: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      avatarUrl?: string;
      bannerUrl?: string;
      profilePhotoUrls?: string[];
      interests?: string[];
      interestedIn?: string[];
      lookingFor?: string[];
      relationship?: string;
      minAge?: number;
      maxAge?: number;
      maxDistance?: number;
      drinking?: string;
      smoking?: string;
      workout?: string;
      pets?: string;
      zodiac?: string;
    },
  ) {
    const { sexuality, age, birthDate, ...profileData } = data;
    const updateData: Record<string, any> = { ...profileData };

    if (birthDate) {
      updateData.birthDate = new Date(birthDate);
    } else if (age) {
      updateData.birthDate = getBirthDateFromAge(age);
    }

    const userData = sexuality ? { sexuality } : {};
    try {
      const profile = await this.usersRepository.updateProfileAndUser(
        userId,
        updateData,
        userData,
      );
      eventBus.emit(EVENTS.USER.PROFILE_UPDATED, { userId });
      return profile;
    } catch (error) {
      if (isUniqueUsernameError(error)) {
        const usernameError = new Error("Username is already taken.") as Error & {
          statusCode?: number;
        };
        usernameError.statusCode = 409;
        throw usernameError;
      }
      throw error;
    }
  }

  async updatePreferences(
    userId: string,
    data: {
      minAge?: number;
      maxAge?: number;
      maxDistance?: number;
      lookingFor?: string[];
    },
  ) {
    const profile = await this.usersRepository.updateProfile(userId, data);
    eventBus.emit(EVENTS.USER.PREFERENCES_UPDATED, { userId });
    return profile;
  }

  async updateInterests(userId: string, interests: string[]) {
    const profile = await this.usersRepository.updateProfile(userId, {
      interests,
    });
    eventBus.emit(EVENTS.USER.INTERESTS_UPDATED, { userId });
    return profile;
  }
}


const isUniqueUsernameError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002" &&
  Array.isArray(error.meta?.target) &&
  error.meta.target.includes("username");
const getBirthDateFromAge = (age: number) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  date.setHours(0, 0, 0, 0);
  return date;
};



