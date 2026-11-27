import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { parseBody } from "next-sanity/webhook";
import { contentTag, sanityConfig } from "../../../lib/sanity";

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) return Response.json({ ok: false }, { status: 503 });

  try {
    const { isValidSignature, body } = await parseBody<{ _type?: string }>(request, secret);
    if (!isValidSignature) return Response.json({ ok: false }, { status: 401 });
    const config = sanityConfig();
    if (!config || request.headers.get("sanity-project-id") !== config.projectId ||
        request.headers.get("sanity-dataset") !== config.dataset ||
        !["home", "delivery", "seo", "category", "dish"].includes(body?._type ?? "")) {
      return Response.json({ ok: false }, { status: 400 });
    }
    revalidateTag(contentTag, { expire: 0 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
