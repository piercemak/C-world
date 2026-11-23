sub init()
    m.top.observeField("focusedChild", "update")
    update()
end sub
sub update()
    m.top.findNode("textLabel").text = m.top.text
    w = m.top.minWidth
    if m.top.width > w then w = m.top.width
    m.top.findNode("textLabel").width = w - 20
    m.top.findNode("surface").width = w
    m.top.findNode("underline").width = w - 24
    if m.top.hasFocus()
        m.top.findNode("surface").opacity = 1
        m.top.findNode("underline").opacity = 1
    else
        m.top.findNode("surface").opacity = 0
        m.top.findNode("underline").opacity = 0
    end if
end sub
function onKeyEvent(key as String, press as Boolean) as Boolean
    if press and (key = "OK" or key = "select")
        m.top.buttonSelected = true
        return true
    end if
    return false
end function
