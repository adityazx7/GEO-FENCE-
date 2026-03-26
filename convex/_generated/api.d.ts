/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as ai_internal from "../ai_internal.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as authHelpers from "../authHelpers.js";
import type * as auth_internal from "../auth_internal.js";
import type * as files from "../files.js";
import type * as geoFences from "../geoFences.js";
import type * as geospatial from "../geospatial.js";
import type * as issues from "../issues.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  ai_internal: typeof ai_internal;
  analytics: typeof analytics;
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  auth_internal: typeof auth_internal;
  files: typeof files;
  geoFences: typeof geoFences;
  geospatial: typeof geospatial;
  issues: typeof issues;
  notifications: typeof notifications;
  projects: typeof projects;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
