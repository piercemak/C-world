sub init()
    m.slots = m.top.findNode("slots")
    m.top.observeField("focusedChild", "paintFocus")
    for i = 0 to 5
        card = m.slots.createChild("CatalogGridItem")
        card.translation = [(i mod 3) * 292, Int(i / 3) * 254]
    end for
end sub
sub render()
    for i = 0 to 5
        card = m.slots.getChild(i)
        card.visible = false
        if m.top.content <> invalid
            if i < m.top.content.getChildCount()
                card.itemContent = m.top.content.getChild(i)
                card.visible = true
            end if
        end if
    end for
    paintFocus()
end sub
sub jump()
    if m.top.content = invalid then return
    i = m.top.jumpToItem
    if i < 0 or i >= m.top.content.getChildCount() then return
    m.top.itemFocused = i
    paintFocus()
end sub
sub paintFocus()
    for i = 0 to 5
        amount = 0.0
        if m.top.hasFocus() and i = m.top.itemFocused then amount = 1.0
        m.slots.getChild(i).focusPercent = amount
    end for
end sub
function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press or m.top.content = invalid then return false
    count = m.top.content.getChildCount()
    i = m.top.itemFocused
    if count = 0 then return false
    col = i mod 3
    if key = "OK"
        m.top.itemSelected = i
        return true
    else if key = "right"
        if col = 2 or i = count - 1
            m.top.pageRequested = 1
        else
            m.top.jumpToItem = i + 1
        end if
        return true
    else if key = "left"
        if col = 0
            m.top.pageRequested = -1
        else
            m.top.jumpToItem = i - 1
        end if
        return true
    else if key = "down"
        if i < 3 and i + 3 < count then m.top.jumpToItem = i + 3
        return true
    else if key = "up" and i >= 3
        m.top.jumpToItem = i - 3
        return true
    end if
    return false
end function
