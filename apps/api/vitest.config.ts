import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../vitest.config';

// API unit tests (pure libs + SessionRoomCore) run in the node environment.
// The Workers-specific glue (DO hibernation handlers) is verified via `wrangler dev`
// E2E rather than a workers test pool.
export default mergeConfig(base, defineConfig({}));
