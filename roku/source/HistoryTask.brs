sub init()
    m.top.functionName = "run"
end sub

sub run()
    transfer = CreateObject("roUrlTransfer")
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

    payload = transfer.PostFromString(m.top.bodyJson)
    responseCode = transfer.GetResponseCode()
    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "History request failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if
end sub
