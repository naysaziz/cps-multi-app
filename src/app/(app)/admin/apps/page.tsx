import { prisma } from "@/lib/prisma"
import AppsClient from "./AppsClient"

export default async function AdminAppsPage() {
  const apps = await prisma.app.findMany({ orderBy: { sortOrder: "asc" } })
  return <AppsClient apps={apps} />
}
