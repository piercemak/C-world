    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
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
      {
        kind: "movie",
        showSlug: "coherence",
        showTitle: "Coherence",
        placeholder: "/images/coherence/placeholders/coherence_placeholder.png",
        to: `/video-library/coherence?movie=1`,
      }, 
      {
        kind: "movie",
        showSlug: "pokemon2000",
        showTitle: "Pokémon 2000",
        placeholder: "/images/pokemon2000/placeholders/pokemon2000_placeholder.png",
        to: `/video-library/pokemon2000?movie=1`,
      },      
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 11,
        episodeTitle: "Tokyo Colony No 5",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E11_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=11`,
      },
    ];