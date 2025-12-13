import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'price-finda',
  name: "Max's Price Finda",
  eventKey: process.env.INNGEST_EVENT_KEY,
})
