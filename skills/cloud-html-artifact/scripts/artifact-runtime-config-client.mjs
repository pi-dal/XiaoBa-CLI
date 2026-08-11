#!/usr/bin/env node

export const ARTIFACT_RUNTIME_CONFIG_CONTRACT =
  "cloud-html-artifact.runtime-config.v1";
export const DEFAULT_CATSCO_HTTP_BASE_URL = "https://app.catsco.cc";

export class ArtifactRuntimeConfigError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ArtifactRuntimeConfigError";
    this.code = cleanText(options.code) || "artifact_runtime_config_failed";
    this.status = Number(options.status || 0);
  }
}

export async function fetchArtifactRuntimeConfig(options = {}) {
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new ArtifactRuntimeConfigError("CatsCo runtime configuration fetch is unavailable", {
      code: "runtime_config_transport_unavailable"
    });
  }
  const apiKey = resolveRuntimeAgentApiKey(env);
  const agentUid = normalizeAgentUid(options.agentUid, "Agent UID");
  const endpoint = new URL(
    "/api/bot/artifact-runtime-config",
    resolveCatsCoHttpBaseUrl(env)
  ).href;
  const timeoutMs = positiveInteger(
    options.timeoutMs || env.CATSCO_ARTIFACT_RUNTIME_CONFIG_TIMEOUT_MS,
    10_000,
    "runtime configuration timeout"
  );

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `ApiKey ${apiKey}`,
        "Accept": "application/json"
      },
      signal: options.signal || AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    throw new ArtifactRuntimeConfigError(
      `CatsCo runtime configuration request failed: ${messageOf(error)}`,
      { code: "runtime_config_transport_failed" }
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new ArtifactRuntimeConfigError(
      `CatsCo runtime configuration returned invalid JSON (HTTP ${response.status})`,
      {
        code: "runtime_config_invalid_response",
        status: response.status
      }
    );
  }
  if (!response.ok) {
    throw new ArtifactRuntimeConfigError(
      `CatsCo runtime configuration is unavailable (HTTP ${response.status})`,
      {
        code: response.status === 401 || response.status === 403
          ? "runtime_config_authentication_failed"
          : "runtime_config_http_failed",
        status: response.status
      }
    );
  }
  if (payload?.contract_version !== ARTIFACT_RUNTIME_CONFIG_CONTRACT) {
    throw new ArtifactRuntimeConfigError(
      "CatsCo returned an unsupported Artifact runtime configuration",
      { code: "runtime_config_contract_unsupported" }
    );
  }
  const responseUid = normalizeAgentUid(payload?.agent_uid, "runtime configuration Agent UID");
  if (responseUid !== agentUid) {
    throw new ArtifactRuntimeConfigError(
      "CatsCo runtime configuration belongs to a different Agent UID",
      { code: "runtime_config_agent_mismatch" }
    );
  }
  if (cleanText(payload?.dns_provider).toLowerCase() !== "volcengine") {
    throw new ArtifactRuntimeConfigError(
      "CatsCo returned an unsupported Artifact DNS provider",
      { code: "runtime_config_provider_unsupported" }
    );
  }

  return {
    VOLC_ACCESSKEY: requiredSecret(payload?.credentials?.access_key, "DNS access key"),
    VOLC_SECRETKEY: requiredSecret(payload?.credentials?.secret_key, "DNS secret key"),
    CATSCO_ARTIFACT_DNS_ZONE: requiredText(payload?.dns_zone, "Artifact DNS zone"),
    CATSCO_ARTIFACT_HOST_SUFFIX: requiredText(
      payload?.host_suffix,
      "Artifact hostname suffix"
    )
  };
}

export function resolveRuntimeAgentApiKey(env = process.env) {
  const candidates = [
    ["CATSCO_API_KEY", env.CATSCO_API_KEY],
    ["CATSCOMPANY_API_KEY", env.CATSCOMPANY_API_KEY]
  ].filter(([, value]) => cleanText(value));
  if (!candidates.length) {
    throw new ArtifactRuntimeConfigError(
      "CATSCO_API_KEY or CATSCOMPANY_API_KEY is required to obtain Artifact runtime configuration",
      { code: "runtime_config_api_key_unavailable" }
    );
  }
  const values = candidates.map(([, value]) => cleanText(value));
  if (new Set(values).size !== 1) {
    throw new ArtifactRuntimeConfigError(
      `runtime Agent API key environment variables conflict: ${candidates.map(([name]) => name).join(", ")}`,
      { code: "runtime_config_api_key_conflict" }
    );
  }
  return values[0];
}

export function resolveCatsCoHttpBaseUrl(env = process.env) {
  const configured = cleanText(
    env.CATSCO_HTTP_BASE_URL || env.CATSCOMPANY_HTTP_BASE_URL
  );
  if (configured) return normalizeHttpOrigin(configured);

  const websocket = cleanText(
    env.CATSCO_SERVER_URL || env.CATSCOMPANY_SERVER_URL
  );
  if (websocket) {
    let parsed;
    try {
      parsed = new URL(websocket);
    } catch {
      throw new ArtifactRuntimeConfigError("CATSCO_SERVER_URL is invalid", {
        code: "runtime_config_base_url_invalid"
      });
    }
    if (parsed.protocol === "wss:") parsed.protocol = "https:";
    else if (parsed.protocol === "ws:") parsed.protocol = "http:";
    else {
      throw new ArtifactRuntimeConfigError(
        "CATSCO_SERVER_URL must use ws or wss",
        { code: "runtime_config_base_url_invalid" }
      );
    }
    parsed.pathname = "/";
    parsed.search = "";
    parsed.hash = "";
    return normalizeHttpOrigin(parsed.href);
  }
  return DEFAULT_CATSCO_HTTP_BASE_URL;
}

function normalizeHttpOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new ArtifactRuntimeConfigError("CatsCo HTTP base URL is invalid", {
      code: "runtime_config_base_url_invalid"
    });
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new ArtifactRuntimeConfigError(
      "CatsCo HTTP base URL must be an HTTP(S) origin without credentials",
      { code: "runtime_config_base_url_invalid" }
    );
  }
  return parsed.origin;
}

function normalizeAgentUid(value, label) {
  const text = requiredText(value, label);
  const match = text.match(/^(?:usr)?([1-9]\d*)$/i);
  if (!match) {
    throw new ArtifactRuntimeConfigError(`${label} is invalid`, {
      code: "runtime_config_agent_uid_invalid"
    });
  }
  return BigInt(match[1]).toString();
}

function requiredSecret(value, label) {
  const text = requiredText(value, label);
  if (/[\r\n\0]/.test(text)) {
    throw new ArtifactRuntimeConfigError(`${label} is invalid`, {
      code: "runtime_config_invalid_response"
    });
  }
  return text;
}

function requiredText(value, label) {
  const text = cleanText(value);
  if (!text) {
    throw new ArtifactRuntimeConfigError(`${label} is unavailable`, {
      code: "runtime_config_invalid_response"
    });
  }
  return text;
}

function positiveInteger(value, fallback, label) {
  const number = Number(value || fallback);
  if (!Number.isInteger(number) || number < 1 || number > 120_000) {
    throw new ArtifactRuntimeConfigError(`${label} is invalid`, {
      code: "runtime_config_timeout_invalid"
    });
  }
  return number;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
