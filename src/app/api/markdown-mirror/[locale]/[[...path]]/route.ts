import { NextRequest } from "next/server";
import { getMarkdownMirror, markdownMirrorHeaders } from "@/lib/llms/markdown-mirrors";

type Context = {
  params: Promise<{ locale: string; path?: string[] }>;
};

async function responseFor(request: NextRequest, context: Context, includeBody: boolean) {
  const { locale, path } = await context.params;
  const mirror = getMarkdownMirror(locale, path?.join("/") ?? "");

  if (!mirror) {
    return new Response(includeBody ? "Markdown mirror not found\n" : null, {
      status: 404,
      headers: markdownMirrorHeaders,
    });
  }

  if (mirror.redirectPath) {
    return Response.redirect(new URL(mirror.redirectPath, request.url), 308);
  }

  return new Response(includeBody ? (mirror.markdown ?? "") : null, {
    status: 200,
    headers: markdownMirrorHeaders,
  });
}

export function GET(request: NextRequest, context: Context) {
  return responseFor(request, context, true);
}

export function HEAD(request: NextRequest, context: Context) {
  return responseFor(request, context, false);
}
