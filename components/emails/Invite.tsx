import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InviteEmailProps {
  magicLink: string;
  role: string;
}

const InviteEmail = ({ magicLink, role }: InviteEmailProps) => (
  <Html>
    <Head />
    <Preview>You've been invited to join UMS POS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Invitation to UMS POS</Heading>
        <Section style={body}>
          <Text style={paragraph}>
            You've been invited to join UMS POS as a {role}. Click the link below to complete your registration:
          </Text>
          <Text style={paragraph}>
            <Link style={link} href={magicLink}>
              Complete your registration
            </Link>
          </Text>
          <Text style={paragraph}>
            If you didn't expect this invitation, please ignore this email.
          </Text>
        </Section>
        <Text style={paragraph}>
          Best regards,
          <br />- The UMS POS Team
        </Text>
        <Hr style={hr} />
        <Text style={footer}>UMS POS</Text>
      </Container>
    </Body>
  </Html>
);

export default InviteEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 25px 48px",
  backgroundImage: 'url("/assets/raycast-bg.png")',
  backgroundPosition: "bottom",
  backgroundRepeat: "no-repeat, no-repeat",
};

const heading = {
  fontSize: "28px",
  fontWeight: "bold",
  marginTop: "48px",
};

const body = {
  margin: "24px 0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "26px",
};

const link = {
  color: "#FF6363",
};

const hr = {
  borderColor: "#dddddd",
  marginTop: "48px",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  marginLeft: "4px",
};
