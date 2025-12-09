import { onRequestPost as __api_save_ts_onRequestPost } from "D:\\anime-role-grid-master\\functions\\api\\save.ts"
import { onRequestOptions as __api_search_ts_onRequestOptions } from "D:\\anime-role-grid-master\\functions\\api\\search.ts"
import { onRequestPost as __api_search_ts_onRequestPost } from "D:\\anime-role-grid-master\\functions\\api\\search.ts"
import { onRequestGet as __api_vndb_image_ts_onRequestGet } from "D:\\anime-role-grid-master\\functions\\api\\vndb-image.ts"

export const routes = [
    {
      routePath: "/api/save",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_save_ts_onRequestPost],
    },
  {
      routePath: "/api/search",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_search_ts_onRequestOptions],
    },
  {
      routePath: "/api/search",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_search_ts_onRequestPost],
    },
  {
      routePath: "/api/vndb-image",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_vndb_image_ts_onRequestGet],
    },
  ]