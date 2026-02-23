import episodeTitles from "../data/episodeTitles.json";

let catalogCache = null;

export const getCatalog = () => {
  if (catalogCache) return catalogCache;

  catalogCache = {
    allEpisodeTitles: episodeTitles,
  };

  return catalogCache;
};

export const getAllEpisodeTitles = () => getCatalog().allEpisodeTitles;
