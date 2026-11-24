#!/usr/bin/env node
// kdev: the Kicho devflow helper (skill kicho-devflow). Talks to Kicho's MCP endpoint over HTTP with the machine's
// personal token and prints only short results (ids, links, compact text), so screenshots, logs and long pages never
// pass through the agent's context. Node 18+, no dependencies. `node kdev.mjs help` lists the commands.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { createHash } from 'node:crypto'
import path from 'node:path'

const BASE = (process.env.KICHO_URL || 'https://kicho.hoang.jp').replace(/\/$/, '')
const CONFIG = '.kicho-devflow.json'
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

// Request status → page icon (the icon shows the status in the page tree) and the label on the "Trạng thái" line.
const REQ_STATUS = {
  review: ['🟡', 'Chờ anh duyệt'],
  approved: ['🟢', 'Đã duyệt, chờ triển khai'],
  doing: ['🔨', 'Đang triển khai'],
  testing: ['🧪', 'Đang kiểm thử'],
  released: ['✅', 'Đã phát hành'],
  paused: ['⏸️', 'Tạm dừng'],
  cancelled: ['✖️', 'Đã huỷ'],
}
const OPEN_ICONS = new Set(['🟡', '🟢', '🔨', '🧪', '⏸️'])

// Structure under the hub page (created by `init`, found again by title).
const HUB_PAGES = {
  handbook: ['📘', 'Quy trình làm việc'],
  requests: ['📥', 'Yêu cầu'],
  brainstorm: ['🧠', 'Brainstorm'],
}
const TASKS_DB = ['✅', 'Việc của agent']
const RELEASES_DB = ['🚀', 'Phát hành']

const TASK_STATUS = [
  { name: 'Chờ duyệt', color: 'yellow', group: 'todo' },
  { name: 'Sẵn sàng', color: 'blue', group: 'todo' },
  { name: 'Hoãn', color: 'grey', group: 'todo' },
  { name: 'Đang làm', color: 'orange', group: 'in_progress' },
  { name: 'Kiểm thử', color: 'purple', group: 'in_progress' },
  { name: 'Xong', color: 'green', group: 'complete' },
  { name: 'Bỏ', color: 'red', group: 'complete' },
]

function die(msg) {
  process.stderr.write(`kdev: ${msg}\n`)
  process.exit(1)
}

function token() {
  if (process.env.KICHO_TOKEN) return process.env.KICHO_TOKEN.trim()
  const f = path.join(homedir(), '.config', 'kicho', 'token')
  if (existsSync(f)) return readFileSync(f, 'utf8').trim()
  const cj = path.join(homedir(), '.claude.json')
  if (existsSync(cj)) {
    const h = JSON.parse(readFileSync(cj, 'utf8'))?.mcpServers?.kicho?.headers?.Authorization
    if (h) return String(h).replace(/^Bearer\s+/i, '')
  }
  die('no Kicho token: set KICHO_TOKEN or ~/.config/kicho/token, or add the kicho MCP server with a Bearer header (skill kicho)')
}

let rpcId = 0
async function rpc(method, params) {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token()}`,
      // Cloudflare refuses some default client signatures (error 1010): always send our own.
      'User-Agent': 'kicho-devflow/1.0',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  })
  if (res.status === 401) die('401 from Kicho: the token is invalid or expired (skill kicho → Connect a machine)')
  if (!res.ok) die(`HTTP ${res.status} from Kicho: ${(await res.text()).slice(0, 200)}`)
  const r = await res.json()
  if (r.error) die(`MCP error: ${JSON.stringify(r.error).slice(0, 300)}`)
  return r.result
}

async function call(name, args, { soft = false } = {}) {
  const r = await rpc('tools/call', { name, arguments: args })
  const text = (r.content ?? []).map((c) => c.text ?? '').join('\n')
  if (r.isError) {
    if (soft) return null
    die(`${name}: ${text.slice(0, 600)}`)
  }
  return text
}

// The server's tool names, cached for a day per server (tools/list is ~100 KB): a missing name refreshes once.
/** A tool call with `output: "json"` (REQ-004 B1): the parsed object, or null on a server without JSON output
 *  (the caller then falls back to reading the text). */
async function callJson(name, args, opts = {}) {
  const text = await call(name, { ...args, output: 'json' }, opts)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

let toolNames = null
const toolCache = () => path.join(homedir(), '.cache', 'kdev', `tools-${BASE.replace(/[^a-z0-9]+/gi, '_')}.json`)
async function fetchTools() {
  const names = ((await rpc('tools/list', {})).tools ?? []).map((t) => t.name)
  try {
    mkdirSync(path.dirname(toolCache()), { recursive: true })
    writeFileSync(toolCache(), JSON.stringify({ at: Date.now(), names }))
  } catch {}
  return new Set(names)
}
async function hasTool(name) {
  if (!toolNames) {
    try {
      const c = JSON.parse(readFileSync(toolCache(), 'utf8'))
      if (Date.now() - c.at < 86_400_000) toolNames = new Set(c.names)
    } catch {}
  }
  toolNames ??= await fetchTools()
  if (!toolNames.has(name)) toolNames = await fetchTools()
  return toolNames.has(name)
}

// ---------- args, config ----------

/** An option given once or several times (--field a=1 --field b=2) as a list. */
const many = (v) => (v === undefined || v === false ? [] : Array.isArray(v) ? v : [v])

function parseArgs(argv) {
  const pos = []
  const opt = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const k = a.slice(2)
      const next = argv[i + 1]
      const v = next === undefined || next.startsWith('--') ? true : argv[++i]
      opt[k] = k in opt ? [...many(opt[k]), v] : v
    } else pos.push(a)
  }
  return { pos, opt }
}

function findConfig(dir = process.cwd()) {
  for (let d = path.resolve(dir); ; d = path.dirname(d)) {
    const f = path.join(d, CONFIG)
    if (existsSync(f)) return f
    if (path.dirname(d) === d) return null
  }
}

function loadConfig() {
  const f = findConfig()
  if (!f) die(`no ${CONFIG} in this folder or above: run \`kdev init <hub_page_id>\` in the project root`)
  return { file: f, ...JSON.parse(readFileSync(f, 'utf8')) }
}

const url = (id) => `${BASE}/p/${id}`
/** The local date (the owner's day, not UTC). */
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const nowLocal = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function readInput(arg) {
  if (arg === '-') return readFileSync(0, 'utf8')
  if (typeof arg === 'string' && arg.startsWith('@')) return readFileSync(arg.slice(1), 'utf8')
  if (typeof arg === 'string' && existsSync(arg) && statSync(arg).isFile()) return readFileSync(arg, 'utf8')
  return arg
}

// ---------- page helpers ----------

/** Children of a page: [{icon, title, id}] from list_pages. */
async function children(parentId) {
  const j = await callJson('list_pages', { parent_id: parentId }, { soft: true })
  if (j?.pages) return j.pages.map((p) => ({ icon: p.icon ?? '', title: p.title ?? '', id: p.id }))
  const text = await call('list_pages', { parent_id: parentId })
  const out = []
  for (const line of text.split('\n')) {
    const m = /^- (.*?) \| id: ([0-9a-f-]{36})/.exec(line.trim())
    if (!m) continue
    const label = m[1]
    const sp = label.indexOf(' ')
    const first = sp > 0 ? label.slice(0, sp) : ''
    const isIcon = first && !/^[\p{L}\p{N}]/u.test(first)
    out.push({ icon: isIcon ? first : '', title: isIcon ? label.slice(sp + 1) : label, id: m[2] })
  }
  return out
}

/** Body blocks of a page: [{id, type, attrs, text, depth}] from get_page format=blocks. */
async function blocks(pageId, maxChars = 60000) {
  const text = await call('get_page', { page_id: pageId, max_chars: maxChars })
  const out = []
  for (const line of text.split('\n')) {
    const m = /^(\s*)([A-Za-z0-9_-]{6,64}) \| ([A-Za-z]+)(\(([^)]*)\))? \| ?(.*)$/.exec(line)
    if (m) out.push({ depth: m[1].length, id: m[2], type: m[3], attrs: m[5] ?? '', text: m[6] ?? '' })
  }
  return { raw: text, list: out }
}

async function ensurePage(parentId, icon, title, markdown) {
  const found = (await children(parentId)).find((c) => c.title === title)
  if (found) return found.id
  const text = await call('create_page', { parent_id: parentId, title, icon, ...(markdown ? { markdown } : {}) })
  return UUID.exec(/page_id ([0-9a-f-]{36})/.exec(text)?.[1] ?? '')?.[0] ?? die(`create_page: no id in ${text.slice(0, 200)}`)
}

/** A full-page database under parentId, found by title or created; returns {pageId, databaseId}. */
async function ensureDatabase(parentId, icon, title, setup) {
  const found = (await children(parentId)).find((c) => c.title === title)
  let pageId = found?.id
  if (!pageId) {
    const text = await call('create_database', { title, template: 'empty', inline: false, parent_id: parentId })
    pageId = /page_id ([0-9a-f-]{36})/.exec(text)?.[1] ?? die(`create_database: no page_id in ${text.slice(0, 300)}`)
    await call('update_page', { page_id: pageId, icon })
    const info = await call('get_database', { database_id: pageId })
    const dbId = /database_id[ :=]+([0-9a-f-]{36})/.exec(info)?.[1] ?? pageId
    // the empty template brings a "Tags" column and a "Table" view: drop the column, name the view
    if (/- Tags \(multi_select\)/.test(info)) await call('delete_property', { database_id: dbId, property: 'Tags' })
    if (/"Table" view_id=/.test(info)) await call('update_view', { database_id: dbId, view: 'Table', name: 'Tất cả' })
    await setup(dbId)
    return { pageId, databaseId: dbId }
  }
  const info = await call('get_database', { database_id: pageId })
  return { pageId, databaseId: /database_id[ :=]+([0-9a-f-]{36})/.exec(info)?.[1] ?? pageId }
}

async function findRequest(cfg, ref) {
  if (UUID.test(ref)) return { id: UUID.exec(ref)[0] }
  const num = Number(/(\d+)/.exec(ref)?.[1] ?? NaN)
  if (!num) die(`not a request id: ${ref}`)
  const hit = (await children(cfg.requests)).find((c) => reqNumber(c.title) === num)
  return hit ? { ...hit, req: /^REQ-/.test(hit.title) ? `REQ-${String(num).padStart(3, '0')}` : `R${num}` } : die(`request ${num} not found under ${url(cfg.requests)}`)
}

// ---------- commands ----------

const HANDBOOK = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'templates', 'handbook.md')

async function cmdInit({ pos, opt }) {
  const hub = UUID.exec(pos[0] ?? '')?.[0] ?? die('usage: kdev init <hub_page_id or url> [--project Name]')
  const project = opt.project || path.basename(process.cwd())
  const ids = { project, hub }
  const handbook = existsSync(HANDBOOK) ? readFileSync(HANDBOOK, 'utf8') : undefined
  ids.handbook = await ensurePage(hub, ...HUB_PAGES.handbook, handbook)
  ids.requests = await ensurePage(hub, ...HUB_PAGES.requests,
    'Mỗi lần anh gửi một loạt yêu cầu là một trang con ở đây: `REQ-NNN · ngày · tóm tắt`. Icon của trang là trạng thái: 🟡 chờ anh duyệt · 🟢 đã duyệt · 🔨 đang làm · 🧪 kiểm thử · ✅ đã phát hành · ⏸️ tạm dừng · ✖️ huỷ.')
  ids.brainstorm = await ensurePage(hub, ...HUB_PAGES.brainstorm,
    'Ý tưởng bàn cùng AI, mỗi buổi một trang con. Ý tưởng nào chốt làm thì thành một yêu cầu (REQ) và ghi link ngược về đây.')
  const tasks = await ensureDatabase(hub, ...TASKS_DB, async (db) => {
    await call('add_property', { database_id: db, name: 'ID', type: 'unique_id', show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Trạng thái', type: 'status', options: TASK_STATUS, show_on_cards: false })
    await call('add_property', { database_id: db, name: 'Yêu cầu', type: 'select', options: [], show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Hạng mục', type: 'select', options: [], show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Loại', type: 'select', show_on_cards: false,
      options: [{ name: 'Tính năng', color: 'blue' }, { name: 'Cải tiến', color: 'green' }, { name: 'Sửa lỗi', color: 'red' }, { name: 'Hạ tầng', color: 'grey' }] })
    await call('add_property', { database_id: db, name: 'Ưu tiên', type: 'select', show_on_cards: true,
      options: [{ name: 'P0', color: 'red' }, { name: 'P1', color: 'orange' }, { name: 'P2', color: 'grey' }] })
    await call('add_property', { database_id: db, name: 'Agent', type: 'select', options: [], show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Thời gian', type: 'date', show_on_cards: false })
    await call('add_property', { database_id: db, name: 'Commit', type: 'text', show_on_cards: false })
    await call('add_view', { database_id: db, type: 'board', name: 'Bảng', group_by: 'Trạng thái' })
    await call('add_view', { database_id: db, type: 'timeline', name: 'Timeline', date_property: 'Thời gian' })
    await call('add_view', { database_id: db, type: 'table', name: 'Chờ anh duyệt', filters: [{ property: 'Trạng thái', operator: 'is', value: 'Chờ duyệt' }] })
  })
  ids.tasks_page = tasks.pageId
  ids.tasks_db = tasks.databaseId
  const rel = await ensureDatabase(hub, ...RELEASES_DB, async (db) => {
    await call('add_property', { database_id: db, name: 'Ngày', type: 'date', show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Commit', type: 'text', show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Yêu cầu', type: 'multi_select', options: [], show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Kết quả', type: 'select', show_on_cards: true,
      options: [{ name: 'Thành công', color: 'green' }, { name: 'Lỗi, đã rollback', color: 'red' }] })
    await call('add_property', { database_id: db, name: 'Backup', type: 'text', show_on_cards: false })
  })
  ids.releases_page = rel.pageId
  ids.releases_db = rel.databaseId
  await writeHubBody(ids)
  const file = path.join(process.cwd(), CONFIG)
  writeFileSync(file, JSON.stringify(ids, null, 2) + '\n')
  console.log(`hub ${url(hub)}\nconfig ${file}`)
  for (const [k, v] of Object.entries(ids)) if (k !== 'project' && k !== 'hub') console.log(`${k} ${v}`)
}

/** The hub page body, written once while the hub is empty: open requests, the task board, shortcuts. */
async function writeHubBody(ids) {
  const { list } = await blocks(ids.hub, 2000)
  if (list.length) return
  const info = await call('get_database', { database_id: ids.tasks_db })
  const board = /"Bảng" view_id=([0-9a-f-]{36})/.exec(info)?.[1] ?? ''
  await call('insert_blocks', {
    page_id: ids.hub,
    blocks: [
      { type: 'paragraph', text: `Trung tâm phát triển ${ids.project}: yêu cầu → duyệt → triển khai → bằng chứng → phát hành. Cách làm việc ở 📘 Quy trình làm việc.` },
      { type: 'heading', level: 2, text: 'Đang mở' },
      { type: 'paragraph', text: '_Không có yêu cầu nào đang mở._' },
      { type: 'heading', level: 2, text: 'Việc của agent' },
      { type: 'databaseView', props: { databaseId: ids.tasks_db, viewId: board } },
      { type: 'heading', level: 2, text: 'Lối tắt' },
      ...[ids.handbook, ids.requests, ids.tasks_page, ids.releases_page, ids.brainstorm].map((pageId) => ({ type: 'pageLink', props: { pageId } })),
    ],
  })
}

async function cmdShow() {
  const cfg = loadConfig()
  console.log(`${cfg.project}: hub ${url(cfg.hub)}`)
  for (const r of await children(cfg.requests)) console.log(`${r.icon || '·'} ${r.title} | ${url(r.id)}`)
  const j = await callJson('query_database', { database_id: cfg.tasks_db, limit: 200, properties: ['Trạng thái'] }, { soft: true })
  const counts = {}
  for (const r of j?.rows ?? []) {
    const st = r.values?.['Trạng thái']
    if (st) counts[st] = (counts[st] ?? 0) + 1
  }
  console.log('tasks: ' + (Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'))
}

/** Request numbers (REQ-004 B2): new requests are R5, R6 …; old pages REQ-001 … REQ-004 keep their names. */
const reqNumber = (title) => Number(/^(?:REQ-|R)(\d+)\b/.exec(title)?.[1] ?? 0)
async function nextReq(cfg) {
  const existing = await children(cfg.requests)
  return `R${Math.max(0, ...existing.map((c) => reqNumber(c.title))) + 1}`
}
/** "R5-T1" for new requests, "T1" for the old REQ-NNN ones (their task rows were named "T1 · …"). */
const taskCode = (req, key) => (/^R\d+$/.test(req) ? `${req}-${key}` : key)

const DEFAULT_INTRO =
  'Trả lời ngay trong từng thẻ: chọn phương án (không chọn = theo đề xuất), bấm **Đồng ý / Có sửa / Để sau / Bỏ**, ghi chú nếu cần. Cuối trang chọn cách duyệt rồi nhắn agent.'

const quoteBlock = (s) =>
  String(s)
    .trim()
    .split('\n')
    .map((l) => (l.trim() ? `> ${l}` : '>'))
    .join('\n')

/** card spec → add_cards input */
const cardInput = (c) => ({
  key: c.key,
  title: c.title,
  ...(c.size ? { size: c.size } : {}),
  ...(c.area ? { area: c.area } : {}),
  ...(c.quote ? { quote: c.quote } : {}),
  ...(c.current ? { current: c.current } : {}),
  ...(c.proposal ? { proposal: c.proposal } : {}),
  ...(c.questions?.length ? { questions: c.questions } : {}),
})


/** A request page made of review blocks from a JSON spec (see templates/request.json). */
/** A card page from a spec: a new page (req new), or the owner's own REQ page (req adopt: his notes stay below,
 *  under "Ghi chú của anh", block ids and comments untouched). New / adopted requests go to the top of Yêu cầu. */
async function reqNewFromSpec(cfg, spec, opt, adopt = null) {
  if (!(await hasTool('add_cards'))) die('this Kicho server has no add_cards tool yet: write the confirmation as Markdown (templates/request.md)')
  const title = opt.title || spec.title || die('the spec needs "title" (or --title)')
  const req = adopt ? adopt.req : await nextReq(cfg)
  const status = spec.status || 'review'
  const [icon] = REQ_STATUS[status] ?? die(`unknown status ${status}`)
  const cards = spec.cards ?? []
  if (!cards.length) die('the spec has no cards')
  const keys = new Set()
  for (const c of cards) {
    if (!c.key || !c.title) die('every card needs "key" and "title"')
    if (keys.has(c.key)) die(`duplicate card key ${c.key}`)
    keys.add(c.key)
  }
  const mainCards = cards.filter((c) => !c.extra)
  const extra = cards.filter((c) => c.extra)
  const summary = ['| # | Mục | Độ lớn |', '|---|---|---|', ...cards.map((c) => `| ${c.key} | ${c.title}${c.extra ? ' *(đề xuất thêm)*' : ''} | ${c.size ?? ''} |`)].join('\n')
  const markdown = [
    spec.intro || DEFAULT_INTRO,
    '## Tóm tắt',
    summary,
    '## Các mục',
    ...(extra.length ? ['## Đề xuất thêm'] : []),
    ...(spec.plan ? ['## Kế hoạch triển khai', spec.plan] : []),
    '## Duyệt',
    '## Báo cáo',
    '_Kết quả của từng mục nằm trong thẻ của mục đó; agent ghi tóm tắt phát hành ở đây._',
    ...(spec.raw ? ['## Nguyên văn yêu cầu', quoteBlock(spec.raw)] : []),
  ].join('\n\n')
  let id
  if (adopt) {
    id = adopt.id
    const { list: before } = await blocks(id, 4000)
    await call('insert_blocks', { page_id: id, position: 'start', markdown: before.length ? `${markdown}\n\n## Ghi chú của anh` : markdown })
    await call('update_page', { page_id: id, title: `${req} · ${today()} · ${title}`, icon })
  } else {
    const text = await call('create_page', { parent_id: cfg.requests, title: `${req} · ${today()} · ${title}`, icon, markdown })
    id = /page_id ([0-9a-f-]{36})/.exec(text)?.[1] ?? die(`create_page: ${text.slice(0, 200)}`)
  }
  // newest request first in the tree
  await call('move_page', { page_id: id, parent_id: cfg.requests, after_page_id: null }, { soft: true })
  const { list } = await blocks(id, 20000)
  const head = (t) => list.find((b) => b.depth === 0 && b.type === 'heading' && b.text.trim() === t)?.id ?? die(`heading "${t}" not found`)
  const ids = {}
  for (const [group, at] of [
    [mainCards, 'Các mục'],
    [extra, 'Đề xuất thêm'],
  ]) {
    if (!group.length) continue
    let after = head(at)
    for (let i = 0; i < group.length; i += 30) {
      const out = await callJson('add_cards', { page_id: id, after_block_id: after, cards: group.slice(i, i + 30).map(cardInput) })
      for (const c of out?.cards ?? []) ids[c.key] = c.block_id
      after = ids[group[Math.min(i + 30, group.length) - 1].key] ?? after
    }
  }
  await call('insert_blocks', { page_id: id, after_block_id: head('Duyệt'), blocks: [{ type: 'approvalBar', props: { req } }] })
  await call('insert_blocks', {
    page_id: id,
    position: 'start',
    blocks: [{ type: 'reqHeader', props: { req, mode: spec.mode || 'review', status, submittedAt: today(), agent: spec.agent || '', tasksDb: cfg.tasks_db, reqProperty: 'Yêu cầu' } }],
  })
  // one task row per card (unless "tasks": false), linked back from the card (taskRef)
  if (spec.tasks !== false) {
    const sprint = await runningSprint(cfg)
    const rows = cards.map((c) => ({
      title: `${taskCode(req, c.key)} · ${c.title}`,
      values: {
        'Yêu cầu': req,
        ...(sprint ? { Sprint: [sprint] } : {}),
        'Trạng thái': 'Chờ duyệt',
        ...(c.area ? { 'Hạng mục': c.area } : {}),
        ...(c.kind ? { Loại: c.kind } : {}),
        ...(c.priority ? { 'Ưu tiên': c.priority } : {}),
        ...(c.agent ? { Agent: c.agent } : {}),
      },
      body_markdown: `Mục **${c.key}** của [${req}](${url(id)}).`,
    }))
    const out = await callJson('add_rows', { database_id: cfg.tasks_db, rows })
    const byTitle = new Map((out?.rows ?? []).map((r) => [r.title, r.id]))
    const updates = []
    for (const c of cards) {
      const row = byTitle.get(`${taskCode(req, c.key)} · ${c.title}`)
      if (row && ids[c.key]) updates.push({ block_id: ids[c.key], props: { taskRef: row } })
    }
    if (updates.length) await call('update_blocks', { page_id: id, updates }, { soft: true })
  }
  await refreshHub(cfg)
  console.log(`${req} ${id}\n${url(id)}\ncards ${Object.keys(ids).length}/${cards.length}`)
}

/** The owner created a REQ page himself (title "REQ-NNN", maybe notes): turn it into a card page from a spec. */
async function cmdReqAdopt({ pos, opt }) {
  const cfg = loadConfig()
  const ref = pos[0] ?? die('usage: kdev req adopt <REQ-NNN|page_id> <spec.json>')
  const page = UUID.test(ref) ? { id: UUID.exec(ref)[0] } : await findRequest(cfg, ref)
  const info = await call('get_page', { page_id: page.id, max_chars: 500 })
  const num = /title="REQ-(\d+)/.exec(info)?.[1] ?? /REQ-(\d+)/.exec(ref)?.[1] ?? die('the page title must start with REQ-NNN')
  return reqNewFromSpec(cfg, JSON.parse(readInput(pos[1] ?? die('spec.json missing'))), opt, { id: page.id, req: `REQ-${num.padStart(3, '0')}` })
}

async function cmdReqNew({ pos, opt }) {
  const cfg = loadConfig()
  const src = pos[0] ?? die('usage: kdev req new <spec.json | page.md> [--title "short summary"]')
  if (/\.json$/i.test(src) || opt.json) return reqNewFromSpec(cfg, JSON.parse(readInput(src)), opt)
  const body = readInput(src)
  const title = opt.title || die('--title is required')
  const req = await nextReq(cfg)
  const status = opt.status || 'review'
  const [icon, label] = REQ_STATUS[status] ?? die(`unknown status ${status}`)
  const markdown = body.replaceAll('{{REQ}}', req).replaceAll('{{STATUS}}', `${icon} ${label} (${nowLocal()})`).replaceAll('{{DATE}}', today())
  const text = await call('create_page', { parent_id: cfg.requests, title: `${req} · ${today()} · ${title}`, icon, markdown })
  const id = /page_id ([0-9a-f-]{36})/.exec(text)?.[1] ?? die(`create_page: ${text.slice(0, 200)}`)
  await refreshHub(cfg)
  console.log(`${req} ${id}\n${url(id)}`)
}

async function setStatusLine(pageId, icon, label) {
  const { list } = await blocks(pageId, 4000)
  const line = list.slice(0, 15).find((b) => /Trạng thái:/.test(b.text))
  if (!line) return false
  const rest = line.text.replace(/^.*?Trạng thái:\**\s*/, '')
  const tail = rest.includes(' · ') ? rest.slice(rest.indexOf(' · ')) : ''
  await call('update_blocks', { page_id: pageId, updates: [{ block_id: line.id, text: `**Trạng thái:** ${icon} ${label} (${nowLocal()})${tail}` }] })
  return true
}

async function cmdReqStatus({ pos }) {
  const cfg = loadConfig()
  const req = await findRequest(cfg, pos[0] ?? die('usage: kdev req status <REQ-NNN|page_id> <' + Object.keys(REQ_STATUS).join('|') + '>'))
  const [icon, label] = REQ_STATUS[pos[1]] ?? die(`status must be one of ${Object.keys(REQ_STATUS).join(', ')}`)
  await call('update_page', { page_id: req.id, icon })
  // card pages: the reqHeader block; Markdown pages: the "Trạng thái:" line
  const { list } = await blocks(req.id, 8000)
  const header = list.find((b) => b.type === 'reqHeader')
  let where = 'icon only'
  if (header) {
    const ok = await call('update_blocks', { page_id: req.id, updates: [{ block_id: header.id, props: { status: pos[1] } }] }, { soft: true })
    where = ok ? 'header' : 'icon only (header not writable on this server)'
  } else if (await setStatusLine(req.id, icon, label)) where = 'status line'
  await refreshHub(cfg)
  console.log(`${icon} ${label} (${where}) | ${url(req.id)}`)
}

async function cmdReqRead({ pos, opt }) {
  const cfg = loadConfig()
  const req = await findRequest(cfg, pos[0] ?? die('usage: kdev req read <R5|REQ-NNN|page_id> [--all | --answered] [--since ISO] [--full] [--markdown]'))
  // card pages: the compact review state; --full (or old servers / Markdown pages): the whole page
  const compact = !opt.full && !opt.markdown && (await hasTool('get_review'))
  const text = compact
    ? await call('get_review', { page_id: req.id, only: opt.all ? 'all' : opt.answered ? 'answered' : 'open', ...(opt.since ? { since: opt.since } : {}) })
    : await call('get_page', { page_id: req.id, max_chars: 60000, ...(opt.markdown ? { format: 'markdown' } : {}) })
  console.log(text)
  if (await hasTool('list_comments')) console.log('\n' + (await call('list_comments', { page_id: req.id, include_resolved: !!opt.resolved })))
  else console.log('\n(comments: this Kicho server has no list_comments tool yet; only the page body was read)')
}

/** Tell the owner the answers were read: agentReadAt on the page's approval bar. */
async function cmdReqAck({ pos }) {
  const cfg = loadConfig()
  const req = await findRequest(cfg, pos[0] ?? die('usage: kdev req ack <REQ-NNN|page_id>'))
  console.log((await call('resolve_cards', { page_id: req.id, mark_read: true, updates: [] })).split('\n')[0])
}

/** A page ref: a page id / URL, or a request id (REQ-007). */
async function pageRef(cfg, ref) {
  if (UUID.test(ref ?? '')) return UUID.exec(ref)[0]
  return (await findRequest(cfg, ref)).id
}

/** Definition of Done items: the project's list (.kicho-devflow.json "dod", else the default). --dod all | "item,item"
 *  (those done, the rest not), --dod-na "i18n=no new text" (not applicable: counted as done, with the note). */
const DEFAULT_DOD = ['Test viết và qua', 'Có bằng chứng', 'Tài liệu cập nhật (repo + Kicho)', 'Chữ giao diện đủ vi / en / ja', 'Rà bảo mật (đăng nhập / upload / quyền)']
function dodList(cfg, opt) {
  if (!opt.dod && !opt['dod-na']) return null
  const items = Array.isArray(cfg?.dod) && cfg.dod.length ? cfg.dod : DEFAULT_DOD
  const listOf = (v) => many(v).flatMap((d) => String(d).split(',')).map((x) => x.trim()).filter(Boolean)
  const done = opt.dod === 'all' ? items : listOf(opt.dod)
  const na = listOf(opt['dod-na']).map((x) => x.split(/=(.*)/s)).map(([k, v]) => [k.trim().toLowerCase(), (v ?? 'không áp dụng').trim()])
  const starts = (item, key) => item.toLowerCase().startsWith(String(key).toLowerCase())
  return items.map((item) => {
    const n = na.find(([k]) => starts(item, k))
    if (n) return { item, done: true, note: n[1] }
    return { item, done: done.some((d) => starts(item, d)) }
  })
}

/** The sprint being run (status Đang chạy, newest first), for new task rows; null without a sprint database. */
async function runningSprint(cfg) {
  if (!cfg.sprints_db) return null
  const j = await callJson('query_database', { database_id: cfg.sprints_db, limit: 20, properties: [], filters: [{ property: 'Trạng thái', operator: 'is', value: 'Đang chạy' }] }, { soft: true })
  const titles = (j?.rows ?? []).map((r) => r.title)
  return titles.sort((a, b) => Number(/\d+/.exec(b)?.[0] ?? 0) - Number(/\d+/.exec(a)?.[0] ?? 0))[0] ?? null
}

async function cmdCard({ pos, opt }, sub) {
  const cfg = loadConfig()
  const pageId = await pageRef(cfg, pos[0] ?? die('usage: kdev card resolve|result <REQ-NNN> <KEY>… (see help)'))
  let updates
  if (sub === 'resolve') {
    if (opt.file) updates = JSON.parse(readInput(opt.file)) // [{ key, status?, decided? }]
    else {
      const keys = pos.slice(1)
      if (!keys.length) die('usage: kdev card resolve <REQ> <KEY>… [--status S] [--decided "…"|@file] | --file decisions.json')
      updates = keys.map((key) => ({ key: String(key).replace(/^R\d+-/, ''), ...(opt.status ? { status: opt.status } : {}), ...(opt.decided ? { decided: readInput(opt.decided) } : {}) }))
    }
  } else {
    const key = String(pos[1] ?? '').replace(/^R\d+-/, '') || die('usage: kdev card result <REQ> <KEY> --outcome done|changed|dropped|deferred [--summary …] [--verification …] [--limits …] [--commit sha] [--status done]')
    const result = { outcome: opt.outcome || 'done' }
    for (const k of ['summary', 'verification', 'limits']) if (opt[k]) result[k] = readInput(opt[k])
    if (opt.commit) result.commit = opt.commit
    const dod = dodList(cfg, opt)
    if (dod) result.dod = dod
    const status = opt.status || { done: 'done', changed: 'done', dropped: 'dropped', deferred: 'later' }[result.outcome]
    updates = [{ key, result, ...(status ? { status } : {}) }]
  }
  console.log((await call('resolve_cards', { page_id: pageId, updates })).split('\n').slice(0, 3).join('\n'))
}

function rowValues(opt) {
  const v = {}
  if (opt.status) v['Trạng thái'] = opt.status
  if (opt.agent) v.Agent = opt.agent
  if (opt.commit) v.Commit = opt.commit
  if (opt.req) v['Yêu cầu'] = opt.req
  if (opt.area) v['Hạng mục'] = opt.area
  if (opt.start || opt.end) v['Thời gian'] = { start: opt.start || today(), ...(opt.end ? { end: opt.end } : {}) }
  return v
}

async function cmdTasksAdd({ pos, opt }) {
  const cfg = loadConfig()
  const rows = JSON.parse(readInput(pos[0] ?? die('usage: kdev tasks add <rows.json> [--req REQ-NNN]')))
  for (const r of rows) {
    r.values ??= {}
    if (opt.req && !r.values['Yêu cầu']) r.values['Yêu cầu'] = opt.req
    if (!r.values['Trạng thái']) r.values['Trạng thái'] = opt.status || 'Chờ duyệt'
  }
  for (let i = 0; i < rows.length; i += 100) {
    const text = await call('add_rows', { database_id: cfg.tasks_db, rows: rows.slice(i, i + 100) })
    console.log(text.split('\n')[0])
  }
  console.log(url(cfg.tasks_page))
}

/** Row refs: row ids stay; an item code ("F2", "R10") becomes the id of the row titled "F2 · …" (with --req, in that
 *  request); anything else is passed as an exact title. (query_database shortens long titles, so codes beat titles.) */
async function resolveRows(cfg, refs, req) {
  let table = null
  const out = []
  for (const ref of refs) {
    if (UUID.test(ref)) {
      out.push(UUID.exec(ref)[0])
      continue
    }
    if (/^(?:R\d+-)?[A-Za-z]{1,3}\d{0,3}$/.test(ref)) {
      const code0 = req && /^R\d+$/.test(req) && !/^R\d+-/.test(ref) ? `${req}-${ref}` : ref
      const j = await callJson('query_database', {
        database_id: cfg.tasks_db,
        limit: 5,
        properties: [],
        title_starts_with: `${code0} · `,
        ...(req ? { filters: [{ property: 'Yêu cầu', operator: 'is', value: req }] } : {}),
      }, { soft: true })
      if (j?.rows) {
        if (j.rows.length === 1) {
          out.push(j.rows[0].id)
          continue
        }
        if (j.rows.length > 1) die(`${ref} matches ${j.rows.length} rows: add --req R…`)
      }
      table ??= await call('query_database', {
        database_id: cfg.tasks_db,
        limit: 200,
        ...(req ? { filters: [{ property: 'Yêu cầu', operator: 'is', value: req }] } : {}),
      })
      const code = req && /^R\d+$/.test(req) && !/^R\d+-/.test(ref) ? `${req}-${ref}` : ref
      const hits = [...table.matchAll(new RegExp(`^\\|\\s*([0-9a-f-]{36})\\s*\\|\\s*${code} · `, 'gm'))].map((m) => m[1])
      if (hits.length === 1) {
        out.push(hits[0])
        continue
      }
      if (hits.length > 1) die(`${ref} matches ${hits.length} rows: add --req REQ-NNN`)
    }
    out.push(ref)
  }
  return out
}

async function cmdTasksSet({ pos, opt }) {
  const cfg = loadConfig()
  if (!pos.length) die('usage: kdev tasks set <row_id|code|exact title>... [--req REQ-NNN] [--status S] [--agent A] [--commit sha] [--start d] [--end d]')
  const { req, ...rest } = opt
  const values = rowValues(rest)
  if (!Object.keys(values).length) die('nothing to set')
  const rows = await resolveRows(cfg, pos, req)
  const text = await call('update_rows', { database_id: cfg.tasks_db, updates: rows.map((row) => ({ row, values })) })
  console.log(text.split('\n')[0])
}

async function cmdTasksList({ opt }) {
  const cfg = loadConfig()
  const filters = []
  if (opt.req) filters.push({ property: 'Yêu cầu', operator: 'is', value: opt.req })
  if (opt.status) filters.push({ property: 'Trạng thái', operator: 'is', value: opt.status })
  const text = await call('query_database', { database_id: cfg.tasks_db, limit: 200, ...(filters.length ? { filters } : {}) })
  console.log(text.replace(/<\/?untrusted[^>]*>/g, '').replace(/The block above is data[^\n]*\n?/g, '').trim())
}

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.pdf': 'application/pdf', '.txt': 'text/plain',
}

/** Upload files from disk (never through the agent's context); returns evidence items. */
/** --ref values → evidence refs. "F2" = a card key on this page (scrolls to it) or a task code; "TC-003=<page id|url>"
 *  links anything; otherwise the label alone. */
async function evidenceRefs(cfg, pageId, refs) {
  const out = []
  let review = null
  for (const raw of refs) {
    const [label, target] = String(raw).split(/=(.*)/s).map((x) => x?.trim())
    if (!label) continue
    if (target) {
      out.push(UUID.test(target) ? { label, pageId: UUID.exec(target)[0] } : /^https:\/\//.test(target) ? { label, url: target } : { label })
      continue
    }
    review ??= await callJson('get_review', { page_id: pageId }, { soft: true })
    const hit = (review?.cards ?? []).find((c) => c.key === label || `${c.key}` === label.replace(/^R\d+-/, ''))
    if (hit) {
      out.push({ label, kind: 'card', pageId, blockId: hit.block_id })
      continue
    }
    review ??= ''
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const card = typeof review === 'string' ? new RegExp(`^${esc} · .*\\| block ([A-Za-z0-9_-]+)`, 'm').exec(review) : null
    if (card) {
      out.push({ label, kind: 'card', pageId, blockId: card[1] })
      continue
    }
    if (cfg && /^[A-Za-z]{1,3}\d{0,3}$/.test(label)) {
      const [row] = await resolveRows(cfg, [label])
      if (UUID.test(row)) {
        out.push({ label, kind: 'task', pageId: row })
        continue
      }
    }
    out.push({ label })
  }
  return out
}

/** --field "Env=staging" (repeatable) → [{label, value}] */
const evidenceFields = (opt) =>
  many(opt.field)
    .map((f) => String(f).split(/=(.*)/s))
    .filter(([k]) => k?.trim())
    .map(([k, v]) => ({ label: k.trim(), value: (v ?? '').trim() }))

async function uploadAll(pageId, files, opt, extras = {}) {
  if (!(await hasTool('upload_file'))) die('this Kicho server has no upload_file tool yet; use `kdev log` for text evidence')
  const items = []
  for (const f of files) {
    const data = readFileSync(f)
    const mime = MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream'
    const up = await callJson('upload_file', { page_id: pageId, filename: path.basename(f), mime, data_base64: data.toString('base64') })
    const fileUrl = up?.url ?? die('upload_file gave no url')
    const caption = files.length === 1 && opt.caption ? opt.caption : opt.caption ? `${opt.caption} · ${path.basename(f)}` : path.basename(f)
    items.push({
      url: fileUrl,
      kind: mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file',
      caption,
      ...(opt.device ? { device: opt.device } : {}),
      ...(opt.verdict ? { verdict: opt.verdict } : {}),
      ...(opt.role ? { role: opt.role } : {}),
      ...extras,
    })
    console.log(`${path.basename(f)} → ${fileUrl}`)
  }
  return items
}

async function cmdEvidence({ pos, opt }) {
  const usage = 'usage: kdev evidence <REQ-NNN|page_id> <file>... [--card KEY] [--caption "…"] [--device desktop|phone|tablet] [--verdict pass|fail] [--role before|after] [--ref F2 …] [--field Env=staging …] [--note "備考"] [--run <row id>] [--title "…"] [--after block_id]'
  const files = pos.slice(1)
  if (!pos[0] || !files.length) die(usage)
  const cfg = findConfig() ? loadConfig() : null
  const pageId = UUID.test(pos[0]) ? UUID.exec(pos[0])[0] : cfg ? await pageRef(cfg, pos[0]) : die(usage)
  const refs = await evidenceRefs(cfg, pageId, many(opt.ref))
  const fields = evidenceFields(opt)
  const extras = {
    ...(refs.length ? { refs } : {}),
    ...(fields.length ? { fields } : {}),
    ...(opt.note ? { note: readInput(opt.note) } : {}),
    ...(opt.run ? { runRef: opt.run } : {}),
  }
  const items = await uploadAll(pageId, files, opt, extras)
  if (opt.card) {
    // inside the card's result (resolve_cards appends)
    const r = await call('resolve_cards', { page_id: pageId, updates: [{ key: opt.card, add_evidence: items }] })
    console.log(r.split('\n')[0])
    return
  }
  const layout = items.some((i) => i.role) ? 'compare' : 'grid'
  const r = await call('insert_blocks', {
    page_id: pageId,
    blocks: [{ type: 'evidence', props: { title: opt.title || '', layout, items } }],
    ...(opt.after ? { after_block_id: opt.after } : {}),
  })
  console.log(`${r.split('\n')[0].replace(/ New block ids:.*/, '')}\nblock ${newBlockIds(r).at(-1) ?? '?'}`)
}

// ---------- project documents, sprints, gates (REQ-003 P2 / P3): kdev init-docs ----------

const hasProp = (info, name) => new RegExp(`^- ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(`, 'm').test(info)

/** Two-way relation from db `from` (property `name`) to db `to` (paired property `paired`), unless it exists. */
async function ensureRelation(from, name, to, paired) {
  const info = await call('get_database', { database_id: from })
  if (hasProp(info, name)) return 'kept'
  const r = await call('add_property', { database_id: from, name, type: 'relation', target_database: to, two_way: true, paired_name: paired }, { soft: true })
  return r ? 'added' : 'FAILED (server without relations?)'
}

async function ensureRollup(db, name, relation, fn) {
  const info = await call('get_database', { database_id: db })
  if (hasProp(info, name)) return 'kept'
  const r = await call('add_property', { database_id: db, name, type: 'rollup', relation, function: fn }, { soft: true })
  return r ? 'added' : 'FAILED'
}

async function cmdInitDocs() {
  const cfgFile = findConfig() ?? die(`no ${CONFIG}: run kdev init first`)
  const cfg = loadConfig()
  const ids = { ...cfg }
  delete ids.file
  const sprints = await ensureDatabase(cfg.hub, '🏃', 'Sprint', async (db) => {
    await call('add_property', { database_id: db, name: 'Trạng thái', type: 'status', show_on_cards: true, options: [
      { name: 'Lên kế hoạch', color: 'grey', group: 'todo' }, { name: 'Đang chạy', color: 'orange', group: 'in_progress' },
      { name: 'Review', color: 'purple', group: 'in_progress' }, { name: 'Xong', color: 'green', group: 'complete' }] })
    await call('add_property', { database_id: db, name: 'Mục tiêu', type: 'text', show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Thời gian', type: 'date', show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Yêu cầu', type: 'multi_select', options: [], show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Commit', type: 'text', show_on_cards: false })
    await call('add_view', { database_id: db, type: 'timeline', name: 'Timeline', date_property: 'Thời gian' })
  })
  ids.sprints_page = sprints.pageId
  ids.sprints_db = sprints.databaseId
  ids.gates_page = await ensurePage(cfg.hub, '🚦', 'Cột mốc',
    'Gate review trước những mốc lớn (theo `stage-gate-dev`: G0 discovery … G5 production batch, G6 QA, G7 release). Trong lúc phát triển agent tự quyết; trước khi phát hành sản phẩm / lên store có trang gate với checklist, test kỹ, tổng kết và thẻ **Go / No-go** để anh duyệt.')
  ids.docs_page = await ensurePage(cfg.hub, '📚', 'Tài liệu dự án',
    'Tài liệu **cho người đọc**: ngắn, tổng quan, có link tới bằng chứng để truy vết. Tài liệu chuyên sâu cho agent (path file, quy tắc code) nằm trong `docs/` của repo.')
  const reqs = await ensureDatabase(ids.docs_page, '🎯', 'Yêu cầu hệ thống', async (db) => {
    await call('add_property', { database_id: db, name: 'Loại', type: 'select', show_on_cards: true, options: [{ name: 'Chức năng', color: 'blue' }, { name: 'Phi chức năng', color: 'purple' }] })
    await call('add_property', { database_id: db, name: 'Trạng thái', type: 'status', show_on_cards: true, options: [
      { name: 'Đề xuất', color: 'grey', group: 'todo' }, { name: 'Đang làm', color: 'orange', group: 'in_progress' },
      { name: 'Đã làm', color: 'green', group: 'complete' }, { name: 'Bỏ', color: 'red', group: 'complete' }] })
    await call('add_property', { database_id: db, name: 'Ưu tiên', type: 'select', show_on_cards: true, options: [{ name: 'P0', color: 'red' }, { name: 'P1', color: 'orange' }, { name: 'P2', color: 'grey' }] })
    await call('add_property', { database_id: db, name: 'Nguồn', type: 'multi_select', options: [], show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Mô tả', type: 'text', show_on_cards: false })
  })
  ids.requirements_page = reqs.pageId
  ids.requirements_db = reqs.databaseId
  ids.design_page = await ensurePage(ids.docs_page, '🏗️', 'Thiết kế hệ thống', '_Kiến trúc, các phần chính, màn hình, vận hành: agent điền và cập nhật._')
  ids.dbdesign_page = await ensurePage(ids.docs_page, '🗄️', 'Thiết kế DB', '_Sinh tự động từ schema (`kdev doc set dbdesign`)._')
  const tcs = await ensureDatabase(ids.docs_page, '🧪', 'Test case', async (db) => {
    await call('add_property', { database_id: db, name: 'Trạng thái', type: 'status', show_on_cards: true, options: [
      { name: 'Chưa chạy', color: 'grey', group: 'todo' }, { name: 'Lỗi', color: 'red', group: 'in_progress' }, { name: 'Đạt', color: 'green', group: 'complete' }] })
    await call('add_property', { database_id: db, name: 'Ưu tiên', type: 'select', show_on_cards: true, options: [{ name: 'P0', color: 'red' }, { name: 'P1', color: 'orange' }, { name: 'P2', color: 'grey' }] })
    await call('add_property', { database_id: db, name: 'Bước', type: 'text', show_on_cards: false })
    await call('add_property', { database_id: db, name: 'Kỳ vọng', type: 'text', show_on_cards: true })
  })
  ids.testcases_page = tcs.pageId
  ids.testcases_db = tcs.databaseId
  const runs = await ensureDatabase(ids.docs_page, '▶️', 'Lần chạy test', async (db) => {
    await call('add_property', { database_id: db, name: 'Kết quả', type: 'select', show_on_cards: true, options: [{ name: 'Đạt', color: 'green' }, { name: 'Lỗi', color: 'red' }] })
    await call('add_property', { database_id: db, name: 'Env', type: 'select', show_on_cards: true, options: [{ name: 'dev', color: 'blue' }, { name: 'production', color: 'purple' }] })
    await call('add_property', { database_id: db, name: 'SHA', type: 'text', show_on_cards: true })
    await call('add_property', { database_id: db, name: 'Người chạy', type: 'select', show_on_cards: true, options: [{ name: 'agent', color: 'grey' }, { name: 'anh', color: 'green' }] })
    await call('add_property', { database_id: db, name: 'Ngày', type: 'date', show_on_cards: true })
  })
  ids.testruns_page = runs.pageId
  ids.testruns_db = runs.databaseId
  // links: Yêu cầu ⇄ Việc ⇄ Test case ⇄ Lần chạy ⇄ Sprint (two-way), then rollups over them
  const rel = [
    [cfg.tasks_db, 'Yêu cầu hệ thống', reqs.databaseId, 'Việc'],
    [cfg.tasks_db, 'Test case', tcs.databaseId, 'Việc'],
    [tcs.databaseId, 'Yêu cầu hệ thống', reqs.databaseId, 'Test case'],
    [runs.databaseId, 'Test case', tcs.databaseId, 'Lần chạy'],
    [runs.databaseId, 'Sprint', sprints.databaseId, 'Lần chạy test'],
    [sprints.databaseId, 'Việc', cfg.tasks_db, 'Sprint'],
  ]
  for (const [from, name, to, paired] of rel) console.log(`relation ${name} ⇄ ${paired}: ${await ensureRelation(from, name, to, paired)}`)
  const rollups = [
    [reqs.databaseId, 'Tiến độ việc', 'Việc', 'percent_complete'],
    [reqs.databaseId, 'Test đạt', 'Test case', 'percent_complete'],
    [cfg.tasks_db, 'Test đạt', 'Test case', 'percent_complete'],
    [sprints.databaseId, 'Tiến độ', 'Việc', 'percent_complete'],
    [tcs.databaseId, 'Số lần chạy', 'Lần chạy', 'count'],
  ]
  for (const [db, name, relation, fn] of rollups) console.log(`rollup ${name}: ${await ensureRollup(db, name, relation, fn)}`)
  // the hub: links to the new pages + "Cài đặt dự án" (evidence fields of this project, Definition of Done)
  const { raw, list } = await blocks(cfg.hub, 30000)
  const links = [ids.sprints_page, ids.gates_page, ids.docs_page].filter((p) => !raw.includes(`page ${p}`))
  if (links.length) await call('insert_blocks', { page_id: cfg.hub, blocks: links.map((pageId) => ({ type: 'pageLink', props: { pageId } })), ...(list.some((b) => b.type === 'heading' && /Cài đặt dự án/.test(b.text)) ? { position: 'end' } : {}) })
  if (!list.some((b) => b.type === 'heading' && /Cài đặt dự án/.test(b.text))) {
    await call('insert_blocks', {
      page_id: cfg.hub,
      markdown: `## Cài đặt dự án

**Trường bằng chứng** của dự án này (agent ghi bằng \`kdev evidence --field Tên=giá trị\`; anh sửa bảng này là đổi). Dự án làm một mình thì để trống.

| Trường | Khi nào ghi |
|---|---|
| | |

**Definition of Done**: test viết và qua · có bằng chứng (case đại diện) · tài liệu cập nhật (repo + Kicho) · chữ giao diện đủ vi / en / ja · rà bảo mật khi đụng đăng nhập / upload / quyền.`,
    })
  }
  writeFileSync(cfgFile, JSON.stringify(ids, null, 2) + '\n')
  for (const k of ['sprints_db', 'gates_page', 'docs_page', 'requirements_db', 'design_page', 'dbdesign_page', 'testcases_db', 'testruns_db']) console.log(`${k} ${ids[k]}`)
}

// ---------- decision memory: Hindsight (REQ-004 B3) ----------
// The owner decides for every agent, so his decisions live in ONE bank shared with doraemon (Paperclip): the company
// bank named in .kicho-devflow.json "memory_bank" (never written in a public repo). Its conventions are doraemon's:
// each record carries exactly one project tag — `project:<memory_project>` for this project, `project:cong-ty` for
// company-wide rules — and kdev reads only those two (other projects' memories, e.g. clients under NDA, never come
// in). Records are one line, word for word (strategy verbatim-record, no LLM): kind board-decision / board-order for
// the owner's decisions, project-change for an agent's record of what went live. The bank's missions, config and
// mental models belong to doraemon's plugin: kdev never changes them. URL + key per machine: HINDSIGHT_URL /
// HINDSIGHT_API_KEY, else ~/.config/kicho/hindsight.env. Recall fails open.

function memoryEnv() {
  const env = { url: process.env.HINDSIGHT_URL, key: process.env.HINDSIGHT_API_KEY }
  const f = path.join(homedir(), '.config', 'kicho', 'hindsight.env')
  if ((!env.url || !env.key) && existsSync(f)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = /^\s*(HINDSIGHT_URL|HINDSIGHT_API_KEY)\s*=\s*(.*)\s*$/.exec(line)
      if (m && m[1] === 'HINDSIGHT_URL') env.url ??= m[2]
      if (m && m[1] === 'HINDSIGHT_API_KEY') env.key ??= m[2]
    }
  }
  return env
}

const COMPANY_TAG = 'project:cong-ty'
const memoryBank = (cfg) => cfg.memory_bank || die(`no "memory_bank" in ${CONFIG}: the shared decision bank (see the skill)`)
const memoryProject = (cfg) => `project:${cfg.memory_project || String(cfg.project || 'project').toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`

async function hindsight(method, pathPart, body, { soft = false, timeoutMs = 8000 } = {}) {
  const { url, key } = memoryEnv()
  if (!url || !key) {
    if (soft) return null
    die('no Hindsight URL / key: set HINDSIGHT_URL + HINDSIGHT_API_KEY or ~/.config/kicho/hindsight.env')
  }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}${pathPart}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const text = await res.text()
    if (!res.ok) {
      if (soft) return null
      return { httpStatus: res.status, text }
    }
    return text ? JSON.parse(text) : {}
  } catch (e) {
    if (soft) return null
    die(`Hindsight unreachable: ${e?.message ?? e}`)
  }
}

const bankPath = (cfg) => `/v1/default/banks/${encodeURIComponent(memoryBank(cfg))}`

async function cmdMemory({ pos }) {
  const cfg = loadConfig()
  const sub = pos[0]
  if (sub === 'init') {
    const r = await hindsight('GET', '/v1/default/banks?limit=1000')
    const ok = (r?.banks ?? []).some((b) => b.bank_id === memoryBank(cfg))
    console.log(ok ? `shared bank found; this project writes ${memoryProject(cfg)} (+ ${COMPANY_TAG} for company-wide rules) and reads both` : 'the shared bank is missing on this Hindsight server (doraemon creates it)')
    return
  }
  if (sub === 'model') {
    // doraemon's summary of how the owner decides (company-wide), read only
    const m = await hindsight('GET', `${bankPath(cfg)}/mental-models/operator-working-style?detail=content`, null, { soft: true })
    console.log(m?.content && !/^Generating content/.test(m.content) ? m.content : '(no summary yet)')
    return
  }
  die('usage: kdev memory init | model')
}

const KIND_MAP = { 'owner-decision': 'board-decision', 'owner-rule': 'board-decision', 'owner-order': 'board-order', 'tech-decision': 'project-change', 'board-decision': 'board-decision', 'board-order': 'board-order', 'project-change': 'project-change' }

/** One decision of the owner (one line, ≤ 300 characters). --company for a rule that applies to every project.
 *  --file items.json for many: [{text, kind?, source?, company?, id?, date?}]. The same id replaces a record. */
async function cmdRemember({ pos, opt }) {
  const cfg = loadConfig()
  const list = opt.file
    ? JSON.parse(readInput(opt.file))
    : [{ text: pos.join(' ') || die('usage: kdev remember "<the owner\'s decision, one line>" [--kind owner-decision|owner-order|tech-decision] [--source R5/T1] [--company] [--id doc-id]'), kind: opt.kind, source: opt.source, company: !!opt.company, id: opt.id, date: opt.date }]
  const items = list.map((x) => {
    const kind = KIND_MAP[x.kind || 'owner-decision'] ?? die(`unknown kind ${x.kind}`)
    const text = String(x.text).trim()
    if (text.length > 300) die(`a record is one line of at most 300 characters (${text.length}): ${text.slice(0, 60)}…`)
    if (/kicho_pat_|sk-ant-|-----BEGIN|password\s*[:=]/i.test(text)) die(`refusing to store something that looks like a secret: ${text.slice(0, 40)}…`)
    const project = x.company ? COMPANY_TAG : memoryProject(cfg)
    const day = x.date || today()
    const who = kind === 'project-change' ? "an agent's record of what changed or went live" : "an agent's one-line summary of the Board's decision"
    return {
      content: text,
      context: `[Kicho devflow${x.source ? `, ${x.source}` : ''}] ${who}${kind === 'project-change' ? '' : ' (the Board = the owner, anh)'}.`.slice(0, 380),
      timestamp: `${day}T12:00:00Z`,
      document_id: `kicho-devflow:${x.id || `${kind}:${createHash('sha1').update(text).digest('hex').slice(0, 16)}`}`,
      tags: ['source:kicho-devflow', `kind:${kind}`, project, ...(x.source ? [`ref:${x.source}`] : [])],
      metadata: { kind, source: 'kicho-devflow', project: project.slice('project:'.length), ...(x.source ? { ref: x.source } : {}) },
      strategy: 'verbatim-record',
    }
  })
  for (let i = 0; i < items.length; i += 50) {
    let r = await hindsight('POST', `${bankPath(cfg)}/memories`, { items: items.slice(i, i + 50), async: true })
    // a bank configured before the strategy existed: store them the old way
    if (r?.httpStatus && /strateg/i.test(r.text)) r = await hindsight('POST', `${bankPath(cfg)}/memories`, { items: items.slice(i, i + 50).map(({ strategy: _s, ...x }) => x), async: true })
    if (r?.httpStatus) die(`Hindsight POST /memories: HTTP ${r.httpStatus} ${r.text.slice(0, 200)}`)
  }
  const company = items.filter((x) => x.tags.includes(COMPANY_TAG)).length
  console.log(`remembered ${items.length} record(s) (${items.length - company} ${memoryProject(cfg)}, ${company} ${COMPANY_TAG}); searchable in a minute`)
}

/** What the owner already decided about something (before asking him): this project + company-wide only. */
async function cmdRecall({ pos, opt }) {
  const cfg = loadConfig()
  const query = pos.join(' ').slice(0, 700) || die('usage: kdev recall "<what you are about to ask / decide>" [--top 6]')
  const r = await hindsight(
    'POST',
    `${bankPath(cfg)}/memories/recall`,
    { query, budget: 'mid', max_tokens: Number(opt.max || 800), types: ['world', 'experience'], tag_groups: [{ tags: [memoryProject(cfg), COMPANY_TAG], match: 'any_strict' }] },
    { soft: true, timeoutMs: 6000 },
  )
  const results = Array.isArray(r?.results) ? r.results : []
  if (!results.length) {
    console.log(r ? '(no matching decision in memory)' : '(memory unavailable: decide as usual)')
    return
  }
  // the closest few only, without Hindsight's "| Involving: …" suffix: small in the agent's context
  for (const e of results.slice(0, Number(opt.top || 6))) {
    const day = String(e.occurred_start || e.mentioned_at || '').slice(0, 10)
    console.log(`- ${day ? `(${day}) ` : ''}${String(e.text).replace(/\s*\|\s*Involving:.*$/s, '').replace(/\s+/g, ' ').trim()}`)
  }
}

/** The owner answered in the chat (REQ-003 P1): his answers go into the cards, marked "qua chat", his words quoted. */
async function cmdAnswer({ pos, opt }) {
  const cfg = loadConfig()
  const req = await findRequest(cfg, pos[0] ?? die('usage: kdev answer <REQ-NNN> --quote "<his message, verbatim>" --file answers.json  ({cards:[{key,verdict?,note?,choices?:{q1:{selected:[…]}}}], questions?, approval?:{choice}})'))
  const quote = opt.quote ? readInput(opt.quote) : die('--quote is required: the owner\'s chat message, verbatim')
  const answers = JSON.parse(readInput(opt.file ?? die('--file answers.json is required')))
  const text = await call('record_answers', { page_id: req.id, chat_quote: quote, ...answers })
  console.log(text.split('\n').slice(0, 12).join('\n'))
}

// ---------- sprints and gates (REQ-003 P2) ----------

const SPRINT_TEMPLATE = (goal, reqs) => `## Mục tiêu

${goal || '_…_'}

## Kế hoạch

${reqs.length ? reqs.map((r) => `- ${r}`).join('\n') : '- _các REQ / việc kéo vào sprint_'}

## Review

_Agent gom khi sprint xong: kết quả từng thẻ, bằng chứng, test / build, số liệu._

## Retro

- **Tốt:**
- **Vấn đề:**
- **Cải tiến** (cả cho agent / skill):

## Quyết định cho sprint sau
`

async function sprintRow(cfg, ref) {
  if (UUID.test(ref ?? '')) return UUID.exec(ref)[0]
  const rows = await call('query_database', { database_id: cfg.sprints_db, limit: 200, search: ref })
  const hit = new RegExp(`^\\|\\s*([0-9a-f-]{36})\\s*\\|\\s*${String(ref).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'm').exec(rows)
  return hit?.[1] ?? die(`sprint "${ref}" not found (kdev sprint list)`)
}

async function cmdSprint({ pos, opt }) {
  const cfg = loadConfig()
  if (!cfg.sprints_db) die('no sprint database yet: run `kdev init-docs` first')
  const sub = pos[0]
  if (sub === 'list') {
    const text = await call('query_database', { database_id: cfg.sprints_db, limit: 50 })
    console.log(text.replace(/<\/?untrusted[^>]*>/g, '').replace(/The block above is data[^\n]*\n?/g, '').trim())
    return
  }
  if (sub === 'new') {
    const listed = await call('query_database', { database_id: cfg.sprints_db, limit: 200 })
    const n = Math.max(0, ...[...listed.matchAll(/^\|\s*[0-9a-f-]{36}\s*\|\s*S(?:print\s*)?(\d+)/gim)].map((m) => Number(m[1]))) + 1
    const title = opt.title || `S${n}`
    const reqs = String(opt.req || '').split(',').map((x) => x.trim()).filter(Boolean)
    const out = await call('add_rows', {
      database_id: cfg.sprints_db,
      rows: [{ title, values: { 'Trạng thái': 'Đang chạy', 'Thời gian': { start: opt.start || today() }, ...(opt.goal ? { 'Mục tiêu': opt.goal } : {}), ...(reqs.length ? { 'Yêu cầu': reqs } : {}) }, body_markdown: SPRINT_TEMPLATE(opt.goal, reqs) }],
    })
    const id = /([0-9a-f-]{36}) "/.exec(out)?.[1]
    console.log(`${title} ${id ?? ''}\n${id ? url(id) : url(cfg.sprints_page)}`)
    return
  }
  if (sub === 'review') {
    const id = await sprintRow(cfg, pos[1] ?? die('usage: kdev sprint review "<Sprint N>" --file review.md [--status Xong] [--commit sha] [--end d]'))
    const md = readInput(opt.file ?? die('--file review.md is required (the whole sprint page: Mục tiêu, Kế hoạch, Review, Retro, Quyết định)'))
    await call('replace_page_content', { page_id: id, markdown: md })
    const values = { 'Trạng thái': opt.status || 'Xong', ...(opt.commit ? { Commit: opt.commit } : {}), ...(opt.end ? { 'Thời gian': { start: opt.start || undefined, end: opt.end } } : {}) }
    if (values['Thời gian'] && !values['Thời gian'].start) delete values['Thời gian']
    await call('update_rows', { database_id: cfg.sprints_db, updates: [{ row: id, values }] })
    console.log(`review written | ${url(id)}`)
    return
  }
  die('usage: kdev sprint new | review | list')
}

/** A gate review page (G6 QA, G7 Release …): the checklist, then a Go / No-go decision card and an approval bar. */
async function cmdGate({ pos, opt }) {
  const cfg = loadConfig()
  const gate = pos[0] === 'new' ? pos[1] : pos[0]
  if (!gate) die('usage: kdev gate new <G6|G7|…> --title "…" [--file checklist.md]')
  if (!cfg.gates_page) die('no gate page yet: run `kdev init-docs` first')
  const title = `${gate} · ${today()} · ${opt.title || 'Gate review'}`
  const body = opt.file ? readInput(opt.file) : '## Tiêu chí\n\n- [ ] …\n\n## Bằng chứng\n\n## Lỗi còn mở\n'
  const text = await call('create_page', { parent_id: cfg.gates_page, title, icon: '🚦', markdown: `${body}\n\n## Quyết định\n` })
  const id = /page_id ([0-9a-f-]{36})/.exec(text)?.[1] ?? die(`create_page: ${text.slice(0, 200)}`)
  const { list } = await blocks(id, 20000)
  const head = list.find((b) => b.type === 'heading' && b.text.trim() === 'Quyết định')?.id
  await call('add_cards', {
    page_id: id,
    ...(head ? { after_block_id: head } : {}),
    cards: [{ key: gate, title: `${gate}: Go / No-go`, questions: [{ id: 'go', text: `Qua ${gate}?`, kind: 'single', options: [{ id: 'go', label: 'Go', recommended: true }, { id: 'nogo', label: 'No-go: sửa tiếp' }] }] }],
  })
  console.log(`${title} ${id}\n${url(id)}`)
}

/** Replace a project document page (design, dbdesign or any page id) with a Markdown file. */
async function cmdDoc({ pos }) {
  const cfg = loadConfig()
  if (pos[0] !== 'set' || !pos[1] || !pos[2]) die('usage: kdev doc set <design|dbdesign|page_id> <file.md>')
  const key = { design: cfg.design_page, dbdesign: cfg.dbdesign_page }[pos[1]] ?? (UUID.test(pos[1]) ? UUID.exec(pos[1])[0] : null)
  if (!key) die(`unknown document ${pos[1]} (run kdev init-docs, or give a page id)`)
  console.log((await call('replace_page_content', { page_id: key, markdown: readInput(pos[2]) })).split('\n')[0] + `\n${url(key)}`)
}

/** Block ids from an insert_blocks result ("New block ids: a, b."); the last one is where to insert next. */
const newBlockIds = (text) => (/New block ids: ([^.]*)\./.exec(text)?.[1] ?? '').split(',').map((x) => x.trim()).filter(Boolean)

/** Numbers from a vitest / jest style summary ("Tests  2 failed | 455 passed | 3 skipped (460)", "Duration 5.1s"). */
function parseTestOutput(text) {
  const line = text.split('\n').reverse().find((l) => /^\s*Tests?\s/.test(l) && /passed|failed/.test(l)) ?? ''
  const n = (w) => Number(new RegExp(`(\\d+) ${w}`).exec(line)?.[1] ?? 0)
  const d = /Duration\s+([\d.]+)\s*(ms|s)\b/.exec(text)
  return { passed: n('passed'), failed: n('failed'), skipped: n('skipped'), durationMs: d ? Math.round(Number(d[1]) * (d[2] === 's' ? 1000 : 1)) : 0 }
}

async function cmdTest({ pos, opt }) {
  const usage = 'usage: kdev test <REQ-NNN|page_id> --suite S (--from output.txt | --passed N [--failed N] [--skipped N]) [--duration ms] [--commit sha] [--card KEY] [--after block_id]'
  if (!pos[0] || !opt.suite) die(usage)
  const cfg = findConfig() ? loadConfig() : null
  const pageId = UUID.test(pos[0]) ? UUID.exec(pos[0])[0] : cfg ? await pageRef(cfg, pos[0]) : die(usage)
  const log = opt.from ? readFileSync(opt.from, 'utf8') : ''
  const parsed = log ? parseTestOutput(log) : { passed: 0, failed: 0, skipped: 0, durationMs: 0 }
  const num = (k, d) => (opt[k] !== undefined ? Number(opt[k]) : d)
  const t = {
    suite: opt.suite,
    passed: num('passed', parsed.passed),
    failed: num('failed', parsed.failed),
    skipped: num('skipped', parsed.skipped),
    durationMs: num('duration', parsed.durationMs),
  }
  if (opt.card) {
    const r = await call('resolve_cards', { page_id: pageId, updates: [{ key: opt.card, add_tests: [t] }] })
    console.log(r.split('\n')[0])
    return
  }
  const tail = log.length > 8000 ? log.slice(-8000) : log
  const r = await call('insert_blocks', {
    page_id: pageId,
    blocks: [{ type: 'testResult', props: { ...t, commit: opt.commit || '', at: new Date().toISOString(), log: tail } }],
    ...(opt.after ? { after_block_id: opt.after } : {}),
  })
  console.log(`${t.suite}: ${t.passed} passed, ${t.failed} failed, ${t.skipped} skipped\nblock ${newBlockIds(r).at(-1) ?? '?'}`)
}

async function cmdLog({ pos, opt }) {
  const pageId = UUID.exec(pos[0] ?? '')?.[0] ?? die('usage: kdev log <page_id> <file|-> [--title "…"] [--lang text] [--max 6000] [--after block_id]')
  let text = readFileSync(pos[1] === '-' || !pos[1] ? 0 : pos[1], 'utf8')
  const max = Number(opt.max || 6000)
  if (text.length > max) text = `… (${text.length - max} characters cut; the end is kept)\n` + text.slice(-max)
  const out = []
  if (opt.title) out.push({ type: 'paragraph', text: `**${opt.title}**` })
  out.push({ type: 'codeBlock', text, language: opt.lang || 'text' })
  const r = await call('insert_blocks', { page_id: pageId, blocks: out, ...(opt.after ? { after_block_id: opt.after } : {}) })
  console.log(r.split('\n')[0])
}

async function cmdRelease({ pos, opt }) {
  const cfg = loadConfig()
  if (pos[0] !== 'add') die('usage: kdev release add --sha <sha> --req REQ-001[,REQ-002] [--result ok|failed] [--backup name] [--note file.md]')
  const sha = opt.sha || die('--sha is required')
  const reqs = String(opt.req || '').split(',').map((s) => s.trim()).filter(Boolean)
  const row = {
    title: `${today()} · ${sha}`,
    values: {
      Ngày: today(),
      Commit: sha,
      ...(reqs.length ? { 'Yêu cầu': reqs } : {}),
      'Kết quả': opt.result === 'failed' ? 'Lỗi, đã rollback' : 'Thành công',
      ...(opt.backup ? { Backup: opt.backup } : {}),
    },
    ...(opt.note ? { body_markdown: readInput(opt.note) } : {}),
  }
  const text = await call('add_rows', { database_id: cfg.releases_db, rows: [row] })
  console.log(text.split('\n')[0] + `\n${url(cfg.releases_page)}`)
}

/** The hub page's "Đang mở" section: one page link per open request (the link shows the live icon = status). */
async function refreshHub(cfg) {
  const open = (await children(cfg.requests)).filter((r) => OPEN_ICONS.has(r.icon))
  const { list } = await blocks(cfg.hub, 20000)
  const head = list.find((b) => b.depth === 0 && b.type === 'heading' && /Đang mở/.test(b.text))
  if (!head) return
  const i = list.indexOf(head)
  const old = []
  for (const b of list.slice(i + 1)) {
    if (b.depth === 0 && b.type === 'heading') break
    if (b.depth === 0) old.push(b.id)
  }
  const fresh = open.length
    ? open.map((r) => ({ type: 'pageLink', props: { pageId: r.id } }))
    : [{ type: 'paragraph', text: '_Không có yêu cầu nào đang mở._' }]
  await call('insert_blocks', { page_id: cfg.hub, after_block_id: head.id, blocks: fresh })
  if (old.length) await call('delete_blocks', { page_id: cfg.hub, block_ids: old })
}

async function cmdHub() {
  const cfg = loadConfig()
  await refreshHub(cfg)
  console.log(url(cfg.hub))
}

async function cmdCall({ pos }) {
  const name = pos[0] ?? die('usage: kdev call <tool> [<json> | @file.json | -]')
  const args = pos[1] ? JSON.parse(readInput(pos[1])) : {}
  console.log(await call(name, args))
}

const HELP = `kdev: Kicho devflow helper (skill kicho-devflow)
  init <hub_page_id> [--project Name]   find or create the structure under the hub; writes ${CONFIG} here
  show                                  requests with their status icons, task counts
  req new <spec.json>                   card page REQ-NNN (header, summary, decision cards, approval bar) + task rows
  req adopt <REQ-NNN> <spec.json>       the owner's own REQ page → card page (his notes kept below)
  req new <page.md> --title "…"         Markdown page (old servers; {{REQ}} {{STATUS}} {{DATE}} filled in)
  req read <R5> [--all] [--since t]     open cards only by default (compact get_review) + comments; --full = whole page
  req ack <REQ-NNN>                     "agent read at" on the approval bar
  req status <REQ-NNN> <status>         ${Object.keys(REQ_STATUS).join(' | ')}: icon, header, hub list
  memory init | model                   check the shared decision bank / doraemon's "how the owner decides" summary
  remember "<decision>" [--kind …] [--source R5/T1] [--company]   the owner's decision, one line (or --file items.json)
  recall "<question>" [--top 6]         what he already decided (before asking him); fails open
  answer <REQ-NNN> --quote "…" --file answers.json  the owner answered in the chat: record it in the cards ("qua chat")
  sprint new --title "Sprint N" [--goal …] [--req REQ-…] | sprint review "<Sprint N>" --file review.md | sprint list
  gate new <G6|G7|…> --title "…" [--file checklist.md]   gate review page with a Go / No-go card
  doc set <design|dbdesign|page_id> <file.md>         replace a project document page
  card resolve <REQ> <KEY>… [--status S] [--decided "…"|@file]   or  --file decisions.json ([{key,status,decided}])
  card result <REQ> <KEY> --outcome done|changed|dropped|deferred [--summary @f] [--verification …] [--limits …] [--commit sha] [--dod all|"items"] [--dod-na "i18n=…"]
  evidence <REQ|page> <files…> [--card KEY] [--caption …] [--device phone] [--verdict pass] [--role before|after] [--ref F2] [--field Env=…] [--note …]
  test <REQ|page> --suite S (--from out.txt | --passed N --failed N) [--card KEY] [--commit sha]
  tasks add <rows.json> [--req REQ-NNN] add rows ([{title, values:{…}, body_markdown}]); status defaults to Chờ duyệt
  tasks set <row id|code>… [--req REQ-NNN] --status S [--agent A] [--commit sha] [--start d] [--end d]
  tasks list [--req REQ-NNN] [--status S]
  log <page_id> <file|-> [--title "…"] [--lang text] [--max 6000]  text as a code block (end kept)
  release add --sha <sha> --req REQ-001[,…] [--result ok|failed] [--backup name] [--note file.md]
  hub                                   refresh the "Đang mở" list on the hub page
  call <tool> [<json>|@file|-]          any Kicho MCP tool`

const [cmd, sub, ...rest] = process.argv.slice(2)
const twoWord = {
  req: { new: cmdReqNew, adopt: cmdReqAdopt, status: cmdReqStatus, read: cmdReqRead, ack: cmdReqAck },
  tasks: { add: cmdTasksAdd, set: cmdTasksSet, list: cmdTasksList },
  card: { resolve: (a) => cmdCard(a, 'resolve'), result: (a) => cmdCard(a, 'result') },
}
const oneWord = { memory: cmdMemory, remember: cmdRemember, recall: cmdRecall, 'init-docs': cmdInitDocs, init: cmdInit, show: cmdShow, evidence: cmdEvidence, test: cmdTest, log: cmdLog, release: cmdRelease, hub: cmdHub, call: cmdCall, answer: cmdAnswer, sprint: cmdSprint, gate: cmdGate, doc: cmdDoc }
try {
  if (twoWord[cmd]) {
    const fn = twoWord[cmd][sub] ?? die(`unknown: ${cmd} ${sub ?? ''}\n${HELP}`)
    await fn(parseArgs(rest))
  } else if (oneWord[cmd]) {
    await oneWord[cmd](parseArgs([sub, ...rest].filter((x) => x !== undefined)))
  } else {
    console.log(HELP)
  }
} catch (e) {
  die(e?.message ?? String(e))
}
