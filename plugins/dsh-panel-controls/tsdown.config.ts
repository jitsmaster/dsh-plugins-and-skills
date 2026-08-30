import { clientBundle } from '/Volumes/Satechi 1/Dev/deepseek-harness/packages/client/tsdown.client.ts'

// Build the dual-face bundle: host `lib/index.js` + browser `lib/client.js`.
// The client half is registered through the loader so the web GUI mounts it.
export default clientBundle('dsh-panel-controls', ['lib/types/index.js'])
