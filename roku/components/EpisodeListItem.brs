sub init()
    m.poster = m.top.findNode("poster")
    m.poster.observeField("loadStatus", "onPosterStatus")
end sub
sub onContentChanged()
    c = m.top.itemContent
    if c = invalid then return
    m.top.findNode("label").text = c.title
    m.top.findNode("code").text = c.episodeCode
    m.top.findNode("meta").text = c.description
    m.top.findNode("fallback").uri = c.fallbackUrl
    m.poster.visible = true
    m.poster.uri = c.HDPosterUrl
    m.top.findNode("progress").width = 260 * c.progressFraction
end sub
sub onPosterStatus()
    m.poster.visible = m.poster.loadStatus <> "failed"
end sub
sub onFocusChanged()
    amount = m.top.focusPercent
    m.top.findNode("focus").opacity = amount
    size = 1.0 + 0.025 * amount
    m.top.findNode("tile").scale = [size,size]
end sub
