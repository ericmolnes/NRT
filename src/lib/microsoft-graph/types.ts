export interface DriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  file?: {
    mimeType: string;
  };
  folder?: {
    childCount: number;
  };
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
}

export interface DriveItemList {
  value: DriveItem[];
  "@odata.nextLink"?: string;
}

export interface Site {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

export interface Drive {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
}

export interface UploadResult {
  id: string;
  name: string;
  webUrl: string;
  size: number;
}

export interface ShareLink {
  id: string;
  link: {
    type: string;
    webUrl: string;
    scope: string;
  };
}
