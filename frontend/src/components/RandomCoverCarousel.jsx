import { CAROUSEL_COVERS } from "../data/carouselData.js";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SHOWS } from "./mobileshowsData";
import RatingRing from "./RatingRing";

const RandomCoverCarousel = () => {

  const covers = CAROUSEL_COVERS;

  const showsById = useMemo(() => {
    const m = new Map();
    (SHOWS || []).forEach((s) => m.set(s.id, s));
    return m;
  }, []);

  const unified = useMemo(() => {
    return covers.map((c) => {
      const show = showsById.get(c.id);
      return {
        ...c,
        creator: show?.creator ?? "",
        ratings: show?.ratings ?? "",
      };
    });
  }, [covers, showsById]);

  const [index, setIndex] = useState(() => Math.floor(Math.random() * unified.length));
  const current = unified[index];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % unified.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [unified.length]);

  return (
    <div className="relative w-full h-88 2xl:h-100 rounded-2xl overflow-hidden mt-1">
      <AnimatePresence mode="wait">
        <motion.img
          key={current.src}
          src={current.src}
          className="absolute inset-0 w-full h-full object-cover object-center"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      <AnimatePresence mode="wait">
        <motion.div
            key={current.id} // or key={current.src}
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="absolute bottom-0 left-0 z-10 p-4 text-white"
        >
            <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="poppinsfont text-3xl font-bold tracking-wider leading-tight"
            >
            {current.title}
            </motion.div>

            <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
            className="text-sm text-white/70 font-semibold"
            >
            {current.creator}
            </motion.div>
        </motion.div>
       </AnimatePresence>


      <div className="absolute top-0 right-0 z-10 p-4 flex items-center gap-2 text-white/90">
        <span className="text-sm">
          <RatingRing rating={current.ratings} />
        </span>

        <img
          src="/images/misc/imdbLogo.svg"
          className="w-12 h-8 rounded border border-white/20 backdrop-blur-2xl"
          alt="IMDb"
        />
      </div>
    </div>
  );
};

export default RandomCoverCarousel;
