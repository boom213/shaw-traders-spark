/** AI reading of wholesale papers. Advice only — never blocks an application. */
import type { TradeDocField } from "@/lib/trade.functions";

export type DocCheck = {
  field: string;
  status: "ok" | "unclear" | "mismatch" | "error";
  extracted: Record<string, string>;
  issues: string[];
  checkedAt: string;
};

export type FormFacts = { businessName?: string; gstin?: string; pan?: string };

const WHAT: Record<TradeDocField, string> = {
  gst_certificate_path: "an Indian GST registration certificate. Extract gstin, legal_name, trade_name, address.",
  pan_card_path: "an Indian PAN card. Extract pan, name.",
  address_proof_path: "a proof of address (utility bill, rent agreement, etc.). Extract name, address, document_type.",
  shop_photo_path: "a photo of a shop front. Extract signboard_visible (yes/no) and signboard_name.",
  trade_licence_path: "a trade licence or Udyam registration. Extract registration_number, name, document_type.",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "matches_expected_type", "fields", "issues"],
  properties: {
    readable: { type: "boolean" },
    matches_expected_type: { type: "boolean" },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value"],
        properties: { key: { type: "string" }, value: { type: "string" } },
      },
    },
    issues: { type: "array", items: { type: "string" } },
  },
};

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function runDocCheck(profileId: string, field: TradeDocField, path: string, form: FormFacts): Promise<DocCheck> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const save = async (c: Omit<DocCheck, "field" | "checkedAt">): Promise<DocCheck> => {
    const checkedAt = new Date().toISOString();
    await supabaseAdmin.from("trade_doc_checks" as never).upsert(
      { profile_id: profileId, field, path, status: c.status, extracted: c.extracted, issues: c.issues, checked_at: checkedAt } as never,
      { onConflict: "profile_id,field" },
    );
    return { ...c, field, checkedAt };
  };

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return save({ status: "error", extracted: {}, issues: ["AI check isn't set up right now."] });

  const { data: blob, error } = await supabaseAdmin.storage.from("trade-docs").download(path);
  if (error || !blob) return save({ status: "error", extracted: {}, issues: ["Could not open the file."] });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = blob.type && blob.type !== "application/octet-stream"
    ? blob.type
    : ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const dataUrl = `data:${mime};base64,${btoa(bin)}`;
  const filePart = mime === "application/pdf"
    ? { type: "input_file", filename: `doc.${ext || "pdf"}`, file_data: dataUrl }
    : { type: "input_image", image_url: dataUrl };

  let text = "";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "doc_check", strict: true, schema: SCHEMA } },
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: `This should be ${WHAT[field]} Set readable=false if blurry, cropped or illegible. Set matches_expected_type=false if it is a different kind of document. Return extracted values as key/value pairs (empty list if nothing readable). List short plain-English issues for the applicant (e.g. "Photo is blurry — upload a sharper one"). Do not invent values.` },
            filePart,
          ],
        }],
      }),
    });
    if (!res.ok || !res.body) {
      const msg = res.status === 429 ? "AI check is busy — try again in a minute." : res.status === 402 || res.status === 403 ? "AI check unavailable right now." : "AI check failed.";
      return save({ status: "error", extracted: {}, issues: [msg] });
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5));
          if (ev.type === "response.output_text.delta") text += ev.delta;
        } catch { /* partial */ }
      }
    }
  } catch {
    return save({ status: "error", extracted: {}, issues: ["AI check failed."] });
  }

  let parsed: { readable: boolean; matches_expected_type: boolean; fields: { key: string; value: string }[]; issues: string[] };
  try { parsed = JSON.parse(text); } catch { return save({ status: "error", extracted: {}, issues: ["AI could not read this file."] }); }

  const extracted = Object.fromEntries(parsed.fields.filter((f) => f.value?.trim()).slice(0, 12).map((f) => [f.key.slice(0, 40), f.value.slice(0, 200)]));
  const issues = parsed.issues.slice(0, 5).map((s) => s.slice(0, 200));
  let status: DocCheck["status"] = "ok";
  if (!parsed.readable) status = "unclear";
  if (!parsed.matches_expected_type) { status = "mismatch"; issues.unshift("This doesn't look like the right kind of document."); }

  const cmp = (k: string, want: string | undefined, label: string) => {
    const got = extracted[k];
    if (got && want && norm(got) !== norm(want)) { status = "mismatch"; issues.push(`${label} on the paper (${got}) doesn't match the form (${want}).`); }
  };
  if (field === "gst_certificate_path") cmp("gstin", form.gstin, "GSTIN");
  if (field === "pan_card_path") cmp("pan", form.pan, "PAN");
  if (field === "shop_photo_path" && /^no$/i.test(extracted["signboard_visible"] ?? "")) {
    if (status === "ok") status = "unclear";
    issues.push("No signboard visible — please include the shop name board.");
  }
  return save({ status, extracted, issues });
}
