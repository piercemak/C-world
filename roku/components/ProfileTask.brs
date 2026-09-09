sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    transfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    transfer.SetPort(port)
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/profiles/")
    transfer.AddHeader("Accept", "application/json")

    if m.top.authToken = ""
        m.top.errorMessage = "A CWorld auth token is required."
        return
    end if
    transfer.AddHeader("Authorization", "Token " + m.top.authToken)

    if not transfer.AsyncGetToString()
        m.top.errorMessage = "Profiles request could not start."
        return
    end if

    event = wait(15000, port)
    if event = invalid
        transfer.AsyncCancel()
        m.top.errorMessage = "Profiles request timed out."
        return
    end if
    if type(event) <> "roUrlEvent"
        m.top.errorMessage = "Profiles returned an invalid response event."
        return
    end if

    responseCode = event.GetResponseCode()
    payload = event.GetString()
    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "Profiles request failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if

    if payload = invalid or payload = ""
        m.top.errorMessage = "Profiles request returned an empty response."
        return
    end if

    m.top.resultJson = payload
end sub
