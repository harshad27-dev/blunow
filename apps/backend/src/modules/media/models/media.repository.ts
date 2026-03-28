import { prisma } from '../../../prisma/prisma';

export class MediaRepository {
  async create(data: {
    uploaderId: string;
    type: any;
    url: string;
    publicId?: string;
    size: number;
    mimeType: string;
  }) {
    return prisma.media.create({ data });
  }

  async findById(id: string) {
    return prisma.media.findUnique({ where: { id } });
  }

  async delete(id: string) {
    return prisma.media.delete({ where: { id } });
  }
}
