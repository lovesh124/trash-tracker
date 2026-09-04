import nodemailer from "nodemailer";

const to = process.argv[2];

if (!to) {
  console.error("Usage: node scripts/test-email.mjs your@email.com");
  process.exit(1);
}

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error("Set GMAIL_USER and GMAIL_APP_PASSWORD in the environment before running this.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

try {
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: "🗑️ It's your turn to take out the trash",
    text: "This is a test email from Trash Tracker's reminder feature — if you got this, it works!",
  });
  console.log(`Sent to ${to}`);
} catch (err) {
  console.error("Failed to send:", err);
  process.exit(1);
}
