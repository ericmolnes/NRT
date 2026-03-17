import { getGraphConfig } from "./config";
import { getGraphAccessToken } from "./token";

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  rawBody?: ArrayBuffer;
  contentType?: string;
}

async function makeRequest<T>(
  method: string,
  path: string,
  options?: RequestOptions,
  isRetry = false
): Promise<T> {
  const config = getGraphConfig();
  const token = await getGraphAccessToken();

  let url = `${config.baseUrl}${path}`;

  if (options?.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  let requestBody: BodyInit | undefined;

  if (options?.rawBody) {
    headers["Content-Type"] = options.contentType ?? "application/octet-stream";
    requestBody = options.rawBody;
  } else if (options?.body) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
    signal: AbortSignal.timeout(60_000),
  });

  // Retry once on 401
  if (response.status === 401 && !isRetry) {
    return makeRequest<T>(method, path, options, true);
  }

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    throw new Error(
      `Microsoft Graph API feil: ${response.status} ${response.statusText} — ${JSON.stringify(details)}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const graph = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return makeRequest<T>("GET", path, { params });
  },

  post<T>(path: string, body: unknown) {
    return makeRequest<T>("POST", path, { body });
  },

  put<T>(path: string, rawBody: ArrayBuffer, contentType?: string) {
    return makeRequest<T>("PUT", path, { rawBody, contentType });
  },

  patch<T>(path: string, body: unknown) {
    return makeRequest<T>("PATCH", path, { body });
  },

  delete(path: string) {
    return makeRequest<void>("DELETE", path);
  },
};
