import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './modules/starReview.scss'; 

const StarReview = ({ showId }) => {
  const formRef = useRef(null);
  const [rating, setRating] = useState(null);

  const ratings = useMemo(() => [
    { id: 1, name: 'Terrible' },
    { id: 2, name: 'Bad' },
    { id: 3, name: 'OK' },
    { id: 4, name: 'Good' },
    { id: 5, name: 'Excellent' },
  ], []);

  const storageKey = `rating-${showId}`;

  const handleChange = useCallback((e) => {
    const newRating = ratings.find(r => r.id === +e.target.value);
    if (!newRating) return;
    const prevRatingID = rating?.id || 0;
    setRating(newRating);
    localStorage.setItem(storageKey, newRating.id);

    // Reset all label classes
    formRef.current?.querySelectorAll(`[for*="rating"]`).forEach((el) => {
      el.className = 'rating__label';
    });

    let delay = 0;
    ratings.forEach((r) => {
      const label = formRef.current?.querySelector(`[for="rating-${r.id}"]`);
      const display = formRef.current?.querySelector(`[data-rating="${r.id}"]`);

      if (r.id > prevRatingID + 1 && r.id <= newRating.id) {
        ++delay;
        label?.classList.add(`rating__label--delay${delay}`);
      }

      if (newRating.id !== r.id) {
        display?.setAttribute('hidden', true);
      } else {
        display?.removeAttribute('hidden');
      }
    });
  }, [rating?.id, ratings, storageKey]);

  useEffect(() => {
    const savedRating = parseInt(localStorage.getItem(storageKey), 10);
    if (savedRating) {
      handleChange({ target: { value: savedRating } });
      const input = formRef.current?.querySelector(`#rating-${showId}-${savedRating}`);
      if (input) input.checked = true;
    } else {
      formRef.current?.reset();
    }
  }, [handleChange, showId, storageKey]);

  return (
    <form className="rating" ref={formRef} onChange={handleChange}>
      <div className="rating__stars">
        {ratings.map((r) => (
        <input
            key={`input-${r.id}`}
            id={`rating-${showId}-${r.id}`}
            className={`rating__input rating__input-${r.id}`}
            type="radio"
            name={`rating-${showId}`}
            value={r.id}
        />
        ))}
        {ratings.map((r) => (
        <label
            key={`label-${r.id}`}
            className="rating__label"
            htmlFor={`rating-${showId}-${r.id}`}
        >
            <svg
            className="rating__star"
            viewBox="0 0 32 32"
            aria-hidden="true"
            >
            <g transform="translate(16,16)">
                <circle
                className="rating__star-ring"
                fill="none"
                stroke="#000"
                strokeWidth="16"
                r="8"
                transform="scale(0)"
                />
            </g>
            <g stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <g transform="translate(16,16) rotate(180)">
                <polygon
                    className="rating__star-stroke"
                    points="0,15 4.41,6.07 14.27,4.64 7.13,-2.32 
                    8.82,-12.14 0,-7.5 -8.82,-12.14 -7.13,-2.32 
                    -14.27,4.64 -4.41,6.07"
                    fill="none"
                />
                <polygon
                    className="rating__star-fill"
                    points="0,15 4.41,6.07 14.27,4.64 7.13,-2.32 
                    8.82,-12.14 0,-7.5 -8.82,-12.14 -7.13,-2.32 
                    -14.27,4.64 -4.41,6.07"
                    fill="#000"
                />
                </g>
                <g transform="translate(16,16)" strokeDasharray="12 12" strokeDashoffset="12">
                {[0, 72, 144, 216, 288].map((angle) => (
                    <polyline
                    key={angle}
                    className="rating__star-line"
                    transform={`rotate(${angle})`}
                    points="0 4,0 16"
                    />
                ))}
                </g>
            </g>
            </svg>
            <span className="rating__sr">{`${r.id} star${r.id > 1 ? 's' : ''}—${r.name}`}</span>
        </label>
        ))}
      </div>
    </form>
  );
};

export default StarReview;
