import type { Product } from "./catalog";
import { SEED_A, type Seed } from "./seed-a";

const DH_PASTA = "Ready in 7 minutes\nNo preservatives\nNo egg\nNo artificial colours or flavours\nNatural ingredients";
const LOOONG = "Organic brown rice\nNo added sugar or salt\nContains calcium\nLong 14 cm stick, easy for little hands";
const MENNO = "Certified organic\nNo artificial colours or flavours\nNo preservatives, no sugar\nSoft texture to practise chewing\nCooks in 6 to 7 minutes";
const LF = "Organic\nStage 1 smooth texture\nNo added sugar\nGreat at home or on the go";
const NOODLE_SERVE = "Cook in boiling water for 6 to 7 minutes until soft. Cut to size and add to broth or puree.";
const PASTA_SERVE = "Cook the pasta with the included sauce powder for 7 minutes, and you're done.";
const pastaIng = (sauce: string) =>
  `Double Happiness veggie pasta\n${sauce}\nWhey powder\nSkim milk powder\nSalt\nCorn starch\nNon-dairy creamer\nYeast extract`;

const SEED_B: Seed[] = [
  { id: "looong-stick-purple-sweet-potato", name: "Looong Stick, Purple Sweet Potato", brand: "pure-eat", category: "snacks", age: "7m+", price: 95, weight: "30g",
    short: "Extra-long organic brown rice sticks with purple sweet potato.",
    description: "An extra-long organic brown rice stick that little ones can hold and nibble for longer. Flavoured with purple sweet potato.", highlights: LOOONG },
  { id: "looong-stick-broccoli", name: "Looong Stick, Broccoli", brand: "pure-eat", category: "snacks", age: "7m+", price: 95, weight: "30g", featured: 1,
    short: "Extra-long organic brown rice sticks with broccoli.",
    description: "Only organic brown rice and broccoli, with no artificial colours, expanders or preservatives. The long shape is perfect for developing grasp.",
    highlights: LOOONG, ingredients: "Organic brown rice (98.4%)\nBroccoli powder (1%)\nGardenia powder (0.5%)\nCalcium carbonate (0.1%)" },
  { id: "looong-stick-sweet-pumpkin", name: "Looong Stick, Sweet Pumpkin", brand: "pure-eat", category: "snacks", age: "7m+", price: 95, weight: "30g",
    short: "Extra-long organic brown rice sticks with sweet pumpkin.",
    description: "Golden, gently sweet pumpkin sticks made from organic brown rice. Long enough to hold, soft enough to melt.", highlights: LOOONG },
  { id: "baby-noodles-sweet-potato", name: "Organic Baby Noodles, Sweet Potato", brand: "mennosato", category: "pasta", age: "7m+", price: 130, weight: "200g", featured: 1,
    short: "Soft organic baby noodles with natural sweet potato.",
    description: "Soft, fine organic noodles made with natural sweet potato. A gentle way to practise chewing and a lovely base for soups and broths.", highlights: MENNO, serve: NOODLE_SERVE },
  { id: "baby-noodles-spinach", name: "Organic Baby Noodles, Spinach", brand: "mennosato", category: "pasta", age: "7m+", price: 130, weight: "200g",
    short: "Soft organic baby noodles made with spinach.",
    description: "Fine, soft organic noodles with the goodness of spinach. Easy to cook and easy to love.", highlights: MENNO, serve: NOODLE_SERVE },
  { id: "mac-and-cheese", name: "Creamy Mac & Cheese", brand: "double-happiness", category: "pasta", age: "12m+", price: 165, weight: "70g", price_confirmed: 1, featured: 1,
    short: "Veggie macaroni in a creamy cheese sauce, ready in 7 minutes.",
    description: "Everyone's favourite, made for little ones. Colourful veggie macaroni with a creamy cheese sauce and no junk.",
    highlights: DH_PASTA, ingredients: pastaIng("Cheese powder\nButtermilk"), allergy: "Contains milk, soy and sesame", serve: PASTA_SERVE },
  { id: "carbonara-pasta", name: "Creamy Carbonara Pasta", brand: "double-happiness", category: "pasta", age: "12m+", price: 165, weight: "70g", price_confirmed: 1,
    short: "Baby fusilli in a mild, creamy carbonara sauce.",
    description: "Colourful veggie fusilli in a gentle, creamy carbonara sauce. A quick, cosy lunch for toddlers.",
    highlights: DH_PASTA, ingredients: pastaIng("Creamy carbonara powder"), allergy: "Contains milk, soy and sesame", serve: PASTA_SERVE },
  { id: "mushroom-pasta", name: "Creamy Mushroom Pasta", brand: "double-happiness", category: "pasta", age: "12m+", price: 150, weight: "70g", price_confirmed: 1,
    short: "Veggie fusilli in a creamy mushroom sauce.",
    description: "Veggie fusilli tossed in a creamy mushroom sauce. Earthy, mild and made in minutes.",
    highlights: DH_PASTA, ingredients: pastaIng("Mushroom powder"), allergy: "Contains milk, soy and sesame", serve: PASTA_SERVE },
  { id: "pumpkin-pasta", name: "Creamy Pumpkin Pasta", brand: "double-happiness", category: "pasta", age: "12m+", price: 150, weight: "70g",
    short: "Veggie pasta in a sunny, creamy pumpkin sauce.",
    description: "Colourful veggie pasta in a creamy pumpkin sauce. Naturally sweet and ready in 7 minutes.", highlights: DH_PASTA, serve: PASTA_SERVE },
  { id: "tomato-pasta", name: "Creamy Tomato Pasta", brand: "double-happiness", category: "pasta", age: "12m+", price: 150, weight: "70g",
    short: "Veggie pasta shells in a creamy tomato sauce.",
    description: "Little veggie pasta shells in a mild, creamy tomato sauce. A toddler classic, ready in 7 minutes.", highlights: DH_PASTA, serve: PASTA_SERVE },
  { id: "sweet-potato-pasta", name: "Creamy Sweet Potato Pasta", brand: "double-happiness", category: "pasta", age: "12m+", price: 150, weight: "70g",
    short: "Veggie macaroni in a creamy purple sweet potato sauce.",
    description: "Veggie macaroni in a creamy sweet potato sauce with a gentle natural sweetness. Ready in 7 minutes.", highlights: DH_PASTA, serve: PASTA_SERVE },
  { id: "lf-blueberry-banana-yoghurt", name: "Blueberry, Banana & Greek Style Yoghurt", brand: "little-freddie", category: "pouches", age: "6m+", price: 130, price_confirmed: 1, featured: 1,
    short: "Creamy Greek-style yoghurt with blueberries and organic banana.",
    description: "Made with creamy Greek-style yoghurt, juicy blueberries and sweet organic bananas. Smooth, tasty and packed with natural goodness.",
    highlights: LF, allergy: "Contains milk and gluten",
    ingredients: "Organic Greek style yoghurt (milk) (48%)\nOrganic bananas (43%)\nOrganic blueberries (7%)\nOrganic wholemeal oat flour (gluten) (1%)\nOrganic barley flour (gluten) (1%)\nOrganic lemon juice concentrate (<0.1%)" },
  { id: "lf-banana-yoghurt", name: "Creamy Banana Greek Style Yoghurt", brand: "little-freddie", category: "pouches", age: "6m+", price: 130, price_confirmed: 1,
    short: "50% organic banana with creamy Greek-style yoghurt.",
    description: "Made with 50% organic bananas and creamy organic Greek-style yoghurt. A yummy, wholesome snack that is sure to be a favourite.",
    highlights: LF, allergy: "Contains milk and gluten",
    ingredients: "Organic bananas (50%)\nOrganic Greek style yoghurt (48%)\nOrganic wholemeal oat flour\nOrganic barley flour\nOrganic lemon juice concentrate" },
  { id: "lf-pink-lady-apple-yoghurt", name: "Pink Lady Apple Greek Style Yoghurt", brand: "little-freddie", category: "pouches", age: "6m+", price: 130, price_confirmed: 1,
    short: "66% organic Pink Lady apples with Greek-style yoghurt.",
    description: "Made with 66% organic Pink Lady apples and creamy Greek-style yoghurt. Fresh, fruity and smooth.",
    highlights: LF, allergy: "Contains milk and gluten",
    ingredients: "Organic Pink Lady apples (66%)\nOrganic Greek style yoghurt (milk) (32%)\nOrganic wholemeal oat flour (gluten) (2%)" },
  { id: "lf-prunes-apples", name: "Prunes & Apples", brand: "little-freddie", category: "pouches", age: "6m+", price: 130,
    short: "Simply fruit: organic apples and naturally sweet prunes.",
    description: "Made with juicy organic apples and naturally sweet organic prunes. A simple fruit blend with fibre for growing little tummies.",
    highlights: LF + "\nSource of fibre", ingredients: "Organic apples (54%)\nOrganic prunes (46%)" },
  { id: "lf-strawberries-blueberries-oats", name: "Strawberries, Blueberries & Oats", brand: "little-freddie", category: "pouches", age: "6m+", price: 130, price_confirmed: 1, featured: 1,
    short: "Organic berries, apple, banana and creamy oats in one pouch.",
    description: "Juicy organic strawberries, blueberries, apples and bananas with creamy oats. A smooth, tasty pouch for home or on the go.",
    highlights: LF, allergy: "Contains oats (gluten)",
    ingredients: "Organic apples (43%)\nOrganic bananas (26%)\nOrganic strawberries (16%)\nOrganic blueberries (10%)\nOrganic oats (5%)" },
];

export const SEED_PRODUCTS: Product[] = [...SEED_A, ...SEED_B].map((p, i) => ({
  weight: "",
  ingredients: "",
  highlights: "",
  allergy: "",
  serve: "",
  in_stock: 1,
  featured: 0,
  price_confirmed: 0,
  ...p,
  image: `/assets/samples/${p.category}.jpg`,
  sort: i,
}));
