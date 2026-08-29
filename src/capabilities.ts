import type { LinkedInEnvironment } from "./linkedin.js";

export const VERSION = "0.1.0";

export interface CapabilityReport {
  name: "profilecraft-agent";
  version: string;
  mode: "api-first";
  credentials: {
    accessTokenAvailable: boolean;
    personIdAvailable: boolean;
    apiVersionConfigured: boolean;
  };
  liveWritesEnabled: boolean;
  supported: string[];
  prohibited: string[];
}

export function getCapabilities(environment: LinkedInEnvironment = {}): CapabilityReport {
  return {
    name: "profilecraft-agent",
    version: VERSION,
    mode: "api-first",
    credentials: {
      accessTokenAvailable: Boolean(environment.accessToken),
      personIdAvailable: Boolean(environment.personId),
      apiVersionConfigured: /^\d{6}$/u.test(environment.version ?? ""),
    },
    liveWritesEnabled: environment.writesEnabled === "1",
    supported: [
      "Audit user-provided profile data",
      "Draft profile and post improvements",
      "Preview a post with a content-bound confirmation ID",
      "Publish a confirmed post through LinkedIn's official API",
      "Read the authenticated member's OIDC userinfo",
    ],
    prohibited: [
      "Scraping LinkedIn pages",
      "Automating LinkedIn's website or modifying its interface",
      "Automating connections, messages, or engagement",
      "Collecting passwords, cookies, or session credentials",
    ],
  };
}
