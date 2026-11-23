function playerClamp(value as Float, low as Float, high as Float) as Float
    if value < low then return low
    if value > high then return high
    return value
end function
function playerMarker(value as Dynamic) as Boolean
    return value <> invalid and (type(value) = "roInt" or type(value) = "Integer" or type(value) = "roFloat" or type(value) = "Float" or type(value) = "Double" or type(value) = "roDouble")
end function
function playerSkipState(info as Object, t as Float, d as Float, autoSkip as Boolean, cancelled as Boolean) as Object
    result = {kind:"", countdown:-1, fraction:0.0}
    if d <= 0 then return result
    if playerMarker(info.introStart) and playerMarker(info.introEnd)
        if info.introStart >= 0 and info.introEnd > info.introStart and info.introEnd < d and t >= info.introStart and t < info.introEnd - 0.25 then result.kind = "intro"
    end if
    if playerMarker(info.outroStart)
        if info.outroStart > 0 and info.outroStart < d and t >= info.outroStart and t < d - 0.25 and not cancelled
            result.kind = "outro"
            if autoSkip and info.hasNext
                deadline = playerClamp(info.outroStart + 5,0,d)
                result.countdown = Int(playerClamp(-Int(-(deadline-t)),0,5))
                result.fraction = playerClamp((t-info.outroStart)/(deadline-info.outroStart),0,1)
            end if
        end if
    end if
    return result
end function
