/**
 * Curated high-resolution studio product photography
 * Replaces generic picsum placeholders with crisp, matching product visuals.
 */

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // Audio
  "sony wh-1000xm5":
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  "bose quietcomfort ultra":
    "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80",
  "bose quietcomfort earbuds ii":
    "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
  "airpods pro (2nd gen)":
    "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80",
  "jbl flip 6":
    "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",

  // Luggage & Travel
  "samsonite omni 28\" spinner":
    "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&auto=format&fit=crop&q=80",
  "samsonite":
    "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=800&auto=format&fit=crop&q=80",
  "anker nebula capsule 3 laser":
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",

  // Cameras & Imaging
  "sony alpha a7 iv":
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
  "canon eos r50":
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop&q=80",
  "gopro hero12 black":
    "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80",
  "insta360 x3 action camera":
    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80",
  "dji mini 4 pro":
    "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800&auto=format&fit=crop&q=80",
  "autel evo lite+ drone":
    "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80",

  // Smartphones
  "iphone 15 pro max":
    "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80",
  "samsung galaxy s24 ultra":
    "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80",
  "google pixel 9 pro":
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",

  // Computers & Tablets
  "macbook air m3":
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
  "macbook pro 14-inch m3 pro":
    "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80",
  "ipad pro 13-inch m4":
    "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80",
  "keychron q1 mechanical keyboard":
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
  "logitech mx master 3s":
    "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80",
  "lg 27gp850-b 4k gaming monitor":
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80",
  "logitech brio 4k webcam":
    "https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80",

  // Gaming
  "playstation 5 slim":
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80",
  "nintendo switch oled":
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80",
  "xbox series x":
    "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&auto=format&fit=crop&q=80",
  "meta quest 3":
    "https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop&q=80",

  // Wearables & Electronics
  "apple watch ultra 2":
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
  "samsung galaxy watch 6":
    "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
  "fitbit charge 6":
    "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&auto=format&fit=crop&q=80",
  "kindle paperwhite (2024)":
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80",
  "anker 737 power bank":
    "https://images.unsplash.com/photo-1609592424364-774f17782631?w=800&auto=format&fit=crop&q=80",

  // Luxury & Fashion
  "omega seamaster diver 300m":
    "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
  "ray-ban aviator classic":
    "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80",
  "chanel no. 5 eau de parfum":
    "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&auto=format&fit=crop&q=80",
  "schott nyc perfecto leather jacket":
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80",

  // Home & Vehicles
  "dyson pure cool tp09":
    "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80",
  "delonghi magnifica evo":
    "https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?w=800&auto=format&fit=crop&q=80",
  "ninja af161 air fryer max xl":
    "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80",
  "irobot roomba j7+":
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
  "segway ninebot kickscooter f40":
    "https://images.unsplash.com/photo-1604868189265-219ba7bf7ea3?w=800&auto=format&fit=crop&q=80",
  "trek marlin 7 mountain bike":
    "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80",
}

export function getCuratedProductImage(name?: string, fallbackUrl?: string): string {
  if (!name) return fallbackUrl || "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"

  const normalized = name.toLowerCase().trim()

  if (PRODUCT_IMAGE_MAP[normalized]) {
    return PRODUCT_IMAGE_MAP[normalized]
  }

  for (const [key, url] of Object.entries(PRODUCT_IMAGE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return url
    }
  }

  if (fallbackUrl && !fallbackUrl.includes("picsum.photos")) {
    return fallbackUrl
  }

  return "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&auto=format&fit=crop&q=80"
}
