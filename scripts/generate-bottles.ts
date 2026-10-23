/**
 * Generates public/bottles/{sign}.svg (and brand.svg) from src/config/zodiac.ts.
 * Runs before `dev` and `build` alongside the zodiac CSS tokens.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SIGNS } from "../src/config/zodiac";
import { BRAND_BOTTLE_THEME, bottleSvg } from "../src/lib/bottle-svg";

const dir = fileURLToPath(new URL("../public/bottles/", import.meta.url));
mkdirSync(dir, { recursive: true });

for (const s of SIGNS) writeFileSync(`${dir}${s.slug}.svg`, bottleSvg(s.theme, s));
writeFileSync(`${dir}brand.svg`, bottleSvg(BRAND_BOTTLE_THEME));
console.log(`bottles: ${SIGNS.length + 1} SVGs`);
