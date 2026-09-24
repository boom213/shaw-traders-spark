import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const toE164 = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return digits ? `+${digits}` : "";
};

/** Mobile number + one-time code sign-in. New numbers get an account automatically. */
export function PhoneOtpForm({ idPrefix = "auth", onVerified }: { idPrefix?: string; onVerified?: () => void }) {
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"mobile" | "code">("mobile");
  const [busy, setBusy] = useState(false);
  const phone = toE164(mobile);
  const validMobile = /^[6-9]\d{9}$/.test(mobile);
  const mobileErr = mobile && mobile.length === 10 && !validMobile ? "Indian mobile numbers start with 6, 7, 8 or 9" : "";

  const sendCode = async () => {
    if (!validMobile) return toast.error("Enter a valid 10-digit mobile number");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) {
      const off = /phone.provider|unsupported phone/i.test(error.message);
      return toast.error(off ? "Text-message sign-in isn't available right now. Please use Continue with Google or call us." : error.message);
    }
    setStage("code");
    toast.success(`Code sent to ${phone}`);
  };

  const verify = async () => {
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) return toast.error("Enter the 6-digit code");
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.user) await supabase.from("profiles").upsert({ id: data.user.id, phone }, { onConflict: "id" });
    toast.success("You're signed in");
    onVerified?.();
  };

  return stage === "mobile" ? (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void sendCode(); }}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-mobile`}>Mobile number</Label>
        <div className="flex items-center gap-2">
          <span className="grid h-10 shrink-0 place-items-center rounded-xl border border-border bg-surface px-3 text-sm">+91</span>
          <Input id={`${idPrefix}-mobile`} inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[6-9][0-9]{9}" aria-invalid={mobileErr ? true : undefined} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} />
        </div>
        {mobileErr && <p role="alert" className="text-xs text-destructive">{mobileErr}</p>}
        <p className="text-xs text-muted-foreground">New number? We'll automatically create your account.</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy || !validMobile}>{busy ? "Sending…" : "Send code"}</Button>
    </form>
  ) : (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void verify(); }}>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-otp`}>6-digit code sent to {phone}</Label>
        <Input id={`${idPrefix}-otp`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Checking…" : "Verify and continue"}</Button>
      <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => { setStage("mobile"); setCode(""); }}>
        Change number
      </button>
    </form>
  );
}
