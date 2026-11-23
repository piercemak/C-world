sub main()
    info = {introStart:70,introEnd:145,outroStart:1300,hasNext:true}
    check(playerSkipState(info,0,1440,true,false).kind = "", "cold open does not show intro")
    check(playerSkipState(info,70,1440,true,false).kind = "intro", "intro begins at saved start")
    check(playerSkipState(info,145,1440,true,false).kind = "", "intro ends at saved end")
    check(playerSkipState(info,1300,1440,true,false).countdown = 5, "outro countdown begins at five")
    check(playerSkipState(info,1302.5,1440,true,false).countdown = 3, "fractional playback time countdown")
    check(playerSkipState(info,1305,1440,true,false).countdown = 0, "advance at five seconds")
    check(playerSkipState(info,1305,1440,false,false).countdown = -1, "auto-skip off prevents countdown")
    check(playerSkipState(info,1305,1440,true,true).kind = "", "keep watching cancels outro")
    check(playerSkipState(info,1200,1440,true,false).kind = "", "seeking before outro hides card")
    info.hasNext = false
    check(playerSkipState(info,1305,1440,true,false).countdown = -1, "last episode does not auto advance")
    info.introStart = invalid
    check(playerSkipState(info,0,1440,true,false).kind = "", "missing intro start never assumes zero")
    info.introStart = -1
    check(playerSkipState(info,0,1440,true,false).kind = "", "invalid negative intro ignored")
    check(playerSkipState(info,0,0,true,false).kind = "", "unknown duration safe")
    print "All playback-rule checks passed."
end sub
sub check(ok as Boolean, message as String)
    if not ok
        print "FAIL: ";message
        stop
    end if
end sub
