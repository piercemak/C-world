sub init()
    m.label = m.top.findNode("label")
    m.background = m.top.findNode("background")
    m.top.observeField("focusedChild", "onFocusChanged")
end sub

sub onContentChanged()
    content = m.top.itemContent
    if content <> invalid
        m.label.text = content.title
    end if
end sub

sub onFocusChanged()
    if m.top.hasFocus()
        m.background.opacity = 0.9
    else
        m.background.opacity = 0.0
    end if
end sub
