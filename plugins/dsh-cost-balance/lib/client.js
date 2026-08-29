// dsh-cost-balance — Client half (web)
// 输入框下方（conversation.composer.dock）的 iOS 风格小黑条：默认折叠，
// 点击展开为半透明毛玻璃多行面板，展示轮次/耗时/缓存命中/Token/花费/余额。
// 数据经同源 /api/cost-balance 路由从 Host 读取。
window.__ModuleLoader__.load({
  id: 'dsh-cost-balance',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const CSS =
      '.cbPill{position:relative;display:flex;flex-direction:column;align-items:center;padding:2px 0 4px}' +
      '.cbPill_bar{width:120px;height:5px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-secondary) 38%,transparent);cursor:pointer;border:none;padding:0;transition:opacity .15s ease}' +
      '.cbPill_bar:hover{opacity:.7}' +
      '.cbPill_panel{position:absolute;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);z-index:50;box-sizing:border-box;min-width:280px;max-width:min(420px,calc(100vw - 48px));background:color-mix(in srgb,var(--dsw-specific-menu) 80%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;box-shadow:var(--dsw-shadow-lv3);padding:10px 14px;font-size:12px;line-height:22px}' +
      '.cbPill_row{justify-content:space-between;align-items:center;gap:12px;display:flex}' +
      '.cbPill_label{color:var(--dsw-alias-label-tertiary);flex:none}' +
      '.cbPill_value{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);font-weight:500;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.cbPill_hint{color:var(--dsw-alias-label-caption);text-align:center;margin-top:4px}' +
      '.cbSbi{position:relative;display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;width:100%;min-height:34px;padding:4px 10px;font-size:12px;line-height:16px;border:none;cursor:pointer;background:transparent;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '.cbSbiWrap{position:relative;width:100%}' +
      '.cbSbi:hover{background:color-mix(in srgb,var(--dsw-alias-label-secondary) 9%,transparent)}' +
      '.cbSbi_dot{width:8px;height:8px;border-radius:999px;flex:none}' +
      '.cbSbi_peak .cbSbi_dot{background:#e5484d}' +
      '.cbSbi_off .cbSbi_dot{background:#30a46c}' +
      '.cbSbi_glow{color:#e5484d}' +
      '.cbSbi_glow .cbSbi_dot{box-shadow:0 0 9px 2px rgba(229,72,77,.85);animation:cbSbiPulse 1.6s ease-in-out infinite}' +
      '@keyframes cbSbiPulse{0%,100%{box-shadow:0 0 4px 1px rgba(229,72,77,.5)}50%{box-shadow:0 0 11px 3px rgba(229,72,77,.95)}}' +
      '.cbSbi_val{font-weight:600;color:inherit}' +
      '.cbSbi_pop{position:absolute;bottom:calc(100% + 12px);left:0;z-index:60;box-sizing:border-box;min-width:220px;background:color-mix(in srgb,var(--dsw-specific-menu) 88%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:var(--dsw-shadow-lv3);padding:10px 14px;font-size:12px;line-height:20px;text-align:left}' +
      '.cbSbi_popRow{display:flex;justify-content:space-between;align-items:center;gap:12px}' +
      '.cbSbi_popLabel{color:var(--dsw-alias-label-tertiary)}' +
      '.cbSbi_popVal{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);font-weight:600;text-align:right}'
    const CSS_TAG = 'dsh-cost-balance/stats'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + CSS_TAG + '"]') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-cost-balance'
      tag.dataset.pluginCss = CSS_TAG
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    function formatTokens(n) {
      const scaled = (v) => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10))
      if (n < 1e3) return String(n)
      if (n < 1e6) return scaled(n / 1e3) + 'K'
      return scaled(n / 1e6) + 'M'
    }
    function formatDuration(ms) {
      const s = ms / 1e3
      if (s < 60) return String(Math.round(s * 10) / 10) + 's'
      const whole = Math.round(s)
      return Math.floor(whole / 60) + 'm' + (whole % 60) + 's'
    }
    function formatTokensPerSecond(tps) {
      const clamped = Math.max(0, tps)
      return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
    }
    function usageOutputTokens(usage) {
      if (typeof usage !== 'object' || usage === null) return null
      const value = usage.outputTokens
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
    }
    function assistantStepReading(node) {
      const timing = node.timing
      return {
        ttftMs: timing !== void 0 && timing.stepStartTime !== null && timing.firstTokenTime !== null
          ? Math.max(0, timing.firstTokenTime - timing.stepStartTime)
          : null,
        decodeMs: timing !== void 0 && timing.firstTokenTime !== null
          ? Math.max(0, timing.completedTime - timing.firstTokenTime)
          : null,
        outputTokens: usageOutputTokens(node.usage),
      }
    }
    function deriveStats(nodes) {
      const turns = new Set()
      let steps = 0
      let llmMs = 0
      let toolMs = 0
      let ttftMs = 0
      let ttftSteps = 0
      let decodeMs = 0
      let decodeTokens = 0
      for (const node of nodes) {
        if (node.kind === 'tool-result') {
          if (node.callTime !== null) toolMs += Math.max(0, node.time - node.callTime)
          continue
        }
        if (node.kind !== 'assistant') continue
        turns.add(node.turn)
        steps += 1
        if (node.timing !== void 0 && node.timing.stepStartTime !== null) {
          llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime)
        }
        const reading = assistantStepReading(node)
        if (reading.ttftMs !== null) {
          ttftMs += reading.ttftMs
          ttftSteps += 1
        }
        if (reading.decodeMs !== null && reading.outputTokens !== null) {
          decodeMs += reading.decodeMs
          decodeTokens += reading.outputTokens
        }
      }
      return { turns: turns.size, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens }
    }
    function billedInputTokens(usage) {
      return usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
    }
    function cacheHitPercent(usage) {
      const denominator = billedInputTokens(usage)
      return denominator === 0 ? null : Math.round((usage.cacheReadTokens / denominator) * 100)
    }
    function formatCost(cost) {
      return cost >= 1 ? cost.toFixed(2) : cost.toFixed(4)
    }
    function currencySymbol(currency) {
      if (currency === 'CNY') return '¥'
      if (currency === 'USD') return '$'
      return currency + ' '
    }
    function fetchReadout(usage) {
      const q = new URLSearchParams({
        uncached: String(usage.uncachedInputTokens ?? 0),
        cacheRead: String(usage.cacheReadTokens ?? 0),
        cacheWrite: String(usage.cacheWriteTokens ?? 0),
        output: String(usage.outputTokens ?? 0),
      })
      return fetch('/api/cost-balance?' + q.toString(), {
        headers: { accept: 'application/json' },
      }).then((r) => r.json())
    }

    // —— 侧栏指示器（sidebar.footer.action）——
    // 始终显示；点击弹出面板展示当前余额与下一档（高峰/谷时）开始时间（本地时区）。

    // 空 usage 只取余额与峰谷标记（花费字段无意义，忽略）。
    function fetchBalanceOnly() {
      return fetch('/api/cost-balance', {
        headers: { accept: 'application/json' },
      }).then((r) => r.json())
    }

    // 判断给定时刻（UTC）是否处于高峰计费时段。周末（北京周六/周日）全天谷时；
    // 工作日按 UTC 小时窗口（peakWindows）判断。与 Host 的 isPeakHours 保持一致。
    function beijingDayOfWeek(now) {
      return new Date(now.getTime() + 8 * 3600 * 1000).getUTCDay() // 0=周日 … 6=周六
    }
    function isPeakHours(now, windows, weekendValley) {
      if (weekendValley) {
        const day = beijingDayOfWeek(now)
        if (day === 0 || day === 6) return false
      }
      const h = now.getUTCHours()
      return windows.some(([start, end]) => h >= start && h < end)
    }

    // 从 peakWindows（UTC 小时，如 [[1,4],[6,10]]）与 weekendValley 计算下一个档位切换时刻（UTC）。
    // 返回 { time: Date, kind: 'peak' | 'valley' }。周末全天谷时，因此下一档可能落在周末边界上。
    // 用 1 分钟步长向前扫描（上限 8 天），找到第一个峰谷状态翻转的时刻，保证跨周末正确。
    function nextTransition(now, windows, weekendValley) {
      const startPeak = isPeakHours(now, windows, weekendValley)
      const stepMs = 60 * 1000
      const maxMs = 8 * 24 * 60 * 60 * 1000
      let t = now.getTime()
      const end = now.getTime() + maxMs
      for (t += stepMs; t <= end; t += stepMs) {
        const cand = new Date(t)
        if (isPeakHours(cand, windows, weekendValley) !== startPeak) {
          return { time: cand, kind: startPeak ? 'valley' : 'peak' }
        }
      }
      return undefined
    }

    // 用本地时区格式化一个 UTC Date（非北京时间——toLocaleString 按浏览器时区）。
    // 含星期（本地时区），如 "周三 8/29 09:00"。
    function formatLocalTime(d) {
      if (d === null || d === undefined) return '--'
      try {
        return d.toLocaleString([], {
          weekday: 'short',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      } catch {
        return String(d)
      }
    }

    function SidebarIndicator(props) {
      const [open, setOpen] = React.useState(false)
      const [readout, setReadout] = React.useState(null)
      const refresh = React.useCallback(() => {
        fetchBalanceOnly().then((result) => {
          setReadout(result !== null && typeof result === 'object' ? result : null)
        }).catch(() => {
          setReadout(null)
        })
      }, [])
      React.useEffect(() => {
        refresh()
      }, [refresh])
      // Poll balance/peak on an interval. Use window.setInterval directly:
      // `ctx` is not in scope inside this component (only inside apply), so
      // the previous ctx.interval(...) threw and crashed the slot entry.
      React.useEffect(() => {
        const timer = window.setInterval(() => refresh(), 15 * 60 * 1000)
        return () => window.clearInterval(timer)
      }, [refresh])

      const windows = readout !== null && Array.isArray(readout.peakWindows) ? readout.peakWindows : null
      const weekendValley = readout !== null ? readout.weekendValley !== false : true
      // 高峰状态优先用本地逻辑判断（周末全天谷时，跨周末正确）；无窗口时回退到服务端 peak。
      const peak = windows !== null
        ? isPeakHours(new Date(), windows, weekendValley)
        : readout !== null && readout.peak === true
      const balance = readout !== null && readout.balance !== null
        && typeof readout.balance === 'object' && readout.balance.available
        ? readout.balance
        : null
      const balanceValue = balance !== null ? Number(balance.balance) : null
      const low = balanceValue !== null && Number.isFinite(balanceValue) && balanceValue <= 2
      const glow = peak || low
      const label = peak ? '高峰' : '谷时'
      const cls = 'cbSbi' + (peak ? ' cbSbi_peak' : ' cbSbi_off') + (glow ? ' cbSbi_glow' : '')
      const balanceText = balance !== null ? currencySymbol(balance.currency) + balance.balance : '--'

      // 下一档切换：当前为高峰则下一档是谷时，否则下一档是高峰。周末全天谷时，跨周末也能正确推算。
      const next = windows === null ? null : nextTransition(new Date(), windows, weekendValley)

      const popRows = []
      popRows.push(['当前', label])
      popRows.push(['余额', balanceText])
      popRows.push(['下一档', next === null ? '--' : (next.kind === 'peak' ? '高峰 ' : '谷时 ') + formatLocalTime(next.time)])

      return React.createElement('div', { className: 'cbSbiWrap' }, [
        React.createElement('button', {
          type: 'button',
          key: 'btn',
          className: cls,
          title: (glow ? '⚠ ' : '') + label + ' · 余额 ' + balanceText + '（点击查看高峰时间）',
          'aria-expanded': open,
          onClick: () => setOpen(!open),
        }, [
          React.createElement('span', { className: 'cbSbi_dot', key: 'dot' }),
          props.wide
            ? React.createElement('span', { key: 'txt' }, [
                React.createElement('span', { key: 'label' }, label),
                React.createElement('span', { className: 'cbSbi_val', key: 'val' }, ' ' + balanceText),
              ])
            : null,
        ]),
        open
          ? React.createElement('div', { className: 'cbSbi_pop', key: 'pop' },
            popRows.map((row, i) => React.createElement('div', { className: 'cbSbi_popRow', key: i }, [
              React.createElement('span', { className: 'cbSbi_popLabel', key: 'l' }, row[0]),
              React.createElement('span', { className: 'cbSbi_popVal', key: 'v' }, row[1]),
            ])))
          : null,
      ])
    }

    function StatsPill(props) {
      const settledNodes = props.useSession((s) => s.chat.legacy.nodes)
      const usage = props.useProjection('tokenUsage')
      const projected = props.useProjection('sessionStats')
      const stats = React.useMemo(() => projected ?? deriveStats(settledNodes), [projected, settledNodes])
      const [open, setOpen] = React.useState(false)
      const [readout, setReadout] = React.useState(null)
      const usageKey = usage === void 0
        ? ''
        : [usage.uncachedInputTokens, usage.cacheReadTokens, usage.cacheWriteTokens, usage.outputTokens].join(',')
      const refresh = React.useCallback(() => {
        if (usage === void 0) return
        fetchReadout(usage).then((result) => {
          setReadout(result !== null && typeof result === 'object' ? result : null)
        }).catch(() => {
          setReadout(null)
        })
      }, [usageKey])
      React.useEffect(() => {
        refresh()
      }, [refresh])
      React.useEffect(() => {
        const timer = window.setInterval(() => refresh(), 15 * 60 * 1000)
        return () => window.clearInterval(timer)
      }, [refresh])

      const rows = []
      if (stats.steps > 0) {
        rows.push(['轮次 · 步数', stats.turns + ' 轮 · ' + stats.steps + ' 步'])
        if (stats.llmMs > 0) rows.push(['LLM 耗时', formatDuration(stats.llmMs)])
        if (stats.toolMs > 0) rows.push(['工具调用', formatDuration(stats.toolMs)])
        if (stats.ttftSteps > 0) rows.push(['首 token 平均', formatDuration(stats.ttftMs / stats.ttftSteps)])
        if (stats.decodeMs > 0) rows.push(['吞吐', formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1e3)) + ' tok/s'])
      }
      if (usage !== void 0 && (billedInputTokens(usage) > 0 || usage.outputTokens > 0)) {
        const cacheHit = cacheHitPercent(usage)
        if (cacheHit !== null) rows.push(['缓存命中', cacheHit + '%'])
        rows.push(['Token', '输入 ' + formatTokens(billedInputTokens(usage)) + ' · 输出 ' + formatTokens(usage.outputTokens)])
      }
      if (readout !== null) {
        const cost = typeof readout.cost === 'number' ? readout.cost : null
        if (cost !== null) rows.push(['花费', '$' + formatCost(cost)])
        const balance = readout.balance !== null && typeof readout.balance === 'object' && readout.balance.available
          ? readout.balance
          : null
        rows.push(['余额', balance !== null ? currencySymbol(balance.currency) + balance.balance : '--'])
      }

      return React.createElement('div', { className: 'cbPill' }, [
        open
          ? React.createElement('div', { className: 'cbPill_panel', key: 'panel' }, [
            rows.length === 0
              ? React.createElement('div', { className: 'cbPill_hint', key: 'hint' }, '暂无数据')
              : rows.map((row, i) => React.createElement('div', { className: 'cbPill_row', key: i }, [
                React.createElement('span', { className: 'cbPill_label', key: 'l' }, row[0]),
                React.createElement('span', { className: 'cbPill_value', key: 'v' }, row[1]),
              ])),
          ])
          : null,
        React.createElement('button', {
          key: 'bar',
          type: 'button',
          className: 'cbPill_bar',
          'aria-label': open ? '收起会话统计' : '展开会话统计',
          'aria-expanded': open,
          onClick: () => setOpen(!open),
        }),
      ])
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('conversation.composer.dock', () => slots.register(
        { name: 'conversation.composer.dock', id: 'stats', order: 0, priority: -1 },
        (props) => React.createElement(StatsPill, props),
      ))
      // 侧栏指示器：位于设置上方（sidebar.footer.action），每会话独立开关。
      slots.inject('sidebar.footer.action', () => slots.register(
        { name: 'sidebar.footer.action', id: 'cost-balance-sidebar', order: -10, label: 'dsh-cost-balance' },
        (props) => React.createElement(SidebarIndicator, props),
      ))
    }

    exports.apply = apply
    exports.inject = ['timer']
    return module.exports
  },
})
