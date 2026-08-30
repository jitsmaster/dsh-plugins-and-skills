/**
 * dsh-panel-controls — browser half.
 *
 * A small control bar registered in the composer dock that lets you:
 *  1. Toggle "Workspaces focus": flips the `dsh-aionui-panel` `enabled`
 *     setting, which live unmounts/mounts the whole Files/Preview/SCM panel
 *     group — so the workspaces/chat column grows to fill the frame.
 *  2. Resize the Files (Explorer) panel width via +/- (writes the
 *     `chat-workspace-width-px` preference; the panel re-reads it on its next
 *     init/reload, since the aionui-panel keeps the width in a private store).
 *
 * All state is transient (in-memory / browser localStorage); no host service.
 */

export const name = 'dsh-panel-controls'

export const inject = ['slots']

const PANEL_NS = 'aionui-panel'
const KEY_EXPLORER_WIDTH = 'chat-workspace-width-px'
const MIN_W = 220
const MAX_W = 500
const STEP_W = 40
const DEFAULT_W = 260

export function apply(ctx) {
  ctx.inject(['slots'], (scope) => {
    const binder = scope.get('webUiSettings') ?? scope.get('settingsScope')
    scope.slots.inject('conversation.input.dock', () =>
      scope.slots.register(
        { name: 'conversation.input.dock', id: 'dsh-panel-controls', order: 90 },
        () => React.createElement(PanelControls, { binder }),
      ),
    )
  })
}

function readWidth() {
  let raw = 0
  try { raw = Number(localStorage.getItem(KEY_EXPLORER_WIDTH)) } catch { /* ignore */ }
  if (!Number.isFinite(raw)) return DEFAULT_W
  return Math.max(MIN_W, Math.min(MAX_W, raw))
}

function writeWidth(value) {
  const clamped = Math.max(MIN_W, Math.min(MAX_W, value))
  try { localStorage.setItem(KEY_EXPLORER_WIDTH, String(Math.round(clamped))) } catch { /* ignore */ }
  return clamped
}

function PanelControls(props) {
  const binder = props.binder
  const [width, setWidth] = React.useState(readWidth)
  const [focus, setFocus] = React.useState(false)

  const setEnabled = (enabled) => {
    if (binder === undefined) return
    try {
      const bound = typeof binder.bind === 'function'
        ? binder.bind({ namespace: PANEL_NS })
        : binder
      if (bound !== undefined && typeof bound.set === 'function') {
        bound.set('enabled', enabled)
      }
    } catch { /* live toggle is best-effort */ }
  }

  const toggleFocus = () => {
    const next = !focus
    setFocus(next)
    setEnabled(!next) // focus ON -> panels OFF (enabled=false)
  }

  const nudge = (delta) => {
    setWidth(writeWidth(readWidth() + delta))
  }

  return React.createElement(
    'div',
    { style: { display: 'flex', gap: '6px', alignItems: 'center', padding: '2px 0', fontSize: '12px' } },
    React.createElement(
      'button',
      { onClick: toggleFocus, title: 'Hide the Files/Preview/SCM panels so the workspaces grow (toggle back)', style: { cursor: 'pointer', padding: '2px 6px' } },
      focus ? 'Focus workspaces: ON' : 'Focus workspaces',
    ),
    React.createElement('span', { style: { opacity: 0.7 } }, 'File width'),
    React.createElement('button', { onClick: () => nudge(-STEP_W), style: { cursor: 'pointer', padding: '2px 6px' } }, '−'),
    React.createElement('span', { style: { minWidth: '30px', textAlign: 'center' } }, String(width)),
    React.createElement('button', { onClick: () => nudge(STEP_W), style: { cursor: 'pointer', padding: '2px 6px' } }, '+'),
  )
}
