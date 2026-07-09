
import { Inngest } from "inngest";

export const inngest = new Inngest({ 
  id: "shipflow-Ai-reviewer",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY
});