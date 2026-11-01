import { ArrowRight, Bank, Camera, ChatCircleDots, Check, Heart, InstagramLogo, Leaf, List, LockKey, MagnifyingGlass, Minus, PencilSimple, Plus, ShieldCheck, ShoppingBag, Truck, UploadSimple, UserCircle, X } from "@phosphor-icons/react";
import type { Icon, IconProps } from "@phosphor-icons/react";

// One rounded, bold family across the storefront and account surfaces.
const glyph = (Component: Icon) => function BrandIcon({ size = 20, ...props }: IconProps) {
  return <Component size={size} weight="bold" aria-hidden="true" {...props} />;
};
export const IconBag = glyph(ShoppingBag);
export const IconSearch = glyph(MagnifyingGlass);
export const IconMenu = glyph(List);
export const IconClose = glyph(X);
export const IconPlus = glyph(Plus);
export const IconMinus = glyph(Minus);
export const IconCheck = glyph(Check);
export const IconArrow = glyph(ArrowRight);
export const IconLeaf = glyph(Leaf);
export const IconTruck = glyph(Truck);
export const IconHeart = glyph(Heart);
export const IconShield = glyph(ShieldCheck);
export const IconBank = glyph(Bank);
export const IconChat = glyph(ChatCircleDots);
export const IconInstagram = glyph(InstagramLogo);
export const IconUpload = glyph(UploadSimple);
export const IconUser = glyph(UserCircle);
export const IconLock = glyph(LockKey);
export const IconCamera = glyph(Camera);
export const IconPen = glyph(PencilSimple);
