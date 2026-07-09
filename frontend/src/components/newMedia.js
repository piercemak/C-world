    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
      {
        kind: "episode",
        showSlug: "mongolianchopsquad",                   
        showTitle: "Beck: Mongolian Chop Squad",
        season: 1,
        episode: 1,
        episodeTitle: "The View at 14",
        placeholder: `${cloudFrontDomain}/${clean("mongolianchopsquad")}/placeholders/season1/S1E1_${clean("mongolianchopsquad")}_placeholder.png`,
        to: `/video-library/jjk?season=1&episode=1`,
      }, 
      {
        kind: "movie",
        showSlug: "theanimatrix",
        showTitle: "The Animatrix",
        placeholder: "/images/theanimatrix/placeholders/theanimatrix_placeholder.png",
        to: `/video-library/theanimatrix?movie=1`,
      }, 
      {
        kind: "movie",
        showSlug: "bloodthelastvampire",
        showTitle: "Blood: The Last Vampire",
        placeholder: "/images/bloodthelastvampire/placeholders/bloodthelastvampire_placeholder.png",
        to: `/video-library/bloodthelastvampire?movie=1`,
      }, 
      {
        kind: "projecthailmary",
        showSlug: "projecthailmary",
        showTitle: "Project Hail Mary",
        placeholder: "/images/projecthailmary/placeholders/projecthailmary_placeholder.png",
        to: `/video-library/projecthailmary?movie=1`,
      }, 
      {
        kind: "movie",
        showSlug: "obsession",
        showTitle: "Obsession",
        placeholder: "/images/obsession/placeholders/obsession_placeholder.png",
        to: `/video-library/obsession?movie=1`,
      }, 
    ];