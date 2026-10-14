import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "./env";

/** Wraps a route handler so thrown HttpErrors (and anything else) become JSON errors. */
export function route<A extends unknown[]>(handler: (req: Request, ...rest: A) => Promise<unknown>) {
  return async (req: Request, ...rest: A) => {
    try {
      const result = await handler(req, ...rest);
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
    }
  };
}

export async function jsonBody<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
}

export function str(v: unknown, field: string, max = 1000): string {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `${field} is required.`);
  if (v.length > max) throw new HttpError(400, `${field} is too long.`);
  return v.trim();
}

export const optStr = (v: unknown, max = 1000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/** Calls a venue API and unwraps its JSON, turning failures into a 502 that names the venue. */
export async function venueFetch<T>(venue: string, url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {}
  if (!res.ok) {
    const msg = (body as { error?: string; message?: string })?.error ?? (body as { message?: string })?.message ?? (text.slice(0, 200) || res.statusText);
    throw new HttpError(502, `${venue}: ${msg}`);
  }
  return body as T;
}
