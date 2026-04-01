type Props = {
  label: string
  enabled: boolean
  disabled?: boolean
  onChange: () => void
}

export default function PermissionToggle({
  label,
  enabled,
  disabled = false,
  onChange,
}: Props) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`
        px-3 py-1.5 text-xs font-medium rounded-full border transition-colors cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          enabled
            ? "bg-cobalt text-white border-cobalt hover:bg-cobalt-dark"
            : "bg-white text-charcoal-mid border-silver-border hover:bg-silver-light hover:border-silver"
        }
      `}
    >
      {label}
    </button>
  )
}
