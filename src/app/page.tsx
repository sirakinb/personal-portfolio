"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BlobTrail {
  x: number;
  y: number;
  size: number;
  opacity: number;
  id: number;
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [smoothPos, setSmoothPos] = useState({ x: -200, y: -200 });
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [trails, setTrails] = useState<BlobTrail[]>([]);
  const [isHovering, setIsHovering] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const trailIdRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const waveOffsetRef = useRef(0);

  // Smooth blob following
  useEffect(() => {
    const animate = () => {
      setSmoothPos((prev) => ({
        x: prev.x + (mousePos.x - prev.x) * 0.12,
        y: prev.y + (mousePos.y - prev.y) * 0.12,
      }));
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePos]);

  // Wave animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawWaves = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const waveCount = 5;
      const mouseInfluence = {
        x: (mousePos.x - canvas.width / 2) * 0.02,
        y: (mousePos.y - canvas.height / 2) * 0.02,
      };

      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + i * 0.01})`;
        ctx.lineWidth = 1;

        const amplitude = 20 + i * 10 + mouseInfluence.y;
        const frequency = 0.003 - i * 0.0003;
        const yOffset = canvas.height * (0.3 + i * 0.12);

        for (let x = 0; x < canvas.width; x += 2) {
          const y =
            yOffset +
            Math.sin(x * frequency + waveOffsetRef.current + i) * amplitude +
            Math.sin(x * frequency * 2 + waveOffsetRef.current * 1.5) *
              (amplitude * 0.3) +
            mouseInfluence.x * Math.sin(x * 0.01);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      waveOffsetRef.current += 0.008;
      requestAnimationFrame(drawWaves);
    };

    drawWaves();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [mousePos]);

  // Trail decay
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setTrails((prev) =>
        prev
          .map((trail) => ({
            ...trail,
            opacity: trail.opacity - 0.03,
            size: trail.size * 0.97,
          }))
          .filter((trail) => trail.opacity > 0)
      );
    }, 30);
    return () => clearInterval(decayInterval);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const { clientX, clientY } = e;
      setMousePos({ x: clientX, y: clientY });
      setIsHovering(true);

      // Calculate velocity for trails
      const dx = clientX - lastMousePos.current.x;
      const dy = clientY - lastMousePos.current.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);

      // Add trail based on velocity
      if (velocity > 8) {
        const trailSize = Math.min(80, 40 + velocity * 0.5);
        setTrails((prev) => [
          ...prev.slice(-15),
          {
            x: clientX,
            y: clientY,
            size: trailSize,
            opacity: 0.6,
            id: trailIdRef.current++,
          },
        ]);
      }

      lastMousePos.current = { x: clientX, y: clientY };

      // Parallax effect
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      setParallaxOffset({
        x: (clientX - centerX) * -0.02,
        y: (clientY - centerY) * -0.02,
      });
    },
    []
  );

  const handleMouseLeave = () => {
    setIsHovering(false);
    setMousePos({ x: -200, y: -200 });
  };

  // Check if element is under blob
  const isUnderBlob = (elementRect: DOMRect) => {
    const blobRadius = 80;
    const blobCenterX = smoothPos.x;
    const blobCenterY = smoothPos.y;

    const closestX = Math.max(
      elementRect.left,
      Math.min(blobCenterX, elementRect.right)
    );
    const closestY = Math.max(
      elementRect.top,
      Math.min(blobCenterY, elementRect.bottom)
    );

    const distanceX = blobCenterX - closestX;
    const distanceY = blobCenterY - closestY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance < blobRadius;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden"
      style={{ backgroundColor: "#252729" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Wave canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Base image layer (IMAGE1) */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{
          transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
          transition: "transform 0.1s ease-out",
          backgroundColor: "#252729",
        }}
      >
        <img
          src="/IMAGE3.jpeg"
          alt="Akinyemi Bajulaiye"
          className="h-full w-auto max-w-none object-contain"
          style={{ objectPosition: "center" }}
        />
      </div>

      {/* Reveal layer (IMAGE2) with blob mask using canvas */}
      <RevealCanvas
        smoothPos={smoothPos}
        trails={trails}
        isHovering={isHovering}
        parallaxOffset={parallaxOffset}
      />

      {/* Content layer */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {/* Name - Top Left */}
        <div
          className="absolute top-12 left-12 pointer-events-auto"
          style={{
            transform: `translate(${parallaxOffset.x * 1.5}px, ${parallaxOffset.y * 1.5}px)`,
            transition: "transform 0.1s ease-out, color 0.3s ease",
          }}
        >
          <NameElement smoothPos={smoothPos} />
        </div>

        {/* Portfolio Link - Top Right */}
        <div
          className="absolute top-12 right-12 pointer-events-auto"
          style={{
            transform: `translate(${parallaxOffset.x * 1.5}px, ${parallaxOffset.y * 1.5}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <PortfolioLink smoothPos={smoothPos} />
        </div>

        {/* Social Icons - Bottom Right */}
        <div
          className="absolute bottom-12 right-12 pointer-events-auto"
          style={{
            transform: `translate(${parallaxOffset.x * 1.5}px, ${parallaxOffset.y * 1.5}px)`,
            transition: "transform 0.1s ease-out",
          }}
        >
          <SocialIcons smoothPos={smoothPos} />
        </div>
      </div>

      {/* Custom cursor */}
      <div
        className="fixed w-4 h-4 bg-black rounded-full pointer-events-none z-50 mix-blend-difference"
        style={{
          left: mousePos.x - 8,
          top: mousePos.y - 8,
          opacity: isHovering ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}

function NameElement({ smoothPos }: { smoothPos: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isUnder, setIsUnder] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const blobRadius = 90;
      const blobCenterX = smoothPos.x;
      const blobCenterY = smoothPos.y;

      const closestX = Math.max(rect.left, Math.min(blobCenterX, rect.right));
      const closestY = Math.max(rect.top, Math.min(blobCenterY, rect.bottom));

      const distanceX = blobCenterX - closestX;
      const distanceY = blobCenterY - closestY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      setIsUnder(distance < blobRadius);
    }
  }, [smoothPos]);

  return (
    <div
      ref={ref}
      className="font-playfair leading-tight"
      style={{
        color: isUnder ? "#000000" : "#ffffff",
        transition: "color 0.3s ease",
        textShadow: isUnder ? "none" : "0 2px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div className="text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight">
        AKINYEMI
      </div>
      <div className="text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight">
        BAJULAIYE
      </div>
    </div>
  );
}

function PortfolioLink({ smoothPos }: { smoothPos: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isUnder, setIsUnder] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const blobRadius = 90;
      const blobCenterX = smoothPos.x;
      const blobCenterY = smoothPos.y;

      const closestX = Math.max(rect.left, Math.min(blobCenterX, rect.right));
      const closestY = Math.max(rect.top, Math.min(blobCenterY, rect.bottom));

      const distanceX = blobCenterX - closestX;
      const distanceY = blobCenterY - closestY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      setIsUnder(distance < blobRadius);
    }
  }, [smoothPos]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const portfolioItems = [
    { 
      name: "Projects", 
      href: "#projects",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      name: "Tech Stack", 
      href: "#stack",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    { 
      name: "Services", 
      href: "#services",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" strokeLinecap="round"/>
        </svg>
      )
    },
    { 
      name: "About", 
      href: "#about",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round"/>
        </svg>
      )
    },
    { 
      name: "Contact", 
      href: "#contact",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
  ];

  const textColor = isUnder ? "#000000" : "#ffffff";
  const bgColor = isUnder ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)";
  const hoverBgColor = isUnder ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)";

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={ref}
        onClick={() => setIsOpen(!isOpen)}
        className="font-playfair text-xl tracking-wide hover:opacity-70 transition-all cursor-none flex items-center gap-2"
        style={{
          color: textColor,
          transition: "color 0.3s ease, opacity 0.3s ease",
          textShadow: isUnder ? "none" : "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        Portfolio
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <path
            d="M2 4L6 8L10 4"
            stroke={textColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "stroke 0.3s ease" }}
          />
        </svg>
      </button>

      {/* Dropdown Menu - Sexy Design */}
      <div
        className="absolute top-full right-0 mt-4 min-w-[240px] overflow-hidden"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(-20px) scale(0.9)",
          pointerEvents: isOpen ? "auto" : "none",
          transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          background: "linear-gradient(135deg, rgba(20, 20, 22, 0.95) 0%, rgba(10, 10, 12, 0.98) 100%)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: "20px",
          boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.7), 0 0 80px -20px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {/* Gradient accent line at top */}
        <div 
          style={{
            height: "2px",
            background: "linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.7), rgba(14, 165, 233, 0.7), transparent)",
            borderRadius: "20px 20px 0 0",
          }}
        />
        
        <div className="p-2">
          {portfolioItems.map((item, index) => (
            <a
              key={item.name}
              href={item.href}
              className="relative flex items-center gap-4 px-4 py-3 cursor-none rounded-2xl group overflow-hidden"
              style={{
                transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? "translateX(0)" : "translateX(-20px)",
                transitionDelay: isOpen ? `${index * 60}ms` : "0ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(14, 165, 233, 0.1) 100%)";
                e.currentTarget.style.transform = "translateX(8px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.transform = "translateX(0)";
              }}
              onClick={() => setIsOpen(false)}
            >
              {/* Icon container */}
              <span 
                className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300"
                style={{ 
                  color: "#3b82f6",
                  background: "rgba(59, 130, 246, 0.1)",
                }}
              >
                {item.icon}
              </span>
              <span 
                className="text-[15px] font-semibold tracking-wide transition-all duration-300"
                style={{ 
                  color: "#ffffff",
                  letterSpacing: "0.02em",
                }}
              >
                {item.name}
              </span>
              
              {/* Arrow indicator on hover */}
              <svg 
                className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0 -translate-x-2"
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="rgba(59, 130, 246, 0.8)" 
                strokeWidth="2"
              >
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          ))}
        </div>
        
        {/* Subtle glow effect at bottom */}
        <div 
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent)",
            marginTop: "-1px",
          }}
        />
      </div>
    </div>
  );
}

function RevealCanvas({
  smoothPos,
  trails,
  isHovering,
  parallaxOffset,
}: {
  smoothPos: { x: number; y: number };
  trails: BlobTrail[];
  isHovering: boolean;
  parallaxOffset: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load the image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = "/IMAGE2.jpeg";
  }, []);

  // Draw the reveal effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate image dimensions to match object-contain behavior
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

    if (imgAspect > canvasAspect) {
      // Image is wider - fit to width
      drawWidth = width;
      drawHeight = width / imgAspect;
      drawX = 0;
      drawY = (height - drawHeight) / 2;
    } else {
      // Image is taller - fit to height
      drawHeight = height;
      drawWidth = height * imgAspect;
      drawX = (width - drawWidth) / 2;
      drawY = 0;
    }

    // Create the blob mask
    ctx.save();

    // Begin the clipping path
    ctx.beginPath();

    // Draw main blob
    if (isHovering) {
      ctx.ellipse(smoothPos.x, smoothPos.y, 85, 75, 0, 0, Math.PI * 2);
    }

    // Draw trail blobs
    trails.forEach((trail) => {
      ctx.moveTo(trail.x + trail.size / 2, trail.y);
      ctx.arc(trail.x, trail.y, trail.size / 2, 0, Math.PI * 2);
    });

    ctx.clip();

    // Draw the image within the clipped area
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    ctx.restore();
  }, [smoothPos, trails, isHovering, imageLoaded]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-20 pointer-events-none"
      style={{
        transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px)`,
        transition: "transform 0.1s ease-out",
      }}
    />
  );
}

function SocialIcons({ smoothPos }: { smoothPos: { x: number; y: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isUnder, setIsUnder] = useState(false);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const blobRadius = 90;
      const blobCenterX = smoothPos.x;
      const blobCenterY = smoothPos.y;

      const closestX = Math.max(rect.left, Math.min(blobCenterX, rect.right));
      const closestY = Math.max(rect.top, Math.min(blobCenterY, rect.bottom));

      const distanceX = blobCenterX - closestX;
      const distanceY = blobCenterY - closestY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      setIsUnder(distance < blobRadius);
    }
  }, [smoothPos]);

  const iconColor = isUnder ? "#000000" : "#ffffff";

  const socialLinks = [
    {
      name: "Instagram",
      url: "https://instagram.com",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={iconColor}
          style={{ transition: "fill 0.3s ease" }}
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: "X",
      url: "https://x.com",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={iconColor}
          style={{ transition: "fill 0.3s ease" }}
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "YouTube",
      url: "https://youtube.com",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={iconColor}
          style={{ transition: "fill 0.3s ease" }}
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={iconColor}
          style={{ transition: "fill 0.3s ease" }}
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
  ];

  return (
    <div 
      ref={ref} 
      className="flex gap-6"
      style={{
        filter: isUnder ? "none" : "drop-shadow(0 2px 8px rgba(0,0,0,0.3))",
        transition: "filter 0.3s ease",
      }}
    >
      {socialLinks.map((social) => (
        <a
          key={social.name}
          href={social.url}
            target="_blank"
            rel="noopener noreferrer"
          className="hover:opacity-70 transition-opacity cursor-none"
          aria-label={social.name}
          >
          {social.icon}
          </a>
      ))}
    </div>
  );
}
