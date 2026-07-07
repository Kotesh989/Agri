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

  if (process.env.EMAIL_PROVIDER === 'BREVO') {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM;
    const senderName = process.env.BREVO_SENDER_NAME || 'Agri Shop';

    // 1. Diagnostics Logging (without exposing secrets)
    console.info('[Brevo Debug] API Key configured:', !!apiKey);
    console.info('[Brevo Debug] Sender Name:', senderName);
    console.info('[Brevo Debug] Sender Email:', senderEmail);
    console.info('[Brevo Debug] Recipient Email:', to);

    // 2. Strict Validations
    if (!apiKey) {
      throw new Error('Brevo API key is missing. Please configure BREVO_API_KEY in your environment variables.');
    }
    if (!senderEmail) {
      throw new Error('Brevo sender email is missing. Please configure BREVO_SENDER_EMAIL or BREVO_FROM in your environment variables.');
    }

    // Email format validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      throw new Error(`Invalid Brevo sender email format: "${senderEmail}". Please configure a valid email address in BREVO_SENDER_EMAIL or BREVO_FROM.`);
    }
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid recipient email format: "${to}".`);
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject: `Agri Shop ${purpose} OTP`,
          textContent: `Your ${purpose} OTP is ${otp}. It expires in 5 minutes.`,
          htmlContent: `<p>Your ${purpose} OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.message || errText;
        } catch (_) {}
        throw new Error(`Brevo API returned error status ${response.status}: ${errMsg}`);
      }

      console.info(`[Brevo] Email OTP successfully sent to ${to}`);
      return;
    } catch (err) {
      console.error('[Brevo Error] Failed to execute sendEmailOtp:', err.message);
      throw err;
    }
  }

  if (process.env.EMAIL_PROVIDER === 'SENDGRID') {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) throw new Error('SendGrid is not configured');
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.SENDGRID_FROM, name: 'Agri Shop' },
        subject: `Agri Shop ${purpose} OTP`,
        content: [
          { type: 'text/plain', value: `Your ${purpose} OTP is ${otp}. It expires in 5 minutes.` },
          { type: 'text/html', value: `<p>Your ${purpose} OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>` }
        ]
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`SendGrid failed: ${errText}`);
    }
    console.info(`SendGrid email delivered to ${to}`);
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
