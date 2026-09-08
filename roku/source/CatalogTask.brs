sub init()
    m.top.functionName = "run"
end sub

sub run()
    transfer = CreateObject("roUrlTransfer")
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/catalog/v1/")
    transfer.AddHeader("Accept", "application/json")

    if m.top.authToken <> ""
        transfer.AddHeader("Authorization", "Token " + m.top.authToken)
    end if

    payload = transfer.GetToString()
    responseCode = transfer.GetResponseCode()
    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "Catalog request failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if

    if payload = invalid or payload = ""
        m.top.errorMessage = "Catalog request returned an empty response."
        return
    end if

    m.top.resultJson = payload
end sub
