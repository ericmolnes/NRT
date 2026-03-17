import { graph } from "./client";
import { getGraphConfig } from "./config";
import type { Site, Drive } from "./types";

/**
 * Get the configured SharePoint site info.
 */
export async function getSiteInfo(): Promise<Site> {
  const config = getGraphConfig();
  return graph.get<Site>(`/sites/${config.siteId}`);
}

/**
 * List document libraries (drives) for the configured site.
 */
export async function getSiteDocLibraries(): Promise<Drive[]> {
  const config = getGraphConfig();
  const result = await graph.get<{ value: Drive[] }>(
    `/sites/${config.siteId}/drives`
  );
  return result.value;
}

/**
 * Search for sites by keyword.
 */
export async function searchSites(query: string): Promise<Site[]> {
  const result = await graph.get<{ value: Site[] }>(
    "/sites",
    { search: query }
  );
  return result.value;
}
