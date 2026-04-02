"use client"

import { useState } from "react"

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

type Props = {
  settings: Record<string, string>
}

export default function AdminSettingsClient({ settings }: Props) {
  const [provider, setProvider] = useState<Provider>(
    (settings.ai_provider as Provider) ?? "claude"
  )
  const [model, setModel] = useState(settings.ai_model ?? "claude-opus-4-6")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleProviderChange(p: Provider) {
    setProvider(p)
    // Default to first model of new provider
    setModel(MODELS[p][0].value)
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError(null)

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_provider: provider, ai_model: model }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const providerModels = MODELS[provider]
  // If current model isn't in the new provider list, reset to first
  const validModel = providerModels.find((m) => m.value === model)
    ? model
    : providerModels[0].value

  return (
    <div className="max-w-xl">
      <h2 className="text-base font-semibold text-charcoal mb-1">AI Parsing Settings</h2>
      <p className="text-sm text-charcoal-muted mb-6">
        Choose which AI provider and model is used to parse FSG PDF reports.
      </p>

      <div className="bg-white border border-border rounded-lg p-6 space-y-5">
        {/* Provider */}
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
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            Model
          </label>
          <select
            value={validModel}
            onChange={(e) => {
              setModel(e.target.value)
              setSaved(false)
            }}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-cobalt/30"
          >
            {providerModels.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* API key note */}
        <div className="rounded-md bg-cobalt-light border border-cobalt/20 px-4 py-3 text-xs text-cobalt">
          <p className="font-medium mb-0.5">Required environment variables</p>
          <p>
            {provider === "claude" && "ANTHROPIC_API_KEY"}
            {provider === "openai" && "OPENAI_API_KEY"}
            {provider === "google" && "GOOGLE_AI_API_KEY"}
            {" "}must be set in{" "}
            <span className="font-mono">.env.local</span> (and in Vercel for production).
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-cobalt text-white rounded-md hover:bg-cobalt-dark disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">✓ Saved</span>
          )}
          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}
