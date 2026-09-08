sub init()
    m.top.functionName = "run"
end sub

sub run()
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
        payload = transfer.PostFromString(m.top.bodyJson)
    else
        payload = transfer.GetToString()
    end if

    responseCode = transfer.GetResponseCode()
    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "Progress request failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if

    if payload = invalid
        payload = "{}"
    end if
    m.top.resultJson = payload
end sub
