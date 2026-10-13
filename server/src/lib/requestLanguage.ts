import type { Request } from "express";
import { getCookie } from "./authCookies";

export function resolveRequestLanguage(request: Request): "en" | "tr" {
  const preference =
    getCookie(request, "NEXT_LOCALE") ??
    request.headers["accept-language"]?.split(",")[0] ??
    "en";
  return preference.slice(0, 2).toLowerCase() === "tr" ? "tr" : "en";
}
