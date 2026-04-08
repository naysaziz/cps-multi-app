"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────

type Section = "ai" | "footnotes"
type FootnoteStyle = "number" | "letter" | "bullet"

// ─── AI constants ─────────────────────────────────────────────

const AI_PROVIDERS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google Gemini" },
] as const

type Provider = (typeof AI_PROVIDERS)[number]["value"]

const MODELS: Record<Provider, { value: string; label: string }[]> = {
  claude: [
    { value: "claude-opus-4-6", label: "Claude Opus 4.6 (most capable)" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (fast + capable)" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest)" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o (most capable)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini (fast)" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (fast)" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (capable)" },
  ],
}

// ─── Nav items ────────────────────────────────────────────────

const NAV: { key: Section; label: string; sub: string; icon: React.ReactNode }[] = [
  {
    key: "ai",
    label: "AI Parsing",
    sub: "Provider & model",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.31 48.31 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    key: "footnotes",
    label: "ISBE Footnotes",
    sub: "Report notes",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
]

// ─── Helpers ──────────────────────────────────────────────────

function getPrefix(style: FootnoteStyle, index: number): string {
  if (style === "letter") return `${String.fromCharCode(65 + index)}.`
  if (style === "bullet") return "•"
  return `${index + 1}.`
}

// ─── Main component ───────────────────────────────────────────

export default function AdminSettingsClient({ settings }: { settings: Record<string, string> }) {
  const [section, setSection] = useState<Section>("ai")

  // ── AI state ────────────────────────────────────────────────
  const [provider, setProvider] = useState<Provider>(
    (settings.ai_provider as Provider) ?? "claude"
  )
  const [model, setModel] = useState(settings.ai_model ?? "claude-opus-4-6")
  const [savingAi, setSavingAi] = useState(false)
  const [savedAi, setSavedAi] = useState(false)
  const [errorAi, setErrorAi] = useState<string | null>(null)

  function handleProviderChange(p: Provider) {
    setProvider(p)
    setModel(MODELS[p][0].value)
    setSavedAi(false)
  }

  async function saveAi() {
    setSavingAi(true)
    setSavedAi(false)
    setErrorAi(null)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_provider: provider, ai_model: model }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSavedAi(true)
    } catch (err) {
      setErrorAi(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSavingAi(false)
    }
  }

  // ── Footnotes state ─────────────────────────────────────────
  const parsedFootnotes = (() => {
    try {
      return JSON.parse(settings.isbe_footnotes ?? "null") as
        | { style: FootnoteStyle; items: string[] }
        | null
    } catch {
      return null
    }
  })()

  const [fnStyle, setFnStyle] = useState<FootnoteStyle>(parsedFootnotes?.style ?? "number")
  const [fnItems, setFnItems] = useState<string[]>(parsedFootnotes?.items ?? [])
  const [savingFn, setSavingFn] = useState(false)
  const [savedFn, setSavedFn] = useState(false)
  const [errorFn, setErrorFn] = useState<string | null>(null)

  function updateItem(i: number, value: string) {
    setFnItems((prev) => prev.map((v, idx) => (idx === i ? value : v)))
    setSavedFn(false)
  }

  function removeItem(i: number) {
    setFnItems((prev) => prev.filter((_, idx) => idx !== i))
    setSavedFn(false)
  }

  function addItem() {
    setFnItems((prev) => [...prev, ""])
    setSavedFn(false)
  }

  async function saveFootnotes() {
    setSavingFn(true)
    setSavedFn(false)
    setErrorFn(null)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbe_footnotes: JSON.stringify({ style: fnStyle, items: fnItems.filter(Boolean) }),
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSavedFn(true)
    } catch (err) {
      setErrorFn(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSavingFn(false)
    }
  }

  const validModel = MODELS[provider].find((m) => m.value === model)
    ? model
    : MODELS[provider][0].value

  return (
    <div className="flex gap-8 min-h-[520px]">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-52 shrink-0">
        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-gray-50">
            <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide">
              Settings
            </p>
          </div>
          <nav className="p-2 space-y-0.5">
            {NAV.map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  section === item.key
                    ? "bg-cobalt text-white"
                    : "text-charcoal hover:bg-gray-50"
                }`}
              >
                <span className={section === item.key ? "text-white" : "text-charcoal-muted"}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.label}</p>
                  <p
                    className={`text-xs leading-tight mt-0.5 ${
                      section === item.key ? "text-white/70" : "text-charcoal-muted"
                    }`}
                  >
                    {item.sub}
                  </p>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* AI Parsing */}
        {section === "ai" && (
          <div>
            <h2 className="text-base font-semibold text-charcoal mb-1">AI Parsing</h2>
            <p className="text-sm text-charcoal-muted mb-6">
              Choose which AI provider and model is used to parse FSG PDF reports.
            </p>
            <div className="bg-white border border-border rounded-xl p-6 space-y-5 shadow-sm">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">
                  AI Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as Provider)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Model</label>
                <select
                  value={validModel}
                  onChange={(e) => { setModel(e.target.value); setSavedAi(false) }}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
                >
                  {MODELS[provider].map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg bg-cobalt-light border border-cobalt/20 px-4 py-3 text-xs text-cobalt">
                <p className="font-medium mb-0.5">Required environment variable</p>
                <p>
                  {provider === "claude" && "ANTHROPIC_API_KEY"}
                  {provider === "openai" && "OPENAI_API_KEY"}
                  {provider === "google" && "GOOGLE_AI_API_KEY"}
                  {" "}must be set in <span className="font-mono">.env.local</span> and Vercel.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={saveAi}
                  disabled={savingAi}
                  className="px-4 py-2 text-sm font-medium bg-cobalt text-white rounded-md hover:bg-cobalt-dark disabled:opacity-50 transition-colors"
                >
                  {savingAi ? "Saving…" : "Save"}
                </button>
                {savedAi && <span className="text-sm text-green-600">✓ Saved</span>}
                {errorAi && <span className="text-sm text-red-600">{errorAi}</span>}
              </div>
            </div>
          </div>
        )}

        {/* ISBE Footnotes */}
        {section === "footnotes" && (
          <div>
            <h2 className="text-base font-semibold text-charcoal mb-1">ISBE Footnotes</h2>
            <p className="text-sm text-charcoal-muted mb-6">
              These notes appear at the bottom of every ISBE Expenditure Report.
            </p>

            <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
              {/* Style picker */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <p className="text-sm font-medium text-charcoal">Bullet Style</p>
                <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(
                    [
                      { value: "number", label: "1 · 2 · 3" },
                      { value: "letter", label: "A · B · C" },
                      { value: "bullet", label: "• · • · •" },
                    ] as { value: FootnoteStyle; label: string }[]
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => { setFnStyle(value); setSavedFn(false) }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        fnStyle === value
                          ? "bg-white text-cobalt shadow-sm"
                          : "text-charcoal-muted hover:text-charcoal"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footnote list */}
              <div className="px-6 py-4 space-y-2.5">
                {fnItems.length === 0 && (
                  <p className="text-sm text-charcoal-muted italic py-4 text-center">
                    No footnotes yet. Add one below.
                  </p>
                )}
                {fnItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <span className="w-7 text-right text-sm font-semibold text-cobalt shrink-0 select-none">
                      {getPrefix(fnStyle, i)}
                    </span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => updateItem(i, e.target.value)}
                      placeholder="Enter footnote text…"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt transition-colors"
                    />
                    <button
                      onClick={() => removeItem(i)}
                      title="Remove"
                      className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border bg-gray-50 flex items-center justify-between">
                <button
                  onClick={addItem}
                  className="flex items-center gap-1.5 text-sm text-cobalt hover:text-cobalt-dark font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add Footnote
                </button>
                <div className="flex items-center gap-3">
                  {savedFn && <span className="text-sm text-green-600">✓ Saved</span>}
                  {errorFn && <span className="text-sm text-red-600">{errorFn}</span>}
                  <button
                    onClick={saveFootnotes}
                    disabled={savingFn}
                    className="px-4 py-2 text-sm font-medium bg-cobalt text-white rounded-md hover:bg-cobalt-dark disabled:opacity-50 transition-colors"
                  >
                    {savingFn ? "Saving…" : "Save Footnotes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
