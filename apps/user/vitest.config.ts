import { defineConfig, mergeConfig } from 'vitest/config';
import base from '../../vitest.config';

// Participant-app unit tests (nickname generator, API client) run in node.
export default mergeConfig(base, defineConfig({}));
