sub main()
    m.top = {content:{getChildCount:function():return 6:end function},itemFocused:0,jumpToItem:-1,pageRequested:0,itemSelected:-1}
    check(onKeyEvent("down",true), "down handled")
    check(m.top.jumpToItem = 3, "down changes focus only")
    check(m.top.pageRequested = 0, "down never changes page")
    m.top.itemFocused = 3
    m.top.jumpToItem = -1
    onKeyEvent("down",true)
    check(m.top.jumpToItem = -1 and m.top.pageRequested = 0, "bottom row stays put")
    onKeyEvent("up",true)
    check(m.top.jumpToItem = 0, "up returns to top row")
    m.top.itemFocused = 0
    check(not onKeyEvent("up",true), "top up bubbles to header")
    m.top.itemFocused = 5
    onKeyEvent("right",true)
    check(m.top.pageRequested = 1, "right advances horizontal page")
    m.top.itemFocused = 3
    onKeyEvent("left",true)
    check(m.top.pageRequested = -1, "left goes to previous page")
    onKeyEvent("OK",true)
    check(m.top.itemSelected = 3, "OK selects focused card")
    print "All fixed-grid navigation checks passed."
end sub
sub check(ok as Boolean, message as String)
    if not ok
        print "FAIL: ";message
        stop
    end if
end sub
