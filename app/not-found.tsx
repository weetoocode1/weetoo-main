"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const GlitchText = ({ children }: { children: React.ReactNode }) => {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true);
      setTimeout(() => setIsGlitching(false), 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={`inline-block relative ${isGlitching ? "animate-glitch" : ""}`}
    >
      {children}
      {isGlitching && (
        <>
          <span
            className="absolute inset-0 text-primary opacity-80"
            style={{
              clipPath: "inset(40% 0 60% 0)",
              transform: "translateX(-2px)",
            }}
          >
            {children}
          </span>
          <span
            className="absolute inset-0 text-destructive opacity-80"
            style={{
              clipPath: "inset(60% 0 40% 0)",
              transform: "translateX(2px)",
            }}
          >
            {children}
          </span>
        </>
      )}
    </span>
  );
};

const BrokenPiece = ({
  x,
  y,
  rotation,
  delay,
}: {
  x: number;
  y: number;
  rotation: number;
  delay: number;
}) => {
  return (
    <div
      className="absolute w-16 h-16 border-2 border-border/50 bg-card/30 backdrop-blur-sm"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `rotate(${rotation}deg)`,
        clipPath:
          "polygon(30% 0%, 70% 0%, 100% 30%, 70% 100%, 30% 100%, 0% 70%)",
        animationDelay: `${delay}s`,
      }}
    />
  );
};

const FloatingOrb = ({
  x,
  y,
  size,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
}) => {
  const [mouseDistance, setMouseDistance] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.getBoundingClientRect();
      if (rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        );
        setMouseDistance(Math.min(distance / 200, 1));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className="absolute rounded-full blur-xl opacity-30 dark:opacity-20 animate-orb-float"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, var(--primary) 0%, transparent 70%)`,
        transform: `scale(${1 + mouseDistance * 0.3})`,
        animationDelay: `${delay}s`,
        transition: "transform 0.3s ease-out",
      }}
    />
  );
};

const Interactive404 = () => {
  return (
    <div className="relative">
      <h1 className="text-[120px] md:text-[200px] font-bold font-gmarket text-foreground relative z-10 select-none cursor-default">
        <GlitchText>4</GlitchText>
        <GlitchText>0</GlitchText>
        <GlitchText>4</GlitchText>
      </h1>
    </div>
  );
};

const MorphingShape = ({
  delay,
  x,
  y,
}: {
  delay: number;
  x: number;
  y: number;
}) => {
  return (
    <div
      className="absolute w-20 h-20 border-2 border-primary/30 rounded-full animate-morph pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    />
  );
};

const InteractiveCard = ({
  children,
  delay = 0,
  href,
}: {
  children: React.ReactNode;
  delay?: number;
  href: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Link
      href={href}
      className={`block relative transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute inset-0 bg-accent rounded-2xl blur-xl transition-all duration-300 ${
          isHovered ? "opacity-40 scale-110" : "opacity-0 scale-100"
        }`}
      />
      <div
        className={`relative bg-card border-2 border-border rounded-2xl p-6 shadow-lg transition-all duration-300 ${
          isHovered
            ? "shadow-xl border-primary/50 scale-105"
            : "hover:shadow-xl"
        }`}
      >
        {children}
      </div>
    </Link>
  );
};

export default function NotFound() {
  const [brokenPieces, setBrokenPieces] = useState<
    Array<{ x: number; y: number; rotation: number; delay: number }>
  >([]);

  useEffect(() => {
    setBrokenPieces(
      Array.from({ length: 12 }, (_, i) => ({
        x: ((i * 7.5) % 80) + 10,
        y: ((i * 5.2) % 60) + 20,
        rotation: (i * 30) % 360,
        delay: i * 0.1,
      }))
    );
  }, []);

  const orbs = [
    { x: 5, y: 10, size: 80, delay: 0 },
    { x: 95, y: 15, size: 60, delay: 0.5 },
    { x: 3, y: 85, size: 70, delay: 1 },
    { x: 97, y: 90, size: 90, delay: 1.5 },
    { x: 10, y: 50, size: 50, delay: 0.3 },
    { x: 90, y: 45, size: 65, delay: 0.8 },
  ];

  const morphingShapes = [
    { x: 15, y: 25, delay: 0 },
    { x: 85, y: 30, delay: 0.4 },
    { x: 20, y: 75, delay: 0.8 },
    { x: 80, y: 70, delay: 1.2 },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {brokenPieces.map((piece, index) => (
        <BrokenPiece
          key={index}
          x={piece.x}
          y={piece.y}
          rotation={piece.rotation}
          delay={piece.delay}
        />
      ))}

      {orbs.map((orb, index) => (
        <FloatingOrb
          key={index}
          x={orb.x}
          y={orb.y}
          size={orb.size}
          delay={orb.delay}
        />
      ))}

      {morphingShapes.map((shape, index) => (
        <MorphingShape
          key={index}
          x={shape.x}
          y={shape.y}
          delay={shape.delay}
        />
      ))}

      <div className="max-w-4xl w-full z-10 relative">
        <div className="text-center space-y-8">
          <Interactive404 />

          <div
            className="space-y-4 animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
            suppressHydrationWarning
          >
            <h2
              className="text-2xl md:text-3xl font-semibold text-foreground"
              suppressHydrationWarning
            >
              Lost in the Digital Void
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              The page you&apos;re looking for has vanished into the abyss.
              We&apos;ll help you find your way back!
            </p>
          </div>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up"
            style={{ animationDelay: "0.5s" }}
          >
            <Button asChild size="lg" className="min-w-[160px]">
              <Link href="/">Go Home</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-w-[160px]"
            >
              <Link href="/free-board">Community</Link>
            </Button>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 animate-fade-in"
            style={{ animationDelay: "0.7s" }}
          >
            <InteractiveCard delay={0.8} href="/">
              <div className="text-center space-y-2">
                <div className="text-3xl mb-2">🏠</div>
                <h3 className="font-semibold text-foreground">Home</h3>
                <p className="text-sm text-muted-foreground">
                  Return to the main page
                </p>
              </div>
            </InteractiveCard>

            <InteractiveCard delay={0.9} href="/trading">
              <div className="text-center space-y-2">
                <div className="text-3xl mb-2">🔍</div>
                <h3 className="font-semibold text-foreground">Explore</h3>
                <p className="text-sm text-muted-foreground">
                  Discover more pages
                </p>
              </div>
            </InteractiveCard>

            <InteractiveCard delay={1.0} href="/free-board">
              <div className="text-center space-y-2">
                <div className="text-3xl mb-2">💬</div>
                <h3 className="font-semibold text-foreground">Community</h3>
                <p className="text-sm text-muted-foreground">
                  Join discussions
                </p>
              </div>
            </InteractiveCard>
          </div>
        </div>
      </div>
    </div>
  );
}
