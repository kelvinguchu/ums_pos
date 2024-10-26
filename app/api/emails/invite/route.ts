import { Resend } from "resend";
import { NextResponse } from 'next/server';
import Invite from "@/components/emails/Invite";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, role, token, signupUrl } = await request.json();

    const { data, error } = await resend.emails.send({
      from: "UMS POS <onboarding@resend.dev>",
      to: email,
      subject: "Invitation to join UMS POS",
      react: Invite({ magicLink: signupUrl, role }),
    });

    if (error) {
      console.error("Error sending email:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Invitation sent successfully", data });
  } catch (error: any) {
    console.error("Error in invite API route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
