/**
 * dsh-panel-controls — host half.
 *
 * The real work is in the browser half (./client): a control bar that
 * (a) toggles the `dsh-aionui-panel` `enabled` setting live so the whole
 * Files/Preview/SCM panel group unmounts/mounts (growing the workspaces/chat
 * column), and (b) writes the Files-panel width preference.
 *
 * This host half is deliberately a no-op: the plugin exposes no host service,
 * so it only needs to be a valid Cordis plugin row so the browser bundle is
 * loaded. `inject` stays empty so the row mounts regardless of host services.
 */

export const name = 'dsh-panel-controls'

export function apply(): void {
  // Nothing to register on the host; all behavior lives in the client half.
}
