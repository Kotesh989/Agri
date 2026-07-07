import dns from 'dns';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

dns.setDefaultResultOrder('ipv4first');

const getMailTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email OTP delivery is not configured');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Force IPv4 lookup to prevent ENETUNREACH issues on Render
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    },
  });
};

export const sendEmailOtp = async ({ to, otp, purpose = 'password reset' }) => {
  if (process.env.EMAIL_PROVIDER === 'RESEND') {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) throw new Error('Resend is not configured');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM,
      to,
      subject: `Agri Shop ${purpose} OTP`,
      text: `Your ${purpose} OTP is ${otp}. It expires in 5 minutes.`,
      html: `<p>Your ${purpose} OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
    });
    if (result.error) {
      console.error('Resend delivery error:', JSON.stringify(result.error));
      throw new Error(`Resend failed: ${result.error.message || JSON.stringify(result.error)}`);
    }
    console.info(`Resend email delivered to ${to}, id: ${result.data?.id}`);
    return;
  }
  const transporter = getMailTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Agri Shop ${purpose} OTP`,
    text: `Your ${purpose} OTP is ${otp}. It expires in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">Agri Shop ${purpose}</h2>
        <p>Your ${purpose} OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${otp}</p>
        <p>This OTP expires in 5 minutes.</p>
      </div>
    `,
  });
};
