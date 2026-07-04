import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: { 
    github: { 
      clientId: process.env.GITHUB_CLIENT_ID as string, 
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 

      mapProfileToUser:async(profile)=>({
        email:profile.email ?? `${profile.id}@users.noreply.github.com`,
        name:profile.name ?? profile.login,
      })
    }, 
  }, 
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          try {
            await prisma.auditEvent.create({
              data: {
                userId: session.userId,
                action: "user_signed_in",
                details: "User signed in via GitHub OAuth.",
              },
            });
          } catch (e) {
            console.warn("Failed to log sign-in audit event:", e);
          }
        },
      },
    },
  },
   plugins: [nextCookies()] 
});
