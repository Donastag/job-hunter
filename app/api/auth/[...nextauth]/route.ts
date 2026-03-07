import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "demo",
      clientSecret: process.env.GITHUB_SECRET || "demo",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "demo",
      clientSecret: process.env.GOOGLE_SECRET || "demo",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as { id: string }).id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
})

export { handler as GET, handler as POST }
