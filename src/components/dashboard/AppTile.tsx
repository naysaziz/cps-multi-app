"use client"

import Link from "next/link"
import { AppTile as AppTileType } from "@/types"
import {
  FileText,
  DollarSign,
  BarChart2,
  ClipboardList,
  Grid2X2,
  LucideIcon,
} from "lucide-react"

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  DollarSign,
  BarChart2,
  ClipboardList,
  Grid2X2,
}

type Props = {
  app: AppTileType
  index?: number
}

export default function AppTile({ app, index = 0 }: Props) {
  const Icon = ICON_MAP[app.icon ?? ""] ?? Grid2X2
  const delayClass = ["delay-1", "delay-2", "delay-3", "delay-4"][index % 4] ?? ""

  return (
    <Link
      href={app.route}
      className={`
        group block bg-white rounded-xl border border-silver-border
        shadow-sm hover:shadow-md transition-all duration-200
        hover:-translate-y-0.5 hover:border-cobalt-light
        animate-fade-up ${delayClass}
      `}
    >
      {/* Icon area */}
      <div className="flex items-center justify-center h-20 bg-cobalt-50 rounded-t-xl border-b border-silver-border group-hover:bg-cobalt-light transition-colors">
        <div className="flex items-center justify-center w-10 h-10 bg-cobalt rounded-lg shadow-cobalt">
          <Icon size={20} className="text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-charcoal text-sm leading-tight mb-1">
          {app.name}
        </h3>
        {app.description && (
          <p className="text-charcoal-muted text-xs leading-relaxed line-clamp-2">
            {app.description}
          </p>
        )}
        {!app.isActive && (
          <span className="inline-block mt-2 px-2 py-0.5 bg-silver-light text-charcoal-muted text-xs rounded-full border border-silver-border">
            Coming soon
          </span>
        )}
      </div>
    </Link>
  )
}
