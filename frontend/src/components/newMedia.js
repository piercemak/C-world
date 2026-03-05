    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
      {
        kind: "episode",
        showSlug: "jjk",                   
        showTitle: "Jujutsu Kaisen",
        season: 3,
        episode: 9,
        episodeTitle: "Tokyo Colony No 3",
        placeholder: `${cloudFrontDomain}/${clean("jjk")}/placeholders/season3/S3E9_${clean("jjk")}_placeholder.png`,
        to: `/video-library/jjk?season=3&episode=9`,
      },
      {
        kind: "movie",
        showSlug: "ikiru",
        showTitle: "Ikiru",
        placeholder: "/images/ikiru/placeholders/ikiru_placeholder.png",
        to: `/video-library/ikiru?movie=1`,
      },
      {
        kind: "movie",
        showSlug: "speaknoevil",
        showTitle: "Speak No Evil",
        placeholder: "/images/speaknoevil/placeholders/speaknoevil_placeholder.png",
        to: `/video-library/speaknoevil?movie=1`,
      },
      {
        kind: "movie",
        showSlug: "shikijitsu",
        showTitle: "Shiki-Jitsu",
        placeholder: "/images/shikijitsu/placeholders/shikijitsu_placeholder.png",
        to: `/video-library/shikijitsu?movie=1`,
      },
      {
        kind: "movie",
        showSlug: "sunsetboulevard",
        showTitle: "Sunset Boulevard",
        placeholder: "/images/sunsetboulevard/placeholders/sunsetboulevard_placeholder.png",
        to: `/video-library/sunsetboulevard?movie=1`,
      },    
    ];