import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const brochureEnquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(120),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, "").slice(-10))
    .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit Indian mobile number."),
  address: z.string().trim().max(500).optional().default(""),
  lookingFor: z.string().trim().max(500).optional().default(""),
});

const encodeHeader = (value: string) =>
  /^[\x00-\x7F]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;

export const submitBrochureEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => brochureEnquirySchema.parse(input))
  .handler(async ({ data }) => {
    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const googleMailApiKey = process.env["GOOGLE_MAIL_API_KEY"];

    if (!lovableApiKey || !googleMailApiKey) {
      console.error("Brochure enquiry email connection is unavailable.");
      return { ok: false as const, message: "We could not send your request. Please try again shortly." };
    }

    const subject = `New brochure enquiry — ${data.name}`;
    const body = [
      "New brochure download enquiry",
      "",
      `Name: ${data.name}`,
      `Mobile: ${data.phone}`,
      `Address: ${data.address || "Not provided"}`,
      `Looking for: ${data.lookingFor || "Not provided"}`,
      "",
      `Submitted: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    ].join("\r\n");
    const message = [
      "To: shawtradersev@gmail.com",
      `Subject: ${encodeHeader(subject)}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "",
      body,
    ].join("\r\n");
    const raw = Buffer.from(message, "utf8").toString("base64url");

    const response = await fetch(
      "https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
          "X-Connection-Api-Key": googleMailApiKey,
        },
        body: JSON.stringify({ raw }),
      },
    );

    if (!response.ok) {
      const providerError = await response.text();
      console.error(`Brochure enquiry email failed [${response.status}]: ${providerError}`);
      return { ok: false as const, message: "We could not send your request. Please try again shortly." };
    }

    return { ok: true as const };
  });