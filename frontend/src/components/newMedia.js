    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 8,
        episodeTitle: "Tokyo Colony No 2",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E8_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=8`,
      }, 
      {
        kind: "movie",
        showSlug: "bugonia",
        showTitle: "Bugonia",
        placeholder: "/images/bugonia/placeholders/bugonia_placeholder.png",
        to: `/video-library/bugonia?movie=1`,
      },
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 2,
        episode: 7,
        episodeTitle: "Tokyo Colony No 1",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E7_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=7`,
      },
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 6,
        episodeTitle: "Cog",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E6_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=6`,
      },      
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 5,
        episodeTitle: "Fever",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E5_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=5`,
      },           
    ];