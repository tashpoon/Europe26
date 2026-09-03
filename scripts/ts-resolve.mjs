/**
 * Lets plain Node resolve the extensionless relative imports and the "@/..."
 * alias that TypeScript and Next understand natively, so test scripts can
 * import application modules without the source being reshaped to suit them.
 *
 * Used as: node --import ./scripts/ts-resolve.mjs --experimental-strip-types ...
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      const ROOT = ${JSON.stringify(pathToFileURL(process.cwd()).href)} + "/";
      export async function resolve(specifier, context, next) {
        const spec = specifier.startsWith("@/")
          ? new URL(specifier.slice(2), ROOT).href
          : specifier;
        try {
          return await next(spec, context);
        } catch (err) {
          for (const ext of [".ts", ".tsx", "/index.ts"]) {
            try {
              return await next(spec + ext, context);
            } catch {}
          }
          throw err;
        }
      }
    `),
  import.meta.url,
);
