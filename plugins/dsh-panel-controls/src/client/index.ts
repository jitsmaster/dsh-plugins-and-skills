/**
 * dsh-panel-controls — browser half.
 *
 * A compact control in the sidebar foot ("beside Settings") that lets you:
 *  - Toggle "Focus workspaces": flips the dsh-aionui-panel `enabled` setting
 *    live — hides the whole Files/Preview/SCM panel group so the workspaces /
 *    chat column grows, and toggles back.
 *  - Resize the Files (Explorer) width via -/+ (writes the
 *    `chat-workspace-width-px` preference; the aionui-panel re-reads it on its
 *    next init/reload).
 *
 * The aionui-panel itself keeps the width in a private store, so in-page live
 * resize of the Files panel is only via its own drag handle / collapse chevron.
 */

import React from 'react'

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
    scope.slots.inject('sidebar.footer.action', () =>
      scope.slots.register(
        { name: 'sidebar.footer.action', id: 'panel-controls', order: 90, label: 'Workspaces focus' },
        (props) => React.createElement(PanelControls, { binder, wide: props.wide }),
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
      const bound = typeof binder.bind === 'function' ? binder.bind({ namespace: PANEL_NS }) : binder
      if (bound !== undefined && typeof bound.set === 'function') bound.set('enabled', enabled)
    } catch { /* live toggle is best-effort */ }
  }

  const toggleFocus = () => {
    const next = !focus
    setFocus(next)
    setEnabled(!next) // focus ON -> panels OFF (enabled=false), so workspaces grow
  }

  const nudge = (delta) => setWidth(writeWidth(readWidth() + delta))

  const button = (label, onClick, title, active) => React.createElement(
    'button',
    { onClick, title, style: { cursor: 'pointer', padding: '2px 6px', fontWeight: active ? 700 : 400 } },
    label,
  )

  return React.createElement(
    'div',
    { style: { display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px' } },
    button(focus ? '◱' : '◻', toggleFocus, 'Focus workspaces — hide the Files/Preview/SCM panels so the workspaces/chat grow (toggle back)', focus),
    button('−', () => nudge(-STEP_W), 'Shrink Files panel width', false),
    React.createElement('span', { style: { minWidth: '26px', textAlign: 'center' } }, String(width)),
    button('+', () => nudge(STEP_W), 'Grow Files panel width', false),
  )
}
