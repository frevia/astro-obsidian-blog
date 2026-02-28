import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface Props {
  image: {
    src: string;
    width: number;
    height: number;
    format: string;
  };
}

const DisintegrationImg: React.FC<Props> = ({ image }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const run = () => {
      if (hasPlayedRef.current) {
        img.classList.add("loaded");
        setIsLoaded(true);
        return;
      }
      hasPlayedRef.current = true;

      gsap.fromTo(
        img,
        {
          opacity: 0,
          scale: 0.98,
          filter: "blur(8px)",
        },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 1.1,
          ease: "power2.out",
          onComplete: () => {
            img.classList.add("loaded");
            setIsLoaded(true);
          },
        }
      );
    };

    if (img.complete) run();
    else img.addEventListener("load", run);

    return () => {
      img.removeEventListener("load", run);
    };
  }, [image.src]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: `${image.width}/${image.height}` }}
    >
      <img
        ref={imgRef}
        src={image.src}
        crossOrigin="anonymous"
        className="disintegration-img block h-full w-full object-cover"
        alt=""
      />
    </div>
  );
};

export default DisintegrationImg;
