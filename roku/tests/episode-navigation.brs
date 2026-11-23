sub main()
    m.selectedItem = {type:"show",seasons:[{number:1,episodes:[{number:1,playbackRef:{season:1}},{number:3,playbackRef:{season:1}}]},{number:2,episodes:[{number:1,playbackRef:{season:2}}]}]}
    m.playbackRef = {season:1,episode:1}
    check(adjacentEpisode(-1)=invalid,"first episode has no previous")
    check(adjacentEpisode(1).number=3,"next uses catalog rather than inventing missing episode 2")
    m.playbackRef = {season:1,episode:3}
    check(adjacentEpisode(1).playbackRef.season=2,"next crosses season boundary")
    m.playbackRef = {season:2,episode:1}
    check(adjacentEpisode(-1).number=3,"previous crosses season boundary")
    check(adjacentEpisode(1)=invalid,"last episode has no next")
    m.selectedItem = {type:"movie"}
    check(adjacentEpisode(1)=invalid,"movie has no automatic next")
    print "All episode-navigation checks passed."
end sub
sub check(ok as Boolean, message as String)
    if not ok
        print "FAIL: ";message
        stop
    end if
end sub
