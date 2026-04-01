import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles: string[]
      permissions: string[]
      isSuperAdmin: boolean
    } & DefaultSession["user"]
  }
}
