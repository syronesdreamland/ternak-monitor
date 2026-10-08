// ============================================================================
// Supabase Edge Function: upload-url
// Generate presigned PUT URL ke Cloudflare R2 (S3-compatible) agar browser
// bisa upload file langsung tanpa expose secret key.
//
// Secrets yang harus di-set (supabase secrets set):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// ============================================================================

import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // AUDIT 2026-10-08 [C1]: WAJIB verifikasi JWT user. Sebelumnya siapa pun
  // dengan anon key (publik di bundle) bisa minta presigned URL & meng-host
  // file arbitrer (terbukti: HTML+JS & SVG malicious tersimpan & dilayani
  // sebagai text/html di domain publik r2.dev).
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: userData, error: authErr } = await (await import("npm:@supabase/supabase-js@2"))
    .createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    )
    .auth.getUser(jwt);
  if (authErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const accountId = Deno.env.get("R2_ACCOUNT_ID");
    const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const bucket = Deno.env.get("R2_BUCKET") ?? "papifarm";

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: "R2 belum dikonfigurasi." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileName, contentType } = await req.json();
    if (!fileName || !contentType) {
      return new Response(JSON.stringify({ error: "fileName & contentType wajib." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AUDIT 2026-10-08 [C1]: whitelist content-type. text/html & svg bisa
    // mengeksekusi script saat dibuka → vektor XSS/phishing. Client-side
    // sudah membatasi accept="image/jpeg,image/png,image/webp,application/pdf".
    const ALLOWED_TYPES = new Set([
      "image/jpeg", "image/png", "image/webp", "application/pdf",
    ]);
    if (!ALLOWED_TYPES.has(contentType)) {
      return new Response(JSON.stringify({ error: "Tipe file tidak diizinkan." }), {
        status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitasi nama file agar aman & unik.
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 600 });

    // Public URL (bucket public read via R2.dev subdomain).
    const publicUrl = `https://pub-5cfac080756045ef86a9ae28918026a8.r2.dev/${key}`;

    return new Response(
      JSON.stringify({ signedUrl, key, publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Gagal." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
