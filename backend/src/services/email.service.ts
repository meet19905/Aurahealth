import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    auth: {
      user: process.env.EMAIL_USER || 'ethereal_user',
      pass: process.env.EMAIL_PASS || 'ethereal_pass'
    }
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@healthcaremanager.com',
    to,
    subject,
    text
  });

  console.log('Email sent: %s', info.messageId);
  return info;
};
