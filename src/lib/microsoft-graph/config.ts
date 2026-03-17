export function getGraphConfig() {
  return {
    baseUrl: "https://graph.microsoft.com/v1.0",
    siteId: process.env.SHAREPOINT_SITE_ID ?? "",
    driveId: process.env.SHAREPOINT_DRIVE_ID ?? "",
  };
}
