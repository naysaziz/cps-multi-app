import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AdminSettingsClient from "./AdminSettingsClient"

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session?.user.isSuperAdmin) redirect("/dashboard")

  const rows = await prisma.systemSetting.findMany()
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return <AdminSettingsClient settings={settings} />
}
