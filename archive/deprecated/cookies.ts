import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  
  // Don't set domain for localhost or IP addresses
  const shouldSetDomain =
    hostname &&
    !LOCAL_HOSTS.has(hostname) &&
    !isIpAddress(hostname) &&
    hostname !== "127.0.0.1" &&
    hostname !== "::1";

  // For production domains like xxx.manus.space, extract root domain
  // This ensures cookies work across OAuth redirects
  let domain: string | undefined = undefined;
  if (shouldSetDomain) {
    // Check if hostname is a manus.space domain (with or without subdomain)
    if (hostname === 'manus.space' || hostname.endsWith('.manus.space')) {
      // Use .manus.space as domain to allow cookies across all subdomains
      domain = '.manus.space';
    } else {
      // For custom domains, don't set domain attribute (defaults to current hostname)
      domain = undefined;
    }
  }

  console.log("[Cookie] Setting cookie for hostname:", hostname, "domain:", domain, "secure:", isSecureRequest(req));

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}
