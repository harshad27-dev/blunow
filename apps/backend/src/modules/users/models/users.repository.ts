import { Prisma } from "@prisma/client";
import { prisma } from "../../../prisma/prisma";

const profileFieldNames = new Set(
  Prisma.dmmf.datamodel.models
    .find((model) => model.name === "Profile")
    ?.fields.map((field) => field.name) ?? [],
);

const pickProfileFields = (data: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(data).filter(([key]) => profileFieldNames.has(key)),
  );

export class UsersRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async findMany(filters: { isActive?: boolean; role?: any } = {}) {
    return prisma.user.findMany({
      where: filters,
      include: { profile: true },
    });
  }

  async updateProfile(userId: string, data: Record<string, any>) {
    return prisma.profile.update({
      where: { userId },
      data: pickProfileFields(data),
    });
  }

  async updateProfileAndUser(
    userId: string,
    profileData: Record<string, any>,
    userData: Record<string, any> = {},
  ) {
    return prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userData,
        });
      }

      return tx.profile.update({
        where: { userId },
        data: pickProfileFields(profileData),
      });
    });
  }

  async deactivate(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}
