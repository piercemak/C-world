    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
      {
        kind: "movie",
        showSlug: "theinvite",
        showTitle: "The Invite",
        placeholder: "/images/theinvite/placeholders/theinvite_placeholder.png",
        to: `/video-library/theinvite?movie=1`,
      }, 
      {
        kind: "movie",
        showSlug: "cure",
        showTitle: "Cure",
        placeholder: "/images/cure/placeholders/cure_placeholder.png",
        to: `/video-library/cure?movie=1`,
      }, 
      {
        kind: "movie",
        showSlug: "thenightisshort",
        showTitle: "The Night Is Short, Walk on Girl",
        placeholder: "/images/thenightisshort/placeholders/thenightisshort_placeholder.png",
        to: `/video-library/thenightisshort?movie=1`,
      }, 
      {
        kind: "movie",
        showSlug: "thedrama",
        showTitle: "The Drama",
        placeholder: "/images/thedrama/placeholders/thedrama_placeholder.png",
        to: `/video-library/thedrama?movie=1`,
      }, 
      {
        kind: "episode",
        showSlug: "attackontitan",
        showTitle: "Attack on Titan",
        season: 1,
        episode: 1,
        episodeTitle: "To You, in 2000 Years: The Fall of Shiganshina (1)",
        placeholder: `${cloudFrontDomain}/${clean("attackontitan")}/placeholders/season1/S1E1_${clean("attackontitan")}_placeholder.png`,
        to: `/video-library/attackontitan?season=1&episode=1`,
      }, 
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
    ];