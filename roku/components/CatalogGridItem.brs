sub init()
    m.poster = m.top.findNode("poster")
    m.card = m.top.findNode("card")
    m.shine = m.top.findNode("shine")
end sub
sub onContentChanged()
    if m.top.itemContent <> invalid
        c = m.top.itemContent
        m.poster.uri = c.HDPosterUrl
        m.top.findNode("title").text = c.title
        m.top.findNode("title").visible = c.posterMode
        if c.posterMode
            m.poster.width = 132
            m.poster.height = 190
            m.poster.translation = [44,0]
        else
            m.poster.width = 238
            m.poster.height = 238
            m.poster.translation = [0,0]
        end if
        onFocusChanged()
    end if
end sub
sub onFocusChanged()
    amount = m.top.focusPercent
    m.shine.opacity = 0.35 * amount
    m.shine.translation = m.poster.translation
    m.shine.width = m.poster.width
    m.shine.height = m.poster.height
    size = 1.0
    m.card.translation = [4, 4]
    m.card.scale = [size, size]
end sub
