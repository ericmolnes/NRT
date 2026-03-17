import { graph } from "./client";
import { getGraphConfig } from "./config";
import type { DriveItem, DriveItemList, UploadResult, ShareLink } from "./types";

/**
 * Upload a file to SharePoint document library.
 * For files < 4MB, uses simple upload. For larger files, use upload session (not implemented here).
 */
export async function uploadFile(
  fileName: string,
  content: ArrayBuffer,
  folderPath?: string
): Promise<UploadResult> {
  const config = getGraphConfig();
  const path = folderPath
    ? `/drives/${config.driveId}/root:/${folderPath}/${fileName}:/content`
    : `/drives/${config.driveId}/root:/${fileName}:/content`;

  return graph.put<UploadResult>(path, content);
}

/**
 * Get file metadata by drive item ID.
 */
export async function getFileMetadata(driveItemId: string): Promise<DriveItem> {
  const config = getGraphConfig();
  return graph.get<DriveItem>(`/drives/${config.driveId}/items/${driveItemId}`);
}

/**
 * List files in a folder (or root).
 */
export async function listFiles(folderPath?: string): Promise<DriveItem[]> {
  const config = getGraphConfig();
  const path = folderPath
    ? `/drives/${config.driveId}/root:/${folderPath}:/children`
    : `/drives/${config.driveId}/root/children`;

  const result = await graph.get<DriveItemList>(path);
  return result.value;
}

/**
 * Create a sharing link for a file.
 */
export async function createShareLink(
  driveItemId: string,
  type: "view" | "edit" = "view"
): Promise<ShareLink> {
  const config = getGraphConfig();
  return graph.post<ShareLink>(
    `/drives/${config.driveId}/items/${driveItemId}/createLink`,
    { type, scope: "organization" }
  );
}

/**
 * Create a folder in the document library.
 */
export async function createFolder(
  folderName: string,
  parentPath?: string
): Promise<DriveItem> {
  const config = getGraphConfig();
  const path = parentPath
    ? `/drives/${config.driveId}/root:/${parentPath}:/children`
    : `/drives/${config.driveId}/root/children`;

  return graph.post<DriveItem>(path, {
    name: folderName,
    folder: {},
    "@microsoft.graph.conflictBehavior": "rename",
  });
}

/**
 * Delete a file by drive item ID.
 */
export async function deleteFile(driveItemId: string): Promise<void> {
  const config = getGraphConfig();
  await graph.delete(`/drives/${config.driveId}/items/${driveItemId}`);
}
