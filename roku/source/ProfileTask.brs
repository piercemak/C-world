sub init()
    m.top.functionName = "run"
end sub

sub run()
    transfer = CreateObject("roUrlTransfer")
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/profiles/")
    transfer.AddHeader("Accept", "application/json")

    if m.top.authToken = ""
        m.top.errorMessage = "A CWorld auth token is required."
        return
    end if
    transfer.AddHeader("Authorization", "Token " + m.top.authToken)

    payload = transfer.GetToString()
    responseCode = transfer.GetResponseCode()
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
