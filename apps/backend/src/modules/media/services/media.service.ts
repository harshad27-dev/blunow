import { MediaRepository } from '../models/media.repository';
import { CloudinaryService } from './cloudinary.service';
import { eventBus } from '../../../events/event-bus';
import { EVENTS } from '../../../events/event-constants';
import { AppError } from '../../../common/middleware/error.middleware';

export class MediaService {
  private repository = new MediaRepository();
  private cloudinaryService = new CloudinaryService();

  async uploadMedia(uploaderId: string, file: Express.Multer.File) {
    // Determine type
    let type: any = 'IMAGE';
    if (file.mimetype.startsWith('video/')) type = 'VIDEO';
    if (file.mimetype.startsWith('audio/')) type = 'AUDIO';

    // Upload to Cloudinary
    const result = await this.cloudinaryService.uploadStream(file.buffer, {
      folder: `blunow/${type.toLowerCase()}s`,
      resource_type: type === 'IMAGE' ? 'image' : 'video',
    });

    // Save to DB
    const media = await this.repository.create({
      uploaderId,
      type,
      url: result.secure_url,
      publicId: result.public_id,
      size: file.size,
      mimeType: file.mimetype,
    });

    eventBus.emit(EVENTS.MEDIA.UPLOAD_COMPLETED, { mediaId: media.id, uploaderId });
    return media;
  }

  async getMedia(id: string) {
    const media = await this.repository.findById(id);
    if (!media) throw new AppError('Media not found', 404);
    return media;
  }

  async deleteMedia(id: string, uploaderId: string) {
    const media = await this.repository.findById(id);
    if (!media) throw new AppError('Media not found', 404);
    if (media.uploaderId !== uploaderId) throw new AppError('Forbidden', 403);

    if (media.publicId) {
      await this.cloudinaryService.deleteResource(
        media.publicId,
        media.type === 'IMAGE' ? 'image' : 'video',
      );
    }

    await this.repository.delete(id);
  }
}
