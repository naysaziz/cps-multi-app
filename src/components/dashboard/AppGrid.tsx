import { AppTile as AppTileType } from "@/types"
import AppTile from "./AppTile"

type Props = {
  apps: AppTileType[]
}

export default function AppGrid({ apps }: Props) {
  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-cobalt-50 rounded-full flex items-center justify-center mb-4">
          <span className="text-cobalt text-2xl">📋</span>
        </div>
        <h3 className="text-charcoal font-semibold mb-1">No apps available</h3>
        <p className="text-charcoal-muted text-sm max-w-xs">
          You don&apos;t have access to any apps yet. Contact your administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {apps.map((app, i) => (
        <AppTile key={app.id} app={app} index={i} />
      ))}
    </div>
  )
}
