sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    transfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    transfer.SetPort(port)
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/catalog/v1/")
    transfer.AddHeader("Accept", "application/json")

    if m.top.authToken <> ""
        transfer.AddHeader("Authorization", "Token " + m.top.authToken)
    end if

    if not transfer.AsyncGetToString()
        m.top.errorMessage = "Catalog request could not start."
        return
    end if

    event = wait(15000, port)
    if event = invalid
        transfer.AsyncCancel()
        m.top.errorMessage = "Catalog request timed out."
        return
    end if
    if type(event) <> "roUrlEvent"
        m.top.errorMessage = "Catalog returned an invalid response event."
        return
    end if

    responseCode = event.GetResponseCode()
    payload = event.GetString()
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
