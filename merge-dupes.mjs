import { db } from './src/db/index.js'; import { products, retailerListings } from './src/db/schema.js'; import { like, eq } from 'drizzle-orm';
// Find the duplicate IdeaPad Slim 3 from The Good Guys
const dupes = await db.select().from(products).where(like(products.name, '%82XJ0016AU%'));
console.log('Found duplicate products:', dupes.length);
// Get the JB Hi-Fi version of the same product
const jbProducts = await db.select().from(products).where(like(products.name, '%IdeaPad Slim 3 14%'));
console.log('JB Hi-Fi versions:', jbProducts.map(p => p.name));
// Update the listing to point to JB Hi-Fi product if we have both
if (dupes.length > 0 && jbProducts.length > 0) {
  const dupeId = dupes[0].id;
  const jbId = jbProducts.find(p => !p.name.includes('82XJ'))?.id;
  if (jbId) {
    console.log('Updating listing from', dupeId, 'to', jbId);
    await db.update(retailerListings).set({ productId: jbId }).where(eq(retailerListings.productId, dupeId));
    await db.delete(products).where(eq(products.id, dupeId));
    console.log('Merged products');
  }
}
process.exit(0);
