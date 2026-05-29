import { NextRequest } from "next/server";
import { getMarkdownMirror, markdownMirrorHeaders } from "@/lib/llms/markdown-mirrors";

function responseFor(request: NextRequest, includeBody: boolean) {
  const locale = request.nextUrl.searchParams.get("locale");
  const path = request.nextUrl.searchParams.get("path");
  const mirror = getMarkdownMirror(locale, path);

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

export function GET(request: NextRequest) {
  return responseFor(request, true);
}

export function HEAD(request: NextRequest) {
  return responseFor(request, false);
}
