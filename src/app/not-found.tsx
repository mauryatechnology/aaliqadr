import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Parallax } from "@/components/motion/Parallax";
import { StoreChrome } from "@/components/layout/StoreChrome";

export default function NotFound() {
  return (
    <StoreChrome>
      <div className="relative grid min-h-[70dvh] place-items-center overflow-clip px-4 text-center">
        <Parallax speed={-0.45} className="absolute inset-x-0 -inset-y-24 -z-10">
          <div aria-hidden className="aurora" />
        </Parallax>
        <Parallax speed={-0.15} className="flex flex-col items-center gap-6">
          <Logo variant="mark" className="h-20 w-auto opacity-80" />
          <p className="eyebrow">404</p>
          <h1 className="font-display text-5xl">This star isn&apos;t on our map</h1>
          <p className="text-muted max-w-md">The page may have moved. Your sign, however, is still waiting.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/zodiac">Explore the zodiac</ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Home
            </ButtonLink>
          </div>
        </Parallax>
      </div>
    </StoreChrome>
  );
}
