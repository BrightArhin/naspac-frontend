import React, { useState, useEffect } from "react";

interface CarouselProps {
  images: string[];
  interval?: number;
}

const Carousel: React.FC<CarouselProps> = ({ images, interval = 7000 }) => {
  const [currentImage, setCurrentImage] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, interval]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#5b3418] flex justify-center items-center">
      {images.map((image, index) => (
        <img
          key={index}
          className="w-full h-full object-cover transition-all duration-3000 ease-in-out max-w-[100vw] max-h-[100vh] min-w-[80vw] min-h-[80vh]"
          alt="Background"
          src={image}
          style={{
            opacity: index === currentImage ? 1 : 0,
            transform: index === currentImage ? "scale(1.08)" : "scale(1.12)",
            filter: "blur(18px)",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
      ))}
       <div className="absolute inset-0 z-10 bg-[#1c1410]/55"></div>
    </div>
  );
};

export default Carousel;