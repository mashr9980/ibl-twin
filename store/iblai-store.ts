
/**
 * ibl.ai Redux store.
 *
 * This standalone store holds the RTK Query API cache and (optionally)
 * chat / file‑upload slices. Import and wrap your app with:
 *
 *   import { iblaiStore } from "@/store/iblai-store";
 *   <Provider store={iblaiStore}>…</Provider>
 *
 * If you already have a Redux store, merge the reducers and middleware
 * from this file into yours instead.
 */

import { configureStore } from "@reduxjs/toolkit";
import {
  coreApiSlice,
  mentorReducer,
  mentorMiddleware,
} from "@iblai/iblai-js/data-layer";
import {
  chatSliceReducerShared,
  filesReducer,
  rbacReducer,
} from "@iblai/iblai-js/web-utils";

export const iblaiStore = configureStore({
  reducer: {
    // Core API cache (auth, tenant, user metadata, etc.)
    [coreApiSlice.reducerPath]: coreApiSlice.reducer,

    // Mentor/chat API slices
    ...mentorReducer,

    // Shared chat state (messages, streaming, sessions)
    chatSliceShared: chatSliceReducerShared,

    // File upload state
    files: filesReducer,

    // Tenant RBAC flags. TenantProvider fetches them on auth and hands them
    // to onLoadPlatformPermissions; without this reducer they have nowhere
    // to live and every vibe container falls back to "everyone is admin".
    rbac: rbacReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .concat(coreApiSlice.middleware)
      .concat(...mentorMiddleware),
});

export type IblaiRootState = ReturnType<typeof iblaiStore.getState>;
export type IblaiAppDispatch = typeof iblaiStore.dispatch;
