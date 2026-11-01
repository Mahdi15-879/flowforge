import { Injectable } from "@nestjs/common";
import { HttpRequestConfigSchema } from "@flowforge/contracts";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, request } from "undici";
import ipaddr from "ipaddr.js";

@Injectable()
export class HttpActionExecutorService {
  async execute(config: unknown) {
    const parsed = HttpRequestConfigSchema.parse(config);

    const blockedHeaders = new Set([
      "host",
      "connection",
      "content-length",
      "transfer-encoding",
      "upgrade",
      "proxy-authorization",
      "proxy-authenticate",
      "proxy-connection",
      "forwarded",
      "x-forwarded-for",
      "x-forwarded-host",
      "x-forwarded-proto",
    ]);

    for (const headerName of Object.keys(parsed.headers ?? {})) {
      if (blockedHeaders.has(headerName.toLowerCase())) {
        throw new Error(`Restricted HTTP header: ${headerName}`);
      }
    }

    const url = new URL(parsed.url);

    // MVP: Only HTTPS on the standard port is supported.
    if (
      url.protocol !== "https:" ||
      (url.port !== "" && url.port !== "443") ||
      url.username ||
      url.password
    ) {
      throw new Error("Only HTTPS on port 443 is supported");
    }

    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const normalizedHostname = hostname.toLowerCase();

    const allowedHosts = new Set([
      "httpbin.org",
      "jsonplaceholder.typicode.com",
    ]);

    if (!allowedHosts.has(normalizedHostname)) {
      throw new Error("HTTP destination is not allowlisted");
    }

    // Reject direct IP addresses and common internal hostnames.
    if (
      normalizedHostname === "localhost" ||
      normalizedHostname.endsWith(".localhost") ||
      normalizedHostname.endsWith(".local") ||
      normalizedHostname.endsWith(".internal") ||
      isIP(hostname) !== 0
    ) {
      throw new Error("Unsafe HTTP destination");
    }

    const dispatcher = new Agent({
      connect: {
        timeout: 5000,

        // Resolve and validate DNS addresses at connection time.
        lookup: (host, options, callback) => {
          lookup(host, { all: true, verbatim: true })
            .then((addresses) => {
              const ipv4Addresses = addresses.filter(
                (entry) => entry.family === 4,
              );

              if (
                ipv4Addresses.length === 0 ||
                ipv4Addresses.some(
                  (entry) => !this.isPublicAddress(entry.address),
                )
              ) {
                callback(new Error("Unsafe destination IPv4"), "", 4);
                return;
              }

              if (options.all) {
                callback(null, ipv4Addresses);
                return;
              }

              const selected = ipv4Addresses[0];
              callback(null, selected.address, 4);
            })
            .catch((error: unknown) => {
              callback(
                error instanceof Error ? error : new Error("DNS lookup failed"),
                "",
                4,
              );
            });
        },
      },
    });

    try {
      const response = await request(url, {
        method: parsed.method,
        headers: parsed.headers,
        body: parsed.body,
        dispatcher,

        // Undici request() does not follow redirects by default.
        headersTimeout: 10000,
        bodyTimeout: 10000,
        signal: AbortSignal.timeout(15000),
      });

      const chunks: Buffer[] = [];
      let size = 0;

      for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        size += buffer.length;

        // Limit response body to 1 MB.
        if (size > 1024 * 1024) {
          throw new Error("HTTP response exceeds 1 MB");
        }

        chunks.push(buffer);
      }

      return {
        statusCode: response.statusCode,
        body: Buffer.concat(chunks).toString("utf8"),
      };
    } finally {
      await dispatcher.close();
    }
  }

  private isPublicAddress(address: string): boolean {
    try {
      const parsed = ipaddr.parse(address);

      // IPv6 is disabled for the initial MVP.
      if (parsed.kind() !== "ipv4") {
        return false;
      }

      // Accept only globally unicast IPv4 addresses.
      return parsed.range() === "unicast";
    } catch {
      return false;
    }
  }
}
