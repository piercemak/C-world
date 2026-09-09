sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    transfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    transfer.SetPort(port)
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/playback/session/")
    transfer.SetRequest("POST")
    transfer.AddHeader("Accept", "application/json")
    transfer.AddHeader("Content-Type", "application/json")

    if m.top.authToken = ""
        m.top.errorMessage = "Playback requires a CWorld auth token."
        return
    end if

    transfer.AddHeader("Authorization", "Token " + m.top.authToken)

    body = {
        mediaId: m.top.mediaId
    }
    if m.top.season > 0
        body.season = m.top.season
    end if
    if m.top.episode > 0
        body.episode = m.top.episode
    end if

    if not transfer.AsyncPostFromString(FormatJson(body))
        m.top.errorMessage = "Playback request could not start."
        return
    end if

    event = wait(15000, port)
    if event = invalid
        transfer.AsyncCancel()
        m.top.errorMessage = "Playback request timed out."
        return
    end if
    if type(event) <> "roUrlEvent"
        m.top.errorMessage = "Playback returned an invalid response event."
        return
    end if

    responseCode = event.GetResponseCode()
    payload = event.GetString()
    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "Playback request failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if

    if payload = invalid or payload = ""
        m.top.errorMessage = "Playback request returned an empty response."
        return
    end if

    m.top.resultJson = payload
end sub
