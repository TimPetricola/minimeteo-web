import { createCookie } from "remix";
import { Place } from "./types";

const recentPlacesCookie = createCookie("search-history", {
  maxAge: 604_800, // one week
});

export const getRecentPlaces = async (
  rawCookie: string | null
): Promise<Place[]> =>
  (await recentPlacesCookie.parse(rawCookie))?.places ?? [];

export const setRecentPlaces = async (recentPlaces: Place[]) =>
  await recentPlacesCookie.serialize({ places: recentPlaces });
