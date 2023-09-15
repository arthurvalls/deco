import type { JSONSchema7 } from "../deps.ts";

export const adminDomain = `https://deco.cx`;
export const landingPageDomain = `https://www.deco.cx`;
const adminPreviewUrls = "https://deco-sites-admin-";
const adminPreviewDomain = "deno.dev";

export const isAdmin = (url: string): boolean => {
  if (url.startsWith(adminDomain)) {
    return true;
  }
  const urlObj = new URL(url);
  return (
    url.startsWith(adminPreviewUrls) &&
    urlObj.host.endsWith(adminPreviewDomain) // previews
  );
};

export const isAdminOrLocalhost = (req: Request): boolean => {
  const referer = req.headers.get("origin") ?? req.headers.get("referer");
  const isOnAdmin = referer && isAdmin(referer);
  const url = new URL(req.url);
  const isLocalhost = ["localhost", "127.0.0.1"].includes(url.hostname);
  return isOnAdmin || isLocalhost;
};

export const adminUrlFor = (
  pageId: string | number,
  siteId: number,
): string => {
  return `${adminDomain}/admin/${siteId}/pages/${pageId}?sort=asc`;
};

export const resolvable = (ref: string, id: string): JSONSchema7 => {
  return {
    title: `#${ref}@${id}`,
    type: "object",
    required: ["__resolveType"],
    properties: {
      __resolveType: {
        type: "string",
        enum: [id],
        default: id,
      },
    },
  };
};
