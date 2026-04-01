import { config } from "dotenv"
config({ path: ".env.local" })

import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@prisma/client"
import ws from "ws"

neonConfig.webSocketConstructor = ws
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const RESOURCES = [
  "admin_users",
  "admin_roles",
  "admin_apps",
  "grants_isbe",
  "grants_non_isbe",
  "payroll",
  "payroll_final",
]

const ACTIONS = ["view", "edit", "manage", "delete"]

const APPS = [
  {
    name: "ISBE Grants",
    slug: "grants-isbe",
    description: "Illinois State Board of Education grant management and tracking.",
    icon: "FileText",
    route: "/grants-isbe",
    requiredPermission: "grants_isbe:view",
    sortOrder: 1,
  },
  {
    name: "Non-ISBE Grants",
    slug: "grants-non-isbe",
    description: "Non-ISBE grant applications, tracking, and reporting.",
    icon: "ClipboardList",
    route: "/grants-non-isbe",
    requiredPermission: "grants_non_isbe:view",
    sortOrder: 2,
  },
  {
    name: "Payroll Efficiencies",
    slug: "payroll",
    description: "Payroll efficiency analysis and reporting tools.",
    icon: "BarChart2",
    route: "/payroll",
    requiredPermission: "payroll:view",
    sortOrder: 3,
  },
  {
    name: "Payroll Final Payout",
    slug: "payroll-final",
    description: "Final payout processing and approval workflows.",
    icon: "DollarSign",
    route: "/payroll-final",
    requiredPermission: "payroll_final:view",
    sortOrder: 4,
  },
]

async function main() {
  console.log("🌱 Seeding database...")

  // 1. Permissions matrix
  console.log("  → Creating permissions...")
  const allPermissions: { id: string; resource: string; action: string }[] = []

  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        create: { resource, action },
        update: {},
      })
      allPermissions.push(perm)
    }
  }

  // 2. Roles
  console.log("  → Creating roles...")

  // super_admin — all permissions
  const superAdmin = await prisma.role.upsert({
    where: { name: "super_admin" },
    create: {
      name: "super_admin",
      displayName: "Super Administrator",
      description: "Full access to all features and administration.",
      isSystem: true,
    },
    update: {},
  })

  // Assign all permissions to super_admin
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id },
      },
      create: { roleId: superAdmin.id, permissionId: perm.id },
      update: {},
    })
  }

  // grants_admin — grants resources
  const grantsAdmin = await prisma.role.upsert({
    where: { name: "grants_admin" },
    create: {
      name: "grants_admin",
      displayName: "Grants Administrator",
      description: "Full access to ISBE and Non-ISBE grant applications.",
    },
    update: {},
  })

  const grantsPerms = allPermissions.filter((p) =>
    ["grants_isbe", "grants_non_isbe"].includes(p.resource)
  )
  for (const perm of grantsPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: grantsAdmin.id, permissionId: perm.id },
      },
      create: { roleId: grantsAdmin.id, permissionId: perm.id },
      update: {},
    })
  }

  // payroll_admin — payroll resources
  const payrollAdmin = await prisma.role.upsert({
    where: { name: "payroll_admin" },
    create: {
      name: "payroll_admin",
      displayName: "Payroll Administrator",
      description: "Full access to payroll and final payout applications.",
    },
    update: {},
  })

  const payrollPerms = allPermissions.filter((p) =>
    ["payroll", "payroll_final"].includes(p.resource)
  )
  for (const perm of payrollPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: payrollAdmin.id, permissionId: perm.id },
      },
      create: { roleId: payrollAdmin.id, permissionId: perm.id },
      update: {},
    })
  }

  // viewer — view-only across all resources
  const viewer = await prisma.role.upsert({
    where: { name: "viewer" },
    create: {
      name: "viewer",
      displayName: "Viewer",
      description: "Read-only access to assigned applications.",
    },
    update: {},
  })

  const viewPerms = allPermissions.filter((p) => p.action === "view")
  for (const perm of viewPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: viewer.id, permissionId: perm.id },
      },
      create: { roleId: viewer.id, permissionId: perm.id },
      update: {},
    })
  }

  // 3. App tiles
  console.log("  → Creating app tiles...")
  for (const app of APPS) {
    await prisma.app.upsert({
      where: { slug: app.slug },
      create: app,
      update: { description: app.description, icon: app.icon },
    })
  }

  // 4. Super admin user
  console.log("  → Creating super admin user (aziz@flowlyst.io)...")
  const adminUser = await prisma.user.upsert({
    where: { email: "aziz@flowlyst.io" },
    create: {
      email: "aziz@flowlyst.io",
      name: "Aziz",
      isActive: true,
    },
    update: { isActive: true },
  })

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: adminUser.id, roleId: superAdmin.id },
    },
    create: { userId: adminUser.id, roleId: superAdmin.id },
    update: {},
  })

  console.log("✅ Seed complete!")
  console.log(`   ${allPermissions.length} permissions`)
  console.log(`   4 roles (super_admin, grants_admin, payroll_admin, viewer)`)
  console.log(`   ${APPS.length} app tiles`)
  console.log(`   Super admin: aziz@flowlyst.io`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
