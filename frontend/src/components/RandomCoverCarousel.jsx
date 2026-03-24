import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SHOWS } from "./mobileshowsData";
import RatingRing from "./RatingRing";

const RandomCoverCarousel = () => {

  const covers = [
    { id: "adventure-time", src: "/images/adventuretime/covers/adventuretimeCover.jpg", title: "Adventure Time" },
    { id: "a-ghost-story", src: "/images/aghoststory/covers/aghoststoryCover.webp", title: "A Ghost Story" },
    { id: "akira", src: "/images/akira/covers/akiraCover.jpg", title: "Akira" },
    { id: "aniara", src: "/images/aniara/covers/aniaraCover.jpg", title: "Aniara" },
    { id: "annihilation", src: "/images/annihilation/covers/annihilationCover.jpg", title: "Annihilation" },
    { id: "blackmirror", src: "/images/blackmirror/covers/blackmirrorCover.jpg", title: "Black Mirror" },
    { id: "cyberpunk", src: "/images/cyberpunk/covers/cyberpunkCover.jpg", title: "Cyberpunk: Edgerunners" },
    { id: "demons", src: "/images/demons/covers/demonsCover.jpg", title: "Demons" },
    { id: "event-horizon", src: "/images/eventhorizon/covers/eventhorizonCover.jpg", title: "Event Horizon" },
    { id: "exmachina", src: "/images/exmachina/covers/exmachinaCover.jpg", title: "Ex Machina" },
    { id: "fmab", src: "/images/fmab/covers/fmabCover.jpg", title: "Fullmetal Alchemist: Brotherhood" },
    { id: "ghost-in-the-shell", src: "/images/ghostintheshell/covers/ghostintheshellCover.jpg", title: "Ghost in the Shell" },
    { id: "itsalwayssunny", src: "/images/itsalwayssunny/covers/itsalwayssunnyCover.jpg", title: "It's Always Sunny in Philadelphia" },
    { id: "jjk", src: "/images/jjk/covers/jjkCover.jpg", title: "Jujutsu Kaisen" },
    { id: "little-miss-sunshine", src: "/images/littlemisssunshine/covers/littlemisssunshineCover.jpg", title: "Little Miss Sunshine" },
    { id: "lovedeathandrobots", src: "/images/lovedeathandrobots/covers/lovedeathandrobotsCover.jpg", title: "Love, Death + Robots" },
    { id: "mob-psycho", src: "/images/mobpsycho/covers/mobpsychoCover.jpeg", title: "Mob Psycho 100" },
    { id: "neon-genesis", src: "/images/neongenesis/covers/neongenesisCover.png", title: "Neon Genesis Evangelion" },
    { id: "over-the-garden-wall", src: "/images/overthegardenwall/covers/overthegardenwallCover.png", title: "Over the Garden Wall" },
    { id: "paprika", src: "/images/paprika/covers/paprikaCover.webp", title: "Paprika" },
    { id: "perfect-blue", src: "/images/perfectblue/covers/perfectblueCover.jpg", title: "Perfect Blue" },
    { id: "pluribus", src: "/images/pluribus/covers/pluribusCover.jpg", title: "Pluribus" },
    { id: "princess-mononoke", src: "/images/princessmononoke/covers/princessmononokeCover.jpg", title: "Princess Mononoke" },
    { id: "redline", src: "/images/redline/covers/redlineCover.jpg", title: "Redline" },
    { id: "severance", src: "/images/severance/covers/severanceCover.jpg", title: "Severance" },
    { id: "solaris", src: "/images/solaris/covers/solarisCover.jpg", title: "Solaris" },
    { id: "steven-universe", src: "/images/stevenuniverse/covers/stevenuniverseCover.webp", title: "Steven Universe" },
    { id: "the-lighthouse", src: "/images/thelighthouse/covers/thelighthouseCover.jpg", title: "The Lighthouse" },
    { id: "thetwilightzone", src: "/images/thetwilightzone/covers/thetwilightzoneCover.svg", title: "The Twilight Zone" },
    { id: "the-vanishing", src: "/images/thevanishing/covers/thevanishingCover.png", title: "The Vanishing" },
    { id: "tokyo-godfathers", src: "/images/tokyogodfathers/covers/tokyogodfathersCover.jpg", title: "Tokyo Godfathers" },
    { id: "weapons", src: "/images/weapons/covers/weaponsCover.jpg", title: "Weapons" },
    { id: "bugonia", src: "/images/bugonia/covers/bugoniaCover.jpg", title: "Bugonia" },
    { id: "frankenstein", src: "/images/frankenstein/covers/frankensteinCover.webp", title: "Frankenstein" },
    { id: "truedetective", src: "/images/truedetective/covers/truedetectiveCover.svg", title: "True Detective" },
    { id: "sunsetboulevard", src: "/images/sunsetboulevard/covers/sunsetboulevardCover.svg", title: "Sunset Boulevard" },
    { id: "shikijitsu", src: "/images/shikijitsu/covers/shikijitsuCover.svg", title: "Shiki-Jitsu" },
    { id: "speaknoevil", src: "/images/speaknoevil/covers/speaknoevilCover.svg", title: "Speak No Evil" },
    { id: "ikiru", src: "/images/ikiru/covers/ikiruCover.jpg", title: "Ikiru" },
    { id: "theericandreshow", src: "/images/theericandreshow/covers/theericandreshowCover.svg", title: "The Eric Andre Show" },
    { id: "pokemon2000", src: "/images/pokemon2000/covers/pokemon2000Cover.svg", title: "Pokémon 2000" },
    { id: "coherence", src: "/images/coherence/covers/coherenceCover.svg", title: "Coherence" },
  ];

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
  }, [showsById]);

  const [index, setIndex] = useState(() => Math.floor(Math.random() * unified.length));
  const current = unified[index];

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % unified.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [unified.length]);

  return (
    <div className="relative w-full h-48 2xl:h-100 rounded-2xl overflow-hidden mt-1">
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
