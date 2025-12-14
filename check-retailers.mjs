import { db } from './src/db/index.js'; import { retailers } from './src/db/schema.js'; const r = await db.select().from(retailers); console.log(JSON.stringify(r, null, 2)); process.exit(0);
