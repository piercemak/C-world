sub init()
    m.poster = m.top.findNode("poster")
    m.title = m.top.findNode("title")
    m.focusFrame = m.top.findNode("focusFrame")
    m.top.observeField("focusedChild", "onFocusChanged")
end sub

sub onContentChanged()
    content = m.top.itemContent
    if content = invalid
        return
    end if

    m.poster.uri = content.HDPosterUrl
    m.title.text = content.title
end sub

sub onFocusChanged()
    focused = m.top.hasFocus()
    if focused
        m.focusFrame.opacity = 0.9
    else
        m.focusFrame.opacity = 0.0
    end if
    m.focusFrame.color = "#5ed8ff"
end sub
