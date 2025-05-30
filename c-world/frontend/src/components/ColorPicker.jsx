import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';


const SUGGESTED_COLORS = [
    '#000000', '#545454', '#737373', '#a6a6a6', '#d9d9d9', '#ffffff',
    '#ff3131', '#ff5757', '#ff66c4', '#cb6ce6', '#8c52ff', '#5e17eb',
    '#0097b2', '#0cc0df', '#5ce1e6', '#38b6ff', '#5271ff', '#004aad',
    '#00bf63', '#7ed957', '#c1ff72', '#ffde59', '#ffbd59', '#ff914d',
];

const GRADIENT_COLORS = [
    'linear-gradient(90deg, #ff3131, #ff914d)', 'linear-gradient(90deg, #ff5757, #8c52ff)', 'linear-gradient(90deg, #5170ff, #ff66c4)', 'linear-gradient(90deg, #004aad, #cb6ce6)', 'linear-gradient(90deg, #8c52ff, #5ce1e6)', 'linear-gradient(90deg, #5de0e6, #004aad)',
    'linear-gradient(90deg, #8c52ff, #00bf63)', 'linear-gradient(90deg, #0097b2, #7ed957)', 'linear-gradient(90deg, #0cc0df, #ffde59)', 'linear-gradient(90deg, #ffde59, #ff914d)', 'linear-gradient(90deg, #ff66c4, #ffde59)', 'linear-gradient(90deg, #8c52ff, #ff914d)',
    'linear-gradient(90deg, #000000, #737373)', 'linear-gradient(90deg, #000000, #c89116)', 'linear-gradient(90deg, #000000, #3533cd)', 'linear-gradient(90deg, #a6a6a6, #ffffff)', 'linear-gradient(90deg, #fff7ad, #ffa9f9)', 'linear-gradient(90deg, #cdffd8, #94b9ff)',
];


const FAVORITES_KEY = 'favoriteColors';
const paletteIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className='2xl:size-10 size-9' viewBox="0 0 16 16"><path d="M12.433 10.07C14.133 10.585 16 11.15 16 8a8 8 0 1 0-8 8c1.996 0 1.826-1.504 1.649-3.08-.124-1.101-.252-2.237.351-2.92.465-.527 1.42-.237 2.433.07M8 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m4.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3M5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"/></svg>
const mouseIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" /></svg>



const ColorPicker = ({ initialValue, onSave, onClose }) => {
  const DEFAULT_GRADIENT = 'conic-gradient(from .5turn at bottom center in oklab, #add8e6, #fff)';

  const extractFirstColor = (gradientStr) => {
    const match = gradientStr.match(/#([0-9a-f]{3,6})/gi);
    return match ? match[0] : '#ffffff';
  };

  const [color, setColor] = useState(() =>
    extractFirstColor(initialValue || DEFAULT_GRADIENT)
  );

  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    if (!initialValue) {
      onSave(DEFAULT_GRADIENT);
    }
  }, []);
  useEffect(() => {
    const savedGradient = localStorage.getItem('userGradient');
    const savedRawColor = localStorage.getItem('userColor');
    if (savedGradient) {
      onSave(savedGradient); 
      document.documentElement.style.setProperty('--gradient-9', savedGradient);
    } else {
      document.documentElement.style.setProperty('--gradient-9', DEFAULT_GRADIENT);
    }
    if (savedRawColor) setColor(savedRawColor);
  }, []);

  const handleColorChange = (e) => {
    setColor(e.target.value);
  };

  const handleReset = () => {
    const fallbackColor = extractFirstColor(DEFAULT_GRADIENT);
    setColor(fallbackColor);
    onSave(`linear-gradient(${fallbackColor}, ${fallbackColor})`);
  };

  const isGradient = color.includes('gradient');
  const handleApply = () => {
    const isGradientValue = color.includes("gradient");
    const finalColor = isGradientValue ? color : `linear-gradient(${color}, ${color})`;
    localStorage.setItem('userColor', color); 
    localStorage.setItem('userGradient', finalColor); 

    document.documentElement.style.setProperty('--gradient-9', finalColor); 

    onSave(finalColor);
    onClose();
  };

  const handleAddToFavorites = () => {
    if (!favorites.includes(color) && favorites.length < 6) {
      const updated = [...favorites, color];
      setFavorites(updated);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    }
  };

  const handlePickFavorite = (favColor) => {
    setColor(favColor);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
      <div className="bg-white p-6 rounded-xl w-[900px] 2xl:w-[380px] 2xl:h-auto h-[580px] shadow-lg border border-gray-200 relative">
        <h2 className="text-xl font-semibold 2xl:mb-4 mb-1 text-gray-800 text-center">Pick a Solid Color</h2>

        {/* Current Preview */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="2xl:size-24 size-20 rounded-full border border-gray-300 2xl:mb-3 mb-1"
            style={
                isGradient
                  ? { background: color }
                  : { backgroundColor: color }
            }
          />
                {!isGradient && (
                <>
                    <motion.div
                    onClick={() => document.getElementById('hidden-color-input')?.click()}
                    className="w-10 h-10 cursor-pointer  flex items-center justify-center"
                    style={{ color: color }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    >
                    <span className='relative z-0 '>{paletteIcon}</span>
                    <span className='absolute z-10 ml-10 mt-8'>{mouseIcon}</span>
                    </motion.div>
                    <input
                    type="color"
                    id="hidden-color-input"
                    value={color}
                    onChange={handleColorChange}
                    className="absolute  md:right-48 lg:right-[690px] opacity-0 cursor-pointer "
                    />
                </>
                )}
            <p className="mt-2 text-sm text-gray-700 font-semibold cursor-pointer">
            Selected: {isGradient 

            ? <span className='font-medium text-blue-400'> Gradient </span>
            
            : color.toUpperCase()}

            </p>
        </div>

        {/* Favorite Colors */}
        <div className="mb-6 2xl:w-auto w-full">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold tracking-wide text-gray-400">Favorites</h3>
            <motion.button
            whileHover={{  scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAddToFavorites}
            className="text-xs text-blue-600  hover:text-blue-700 cursor-pointer"
            disabled={favorites.includes(color) || favorites.length >= 6}
            >
            + Add
            </motion.button>
        </div>

        <div className="grid grid-cols-6 gap-2 2xl:w-auto w-80">
            {favorites.length > 0 ? (
            favorites.map((fav) => (
                <div key={fav} className="relative group w-12 z-0">
                <div
                    onClick={() => handlePickFavorite(fav)}
                    className="w-10 h-10 rounded-full cursor-pointer border z-10"
                    style={{ backgroundColor: fav }}
                />
                <motion.button
                    whileHover={{  scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                    e.stopPropagation();
                    const updated = favorites.filter((c) => c !== fav);
                    setFavorites(updated);
                    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 border text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Remove"
                >
                    ×
                </motion.button>
                </div>
            ))
            ) : (
            <p className="col-span-3 text-xs text-gray-400 text-center">No favorites yet</p>
            )}
        </div>
        </div>


      <div className='2xl:block flex justify-between'>
        {/* Suggested Colors */}
        <div className="mb-6 2xl:w-full w-[400px]">
          <h3 className="text-sm font-semibold tracking-wide text-gray-400 mb-2">Solid Colors</h3>
          <div className="grid 2xl:grid-cols-6 grid-cols-8 gap-1 place-items-center">
            {SUGGESTED_COLORS.map((col) => (
              <motion.div
                whileHover={{  scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                key={col}
                onClick={() => setColor(col)}
                className="w-10 h-10 rounded-full cursor-pointer border border-gray-200"
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        {/* Gradients */}
        <div className="mb-4 2xl:w-full w-80">
          <h3 className="text-sm font-semibold tracking-wide text-gray-400 mb-2">Gradients</h3>
          <div className="grid grid-cols-6 gap-1 place-items-center">
            {GRADIENT_COLORS.map((col) => (
              <motion.div
                whileHover={{  scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                key={col}
                onClick={() => setColor(col)}
                className="w-10 h-10 rounded-full cursor-pointer border border-gray-200"
                style={{ background: col }}
              />
            ))}
          </div>
        </div>
      </div>
        

        {/* Actions */}
        <div className="flex justify-between mt-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 text-sm cursor-pointer"
          >
            Reset
          </motion.button>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleApply}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 text-sm cursor-pointer"
            >
              Apply
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-200 text-sm cursor-pointer"
            >
              Cancel
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
