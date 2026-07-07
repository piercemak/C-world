    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
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
      {
        kind: "hokum",
        showSlug: "hokum",
        showTitle: "Hokum",
        placeholder: "/images/hokum/placeholders/hokum_placeholder.png",
        to: `/video-library/hokum?movie=1`,
      }, 
      {
        kind: "movie",
        showSlug: "exit8",
        showTitle: "Exit 8",
        placeholder: "/images/exit8/placeholders/exit8_placeholder.png",
        to: `/video-library/exit8?movie=1`,
      }, 
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 12,
        episodeTitle: "Sendai Colony",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E12_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=12`,
      },   
    ];