sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    transfer = CreateObject("roUrlTransfer")
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/progress/")
    transfer.AddHeader("Accept", "application/json")

    if m.top.authToken = "" or m.top.profileId = ""
        m.top.errorMessage = "A CWorld token and profile are required for progress sync."
        return
    end if
    transfer.AddHeader("Authorization", "Token " + m.top.authToken)
    transfer.AddHeader("X-Profile-Id", m.top.profileId)

    if m.top.method = "POST"
        transfer.SetRequest("POST")
        transfer.AddHeader("Content-Type", "application/json")
        port = CreateObject("roMessagePort")
        transfer.SetPort(port)
        if not transfer.AsyncPostFromString(m.top.bodyJson)
            m.top.errorMessage = "Progress request could not start."
            return
        end if
        event = wait(15000, port)
        if event = invalid
            transfer.AsyncCancel()
            m.top.errorMessage = "Progress request timed out."
            return
        end if
        if type(event) <> "roUrlEvent"
            m.top.errorMessage = "Progress returned an invalid response event."
            return
        end if
        payload = event.GetString()
        responseCode = event.GetResponseCode()
    else
        payload = transfer.GetToString()
        responseCode = transfer.GetResponseCode()
    end if

    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "Progress request failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if

    if payload = invalid
        payload = "{}"
    end if
    m.top.resultJson = payload
end sub
