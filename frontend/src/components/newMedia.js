    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
      {
        kind: "movie",
        showSlug: "beingjohnmalkovich",
        showTitle: "Being John Malkovich",
        placeholder: "/images/beingjohnmalkovich/placeholders/beingjohnmalkovich_placeholder.png",
        to: `/video-library/beingjohnmalkovich?movie=1`,
      }, 
      {
        kind: "episode",
        showSlug: "chernobyl",
        showTitle: "Chernobyl",
        season: 1,
        episode: 1,
        episodeTitle: "1:23:45",
        placeholder: `${cloudFrontDomain}/${clean("chernobyl")}/placeholders/season1/S1E1_${clean("chernobyl")}_placeholder.png`,
        to: `/video-library/chernobyl?season=1&episode=1`,
      }, 
      {
        kind: "episode",
        showSlug: "jojos",
        showTitle: "JoJo's Bizarre Adventure",
        season: 1,
        episode: 1,
        episodeTitle: "Stone Ocean",
        placeholder: `${cloudFrontDomain}/${clean("jojos")}/placeholders/season1/S1E1_${clean("jojos")}_placeholder.png`,
        to: `/video-library/jojos?season=1&episode=1`,
      }, 
      {
        kind: "movie",
        showSlug: "chronicle",
        showTitle: "Chronicle",
        placeholder: "/images/chronicle/placeholders/chronicle_placeholder.png",
        to: `/video-library/chronicle?movie=1`,
      }, 
      {
        kind: "episode",
        showSlug: "atlanta",
        showTitle: "Atlanta",
        season: 1,
        episode: 1,
        episodeTitle: "The Big Bang",
        placeholder: `${cloudFrontDomain}/${clean("atlanta")}/placeholders/season1/S1E1_${clean("atlanta")}_placeholder.png`,
        to: `/video-library/atlanta?season=1&episode=1`,
      }, 
    ];