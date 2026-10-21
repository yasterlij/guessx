export const STANDARD_PRODUCT_CATEGORIES = [
  "Computers",
  "Smartphones",
  "Tablets",
  "Electronics",
  "Cars",
  "Clothes",
  "Audio",
  "Gaming",
  "Appliances",
] as const;

const CATEGORY_KEYWORDS: Array<{
  category: (typeof STANDARD_PRODUCT_CATEGORIES)[number];
  keywords: string[];
}> = [
  {
    category: "Cars",
    keywords: [
      "car",
      "cars",
      "vehicle",
      "toyota",
      "hyundai",
      "suv",
      "sedan",
      "pickup",
    ],
  },
  {
    category: "Clothes",
    keywords: [
      "cloth",
      "clothes",
      "clothing",
      "fashion",
      "shirt",
      "dress",
      "jacket",
      "shoe",
      "shoes",
      "wear",
    ],
  },
  {
    category: "Smartphones",
    keywords: [
      "smartphone",
      "smartphones",
      "phone",
      "phones",
      "iphone",
      "galaxy",
      "pixel",
      "android",
      "mobile",
    ],
  },
  {
    category: "Tablets",
    keywords: ["tablet", "tablets", "ipad", "tab"],
  },
  {
    category: "Computers",
    keywords: [
      "computer",
      "computers",
      "laptop",
      "desktop",
      "pc",
      "macbook",
      "imac",
      "notebook",
      "surface",
      "thinkpad",
    ],
  },
  {
    category: "Gaming",
    keywords: [
      "gaming",
      "xbox",
      "playstation",
      "ps5",
      "ps4",
      "nintendo",
      "switch",
      "console",
    ],
  },
  {
    category: "Audio",
    keywords: [
      "audio",
      "speaker",
      "speakers",
      "headphone",
      "headphones",
      "earbud",
      "earbuds",
      "soundbar",
      "jbl",
      "bose",
    ],
  },
  {
    category: "Appliances",
    keywords: [
      "appliance",
      "appliances",
      "fridge",
      "refrigerator",
      "washer",
      "dryer",
      "oven",
      "microwave",
      "vacuum",
      "dyson",
    ],
  },
  {
    category: "Electronics",
    keywords: [
      "electronics",
      "electronic",
      "camera",
      "tv",
      "monitor",
      "drone",
      "gopro",
      "canon",
      "sony",
      "anker",
      "fitbit",
      "meta",
      "apple",
      "samsung",
      "google",
      "microsoft",
      "logitech",
      "dji",
    ],
  },
];

function normalize(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

export function normalizeProductCategory(
  rawCategory?: string | null,
  productName?: string | null,
  productBrand?: string | null,
): string {
  const normalizedCategory = normalize(rawCategory);
  const directMatch = STANDARD_PRODUCT_CATEGORIES.find(
    (category) => normalize(category) === normalizedCategory,
  );

  if (directMatch) {
    return directMatch;
  }

  const source = [
    normalizedCategory,
    normalize(productBrand),
    normalize(productName),
  ]
    .filter(Boolean)
    .join(" ");

  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((keyword) => source.includes(keyword))) {
      return entry.category;
    }
  }

  return "Electronics";
}
