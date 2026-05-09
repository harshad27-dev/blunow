import nodemailer from 'nodemailer';
import { AppError } from '../../../common/middleware/error.middleware';

export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure:
      process.env.SMTP_SECURE === 'true' ||
      Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendLoginOtp(to: string, otp: string) {
    const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !fromEmail) {
      throw new AppError('SMTP is not configured', 500);
    }

    await this.transporter.sendMail({
      from: `"Blunow" <${fromEmail}>`,
      to,
      subject: 'Your Blunow login OTP',
      text: `Your Blunow login OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Your Blunow login OTP</h2>
          <p>Use this code to sign in:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  }
}
