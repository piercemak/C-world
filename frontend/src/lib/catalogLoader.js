import episodeTitles from "../data/episodeTitles.json";
import episodeMetadata from "../data/episodeMetadata.json";

let catalogCache = null;

export const getCatalog = () => {
  if (catalogCache) return catalogCache;

  catalogCache = {
    allEpisodeTitles: episodeTitles,
    allEpisodeMetadata: episodeMetadata,
  };

  return catalogCache;
};

export const getAllEpisodeTitles = () => getCatalog().allEpisodeTitles;
export const getAllEpisodeMetadata = () => getCatalog().allEpisodeMetadata;
