sub init()
    m.top.functionName = "executeTask"
end sub

sub executeTask()
    transfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    transfer.SetPort(port)
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.EnableEncodings(true)
    transfer.AddHeader("Accept", "application/json")
    transfer.AddHeader("Content-Type", "application/json")

    body = {}
    if m.top.operation = "POLL"
        transfer.SetUrl(m.top.apiBase + "/api/auth/device/poll/?pollToken=" + m.top.pollToken)
        body.pollToken = m.top.pollToken
    else
        transfer.SetUrl(m.top.apiBase + "/api/auth/device/start/")
    end if
    transfer.SetRequest("POST")

    if not transfer.AsyncPostFromString(FormatJson(body))
        m.top.errorMessage = "Device sign-in request could not start."
        return
    end if

    event = wait(15000, port)
    if event = invalid
        transfer.AsyncCancel()
        m.top.errorMessage = "Device sign-in request timed out."
        return
    end if

    if type(event) <> "roUrlEvent"
        m.top.errorMessage = "Device sign-in returned an invalid response event."
        return
    end if

    responseCode = event.GetResponseCode()
    payload = event.GetString()
    if responseCode < 200 or responseCode >= 300
        detail = ""
        if payload <> invalid and payload <> ""
            errorPayload = ParseJson(payload)
            if errorPayload <> invalid and errorPayload.error <> invalid
                detail = ": " + errorPayload.error
            end if
        end if
        if responseCode = 410
            m.top.errorMessage = "This sign-in code has expired."
        else
            m.top.errorMessage = "Device sign-in returned HTTP " + responseCode.ToStr() + detail
        end if
        return
    end if

    if payload = invalid or payload = ""
        m.top.errorMessage = "Device sign-in returned an empty response."
        return
    end if

    parsed = ParseJson(payload)
    if parsed = invalid
        m.top.errorMessage = "Device sign-in returned an invalid response."
        return
    end if
    if parsed.error <> invalid and parsed.error <> ""
        m.top.errorMessage = parsed.error
        return
    end if

    m.top.resultJson = payload
end sub
