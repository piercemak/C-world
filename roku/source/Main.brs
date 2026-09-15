sub Main()
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.setMessagePort(port)

    scene = screen.CreateScene("MainScene")
    scene.config = CWorldConfig()
    screen.show()
    scene.setFocus(true)

    while true
        message = wait(0, port)
        if type(message) = "roSGScreenEvent" and message.isScreenClosed()
            return
        end if
    end while
end sub
