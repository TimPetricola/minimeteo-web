import type { LoaderFunction } from "remix";
import { optimize } from "svgo";
import Redis from "ioredis";

export const loader: LoaderFunction = async ({ params }) => {
  const redis = new Redis(process.env.REDIS_URL);

  const redisKey = `meteo:logo:${params.filename}`;

  const cachedSvg = await redis.get(redisKey);

  if (cachedSvg != null)
    return new Response(cachedSvg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });

  const response = await fetch(
    `https://meteofrance.com/modules/custom/mf_tools_common_theme_public/svg/weather/${params.filename}`
  );

  if (!response.ok) throw new Error("error");

  const raw = await response.text();

  const { data: svg } = optimize(raw, {
    multipass: true,
    plugins: [
      { name: "removeDoctype" },
      { name: "removeXMLProcInst" },
      { name: "removeComments" },
      { name: "removeMetadata" },
      { name: "removeEditorsNSData" },
      { name: "cleanupAttrs" },
      { name: "mergeStyles" },
      { name: "inlineStyles" },
      { name: "minifyStyles" },
      { name: "convertStyleToAttrs" },
      { name: "cleanupIDs" },
      { name: "removeRasterImages" },
      { name: "removeUselessDefs" },
      { name: "cleanupNumericValues" },
      { name: "convertColors" },
      { name: "removeUnknownsAndDefaults" },
      { name: "removeNonInheritableGroupAttrs" },
      { name: "removeUselessStrokeAndFill" },
      { name: "removeViewBox" },
      { name: "cleanupEnableBackground" },
      { name: "removeHiddenElems" },
      { name: "removeEmptyText" },
      { name: "convertShapeToPath" },
      { name: "moveElemsAttrsToGroup" },
      { name: "moveGroupAttrsToElems" },
      { name: "collapseGroups" },
      { name: "convertPathData" },
      { name: "convertEllipseToCircle" },
      { name: "convertTransform" },
      { name: "removeEmptyAttrs" },
      { name: "removeEmptyContainers" },
      { name: "mergePaths" },
      { name: "removeUnusedNS" },
      { name: "sortAttrs" },
      { name: "sortDefsChildren" },
      { name: "removeTitle" },
      { name: "removeDesc" },
      { name: "removeDimensions" },
    ],
    js2svg: {
      indent: 2,
      pretty: true,
    },
  });

  await redis
    .multi()
    .set(redisKey, svg)
    .expire(redisKey, 60 * 60 * 24 * 7) // expire every 7 days
    .exec();

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
};
