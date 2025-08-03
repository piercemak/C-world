import React, { useState } from 'react';

const GradientPickerModal = ({ initialValue, onClose, onSave }) => {
  const DEFAULT_GRADIENT = 'conic-gradient(from .5turn at bottom center in oklab, #add8e6, #fff)';
  const [gradientType, setGradientType] = useState('conic'); // 'linear', 'radial', etc.
  const [colors, setColors] = useState(['#add8e6', '#ffffff']);
  const [angle, setAngle] = useState('.5turn');

  const buildGradient = () => {
    if (gradientType === 'conic') {
      return `conic-gradient(from ${angle} at bottom center in oklab, ${colors.join(', ')})`;
    }
    if (gradientType === 'linear') {
      return `linear-gradient(${angle}, ${colors.join(', ')})`;
    }
    return '';
  };

  const gradient = buildGradient();

  const handleSave = () => {
    onSave(gradient);
    onClose();
  };

  const handleReset = () => {
    setGradientType('conic');
    setAngle('.5turn');
    setColors(['#add8e6', '#ffffff']);
  };

  const handleColorChange = (index, value) => {
    const updated = [...colors];
    updated[index] = value;
    setColors(updated);
  };

  const handleAddColor = () => setColors([...colors, '#ffffff']);
  const handleRemoveColor = (index) => {
    if (colors.length > 2) setColors(colors.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
      <div className="bg-white p-6 rounded-xl w-[480px] shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 text-center">Customize Gradient</h2>

        {/* Gradient Type Select */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-600">Gradient Type</label>
          <select
            value={gradientType}
            onChange={(e) => setGradientType(e.target.value)}
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2"
          >
            <option value="conic">Conic</option>
            <option value="linear">Linear</option>
          </select>
        </div>

        {/* Angle Input */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-600">Angle / Direction</label>
          <input
            type="text"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="e.g. 45deg or .5turn"
            className="w-full mt-1 border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {/* Color Inputs */}
        <div className="mb-4 space-y-2 text-black">
          <label className="text-sm font-medium text-gray-600">Colors</label>
          {colors.map((color, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(index, e.target.value)}
                className="w-10 h-10 p-0 border border-gray-300 rounded"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => handleColorChange(index, e.target.value)}
                className="flex-grow border border-gray-300 rounded px-2 py-1"
              />
              {colors.length > 2 && (
                <button
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveColor(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddColor}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            + Add Color
          </button>
        </div>

        {/* Preview Box */}
        <div
          className="w-full h-20 rounded mb-6 border border-gray-300"
          style={{ background: gradient }}
        />

        {/* Controls */}
        <div className="flex justify-between items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradientPickerModal;
