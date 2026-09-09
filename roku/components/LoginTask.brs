sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    transfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    transfer.SetPort(port)
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.SetUrl(m.top.apiBase + "/api/auth/login/")
    transfer.SetRequest("POST")
    transfer.AddHeader("Accept", "application/json")
    transfer.AddHeader("Content-Type", "application/json")

    body = {
        username: m.top.username,
        password: m.top.password
    }
    if not transfer.AsyncPostFromString(FormatJson(body))
        m.top.errorMessage = "Login request could not start."
        return
    end if

    event = wait(15000, port)
    if event = invalid
        transfer.AsyncCancel()
        m.top.errorMessage = "Login request timed out."
        return
    end if
    if type(event) <> "roUrlEvent"
        m.top.errorMessage = "Login returned an invalid response event."
        return
    end if

    responseCode = event.GetResponseCode()
    payload = event.GetString()
    if responseCode < 200 or responseCode >= 300
        m.top.errorMessage = "Login failed (HTTP " + responseCode.ToStr() + ")."
        return
    end if

    if payload = invalid or payload = ""
        m.top.errorMessage = "Login returned an empty response."
        return
    end if

    m.top.resultJson = payload
end sub
