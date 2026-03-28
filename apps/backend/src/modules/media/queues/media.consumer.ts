import { createWorker } from '../../../queues/queue';
import { QUEUES } from '../../../queues/queue-constants';
import { prisma } from '../../../prisma/prisma';
import { CloudinaryService } from '../services/cloudinary.service';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';

const cloudinaryService = new CloudinaryService();

export const mediaWorker = createWorker(
  QUEUES.MEDIA_PROCESSING,
  async (job) => {
    const { mediaId } = job.data;
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || !media.publicId) return;

    // Here we could trigger heavy video compression, generate multiple thumbnails etc.
    // Example: Trigger eager transformations in cloudinary
    // await cloudinary.uploader.explicit(media.publicId, { eager: [...] })
    
    console.log(`[Media] Async processing completed for ${mediaId}`);
  },
);
