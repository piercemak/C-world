    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
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
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 4,
        episodeTitle: "Perfect Preparation",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E4_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=4`,
      },      
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 3,
        episodeTitle: "About The Culling Game",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E3_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=3`,
      }   
      /* FOR MOVIES
      {
        kind: "movie",
        showSlug: "perfect-blue",
        showTitle: "Perfect Blue",
        placeholder: "/images/perfectblue/placeholders/perfectblue_placeholder.png",
        to: `/video-library/perfect-blue?movie=1`,
      },
      */
    ];