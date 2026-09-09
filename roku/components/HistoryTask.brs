sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    transfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    transfer.SetPort(port)
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/history/")
    transfer.SetRequest("POST")
    transfer.AddHeader("Accept", "application/json")
    transfer.AddHeader("Content-Type", "application/json")

    if m.top.authToken = "" or m.top.profileId = ""
        m.top.errorMessage = "A CWorld token and profile are required for history sync."
        return
    end if
    transfer.AddHeader("Authorization", "Token " + m.top.authToken)
    transfer.AddHeader("X-Profile-Id", m.top.profileId)

    if not transfer.AsyncPostFromString(m.top.bodyJson)
        m.top.errorMessage = "History request could not start."
        return
    end if
    event = wait(15000, port)
    if event = invalid
        transfer.AsyncCancel()
        m.top.errorMessage = "History request timed out."
        return
    end if
    if type(event) <> "roUrlEvent"
        m.top.errorMessage = "History returned an invalid response event."
        return
    end if

    responseCode = event.GetResponseCode()
    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "History request failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if
end sub
