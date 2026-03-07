import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
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
  pages: {
    signIn: '/auth/signin',
  },
})

export { handler as GET, handler as POST }
