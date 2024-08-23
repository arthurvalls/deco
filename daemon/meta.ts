import type { JSONSchema } from "deco/types.ts";
import { broadcast } from "./sse/channel.ts";
import { dispatchWorkerState, worker } from "./worker.ts";

export type BlockMap = Record<string, { $ref: string; namespace: string }>;

export interface ManifestBlocks {
  blocks: Record<string, BlockMap>;
}

export interface MetaInfo {
  major: number;
  namespace: string;
  version: string;
  schema: {
    definitions: Record<string, JSONSchema>;
    root: Record<string, JSONSchema>;
  };
  manifest: ManifestBlocks;
  site: string;
  etag?: string;
  timestamp: number;
}

export type MetaEvent = {
  type: "meta-info";
  detail: MetaInfo;
};

let meta: PromiseWithResolvers<MetaInfo> | MetaInfo = Promise.withResolvers<
  MetaInfo
>();

const metaRequest = (etag: string) =>
  new Request(`http://0.0.0.0/deco/meta?waitForChanges=true`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "If-None-Match": etag,
    },
  });

const isPromiseLike = <T>(
  x: T | PromiseWithResolvers<T>,
): x is PromiseWithResolvers<T> =>
  // @ts-expect-error typescript is wild
  typeof x.resolve === "function" && typeof x.reject === "function";

export const start = async (since: number): Promise<MetaEvent | null> => {
  const detail = isPromiseLike(meta) ? await meta.promise : meta;

  console.log("start meta", since, detail.timestamp, since >= detail.timestamp);

  if (since >= detail.timestamp) {
    return null;
  }

  return {
    type: "meta-info",
    detail,
  };
};

export const watchMeta = async () => {
  let etag = "";

  while (true) {
    try {
      const w = await worker();
      console.log("watching meta", { etag });
      const response = await w.fetch(metaRequest(etag));
      console.log("responded", { ok: response.ok });
      if (!response.ok) {
        throw new Error(`Failed to fetch meta info: ${response.statusText}`);
      }
      const m: MetaInfo = await response.json();

      etag = response.headers.get("etag") ?? etag;
      const withExtraParams = { ...m, etag, timestamp: Date.now() };

      if (isPromiseLike(meta)) {
        meta.resolve(withExtraParams);
        console.log("setting new meta");
      } else {
        console.log("not promise like");
      }
      meta = withExtraParams;

      broadcast({ type: "meta-info", detail: withExtraParams });
      dispatchWorkerState("ready");
    } catch (error) {
      dispatchWorkerState("updating");
      console.error(error);
    }
  }
};