import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendTurnReminderEmail(to: string, roommateName: string): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: "🗑️ It's your turn to take out the trash",
    text: `Hey ${roommateName}, it's your turn to take out the trash! Check Trash Tracker when you get a chance.`,
  });
}
