    {/* New Episodes */}
    const cloudFrontDomain = "https://d20honz3pkzrs8.cloudfront.net";
    const clean = (s) => (s || "").replace(/-/g, "");
    export const newMedia = [
      {
        kind: "movie",
        showSlug: "sunsetboulevard",
        showTitle: "Sunset Boulevard",
        placeholder: "/images/sunsetboulevard/placeholders/sunsetboulevard_placeholder.png",
        to: `/video-library/sunsetboulevard?movie=1`,
      },
      {
        kind: "episode",
        showSlug: "truedetective",                   
        showTitle: "True Detective",
        season: 1,
        episode: 1,
        episodeTitle: "The Long Bright Dark",
        placeholder: `${cloudFrontDomain}/${clean("truedetective")}/placeholders/season1/S1E1_${clean("truedetective")}_placeholder.png`,
        to: `/video-library/truedetective?season=1&episode=1`,
      },
      {
        kind: "frankenstein",
        showSlug: "frankenstein",
        showTitle: "Frankenstein",
        placeholder: "/images/frankenstein/placeholders/frankenstein_placeholder.png",
        to: `/video-library/frankenstein?movie=1`,
      },       
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
    ];