// dsh-cost-balance — Host half
// 会话花费计算 + DeepSeek 账户余额抓取，经 webServer 路由提供给客户端。
//
// 花费 = 会话累计 token × 模型单价。token 桶由客户端从 tokenUsage 投影读取后随请求传入；
// 余额走 DeepSeek 官方 /user/balance 接口，API Key 通过官方凭据服务（DEEPSEEK_API_KEY）解析。

export const name = 'dsh-cost-balance'

// webServer 行声明了 inject: [webStartup]，其注册是异步的；声明硬依赖让本插件
// 等待服务出现后再 apply，避免启动时序下取不到路由注册点。
export const inject = ['webServer']

// 官方定价（USD / 1M tokens）。来源：https://api-docs.deepseek.com/quick_start/pricing
// 注：DeepSeek 于 2026-08-16 16:00 UTC 起切换峰谷计费（off-peak 为 peak 一半），届时可在
// profile 的 cordis.patch.yml 里用 config.prices 覆盖，无需改代码。
const DEFAULT_PRICES = {
  'deepseek-v4-flash': { cacheHit: 0.0028, cacheMiss: 0.14, output: 0.28 },
  'deepseek-v4-pro': { cacheHit: 0.003625, cacheMiss: 0.435, output: 0.87 },
}

const BALANCE_URL = 'https://api.deepseek.com/user/balance'

// 峰谷计费窗口（UTC 小时，半开区间 [start, end)）。来源：DeepSeek 2026-08-16 定价变更，
// 高峰 = UTC 01:00–04:00 与 06:00–10:00（即北京 09:00–12:00、14:00–18:00），off-peak 为 peak 一半。
// 2026-08-23 起 DeepSeek 再调整价：周末（周六/周日）全天按谷时计费，不再分峰谷。
// 工作日窗口可在 profile 的 cordis.patch.yml 里用 config.peakWindows 覆盖。
const DEFAULT_PEAK_WINDOWS = [[1, 4], [6, 10]]
// 周末是否全天谷时。2026-08-23 起 DeepSeek 规则如此；可用 config.weekendValley 覆盖（默认 true）。
const DEFAULT_WEEKEND_VALLEY = true

// 判断给定时刻（UTC）对应北京时区的星期几（0=周日 … 6=周六）。
function beijingDayOfWeek(now) {
  return new Date(now.getTime() + 8 * 3600 * 1000).getUTCDay()
}

// 判断给定时刻是否处于高峰计费时段。周末（北京周六/周日）全天谷时；
// 工作日按 UTC 小时窗口（peakWindows）判断。
function isPeakHours(now, windows = DEFAULT_PEAK_WINDOWS, weekendValley = DEFAULT_WEEKEND_VALLEY) {
  if (weekendValley) {
    const day = beijingDayOfWeek(now)
    if (day === 0 || day === 6) return false
  }
  const h = now.getUTCHours()
  return windows.some(([start, end]) => h >= start && h < end)
}

function sendJson(res, code, value) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(value))
}

export function apply(ctx, config = {}) {
  const prices = { ...DEFAULT_PRICES, ...(config.prices ?? {}) }
  const peakWindows = config.peakWindows ?? DEFAULT_PEAK_WINDOWS
  const weekendValley = config.weekendValley ?? DEFAULT_WEEKEND_VALLEY
  let balanceCache = null
  let failureAt = 0

  const computeCost = (usage) => {
    const model = ctx.get('agentDefaultModel')?.currentSelection()?.model || 'deepseek-v4-flash'
    const p = prices[model] ?? prices['deepseek-v4-flash']
    const perMillion = (n, price) => (Math.max(0, Number(n) || 0) / 1e6) * price
    const cost = perMillion(usage.uncached, p.cacheMiss)
      + perMillion(usage.cacheRead, p.cacheHit)
      + perMillion(usage.cacheWrite, p.cacheMiss)
      + perMillion(usage.output, p.output)
    return { cost, model }
  }

  const fetchBalance = async (force = false) => {
    const now = Date.now()
    if (!force && balanceCache !== null && now - balanceCache.at < 60000) return balanceCache.data
    if (now - failureAt < 30000) return { available: false, reason: 'throttled' }
    try {
      const credentials = ctx.get('credentials')
      if (credentials === undefined) return { available: false, reason: 'no-credentials-service' }
      const hit = await credentials.resolve('DEEPSEEK_API_KEY')
      if (hit === undefined) return { available: false, reason: 'no-api-key' }
      const shell = ctx.get('shell')
      if (shell === undefined) return { available: false, reason: 'no-shell-service' }
      const result = await shell.run(shell.resolve({
        command: 'curl -sS --max-time 15 -H "Authorization: Bearer $DSH_CB_KEY" "' + BALANCE_URL + '"',
        env: { DSH_CB_KEY: hit.value },
        timeoutMs: 20000,
      }))
      if (result.exitCode !== 0) throw new Error('curl exit ' + result.exitCode)
      const parsed = JSON.parse(result.stdout.text)
      const info = parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.balance_infos)
        ? parsed.balance_infos[0]
        : undefined
      if (info === undefined) throw new Error('unexpected balance response')
      const data = {
        available: true,
        balance: String(info.total_balance),
        currency: String(info.currency),
      }
      balanceCache = { at: now, data }
      return data
    } catch (error) {
      failureAt = Date.now()
      console.error('[dsh-cost-balance] balance fetch failed', error)
      return { available: false, reason: 'error', message: String((error && error.message) || error) }
    }
  }

  const webServer = ctx.get('webServer')
  if (webServer === undefined) return

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/api/cost-balance',
    handler: async (req, res) => {
      let usage = { uncached: 0, cacheRead: 0, cacheWrite: 0, output: 0 }
      let force = false
      try {
        const url = new URL(req.url ?? '/', 'http://x')
        usage = {
          uncached: Number(url.searchParams.get('uncached') ?? 0),
          cacheRead: Number(url.searchParams.get('cacheRead') ?? 0),
          cacheWrite: Number(url.searchParams.get('cacheWrite') ?? 0),
          output: Number(url.searchParams.get('output') ?? 0),
        }
        force = url.searchParams.get('force') === '1'
      } catch {
        // 参数缺省按全零处理
      }
      const { cost, model } = computeCost(usage)
      const balance = await fetchBalance(force)
      sendJson(res, 200, {
        cost,
        model,
        peak: isPeakHours(new Date(), peakWindows, weekendValley),
        peakWindows,
        weekendValley,
        balance,
      })
    },
  }))
}
