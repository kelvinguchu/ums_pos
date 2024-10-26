import React from 'react'
import { Button } from "@/components/ui/button";

const Email = () => {
      const handleSendEmail = async () => {
        await fetch("/api/emails", {
          method: "POST",
          body: JSON.stringify({
            email: "kelvinguchu5@gmail.com",
            subject: "Welcome to UMS POS",
            name: "Kelvin",
          }),
        });
      };
  return (
    <div>
      <Button onClick={handleSendEmail}>Send Email</Button>
    </div>
  );
}

export default Email;
