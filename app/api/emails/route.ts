import { Resend } from "resend";
import Welcome from "@/components/emails/Welcome";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { email, subject, name } = await request.json();
  await resend.emails.send({
    from: "UMS POS <onboarding@resend.dev>",
    to: email,
    subject: subject,
    react: Welcome({ name }),
  });

  return new Response(JSON.stringify({ message: "Email sent successfully" }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
