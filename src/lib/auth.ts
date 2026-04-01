import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "cps.edu")
  .split(",")
  .map((d) => d.trim())

const devAllowedEmails = (process.env.DEV_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean)

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Allow linking OAuth accounts to pre-seeded user rows (no account takeover
      // risk here — single provider, domain-restricted, internal app only)
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? ""

      // Dev override — specific emails always allowed
      if (devAllowedEmails.includes(email)) return true

      // Domain restriction
      const domain = email.split("@")[1]
      if (!allowedDomains.includes(domain)) {
        return "/login?error=unauthorized_domain"
      }

      // Block deactivated users
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { isActive: true },
      })

      // First sign-in: user doesn't exist yet, NextAuth will create them
      if (!dbUser) return true

      return dbUser.isActive ? true : "/login?error=account_disabled"
    },

    async session({ session, user }) {
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      })

      const roles = userWithRoles?.userRoles.map((ur) => ur.role.name) ?? []
      const permissions =
        userWithRoles?.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map(
            (rp) => `${rp.permission.resource}:${rp.permission.action}`
          )
        ) ?? []

      session.user.id = user.id
      session.user.roles = roles
      session.user.permissions = permissions
      session.user.isSuperAdmin = roles.includes("super_admin")

      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "database",
  },
})
