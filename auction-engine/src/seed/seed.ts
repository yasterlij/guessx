import { DataSource } from "typeorm";
import { Product } from "../modules/admin/entities/product.entity";
import {
  Auction,
  AuctionStatus,
} from "../modules/winner/entities/auction.entity";

const MOCK_AUCTIONS = [
  {
    name: "iPhone 15 Pro Max",
    category: "Smartphones",
    description:
      "6.7-inch Super Retina XDR display, A17 Pro chip, titanium design and a pro camera system. The most advanced iPhone, up for grabs at the lowest unique bid.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/IPhone_15_pro_max.jpg",
    timeLeft: 2 * 3600 + 15 * 60 + 30,
    status: "live",
  },
  {
    name: 'Samsung 55" Smart TV',
    category: "Electronics",
    description:
      "Crystal UHD 4K smart TV with vivid color, slim bezels and built-in streaming. Bring the cinema home for a fraction of the price.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/1/1d/Samsung_LED_TV.jpg",
    timeLeft: 1 * 3600 + 45 * 60 + 10,
    status: "live",
  },
  {
    name: "Dell XPS Laptop",
    category: "Computers",
    description:
      "Ultra-thin Dell XPS with a stunning InfinityEdge display, Intel Core processor and all-day battery. Built for work and play.",
    image:
      "https://platform.theverge.com/wp-content/uploads/sites/2/chorus/uploads/chorus_asset/file/3405340/dell-xps-0212.0.jpg",
    timeLeft: 3 * 3600 + 30 * 60 + 45,
    status: "live",
  },
  {
    name: "Wireless Headphones Pro",
    category: "Audio",
    description:
      "Premium noise-cancelling over-ear headphones with up to 30 hours of battery and crystal-clear sound.",
    image:
      "https://www.classic-phones.com/cdn/shop/files/image_e0fd1474-6c62-43a8-916f-7c118e375ed6_large.jpg?v=1715270049",
    timeLeft: 40 * 60 + 12,
    status: "ending-soon",
  },
  {
    name: "Next-Gen Game Console",
    category: "Gaming",
    description:
      "Lightning-fast next-generation console with ultra-high-speed SSD, ray tracing and one wireless controller included.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png",
    timeLeft: 5 * 3600 + 5 * 60,
    status: "live",
  },
];

async function seed() {
  const ds = new DataSource({
    type: "postgres",
    url:
      process.env.DATABASE_URL ||
      "postgresql://admin:secret@localhost:5432/guessx_db",
    entities: [Product, Auction],
  });

  await ds.initialize();
  console.log("Connected to database");

  const productRepo = ds.getRepository(Product);
  const auctionRepo = ds.getRepository(Auction);
  let productsCreated = 0;
  let auctionsCreated = 0;

  for (const item of MOCK_AUCTIONS) {
    // Check if product already exists by name + category
    let product = await productRepo.findOne({
      where: { name: item.name, category: item.category },
    });
    if (!product) {
      product = productRepo.create({
        name: item.name,
        description: item.description,
        image_urls: [item.image],
        current_market_price: 0,
        category: item.category,
      });
      await productRepo.save(product);
      productsCreated++;
      console.log(`  Created product: ${item.name}`);
    } else {
      console.log(`  Skipped product (exists): ${item.name}`);
    }

    // Check for an active auction on this product
    const existing = await auctionRepo.findOne({
      where: { product_id: product.id, status: AuctionStatus.ACTIVE },
    });
    if (!existing) {
      const now = new Date();
      const auctionStatus =
        item.status === "ending-soon"
          ? AuctionStatus.ACTIVE
          : AuctionStatus.ACTIVE;
      const auction = auctionRepo.create({
        product_id: product.id,
        start_time: now,
        end_time: new Date(now.getTime() + item.timeLeft * 1000),
        status: auctionStatus,
      });
      await auctionRepo.save(auction);
      auctionsCreated++;
      console.log(
        `  Created auction for: ${item.name} (ends ${auction.end_time.toISOString()})`,
      );
    } else {
      console.log(`  Skipped auction (active exists): ${item.name}`);
    }
  }

  console.log(
    `\nDone — ${productsCreated} products, ${auctionsCreated} auctions created`,
  );
  await ds.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
