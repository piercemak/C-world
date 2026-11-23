sub init()
    m.chrome = m.top.findNode("chrome")
    m.tick = m.top.findNode("tick")
    m.hide = m.top.findNode("hide")
    m.tick.observeField("fire", "update")
    m.hide.observeField("fire", "hideControls")
    m.settings = CreateObject("roRegistrySection", "SeedSpacePlayer")
    m.autoSkip = m.settings.Read("autoSkip") <> "off"
    m.captionSize = preference("captionSize", "Large")
    m.captionFont = preference("captionFont", "Sans Serif Proportional")
    m.captionColor = preference("captionColor", "White")
    m.captionBackground = preference("captionBackground", "Off")
    m.captionEffect = preference("captionEffect", "Drop shadow (right)")
    m.accent = preference("accent", "0xFFFFFFFF")
    m.top.findNode("progress").color = m.accent
    m.buttonNames = ["Restart", "Previous", "−15s", "Pause", "+15s", "Next", "Captions", "Audio", "Auto skip", "More"]
    m.buttonActions = ["restart", "previous", "rewind", "toggle", "forward", "next", "captions", "audio", "auto", "more"]
    m.buttons = []
    for i = 0 to 9
        button = m.top.findNode("buttons").createChild("Group")
        button.translation = [i * 118,0]
        surface = button.createChild("Rectangle")
        surface.width = 112
        surface.height = 44
        surface.color = "0xFFFFFF24"
        label = button.createChild("Label")
        label.translation = [2,9]
        label.width = 108
        label.height = 30
        label.horizAlign = "center"
        font = CreateObject("roSGNode", "Font")
        font.uri = "pkg:/fonts/Poppins-Semibold.ttf"
        font.size = 16
        label.font = font
        label.text = m.buttonNames[i]
        m.buttons.Push({surface:surface,label:label})
    end for
    m.row = 3
    m.index = 3
    m.shown = true
    m.info = invalid
    m.outroCancelled = false
    m.advancing = false
    m.skipKind = ""
    m.captions = false
end sub
function preference(key as String, fallback as String) as String
    value = m.settings.Read(key)
    if value = "" then return fallback
    return value
end function
sub savePreference(key as String, value as String)
    m.settings.Write(key,value)
    m.settings.Flush()
end sub
sub bindVideo()
    m.video = m.top.video
end sub
sub configure()
    m.info = m.top.playbackInfo
    if m.info = invalid then return
    m.outroCancelled = false
    m.advancing = false
    m.skipKind = ""
    m.row = 3
    m.index = 3
    m.top.failure = ""
    if m.captionMediaID <> m.info.mediaId
        m.captions = m.info.subtitlesDefaultEnabled = true
        m.captionMediaID = m.info.mediaId
    end if
    m.top.findNode("title").text = UCase(m.info.title)
    m.top.findNode("episode").text = m.info.episodeLabel
    applyCaptions()
    showControls()
end sub
sub activeChanged()
    if m.top.active
        m.savedCaptionMode = m.video.globalCaptionMode
        m.top.visible = true
        m.tick.control = "start"
        applyCaptions()
        showControls()
    else
        m.tick.control = "stop"
        m.hide.control = "stop"
        m.top.visible = false
        if m.video <> invalid and m.savedCaptionMode <> invalid
            m.video.globalCaptionMode = m.savedCaptionMode
        end if
    end if
end sub
sub applyCaptions()
    if m.video = invalid then return
    m.video.captionStyle = {"Text/Font":m.captionFont, "Text/Size":m.captionSize, "Text/Color":m.captionColor, "Text/Effect":m.captionEffect, "Background/Opacity":m.captionBackground, "Window/Opacity":"Off"}
    m.video.suppressCaptions = not m.captions
    if m.top.active and m.captions then m.video.globalCaptionMode = "On"
end sub
sub showControls()
    if not m.shown
        m.top.findNode("fadeOut").control = "stop"
        m.top.findNode("fadeIn").control = "start"
    end if
    m.shown = true
    m.hide.control = "stop"
    m.hide.control = "start"
    paintFocus()
end sub
sub hideControls()
    if m.video = invalid then return
    if m.video.state <> "playing" or m.top.getScene().dialog <> invalid then return
    m.shown = false
    m.top.findNode("fadeIn").control = "stop"
    m.top.findNode("fadeOut").control = "start"
    m.row = 3
    paintFocus()
end sub
sub paintFocus()
    for i = 0 to 9
        m.buttons[i].surface.opacity = 0
        if m.row = 3 and m.index = i then m.buttons[i].surface.opacity = 1
    end for
    m.top.findNode("backFocus").opacity = 0
    m.top.findNode("timelineFocus").opacity = 0
    m.top.findNode("skipFocus").color = "0xFFFFFF20"
    if m.row = 0 then m.top.findNode("backFocus").opacity = 1
    if m.row = 2 then m.top.findNode("timelineFocus").opacity = 1
    if m.row = 1 then m.top.findNode("skipFocus").color = "0xFFFFFF55"
    if m.video <> invalid and m.video.hasField("captionRenderArea")
        height = 650
        if m.shown then height = 540
        m.video.captionRenderArea = {mode:"override", x:64, y:90, width:1152, height:height-90, "overridePlacement":true, "keepSafeMargins":false}
    end if
end sub
function clockText(seconds as Float) as String
    s = Int(seconds)
    if s < 0 then s = 0
    hours = Int(s / 3600)
    minutes = Int((s mod 3600) / 60)
    rest = (s mod 60).ToStr()
    if Len(rest) = 1 then rest = "0" + rest
    result = minutes.ToStr() + ":" + rest
    if hours > 0
        if minutes < 10 then result = "0" + result
        result = hours.ToStr() + ":" + result
    end if
    return result
end function
sub update()
    if not m.top.active or m.video = invalid or m.info = invalid then return
    t = m.video.position
    d = m.video.duration
    if t = invalid then t = 0
    if d = invalid then d = 0
    m.top.findNode("elapsed").text = clockText(t)
    m.top.findNode("duration").text = clockText(d)
    if d > 0 then m.top.findNode("progress").width = 1176 * clamp(t / d,0,1)
    m.buttons[3].label.text = "Play"
    if m.video.state = "playing" then m.buttons[3].label.text = "Pause"
    m.buttons[8].label.text = "Auto: Off"
    if m.autoSkip then m.buttons[8].label.text = "Auto: On"
    m.buttons[1].label.color = "0xFFFFFF66"
    m.buttons[5].label.color = "0xFFFFFF66"
    if m.info.hasPrevious then m.buttons[1].label.color = "0xFFFFFFFF"
    if m.info.hasNext then m.buttons[5].label.color = "0xFFFFFFFF"
    statusText = ""
    if m.video.state = "buffering" then statusText = "Buffering…"
    if m.video.state = "none" or m.video.state = "stopped" then statusText = "Preparing playback…"
    if m.top.failure <> "" then statusText = m.top.failure + Chr(10) + "OK to retry · Back to details"
    m.top.findNode("status").visible = statusText <> ""
    m.top.findNode("statusText").text = statusText
    skip = playerSkipState(m.info,t,d,m.autoSkip,m.outroCancelled)
    m.skipKind = skip.kind
    m.top.findNode("skip").visible = m.skipKind <> ""
    m.top.findNode("nextArtwork").visible = m.skipKind = "outro" and m.info.hasNext
    m.top.findNode("sweepAnimation").control = "stop"
    if m.skipKind <> "outro" then m.top.findNode("sweep").width = 0
    m.top.findNode("cancelLabel").visible = m.skipKind = "outro"
    if m.skipKind = "intro"
        m.top.findNode("skipTitle").text = "Intro"
        m.top.findNode("skipLabel").text = "Skip intro · OK"
    else if m.skipKind = "outro"
        m.top.findNode("skipTitle").text = "Credits"
        m.top.findNode("skipLabel").text = "Skip outro · OK"
        if m.info.hasNext
            m.top.findNode("skipTitle").text = m.info.nextTitle
            m.top.findNode("nextArtwork").uri = m.info.nextArtwork
            m.top.findNode("skipLabel").text = "Next episode · OK"
            if m.autoSkip
                left = skip.countdown
                m.top.findNode("skipLabel").text = "Next in " + left.ToStr() + "s · OK"
                targetWidth = 298 * skip.fraction
                if m.video.state = "playing"
                    m.top.findNode("sweepInterpolator").keyValue = [m.top.findNode("sweep").width,targetWidth]
                    m.top.findNode("sweepAnimation").control = "start"
                else
                    m.top.findNode("sweep").width = targetWidth
                end if
                if left = 0 and m.video.state = "playing" and not m.advancing
                    m.advancing = true
                    m.top.action = "next"
                end if
            end if
        end if
    end if
    if m.skipKind = "" and m.row = 1 then m.row = 3
end sub
function clamp(value as Float, low as Float, high as Float) as Float
    if value < low then return low
    if value > high then return high
    return value
end function
sub seekBy(delta as Float)
    if m.video.duration = invalid then return
    if m.video.duration <= 0 then return
    m.video.autoplayAfterSeek = m.video.state <> "paused"
    m.video.seek = clamp(m.video.position+delta,0,m.video.duration-0.1)
    m.top.action = "save"
end sub
sub toggle()
    if m.video.state = "playing" or m.video.state = "buffering"
        m.video.control = "pause"
    else if m.video.state = "finished"
        m.video.seek = 0
        m.video.control = "play"
    else
        m.video.control = "resume"
    end if
    m.top.action = "save"
end sub
sub doSkip()
    if m.skipKind = "intro"
        m.video.seek = m.info.introEnd
    else if m.skipKind = "outro"
        if m.info.hasNext
            m.advancing = true
            m.top.action = "next"
        else
            m.video.seek = m.video.duration - 0.1
        end if
    end if
end sub
sub runAction(name as String)
    if name = "toggle"
        toggle()
    else if name = "restart"
        m.outroCancelled = false
        m.video.autoplayAfterSeek = m.video.state <> "paused"
        m.video.seek = 0
        if m.video.state = "finished" then m.video.control = "play"
    else if name = "rewind"
        seekBy(-15)
    else if name = "forward"
        seekBy(15)
    else if name = "previous"
        if m.info.hasPrevious then m.top.action = "previous"
    else if name = "next"
        if m.info.hasNext then m.top.action = "next"
    else if name = "auto"
        m.autoSkip = not m.autoSkip
        m.outroCancelled = false
        value = "off"
        if m.autoSkip then value = "on"
        savePreference("autoSkip",value)
    else
        openMenu(name)
    end if
end sub
function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press or not m.top.active then return false
    if key = "back"
        m.top.action = "close"
        return true
    end if
    if m.top.failure <> ""
        if key = "OK" then m.top.action = "retry"
        return true
    end if
    if key = "play"
        toggle()
    else if key = "rev" or key = "replay"
        seekBy(-15)
    else if key = "fwd"
        seekBy(15)
    else if key = "options"
        openMenu("more")
    else if not m.shown
        if key = "OK" and m.skipKind <> ""
            doSkip()
        else if key = "down" and m.skipKind = "outro"
            m.outroCancelled = true
        end if
        showControls()
        return true
    else if key = "up"
        if m.row = 3
            m.row = 2
        else if m.row = 2 and m.skipKind <> ""
            m.row = 1
        else
            m.row = 0
        end if
    else if key = "down"
        if m.row = 1 and m.skipKind = "outro"
            m.outroCancelled = true
            m.row = 2
        else if m.row < 2
            m.row = 2
        else
            m.row = 3
        end if
    else if key = "left" or key = "right"
        delta = 1
        if key = "left" then delta = -1
        if m.row = 2
            seekBy(delta*15)
        else if m.row = 3
            m.index = Int(clamp(m.index+delta,0,9))
        end if
    else if key = "OK"
        if m.row = 0
            m.top.action = "close"
        else if m.row = 1
            doSkip()
        else if m.row = 2
            toggle()
        else
            runAction(m.buttonActions[m.index])
        end if
    else
        return false
    end if
    showControls()
    update()
    return true
end function
sub openMenu(kind as String)
    dialog = CreateObject("roSGNode", "Dialog")
    m.menuKind = kind
    m.menuValues = []
    labels = []
    if kind = "audio"
        dialog.title = "Audio track"
        for each track in m.video.availableAudioTracks
            title = track.Name
            if title = invalid or title = "" then title = track.Language
            if title = invalid or title = "" then title = "Audio"
            if track.Track = m.video.currentAudioTrack then title = "✓ " + title
            labels.Push(title)
            m.menuValues.Push(track.Track)
        end for
        if labels.Count() = 0 then dialog.message = "Audio tracks will appear once playback starts."
    else if kind = "captions"
        dialog.title = "Subtitles"
        labels = ["Turn subtitles on", "Subtitle appearance"]
        if m.captions then labels[0] = "Turn subtitles off"
        for each track in m.video.availableSubtitleTracks
            title = track.Description
            if title = invalid or title = "" then title = track.Language
            if title = invalid or title = "" then title = "Subtitle track"
            labels.Push(title)
            m.menuValues.Push(track.TrackName)
        end for
    else if kind = "appearance"
        dialog.title = "Subtitle appearance"
        labels = ["Size: " + m.captionSize, "Font: " + m.captionFont, "Color: " + m.captionColor, "Background: " + m.captionBackground, "Edge: " + m.captionEffect, "Restore defaults"]
    else if kind = "more"
        dialog.title = "Playback settings"
        labels = ["Mute / unmute", "Progress color", "Subtitle appearance", "Hide controls"]
        dialog.message = "Use your TV remote for volume. Back returns to media details."
    else if kind = "color"
        dialog.title = "Progress color"
        labels = ["White", "Blue", "Green", "Purple", "Red"]
        m.menuValues = ["0xFFFFFFFF","0x5BB8FFFF","0x60D0A0FF","0xB69CFFFF","0xF27782FF"]
    end if
    labels.Push("Done")
    dialog.buttons = labels
    dialog.observeField("buttonSelected", "menuSelected")
    m.dialog = dialog
    m.top.getScene().dialog = dialog
end sub
function cycle(value as String, choices as Object) as String
    for i = 0 to choices.Count()-1
        if choices[i] = value then return choices[(i+1) mod choices.Count()]
    end for
    return choices[0]
end function
sub menuSelected()
    i = m.dialog.buttonSelected
    done = i = m.dialog.buttons.Count()-1
    m.dialog.close = true
    if done
        showControls()
        return
    end if
    kind = m.menuKind
    showControls()
    if kind = "audio"
        if i < m.menuValues.Count() then m.video.audioTrack = m.menuValues[i]
    else if kind = "captions"
        if i = 0
            m.captions = not m.captions
            applyCaptions()
        else if i = 1
            openMenu("appearance")
        else if i-2 < m.menuValues.Count()
            m.video.subtitleTrack = m.menuValues[i-2]
            m.captions = true
            applyCaptions()
        end if
    else if kind = "appearance"
        if i = 0 then m.captionSize = cycle(m.captionSize,["Small","Medium","Large"])
        if i = 1 then m.captionFont = cycle(m.captionFont,["Sans Serif Proportional","Serif Proportional","Sans Serif Fixed Width","Casual"])
        if i = 2 then m.captionColor = cycle(m.captionColor,["White","Yellow","Cyan"])
        if i = 3 then m.captionBackground = cycle(m.captionBackground,["Off","25%","50%","75%"])
        if i = 4 then m.captionEffect = cycle(m.captionEffect,["Drop shadow (right)","Uniform","Depressed","None"])
        if i = 5
            m.captionSize = "Large"
            m.captionFont = "Sans Serif Proportional"
            m.captionColor = "White"
            m.captionBackground = "Off"
            m.captionEffect = "Drop shadow (right)"
        end if
        savePreference("captionSize",m.captionSize)
        savePreference("captionFont",m.captionFont)
        savePreference("captionColor",m.captionColor)
        savePreference("captionBackground",m.captionBackground)
        savePreference("captionEffect",m.captionEffect)
        applyCaptions()
        openMenu("appearance")
    else if kind = "color"
        m.accent = m.menuValues[i]
        savePreference("accent",m.accent)
        m.top.findNode("progress").color = m.accent
    else if kind = "more"
        if i = 0 then m.video.mute = not m.video.mute
        if i = 1 then openMenu("color")
        if i = 2 then openMenu("appearance")
        if i = 3 then hideControls()
    end if
    update()
end sub

sub playbackEnded()
    if m.info = invalid then return
    if m.autoSkip and not m.outroCancelled and m.info.hasNext and not m.advancing
        m.advancing = true
        m.top.action = "next"
    else
        showControls()
    end if
end sub
