import { fcm } from '../../../config/firebase.config';

export class PushService {
  async sendPushNotification(token: string, notification: { title: string; body: string; data?: any }) {
    try {
      await fcm.send({
        token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
      });
      console.log(`[Push] Sent to token ${token}`);
    } catch (error) {
      console.error('[Push] Failed to send push notification:', error);
    }
  }
}
