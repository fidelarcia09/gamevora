import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SECRET_KEY") ??
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=30",
};

const ALLOWED_PRESETS = new Set([
  "gamer", "dragon", "rayo", "lobo", "corona", "cohete", "zorro", "escudo",
]);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function avatarPublico(userId: string, metadata: Record<string, unknown>) {
  if (metadata.gg_avatar_removed === true) {
    return { user_id: userId, avatar_url: null, avatar_preset: null };
  }

  const presetRaw = metadata.gg_avatar_preset;
  const preset =
    typeof presetRaw === "string" && ALLOWED_PRESETS.has(presetRaw)
      ? presetRaw
      : null;

  const urlRaw = metadata.gg_avatar_url;
  let avatarUrl: string | null = null;

  if (typeof urlRaw === "string" && urlRaw.length <= 1200) {
    try {
      const parsed = new URL(urlRaw);
      const expectedPath =
        "/storage/v1/object/public/avatars/" + userId + "/";
      const validFile =
        /^avatar\.(jpg|jpeg|png|webp)$/i.test(
          parsed.pathname.slice(expectedPath.length),
        );

      if (
        parsed.origin === SUPABASE_URL &&
        parsed.pathname.startsWith(expectedPath) &&
        validFile
      ) {
        const version = parsed.searchParams.get("v");
        avatarUrl =
          SUPABASE_URL +
          parsed.pathname +
          (version ? "?v=" + encodeURIComponent(version.slice(0, 40)) : "");
      }
    } catch {
      avatarUrl = null;
    }
  }

  return {
    user_id: userId,
    avatar_url: avatarUrl,
    avatar_preset: avatarUrl ? null : preset,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Método no permitido." }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Faltan las variables de entorno de Supabase.");
    return json({ ok: false, error: "Servicio no disponible." }, 500);
  }

  try {
    const body = await req.json();
    const rawIds = Array.isArray(body?.user_ids) ? body.user_ids : [];
    const userIds = [...new Set(
      rawIds
        .filter((value: unknown): value is string =>
          typeof value === "string" && UUID_RE.test(value)
        ),
    )].slice(0, 50);

    if (userIds.length === 0) {
      return json({ ok: true, avatars: [] });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: rows, error: reviewsError } = await admin
      .from("reviews")
      .select("user_id")
      .in("user_id", userIds)
      .limit(500);

    if (reviewsError) {
      console.error("No se pudieron comprobar los autores de reseñas:", reviewsError);
      return json({ ok: false, error: "No se pudieron cargar los perfiles." }, 500);
    }

    const authorIds = [...new Set(
      (rows ?? [])
        .map((row: { user_id: string | null }) => row.user_id)
        .filter((id: string | null): id is string => Boolean(id)),
    )];

    const avatars = [];
    for (let i = 0; i < authorIds.length; i += 8) {
      const batch = authorIds.slice(i, i + 8);
      const results = await Promise.all(batch.map(async (userId) => {
        const { data, error } = await admin.auth.admin.getUserById(userId);
        if (error || !data?.user) {
          console.warn("No se pudo leer el avatar de un autor de reseña.");
          return {
            user_id: userId,
            avatar_url: null,
            avatar_preset: null,
          };
        }

        return avatarPublico(
          userId,
          (data.user.user_metadata ?? {}) as Record<string, unknown>,
        );
      }));
      avatars.push(...results);
    }

    return json({ ok: true, avatars });
  } catch (error) {
    console.error("Error cargando avatares públicos de reseñas:", error);
    return json({ ok: false, error: "No se pudieron cargar los perfiles." }, 500);
  }
});
