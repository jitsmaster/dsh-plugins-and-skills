/**
 * dsh-panel-controls — browser half.
 *
 * A compact control in the sidebar foot that lets you:
 *  - Toggle the workspaces (left) area: calls the frame's `ctx.layout.toggleSidebar()`
 *    so the workspaces/session list expands to fill the left panel (or collapses
 *    to the rail) — enough room to see the workspaces listing on mobile.
 *  - Resize the Files (Explorer) width via -/+ (writes the
 *    `chat-workspace-width-px` preference; the aionui-panel re-reads it on its
 *    next init/reload).
 */

import React from 'react'

export const name = 'dsh-panel-controls'

export const inject = ['slots', 'layout']

const KEY_EXPLORER_WIDTH = 'chat-workspace-width-px'
const MIN_W = 220
const MAX_W = 500
const STEP_W = 40
const DEFAULT_W = 260

export function apply(ctx) {
  const layout = ctx.layout
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      { name: 'sidebar.footer.action', id: 'panel-controls', order: 90, label: 'Workspaces' },
      (props) => React.createElement(PanelControls, { layout, wide: props.wide }),
    ),
  )
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
  const layout = props.layout
  const [width, setWidth] = React.useState(readWidth)

  const toggleSidebar = () => {
    if (layout !== undefined && typeof layout.toggleSidebar === 'function') layout.toggleSidebar()
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
    button('⇤⇥', toggleSidebar, 'Toggle the workspaces (left) area — expand it to fill the left panel (mobile-friendly) or collapse to the rail', false),
    button('−', () => nudge(-STEP_W), 'Shrink Files panel width', false),
    React.createElement('span', { style: { minWidth: '26px', textAlign: 'center' } }, String(width)),
    button('+', () => nudge(STEP_W), 'Grow Files panel width', false),
  )
}
