import { getPowerOfficeConfig } from "./config";
import { PowerOfficeError } from "./errors";
import { getAccessToken, clearTokenCache } from "./token";
import type { POPaginatedResponse } from "./types";

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

async function makeRequest<T>(
  method: string,
  path: string,
  options?: RequestOptions,
  isRetry = false
): Promise<T> {
  const config = getPowerOfficeConfig();
  const token = await getAccessToken();

  let url = `${config.apiBaseUrl}${path}`;

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
    "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  // Retry once on 401 (token may have expired)
  if (response.status === 401 && !isRetry) {
    clearTokenCache();
    return makeRequest<T>(method, path, options, true);
  }

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    throw new PowerOfficeError(
      `PowerOffice API feil: ${response.status} ${response.statusText}`,
      response.status,
      undefined,
      details
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const poweroffice = {
  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return makeRequest<T>("GET", path, { params });
  },

  post<T>(path: string, body: unknown) {
    return makeRequest<T>("POST", path, { body });
  },

  put<T>(path: string, body: unknown) {
    return makeRequest<T>("PUT", path, { body });
  },

  patch<T>(path: string, body: unknown) {
    return makeRequest<T>("PATCH", path, { body });
  },

  delete(path: string) {
    return makeRequest<void>("DELETE", path);
  },

  /** Hent alle sider fra en paginert PowerOffice-ressurs */
  async getPaginated<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T[]> {
    const allItems: T[] = [];
    let skip = 0;
    const top = 1000;
    const MAX_PAGES = 100;

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await makeRequest<POPaginatedResponse<T>>("GET", path, {
        params: { ...params, $top: top, $skip: skip },
      });

      if (response.data && response.data.length > 0) {
        allItems.push(...response.data);
      }

      // Ingen flere sider
      if (!response.data || response.data.length < top || !response.next) {
        break;
      }

      skip += top;
    }

    return allItems;
  },
};
