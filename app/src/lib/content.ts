// Every editable piece of website copy and imagery. Stored in the settings table as "c.<key>".
export type FieldType = "text" | "textarea" | "image" | "video";
export type ContentField = { k: string; label: string; type?: FieldType; def: string };
export type ContentGroup = { id: string; title: string; fields: ContentField[] };

const t = (k: string, label: string, def: string): ContentField => ({ k, label, type: "text", def });
const ta = (k: string, label: string, def: string): ContentField => ({ k, label, type: "textarea", def });
const img = (k: string, label: string, def: string): ContentField => ({ k, label, type: "image", def });

export const CONTENT_GROUPS: ContentGroup[] = [
  { id: "seo", title: "Site name & search engines", fields: [
    t("seo_title", "Browser tab / Google title", "Little Bean | Baby food store in the Maldives"),
    ta("seo_description", "Google description", "Organic porridge, oats, snacks, pasta and fruit pouches for babies and toddlers. Shop by age and brand, then pay by BML bank transfer."),
    t("brand_name", "Shop name (small text)", "Little Bean"),
    img("logo_image", "Logo image (optional, replaces the built-in logo)", ""),
  ] },
  { id: "hero", title: "Home: top banner", fields: [
    t("hero_eyebrow", "Small label", "Baby food store in the Maldives"),
    t("hero_title", "Headline", "Good food for"),
    t("hero_highlight", "Headline (green, underlined)", "tiny tummies"),
    ta("hero_text", "Intro text", "Porridge, oats, snacks, pasta and fruit pouches from brands moms trust. Pick by age, add to your basket, and order in a minute."),
    t("hero_cta", "Main button", "Shop all products"),
    t("hero_cta2", "Second link", "Shop by age"),
    t("mobile_hint", "Hint under the hanging mobile", "Tap a charm to explore"),
  ] },
  { id: "marquee", title: "Home: scrolling brand strip", fields: [
    t("brands_strip_label", "Small label before the logos (optional)", "Brands we love"),
  ] },
  { id: "ages", title: "Home: shop by age", fields: [
    t("ages_title", "Title", "What's your little one ready for?"),
    t("ages_text", "Text", "Every product is tagged by age, so you only see what fits."),
    t("age6_title", "6m+ title", "First tastes"), t("age6_note", "6m+ text", "Smooth porridges, oats and pouches"),
    t("age7_title", "7m+ title", "Little nibblers"), t("age7_note", "7m+ text", "Soft noodles and long sticks"),
    t("age9_title", "9m+ title", "Busy snackers"), t("age9_note", "9m+ text", "Crunchy rice puffs"),
    t("age12_title", "12m+ title", "Toddler meals"), t("age12_note", "12m+ text", "Creamy quick-cook pastas"),
  ] },
  { id: "sections", title: "Home: section titles", fields: [
    t("cats_title", "Categories title", "Shop by category"), t("cats_text", "Categories text", "From first spoonfuls to toddler lunches."),
    t("fav_title", "Favourites title", "Mom favourites"), t("fav_text", "Favourites text", "The ones that keep selling out."),
    t("brands_title", "Brands title", "Brands we stock"), t("brands_text", "Brands text", "Hand-picked from Malaysia, the UK, Korea and Finland."),
  ] },
  { id: "snack", title: "Home: snack time block", fields: [
    t("snack_label", "Small label", "Puffs & Sticks"), t("snack_title", "Title", "Snack time, sorted."),
    ta("snack_text", "Text", "Melt-in-the-mouth rice puffs and extra-long sticks that tiny hands can hold. Baked, never fried, with no added sugar or salt."),
    t("snack_cta", "Button", "Shop snacks"), t("snack_category", "Button opens category (id)", "snacks"),
    img("snack_image", "Photo", "/assets/life/snack.jpg"),
  ] },
  { id: "how", title: "How ordering works", fields: [
    t("how_title", "Title", "Ordering is easy"), img("how_image", "Photo", "/assets/life/feeding.webp"),
    t("how_badge_title", "Photo badge title", "Delivered to your door"), t("how_badge_text", "Photo badge text", "Male, Hulhumale and Villimale"),
    t("step1_title", "Step 1 title", "Create your account"), ta("step1_text", "Step 1 text", "Sign up with your Viber or WhatsApp number. Your account is verified instantly."),
    t("step2_title", "Step 2 title", "Fill your basket"), ta("step2_text", "Step 2 text", "Browse by age, brand or category and tap + on anything you like."),
    t("step3_title", "Step 3 title", "We confirm your order"), ta("step3_text", "Step 3 text", "You'll get a confirmation on WhatsApp. Pay by BML transfer and attach the slip."),
    t("step4_title", "Step 4 title", "We deliver"), ta("step4_text", "Step 4 text", "Your order arrives at your door. Other islands by ferry or speedboat."),
  ] },
  { id: "care", title: "Home: what we look for", fields: [
    t("care_title", "Title", "What we look for on every label"), img("care_image", "Background photo", "/assets/life/flatlay.jpg"),
    t("care1_title", "Point 1", "Real ingredients"), t("care1_text", "Point 1 text", "Short lists you can read out loud."),
    t("care2_title", "Point 2", "Clear allergy info"), t("care2_text", "Point 2 text", "Milk, gluten, soy and sesame flagged."),
    t("care3_title", "Point 3", "Made for their age"), t("care3_text", "Point 3 text", "Textures that match each stage."),
    t("care4_title", "Point 4", "Nothing sneaky"), t("care4_text", "Point 4 text", "Many picks with no added sugar or salt."),
  ] },
  { id: "meals", title: "Home: toddler meals & Instagram", fields: [
    t("meals_title", "Meals card title", "Toddler lunches in 7 minutes"), t("meals_text", "Meals card text", "Creamy veggie pastas for 12 months+"),
    t("meals_category", "Meals card opens category (id)", "pasta"), img("meals_image", "Meals photo", "/assets/life/pasta.jpg"),
    t("insta_title", "Instagram card title", "New arrivals land on Instagram first"), ta("insta_text", "Instagram card text", "Follow along for new flavours, restocks and little recipe ideas."),
  ] },
  { id: "shop", title: "Shop page", fields: [
    t("shop_title", "Title", "All products"), t("shop_text", "Text", "Everything we stock, from first tastes to toddler meals."),
  ] },
  { id: "about", title: "About page", fields: [
    t("about_eyebrow", "Small label", "About Little Bean"), t("about_title", "Title", "Growth nutrition for tiny tummies"),
    ta("about_text", "Text", "We are a small Maldivian shop that brings trusted baby and toddler foods to local families. We read every label, choose simple ingredients, and stock the textures and flavours little ones love, from first smooth porridges to quick toddler pastas."),
    img("about_image", "Photo", "/assets/life/mom.jpg"), t("faq_title", "FAQ title", "Questions moms ask"),
    t("faq1_q", "Question 1", "Where do you deliver?"), ta("faq1_a", "Answer 1", "We deliver across Male, Hulhumale and Villimale. For other islands, we send by ferry or speedboat. Message us for rates."),
    t("faq2_q", "Question 2", "How do I order and pay?"), ta("faq2_a", "Answer 2", "Create an account, add products to your basket and place your order. We confirm it on WhatsApp. Pay by BML bank transfer and attach the slip, or send it to us with your order number."),
    t("faq3_q", "Question 3", "Can I return or exchange a product?"), ta("faq3_a", "Answer 3", "All sales are instant purchase only, with no refunds or returns. Please double-check flavours and ages before you order, and message us if you are unsure."),
    t("faq4_q", "Question 4", "Which age is right for my baby?"), ta("faq4_a", "Answer 4", "Every product shows an age tag (6m+, 7m+, 9m+ or 12m+). Always follow your paediatrician's advice, supervise your little one while eating, and check the pack for allergy information."),
    t("faq5_q", "Question 5", "Can I see the full label?"), ta("faq5_a", "Answer 5", "Yes. Message us with the product name and we'll send a clear photo of the ingredients and nutrition label."),
    t("faq6_q", "Question 6 (optional)", ""), ta("faq6_a", "Answer 6", ""),
  ] },
  { id: "footer", title: "Footer", fields: [
    ta("footer_text", "Footer text", "Growth nutrition for tiny tummies. Organic and natural baby food from brands moms trust, delivered in the Maldives."),
    t("footer_left", "Bottom left", "Little Bean, Maldives"), t("footer_right", "Bottom right", "Instant purchase only. No refund, no return."),
  ] },
];

const DEFAULTS: Record<string, string> = Object.fromEntries(CONTENT_GROUPS.flatMap((g) => g.fields.map((f) => [f.k, f.def])));

/** Read a content value with its default. */
export function c(settings: Record<string, string>, key: string): string {
  const v = settings[`c.${key}`];
  return v !== undefined && v !== "" ? v : (DEFAULTS[key] ?? "");
}
/** Like c() but an explicitly cleared value stays empty (for optional media). */
export function cRaw(settings: Record<string, string>, key: string): string {
  const v = settings[`c.${key}`];
  return v !== undefined ? v : (DEFAULTS[key] ?? "");
}
export const CONTENT_KEYS = Object.keys(DEFAULTS);
