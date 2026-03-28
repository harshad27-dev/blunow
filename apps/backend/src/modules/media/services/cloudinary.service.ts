import { cloudinary } from '../../../config/cloudinary.config';
import streamifier from 'streamifier';
import { AppError } from '../../../common/middleware/error.middleware';

export class CloudinaryService {
  async uploadStream(buffer: Buffer, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (result) {
            resolve(result);
          } else {
            console.error('[Cloudinary] Upload Error:', error);
            reject(new AppError('Failed to upload media to cloud', 500));
          }
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async deleteResource(publicId: string, resourceType: string = 'image') {
    return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }
}
