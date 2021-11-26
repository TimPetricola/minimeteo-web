import { createCookie } from "remix";

export const searchHistory = createCookie("search-history", {
  maxAge: 604_800, // one week
});
