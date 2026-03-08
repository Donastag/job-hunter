import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "demo",
      clientSecret: process.env.GOOGLE_SECRET || "demo",
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
}

export default NextAuth(authOptions)