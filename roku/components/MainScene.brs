sub init()
    m.catalogGrid = m.top.findNode("catalogGrid")
    m.libraryInfo = m.top.findNode("libraryInfo")
    m.libraryEntrance = m.top.findNode("libraryEntrance")
    m.artworkMap = ParseJson(ReadAsciiFile("pkg:/images/card-map.json"))
    if m.artworkMap = invalid then m.artworkMap = {}
    m.catalogGrid.observeField("itemFocused", "onCatalogFocusChanged")
    m.catalogGrid.observeField("pageRequested", "onLibraryPageRequested")
    m.catalogGrid.observeField("visible", "onLibraryVisibilityChanged")
    m.catalogTask = m.top.findNode("catalogTask")
    m.catalogErrorView = m.top.findNode("catalogErrorView")
    m.top.findNode("catalogRetry").observeField("buttonSelected", "loadCatalogAndProgress")
    m.playbackTask = m.top.findNode("playbackTask")
    m.loginView = m.top.findNode("loginView")
    m.usernameInput = m.top.findNode("usernameInput")
    m.passwordInput = m.top.findNode("passwordInput")
    m.loginButton = m.top.findNode("loginButton")
    m.loginStatus = m.top.findNode("loginStatus")
    m.profileView = m.top.findNode("profileView")
    m.profileList = m.top.findNode("profileList")
    m.profileStatus = m.top.findNode("profileStatus")
    m.loginTask = m.top.findNode("loginTask")
    m.deviceLoginView = m.top.findNode("deviceLoginView")
    m.deviceQr = m.top.findNode("deviceQr")
    m.deviceCode = m.top.findNode("deviceCode")
    m.deviceUrl = m.top.findNode("deviceUrl")
    m.deviceStatus = m.top.findNode("deviceStatus")
    m.useRemoteLoginButton = m.top.findNode("useRemoteLoginButton")
    m.refreshDeviceButton = m.top.findNode("refreshDeviceButton")
    m.deviceTask = m.top.findNode("deviceTask")
    m.devicePollTimer = m.top.findNode("devicePollTimer")
    m.profileTask = m.top.findNode("profileTask")
    m.progressTask = m.top.findNode("progressTask")
    m.historyTask = m.top.findNode("historyTask")
    m.detailView = m.top.findNode("detailView")
    m.detailPoster = m.top.findNode("detailPoster")
    m.detailTitle = m.top.findNode("detailTitle")
    m.detailMeta = m.top.findNode("detailMeta")
    m.detailDescription = m.top.findNode("detailDescription")
    m.detailStatus = m.top.findNode("detailStatus")
    m.episodeList = m.top.findNode("episodeList")
    m.seasonButton = m.top.findNode("seasonButton")
    m.seasonButton.observeField("buttonSelected", "onSeasonSelected")
    m.episodeList.observeField("itemFocused", "onEpisodeFocused")
    m.detailPoster.observeField("loadStatus", "onDetailPosterStatus")
    m.seasonView = m.top.findNode("seasonView")
    m.seasonList = m.top.findNode("seasonList")
    m.seasonList.observeField("itemSelected", "onSeasonChoice")
    m.browseButton = m.top.findNode("browseButton")
    m.browseButton.observeField("buttonSelected", "onBrowseSelected")
    m.pageStart = 0
    m.posterMode = false
    m.browseDialog = invalid
    m.searchDialog = invalid
    m.seasonIndex = 0
    m.seasonDialog = invalid
    m.detailArtwork = ParseJson(ReadAsciiFile("pkg:/images/detail-map.json"))
    if m.detailArtwork = invalid then m.detailArtwork = {}
    m.moviePlayButton = m.top.findNode("moviePlayButton")
    m.top.findNode("detailContinue").observeField("buttonSelected", "onDetailContinue")
    m.allTitlesButton = m.top.findNode("allTitlesButton")
    m.continueButton = m.top.findNode("continueButton")
    m.video = m.top.findNode("video")
    m.playerOverlay = m.top.findNode("playerOverlay")
    m.playerOverlay.video = m.video
    m.playerOverlay.observeField("action", "onPlayerAction")
    m.progressQueue = []
    m.forceStart = false
    m.playbackTransition = false
    m.retryPosition = invalid
    m.status = m.top.findNode("status")
    m.view = "boot"
    m.catalogItems = []
    m.activeItems = []
    m.continueSelections = []
    m.gridMode = "all"
    m.episodeItems = []
    m.profiles = []
    m.progressByKey = {}
    m.selectedItem = invalid
    m.profileId = ""
    m.apiBase = ""
    m.authToken = ""
    m.catalogLoaded = false
    m.progressLoaded = false
    m.progressSyncBusy = false
    m.pendingFinalProgress = false
    m.lastProgressPosition = 0
    m.resumePosition = 0
    m.usernameValue = ""
    m.passwordValue = ""
    m.loginField = ""
    m.loginKeyboard = invalid
    m.devicePollToken = ""
    m.devicePollBusy = false
    m.playbackSubtitleUrls = []
    m.playbackBusy = false
    m.playbackRef = { mediaId: "", season: 0, episode: 0 }

    m.catalogTask.observeField("resultJson", "onCatalogLoaded")
    m.catalogTask.observeField("errorMessage", "onCatalogError")
    m.playbackTask.observeField("resultJson", "onPlaybackReady")
    m.playbackTask.observeField("errorMessage", "onPlaybackError")
    m.loginTask.observeField("resultJson", "onLoginReady")
    m.loginTask.observeField("errorMessage", "onLoginError")
    m.deviceTask.observeField("resultJson", "onDeviceLoginReady")
    m.deviceTask.observeField("errorMessage", "onDeviceLoginError")
    m.profileTask.observeField("resultJson", "onProfilesLoaded")
    m.profileTask.observeField("errorMessage", "onProfilesError")
    m.progressTask.observeField("resultJson", "onProgressResult")
    m.progressTask.observeField("errorMessage", "onProgressError")
    m.historyTask.observeField("errorMessage", "onHistoryError")
    m.catalogGrid.observeField("itemSelected", "onCatalogItemSelected")
    m.episodeList.observeField("itemSelected", "onEpisodeSelected")
    m.moviePlayButton.observeField("buttonSelected", "onMoviePlaySelected")
    m.allTitlesButton.observeField("buttonSelected", "onAllTitlesSelected")
    m.continueButton.observeField("buttonSelected", "onContinueSelected")
    m.usernameInput.observeField("buttonSelected", "onUsernameSelected")
    m.passwordInput.observeField("buttonSelected", "onPasswordSelected")
    m.loginButton.observeField("buttonSelected", "onLoginSelected")
    m.useRemoteLoginButton.observeField("buttonSelected", "onUseRemoteLoginSelected")
    m.refreshDeviceButton.observeField("buttonSelected", "onRefreshDeviceSelected")
    m.profileList.observeField("itemSelected", "onProfileSelected")
    m.video.observeField("position", "onVideoPositionChanged")
    m.video.observeField("state", "onVideoStateChanged")
    m.devicePollTimer.observeField("fire", "onDevicePollTimerFired")
    onLibraryVisibilityChanged()
    m.top.setFocus(true)
end sub

sub onConfigChanged()
    config = m.top.config
    if config = invalid
        return
    end if

    m.apiBase = config.apiBase
    m.authToken = config.authToken
    if m.authToken = ""
        startDeviceLogin("Scan the QR code with your phone to sign in.")
    else
        requestProfiles()
    end if
end sub

sub showLogin(message as String)
    m.devicePollTimer.control = "stop"
    m.deviceLoginView.visible = false
    m.view = "login"
    m.deviceLoginView.visible = false
    m.devicePollTimer.control = "stop"
    m.devicePollToken = ""
    m.devicePollBusy = false
    m.catalogGrid.visible = false
    m.libraryInfo.visible = false
    m.status.visible = false
    m.detailView.visible = false
    m.profileView.visible = false
    m.video.visible = false
    m.loginView.visible = true
    m.usernameInput.text = loginFieldText(m.usernameValue, "Username")
    m.passwordInput.text = loginFieldText(m.passwordValue, "Password")
    m.loginStatus.text = message
    m.usernameInput.setFocus(true)
end sub

sub startDeviceLogin(message as String)
    m.view = "deviceLogin"
    m.catalogGrid.visible = false
    m.libraryInfo.visible = false
    m.status.visible = false
    m.detailView.visible = false
    m.profileView.visible = false
    m.loginView.visible = false
    m.video.visible = false
    m.deviceLoginView.visible = true
    m.deviceCode.text = "Creating a sign-in code..."
    m.deviceUrl.text = ""
    m.deviceStatus.text = message
    m.deviceQr.uri = ""
    m.devicePollToken = ""
    m.devicePollBusy = false
    m.devicePollTimer.control = "stop"
    m.deviceTask.apiBase = m.apiBase
    m.deviceTask.operation = "START"
    m.deviceTask.pollToken = ""
    m.deviceTask.errorMessage = ""
    m.deviceTask.resultJson = ""
    m.deviceTask.control = "STOP"
    m.deviceTask.control = "RUN"
    m.refreshDeviceButton.setFocus(true)
end sub

sub onDeviceLoginReady()
    if m.view <> "deviceLogin" then return
    if m.deviceTask.resultJson = ""
        return
    end if
    payload = ParseJson(m.deviceTask.resultJson)
    if payload = invalid
        m.devicePollBusy = false
        m.deviceStatus.text = "The sign-in response was not valid. Select New QR code to try again."
        return
    end if

    if m.deviceTask.operation = "START"
        if payload.pollToken = invalid or payload.pollToken = ""
            m.deviceStatus.text = "A sign-in code could not be created. Select New QR code to try again."
            return
        end if
        m.devicePollToken = payload.pollToken
        if payload.deviceCode <> invalid
            m.deviceCode.text = "Code: " + payload.deviceCode
        end if
        if payload.verificationUrl <> invalid
            m.deviceUrl.text = payload.verificationUrl
        end if
        if payload.qrUrl <> invalid
            m.deviceQr.uri = payload.qrUrl
        end if
        m.deviceStatus.text = "On your phone: sign in, then select Approve. Waiting for approval..."
        m.devicePollBusy = false
        m.devicePollTimer.control = "start"
        return
    end if

    if payload.status = "pending"
        m.devicePollBusy = false
        m.deviceStatus.text = "On your phone: sign in, then select Approve. Waiting for approval..."
        return
    end if

    if payload.token = invalid or payload.token = ""
        m.devicePollBusy = false
        m.deviceStatus.text = "Approval was incomplete. Select New QR code to try again."
        return
    end if

    m.devicePollTimer.control = "stop"
    m.devicePollBusy = false
    m.devicePollToken = ""
    m.authToken = payload.token
    m.deviceStatus.text = "Connected. Loading profiles..."
    requestProfiles()
end sub

sub onDeviceLoginError()
    if m.deviceTask.errorMessage = "" then return
    if m.view <> "deviceLogin" then return
    m.devicePollBusy = false
    pollError = m.deviceTask.errorMessage
    transientError = instr(1, pollError, "timed out") > 0 or instr(1, pollError, "could not start") > 0 or instr(1, pollError, "HTTP 5") > 0
    isTransientPollError = m.deviceTask.operation = "POLL" and transientError
    if isTransientPollError
        m.deviceStatus.text = "Connection interrupted. Retrying approval check..."
    else
        m.devicePollTimer.control = "stop"
        m.deviceStatus.text = m.deviceTask.errorMessage
    end if
end sub

sub onDevicePollTimerFired()
    if m.view <> "deviceLogin" or m.devicePollToken = "" or m.devicePollBusy
        return
    end if

    m.devicePollBusy = true
    m.deviceTask.apiBase = m.apiBase
    m.deviceTask.operation = "POLL"
    m.deviceTask.pollToken = m.devicePollToken
    m.deviceTask.errorMessage = ""
    m.deviceTask.resultJson = ""
    ' Force a new Task run after the previous asynchronous request completes.
    m.deviceTask.control = "STOP"
    m.deviceTask.control = "RUN"
end sub

sub onUseRemoteLoginSelected()
    if m.view = "deviceLogin"
        showLogin("Use the Roku remote to sign in to CWorld.")
    end if
end sub

sub onRefreshDeviceSelected()
    if m.view = "deviceLogin"
        startDeviceLogin("Creating a new sign-in code...")
    end if
end sub

function loginFieldText(value as String, placeholder as String) as String
    if value = ""
        return placeholder
    end if
    return value
end function

sub onUsernameSelected()
    if m.view = "login"
        openLoginKeyboard("username")
    end if
end sub

sub onPasswordSelected()
    if m.view = "login"
        openLoginKeyboard("password")
    end if
end sub

sub openLoginKeyboard(field as String)
    m.loginField = field
    m.loginKeyboard = CreateObject("roSGNode", "KeyboardDialog")
    if field = "password"
        m.loginKeyboard.title = "Enter your password"
        m.loginKeyboard.text = m.passwordValue
        m.loginKeyboard.keyboard.textEditBox.secureMode = true
    else
        m.loginKeyboard.title = "Enter your username"
        m.loginKeyboard.text = m.usernameValue
        m.loginKeyboard.keyboard.textEditBox.secureMode = false
    end if
    m.loginKeyboard.buttons = ["OK", "Cancel"]
    m.loginKeyboard.observeField("buttonSelected", "onLoginKeyboardSelected")
    m.top.dialog = m.loginKeyboard
end sub

sub onLoginKeyboardSelected()
    if m.loginKeyboard = invalid
        return
    end if

    if m.loginKeyboard.buttonSelected = 0
        if m.loginField = "password"
            m.passwordValue = m.loginKeyboard.text
            m.passwordInput.text = loginFieldText(m.passwordValue, "Password")
            m.loginButton.setFocus(true)
        else
            m.usernameValue = m.loginKeyboard.text
            m.usernameInput.text = loginFieldText(m.usernameValue, "Username")
            m.passwordInput.setFocus(true)
        end if
    else
        if m.loginField = "password"
            m.passwordInput.setFocus(true)
        else
            m.usernameInput.setFocus(true)
        end if
    end if

    m.top.dialog = invalid
    m.loginKeyboard = invalid
    m.loginField = ""
end sub

sub onLoginSelected()
    if m.view <> "login"
        return
    end if

    if m.usernameValue = "" or m.passwordValue = ""
        m.loginStatus.text = "Enter a username and password."
        if m.usernameValue = ""
            m.usernameInput.setFocus(true)
        else
            m.passwordInput.setFocus(true)
        end if
        return
    end if

    m.loginStatus.text = "Signing in..."
    m.loginTask.apiBase = m.apiBase
    m.loginTask.username = m.usernameValue
    m.loginTask.password = m.passwordValue
    m.loginTask.errorMessage = ""
    m.loginTask.resultJson = ""
    m.loginTask.control = "RUN"
end sub

sub onLoginReady()
    payload = ParseJson(m.loginTask.resultJson)
    if payload = invalid
        m.loginStatus.text = "Login response was not valid."
        return
    end if
    if payload.token = invalid or payload.token = ""
        m.loginStatus.text = "Login response was not valid."
        return
    end if

    m.authToken = payload.token
    m.passwordValue = ""
    m.passwordInput.text = "Password"
    requestProfiles()
end sub

sub onLoginError()
    if m.loginTask.errorMessage <> ""
        m.loginStatus.text = m.loginTask.errorMessage
    end if
end sub

sub requestProfiles()
    m.devicePollTimer.control = "stop"
    m.devicePollBusy = false
    m.deviceLoginView.visible = false
    m.view = "profiles"
    m.loginView.visible = false
    m.profileView.visible = true
    m.catalogGrid.visible = false
    m.libraryInfo.visible = false
    m.status.visible = false
    m.detailView.visible = false
    m.profileStatus.text = "Loading profiles..."
    m.profileTask.apiBase = m.apiBase
    m.profileTask.authToken = m.authToken
    m.profileTask.errorMessage = ""
    m.profileTask.resultJson = ""
    m.profileTask.control = "RUN"
end sub

sub onProfilesLoaded()
    if m.profileTask.resultJson = "" then return
    payload = ParseJson(m.profileTask.resultJson)
    if payload = invalid
        m.profileStatus.text = "Profiles response was not valid."
        return
    end if
    if payload.Count() = 0
        m.profileStatus.text = "No CWorld profiles were found."
        return
    end if

    m.profiles = payload
    content = CreateObject("roSGNode", "ContentNode")
    for each profile in m.profiles
        row = content.CreateChild("ContentNode")
        row.title = profile.name
    end for
    m.profileList.content = content
    m.profileStatus.text = "Select a profile"
    m.profileList.setFocus(true)
end sub

sub onProfilesError()
    if m.profileTask.errorMessage <> ""
        showLogin("Your CWorld session expired. Please sign in again.")
        m.loginStatus.text = m.profileTask.errorMessage
    end if
end sub

sub onProfileSelected()
    if m.view <> "profiles"
        return
    end if

    index = m.profileList.itemSelected
    if index < 0 or index >= m.profiles.Count()
        return
    end if

    m.profileId = m.profiles[index].id.ToStr()
    m.top.findNode("profileName").text = m.profiles[index].name
    if m.profiles[index].avatar_url <> invalid then m.top.findNode("profileAvatar").uri = m.profiles[index].avatar_url
    loadCatalogAndProgress()
end sub

sub loadCatalogAndProgress()
    m.catalogErrorView.visible = false
    m.view = "loading"
    m.profileView.visible = false
    m.catalogGrid.visible = false
    m.libraryInfo.visible = false
    m.status.visible = true
    m.status.text = "Loading your CWorld library..."
    m.catalogLoaded = false
    m.progressLoaded = false
    m.progressByKey = {}

    m.catalogTask.apiBase = m.apiBase
    m.catalogTask.authToken = m.authToken
    m.catalogTask.errorMessage = ""
    m.catalogTask.resultJson = ""
    m.catalogTask.control = "RUN"

    m.progressSyncBusy = true
    m.progressTask.apiBase = m.apiBase
    m.progressTask.authToken = m.authToken
    m.progressTask.profileId = m.profileId
    m.progressTask.method = "GET"
    m.progressTask.bodyJson = ""
    m.progressTask.errorMessage = ""
    m.progressTask.resultJson = ""
    m.progressOperation = "GET"
    m.progressTask.control = "RUN"
end sub

sub onCatalogLoaded()
    raw = m.catalogTask.resultJson
    ' alwaysNotify also fires when the request resets its output field.
    if raw = "" then return
    payload = ParseJson(raw)
    validItems = false
    if type(payload) = "roArray"
        m.catalogItems = payload
        validItems = true
    else if type(payload) = "roAssociativeArray"
        if type(payload.items) = "roArray"
            m.catalogItems = payload.items
            validItems = true
        end if
    end if
    if not validItems
        print "[Roku catalog] Invalid response; bytes="; Len(raw)
        showCatalogFailure("The server returned an unexpected catalog format. Please try again.")
        return
    end if
    print "[Roku catalog] Loaded titles="; m.catalogItems.Count()
    m.catalogLoaded = true
    maybeShowCatalog()
end sub

sub showCatalogFailure(message as String)
    m.catalogLoaded = false
    m.view = "catalogError"
    m.status.text = "Library unavailable"
    m.catalogErrorView.visible = true
    m.top.findNode("catalogErrorText").text = message
    m.top.findNode("catalogRetry").setFocus(true)
end sub

sub onCatalogError()
    if m.catalogTask.errorMessage = "" then return
    print "[Roku catalog] "; m.catalogTask.errorMessage
    showCatalogFailure(m.catalogTask.errorMessage)
end sub

sub onProgressResult()
    if m.progressTask.resultJson = "" then return
    m.progressSyncBusy = false
    if m.progressOperation = "GET"
        payload = ParseJson(m.progressTask.resultJson)
        if type(payload) = "roArray"
            for each item in payload
                key = progressKey(item.show_id, item.season, item.episode)
                m.progressByKey[key] = item
            end for
        end if
        m.progressLoaded = true
        refreshProgressPresentation()
        return
    end if

    if m.sentProgress <> invalid
        body = m.sentProgress
        key = progressKey(body.show_id, body.season, body.episode)
        now = CreateObject("roDateTime")
        body.updated_at = now.ToISOString()
        m.progressByKey[key] = body
    end if
    flushProgressQueue()
end sub

sub onProgressError()
    if m.progressTask.errorMessage = "" then return
    m.progressSyncBusy = false
    if m.progressOperation = "GET"
        m.progressLoaded = true
        refreshProgressPresentation()
        return
    end if

    flushProgressQueue()
end sub

sub onHistoryError()
    if m.historyTask.errorMessage <> "" and m.view = "detail"
        m.detailStatus.text = "Playback started, but watch history could not sync."
    end if
end sub

sub maybeShowCatalog()
    if not m.catalogLoaded or m.view <> "loading"
        return
    end if

    m.view = "catalog"
    m.status.visible = true
    m.loginView.visible = false
    m.profileView.visible = false
    m.catalogGrid.visible = true
    m.libraryInfo.visible = true
    buildContinueSelections()
    showAllTitles()
    m.allTitlesButton.setFocus(true)
end sub

sub onAllTitlesSelected()
    if m.view = "catalog"
        showAllTitles()
        m.catalogGrid.setFocus(true)
    end if
end sub

sub onContinueSelected()
    if m.view = "catalog"
        showContinueWatching()
        m.catalogGrid.setFocus(true)
    end if
end sub

sub showAllTitles()
    m.gridMode = "all"
    m.activeItems = m.catalogItems
    m.status.text = m.catalogItems.Count().ToStr() + " titles"
    if not m.progressLoaded then m.status.text = m.status.text + " · Syncing progress..."
    setCatalogGridContent(m.catalogItems, invalid)
end sub

sub showContinueWatching()
    m.gridMode = "continue"
    if m.continueSelections.Count() = 0
        m.activeItems = []
        m.status.text = "No saved progress for this profile"
        if not m.progressLoaded then m.status.text = "Loading Continue Watching..."
        setCatalogGridContent([], invalid)
        return
    end if

    m.activeItems = []
    for each selection in m.continueSelections
        m.activeItems.Push(selection.item)
    end for
    m.status.text = "Continue Watching"
    setCatalogGridContent(m.activeItems, m.continueSelections)
end sub

sub setCatalogGridContent(items as Object, selections as Object)
    content = CreateObject("roSGNode", "ContentNode")
    for index = 0 to items.Count() - 1
        item = items[index]
        tile = content.CreateChild("ContentNode")
        tile.id = item.id
        tile.addFields({posterMode: m.posterMode})
        if selections <> invalid
            tile.title = selections[index].label
        else
            tile.title = item.title
        end if
        if item.artwork <> invalid
            tile.HDPosterUrl = item.artwork.poster
            if m.artworkMap[item.id] <> invalid then tile.HDPosterUrl = m.artworkMap[item.id]
            if m.posterMode and instr(1, item.artwork.poster, ".svg") = 0 then tile.HDPosterUrl = item.artwork.poster
        end if
    end for
    m.gridContent = content
    m.pageStart = 0
    renderLibraryPage()
    m.catalogGrid.jumpToItem = 0
    onCatalogFocusChanged()
    m.libraryEntrance.control = "stop"
    m.libraryEntrance.control = "start"
end sub

sub onCatalogFocusChanged()
    index = m.pageStart + m.catalogGrid.itemFocused
    if index < 0 then index = 0
    if index >= m.activeItems.Count()
        m.top.findNode("focusedTitle").text = "Nothing here yet"
        m.top.findNode("focusedMeta").text = ""
        m.top.findNode("focusedDescription").text = ""
        m.top.findNode("libraryPosition").text = "No matching titles"
        for i = 0 to 5
            m.top.findNode("sideTitle" + i.ToStr()).text = ""
        end for
        return
    end if
    item = m.activeItems[index]
    m.top.findNode("focusedTitle").text = item.title
    m.top.findNode("focusedMeta").text = buildMetaText(item)
    m.top.findNode("focusedDescription").text = item.description
    updatePageLabels()
    for i = 0 to 5
        label = m.top.findNode("sideTitle" + i.ToStr())
        itemIndex = m.pageStart + i
        label.text = ""
        if itemIndex < m.activeItems.Count()
            label.text = m.activeItems[itemIndex].title
            if m.activeItems[itemIndex].id = "fmab" then label.text = "Fullmetal Alchemist"
        end if
        label.color = "0x808080FF"
        if itemIndex = index then label.color = "0xFFFFFFFF"
    end for
end sub

sub buildContinueSelections()
    candidates = []
    for each item in m.catalogItems
        best = invalid
        for each key in m.progressByKey
            progress = m.progressByKey[key]
            if progress.show_id = item.id and hasResumableProgress(progress)
                stamp = ""
                if progress.updated_at <> invalid then stamp = progress.updated_at
                seasonNumber = 0
                episodeNumber = 0
                validEpisode = item.type = "movie"
                if item.type <> "movie"
                    if progress.season <> invalid and progress.episode <> invalid
                        seasonNumber = progress.season
                        episodeNumber = progress.episode
                        for each season in item.seasons
                            if season.number = seasonNumber
                                for each ep in season.episodes
                                    if ep.number = episodeNumber then validEpisode = true
                                end for
                            end if
                        end for
                    end if
                end if
                if validEpisode
                    candidate = {item:item, season:seasonNumber, episode:episodeNumber, label:item.title, stamp:stamp}
                    if best = invalid
                        best = candidate
                    else if stamp > best.stamp
                        best = candidate
                    end if
                end if
            end if
        end for
        if best <> invalid then candidates.Push(best)
    end for
    m.continueSelections = []
    while candidates.Count() > 0 and m.continueSelections.Count() < 10
        newest = 0
        for i = 1 to candidates.Count() - 1
            if candidates[i].stamp > candidates[newest].stamp then newest = i
        end for
        m.continueSelections.Push(candidates[newest])
        candidates.Delete(newest)
    end while
    for i = 0 to 2
        thumb = m.top.findNode("recentThumb" + i.ToStr())
        thumb.visible = i < m.continueSelections.Count()
        if i < m.continueSelections.Count()
            selection = m.continueSelections[i]
            thumb.uri = placeholderUrl(selection.item, selection.season, selection.episode)
        end if
    end for
end sub

function hasResumableProgress(progress as Object) as Boolean
    currentTime = CDbl(progress.current_time)
    duration = CDbl(progress.duration)
    if currentTime < 5
        return false
    end if
    return duration = 0 or currentTime < duration - 10
end function

sub onCatalogItemSelected()
    if m.view = "catalog"
        if m.gridMode = "continue"
            startContinueSelection()
        else
            openSelectedTitle()
        end if
    end if
end sub

sub startContinueSelection()
    index = m.pageStart + m.catalogGrid.itemSelected
    if index < 0 or index >= m.continueSelections.Count()
        return
    end if

    selection = m.continueSelections[index]
    m.selectedItem = selection.item
    showSelectedDetail()
    if m.selectedItem.type <> "movie"
        for i = 0 to m.selectedItem.seasons.Count() - 1
            if m.selectedItem.seasons[i].number = selection.season then m.seasonIndex = i
        end for
        populateEpisodes(m.selectedItem)
    end if
    requestSelectedPlayback(selection.season, selection.episode)
end sub

sub onEpisodeSelected()
    if m.view <> "detail" or m.selectedItem = invalid
        return
    end if

    index = m.episodeList.itemSelected
    if index >= 0 and index < m.episodeItems.Count()
        episode = m.episodeItems[index]
        requestSelectedPlayback(episode.playbackRef.season, episode.playbackRef.episode)
    end if
end sub

sub onMoviePlaySelected()
    if m.view = "detail" and m.selectedItem <> invalid
        if m.selectedItem.type = "movie"
            requestSelectedPlayback(0, 0)
        else
            index = m.episodeList.itemFocused
            if index < 0 then index = 0
            if index < m.episodeItems.Count()
                ep = m.episodeItems[index]
                requestSelectedPlayback(ep.playbackRef.season, ep.number)
            end if
        end if
    end if
end sub

sub openSelectedTitle()
    index = m.pageStart + m.catalogGrid.itemSelected
    if index < 0 or index >= m.activeItems.Count()
        return
    end if

    m.selectedItem = m.activeItems[index]
    showSelectedDetail()
end sub

sub showSelectedDetail()
    m.view = "detail"
    m.catalogGrid.visible = false
    m.libraryInfo.visible = false
    m.status.visible = false
    m.detailView.visible = true
    m.detailStatus.text = ""
    m.seasonIndex = 0
    m.top.findNode("detailBackdrop").uri = detailCover(m.selectedItem)
    m.detailPoster.uri = detailCover(m.selectedItem)
    m.top.findNode("previewTitle").text = m.selectedItem.title
    m.top.findNode("previewMeta").text = "Select an episode"
    m.top.findNode("previewProgress").width = 0
    m.top.findNode("detailEntrance").control = "stop"
    m.top.findNode("detailEntrance").control = "start"
    m.detailTitle.text = m.selectedItem.title
    m.detailDescription.text = m.selectedItem.description
    m.detailMeta.text = buildMetaText(m.selectedItem)
    m.top.findNode("statRuntime").text = m.selectedItem.metadata.duration
    m.top.findNode("statResume").text = "Start"

    m.seasonButton.visible = m.selectedItem.type <> "movie"
    if m.selectedItem.type = "movie"
        m.detailPoster.uri = placeholderUrl(m.selectedItem, 0, 0)
        m.top.findNode("previewMeta").text = progressLabel(m.selectedItem.id, 0, 0, m.selectedItem.metadata.duration)
        m.top.findNode("previewProgress").width = 328 * progressFraction(m.selectedItem.id, 0, 0)
        m.moviePlayButton.text = "Play"
        if resumePositionFor(m.selectedItem.id, 0, 0) > 0 then m.moviePlayButton.text = "Resume"
        m.episodeList.visible = false
        m.moviePlayButton.visible = true
        m.moviePlayButton.setFocus(true)
    else
        m.moviePlayButton.visible = true
        m.moviePlayButton.text = "▶ Play"
        m.episodeList.visible = true
        populateEpisodes(m.selectedItem)
        m.episodeList.setFocus(true)
    end if
end sub

function buildMetaText(item as Object) as String
    meta = item.metadata
    if meta = invalid
        return item.type
    end if

    parts = []
    if meta.year <> ""
        parts.Push(meta.year)
    end if
    if meta.rating <> ""
        parts.Push("Rating " + meta.rating)
    end if
    if meta.duration <> ""
        parts.Push(meta.duration)
    end if
    if parts.Count() = 0
        parts.Push(item.type)
    end if
    return parts.Join("  |  ")
end function

function progressKey(mediaId as String, season, episode) as String
    seasonPart = "0"
    episodePart = "0"
    if season <> invalid
        seasonPart = season.ToStr()
    end if
    if episode <> invalid
        episodePart = episode.ToStr()
    end if
    return mediaId + ":" + seasonPart + ":" + episodePart
end function

function currentVideoPosition() as Float
    if m.video.position = invalid
        return 0
    end if
    return CDbl(m.video.position)
end function

function currentVideoDuration() as Float
    if m.video.duration = invalid
        return 0
    end if
    return CDbl(m.video.duration)
end function

function resumePositionFor(mediaId as String, season as Integer, episode as Integer) as Float
    key = progressKey(mediaId, season, episode)
    if not m.progressByKey.DoesExist(key)
        return 0
    end if

    item = m.progressByKey[key]
    currentTime = CDbl(item.current_time)
    duration = CDbl(item.duration)
    if currentTime < 5
        return 0
    end if
    if duration > 0 and currentTime >= duration - 10
        return 0
    end if
    return currentTime
end function

sub populateEpisodes(item as Object)
    m.episodeItems = []
    content = CreateObject("roSGNode", "ContentNode")
    if item.seasons.Count() = 0
        m.seasonButton.text = "No episodes yet"
        m.episodeList.content = content
        m.seasonButton.setFocus(true)
        return
    end if
    season = item.seasons[m.seasonIndex]
    m.seasonButton.text = "Season " + season.number.ToStr() + "  ▾"
    for each episode in season.episodes
        m.episodeItems.Push(episode)
        row = content.CreateChild("ContentNode")
        row.addFields({fallbackUrl: detailCover(item), progressFraction: progressFraction(item.id, season.number, episode.number)})
        row.addFields({episodeCode: "S" + paddedNumber(season.number) + "E" + paddedNumber(episode.number)})
        row.title = episode.title
        row.description = progressLabel(item.id, season.number, episode.number, episode.duration)
        row.HDPosterUrl = placeholderUrl(item, season.number, episode.number)
    end for
    m.episodeList.content = content
    m.episodeList.jumpToItem = 0
    m.detailStatus.text = season.episodes.Count().ToStr() + " episodes · OK to play · Up to change season"
end sub

function detailCover(item as Object) as String
    if m.detailArtwork[item.id] <> invalid then return m.detailArtwork[item.id]
    if m.artworkMap[item.id] <> invalid then return m.artworkMap[item.id]
    return item.artwork.poster
end function

function placeholderUrl(item as Object, season as Integer, episode as Integer) as String
    asset = item.assetId
    if asset = invalid or asset = "" then asset = item.id.Replace("-", "")
    if season > 0
        return "https://d20honz3pkzrs8.cloudfront.net/" + asset + "/placeholders/season" + season.ToStr() + "/S" + season.ToStr() + "E" + episode.ToStr() + "_" + asset + "_placeholder.png"
    end if
    url = "https://cearaworld.com/images/" + asset + "/placeholders/" + asset + "_placeholder.png"
    if asset = "thegrey" then url = url + "?v=53e47519f8c3"
    return url
end function

function progressFraction(id as String, season as Integer, episode as Integer) as Float
    key = progressKey(id, season, episode)
    if not m.progressByKey.DoesExist(key) then return 0
    p = m.progressByKey[key]
    if p.duration = invalid or p.current_time = invalid then return 0
    if p.duration <= 0 then return 0
    value = p.current_time / p.duration
    if value > 1 then return 1
    if value < 0 then return 0
    return value
end function

function progressLabel(id as String, season as Integer, episode as Integer, duration as Dynamic) as String
    label = "Unwatched"
    fraction = progressFraction(id, season, episode)
    if fraction >= 0.95
        label = "Watched"
    else if fraction > 0
        label = "In progress"
    end if
    if duration <> invalid and duration <> "" then label = label + " · " + duration
    return label
end function

sub onEpisodeFocused()
    index = m.episodeList.itemFocused
    if m.selectedItem = invalid or index < 0 or index >= m.episodeItems.Count() then return
    ep = m.episodeItems[index]
    season = ep.playbackRef.season
    m.detailPoster.uri = placeholderUrl(m.selectedItem, season, ep.number)
    m.top.findNode("previewTitle").text = "S" + season.ToStr() + "E" + ep.number.ToStr() + " · " + ep.title
    m.top.findNode("previewMeta").text = progressLabel(m.selectedItem.id, season, ep.number, ep.duration)
    m.top.findNode("previewProgress").width = 328 * progressFraction(m.selectedItem.id, season, ep.number)
    m.detailTitle.text = ep.title
    m.top.findNode("statRuntime").text = ep.duration
    m.top.findNode("statResume").text = "Start"
    f = progressFraction(m.selectedItem.id, season, ep.number)
    if f > 0 then m.top.findNode("statResume").text = Int(f * 100).ToStr() + "%"
    m.detailDescription.text = ep.description
    if ep.description = "" then m.detailDescription.text = m.selectedItem.description
end sub

sub onDetailPosterStatus()
    if m.detailPoster.loadStatus = "failed" and m.selectedItem <> invalid
        fallback = detailCover(m.selectedItem)
        if m.detailPoster.uri <> fallback then m.detailPoster.uri = fallback
    end if
end sub

sub onSeasonSelected()
    if m.selectedItem = invalid or m.selectedItem.seasons.Count() = 0 then return
    content = CreateObject("roSGNode", "ContentNode")
    for each season in m.selectedItem.seasons
        row = content.CreateChild("ContentNode")
        row.title = "Season " + season.number.ToStr() + " · " + season.episodes.Count().ToStr() + " episodes"
    end for
    m.seasonList.content = content
    m.seasonList.jumpToItem = m.seasonIndex
    m.seasonView.visible = true
    m.seasonList.setFocus(true)
end sub

sub onSeasonChoice()
    if not m.seasonView.visible or m.selectedItem = invalid then return
    index = m.seasonList.itemSelected
    if index < 0 or index >= m.selectedItem.seasons.Count() then return
    m.seasonIndex = index
    m.seasonView.visible = false
    populateEpisodes(m.selectedItem)
    if m.episodeItems.Count() > 0
        m.episodeList.setFocus(true)
        onEpisodeFocused()
    else
        m.seasonButton.setFocus(true)
    end if
end sub

sub requestSelectedPlayback(season as Integer, episode as Integer)
    if m.playbackBusy then return
    if not m.progressLoaded
        m.detailStatus.text = "Resume position is still syncing. Please select Play again shortly."
        return
    end if
    if m.authToken = ""
        m.detailStatus.text = "Sign in before starting playback."
        return
    end if

    m.playbackBusy = true
    m.playbackTransition = true
    m.detailStatus.text = "Preparing playback..."
    m.playbackRef = {
        mediaId: m.selectedItem.id,
        season: season,
        episode: episode
    }
    m.resumePosition = resumePositionFor(m.selectedItem.id, season, episode)
    if m.forceStart then m.resumePosition = 0
    if m.retryPosition <> invalid then m.resumePosition = m.retryPosition
    m.forceStart = false
    m.retryPosition = invalid
    m.playbackSubtitleUrls = []
    if m.selectedItem.type = "movie"
        if m.selectedItem.rokuSubtitleTracks <> invalid
            m.playbackSubtitleUrls = m.selectedItem.rokuSubtitleTracks
        else if m.selectedItem.subtitleTracks <> invalid
            m.playbackSubtitleUrls = m.selectedItem.subtitleTracks
        end if
    else
        for each showSeason in m.selectedItem.seasons
            if showSeason.number = season
                for each showEpisode in showSeason.episodes
                    if showEpisode.number = episode
                        if showEpisode.rokuSubtitles <> invalid
                            m.playbackSubtitleUrls = showEpisode.rokuSubtitles
                        else
                            m.playbackSubtitleUrls = showEpisode.subtitles
                        end if
                    end if
                end for
            end if
        end for
    end if
    m.playbackTask.apiBase = m.apiBase
    m.playbackTask.authToken = m.authToken
    m.playbackTask.mediaId = m.selectedItem.id
    m.playbackTask.season = season
    m.playbackTask.episode = episode
    m.playbackTask.errorMessage = ""
    m.playbackTask.resultJson = ""
    m.playbackTask.control = "RUN"
end sub

sub onPlaybackReady()
    if m.playbackTask.resultJson = "" or not m.playbackBusy then return
    m.playbackBusy = false
    payload = ParseJson(m.playbackTask.resultJson)
    if payload = invalid
        onPlaybackError()
        return
    end if
    if payload.url = invalid or payload.url = ""
        onPlaybackError()
        return
    end if

    mediaContent = CreateObject("roSGNode", "ContentNode")
    mediaContent.url = payload.url
    mediaContent.streamFormat = "mp4"
    if payload.playbackType = "hls"
        mediaContent.streamFormat = "hls"
    end if
    mediaContent.title = m.selectedItem.title
    mediaContent.VideoDisableUI = true
    mediaContent.PlayStart = m.resumePosition
    if m.playbackSubtitleUrls.Count() > 0
        subtitleTracks = []
        for each subtitleUrl in m.playbackSubtitleUrls
            subtitleTracks.Push({
                "Language": "eng",
                "Description": "English",
                "TrackName": subtitleUrl
            })
        end for
        mediaContent.SubtitleTracks = subtitleTracks
    end if
    m.video.content = mediaContent
    m.lastProgressPosition = m.resumePosition
    m.detailView.visible = false
    m.video.visible = true
    m.view = "video"
    m.playerOverlay.playbackInfo = playerInfo()
    m.playerOverlay.active = true
    m.playerOverlay.setFocus(true)
    m.video.control = "play"
    requestHistoryUpdate()
end sub

sub onPlaybackError()
    if m.playbackTask.errorMessage <> ""
        m.playbackBusy = false
        if m.view = "video"
            m.playerOverlay.failure = m.playbackTask.errorMessage
        else if m.gridMode = "continue" and m.view = "catalog"
            m.status.text = m.playbackTask.errorMessage
        else
            m.detailStatus.text = m.playbackTask.errorMessage
        end if
    end if
end sub

sub onVideoPositionChanged()
    if m.view <> "video" or m.progressSyncBusy or m.playbackTransition
        return
    end if

    if Abs(currentVideoPosition() - m.lastProgressPosition) < 10
        return
    end if

    requestProgressPost()
end sub

sub requestProgressPost()
    if m.profileId = "" or m.playbackRef.mediaId = "" or currentVideoDuration() <= 0 then return
    body = {
        show_id: m.playbackRef.mediaId,
        season: m.playbackRef.season,
        episode: m.playbackRef.episode,
        current_time: currentVideoPosition(),
        duration: currentVideoDuration()
    }
    ep = adjacentEpisode(0)
    if ep <> invalid
        if ep.skipOutroStart <> invalid
            if ep.skipOutroStart > 0 and ep.skipOutroStart < body.duration and body.current_time >= ep.skipOutroStart then body.current_time = body.duration
        end if
    end if
    m.progressQueue.Push(body)
    m.lastProgressPosition = currentVideoPosition()
    flushProgressQueue()
end sub

sub flushProgressQueue()
    if m.progressSyncBusy or m.progressQueue.Count() = 0 then return
    m.sentProgress = m.progressQueue.Shift()
    m.progressSyncBusy = true
    m.progressOperation = "POST"
    m.progressTask.apiBase = m.apiBase
    m.progressTask.authToken = m.authToken
    m.progressTask.profileId = m.profileId
    m.progressTask.method = "POST"
    m.progressTask.bodyJson = FormatJson(m.sentProgress)
    m.progressTask.errorMessage = ""
    m.progressTask.resultJson = ""
    m.progressTask.control = "RUN"
end sub

sub saveCurrentProgress()
    if m.view = "video" and not m.playbackTransition then requestProgressPost()
end sub

sub requestHistoryUpdate()
    if m.profileId = "" or m.playbackRef.mediaId = ""
        return
    end if

    m.historyTask.apiBase = m.apiBase
    m.historyTask.authToken = m.authToken
    m.historyTask.profileId = m.profileId
    m.historyTask.bodyJson = FormatJson({
        show_id: m.playbackRef.mediaId,
        season: m.playbackRef.season,
        episode: m.playbackRef.episode
    })
    m.historyTask.errorMessage = ""
    m.historyTask.control = "RUN"
end sub

sub returnToDetail()
    saveCurrentProgress()
    m.playerOverlay.active = false
    if m.playbackBusy
        m.playbackTask.control = "STOP"
        m.playbackBusy = false
    end if
    m.video.control = "stop"
    m.video.visible = false
    m.detailView.visible = true
    m.view = "detail"
    if m.selectedItem.type = "movie"
        m.moviePlayButton.setFocus(true)
    else
        m.episodeList.setFocus(true)
    end if
end sub

sub onVideoStateChanged()
    if m.view <> "video" then return
    if m.video.state = "playing"
        m.playbackTransition = false
    else if m.video.state = "finished"
        saveCurrentProgress()
        m.playerOverlay.callFunc("playbackEnded")
    else if m.video.state = "error"
        m.playerOverlay.failure = "Playback failed (" + m.video.errorCode.ToStr() + "). " + m.video.errorMsg
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press
        return false
    end if

    ' Roku hardware reports OK; RokuLab reports the equivalent button as select.
    if key = "select" or key = "enter"
        key = "OK"
    end if

    if m.top.dialog <> invalid then return false
    if m.seasonView.visible
        if key = "back"
            m.seasonView.visible = false
            m.seasonButton.setFocus(true)
            return true
        end if
        return false
    end if
    if m.view = "detail"
        if key = "up" and m.episodeList.hasFocus()
            m.seasonButton.setFocus(true)
            return true
        else if key = "down" and m.seasonButton.hasFocus()
            m.episodeList.setFocus(true)
            return true
        else if key = "up" and m.seasonButton.hasFocus()
            m.moviePlayButton.setFocus(true)
            return true
        else if key = "right" and m.moviePlayButton.hasFocus()
            m.top.findNode("detailContinue").setFocus(true)
            return true
        else if key = "left" and m.top.findNode("detailContinue").hasFocus()
            m.moviePlayButton.setFocus(true)
            return true
        else if key = "down" and (m.moviePlayButton.hasFocus() or m.top.findNode("detailContinue").hasFocus()) and m.seasonButton.visible
            m.seasonButton.setFocus(true)
            return true
        end if
    end if

    if m.view = "catalogError" and key = "OK"
        loadCatalogAndProgress()
        return true
    end if

    if m.view = "deviceLogin"
        if key = "left" and m.refreshDeviceButton.hasFocus()
            m.useRemoteLoginButton.setFocus(true)
            return true
        else if key = "right" and m.useRemoteLoginButton.hasFocus()
            m.refreshDeviceButton.setFocus(true)
            return true
        else if key = "OK"
            if m.useRemoteLoginButton.hasFocus()
                onUseRemoteLoginSelected()
                return true
            else if m.refreshDeviceButton.hasFocus()
                onRefreshDeviceSelected()
                return true
            end if
        else if key = "back"
            onUseRemoteLoginSelected()
            return true
        end if
    else if m.view = "login"
        if key = "up"
            if m.passwordInput.hasFocus()
                m.usernameInput.setFocus(true)
                return true
            end if
        else if key = "down"
            if m.usernameInput.hasFocus()
                m.passwordInput.setFocus(true)
                return true
            else if m.passwordInput.hasFocus()
                m.loginButton.setFocus(true)
                return true
            end if
        else if key = "OK"
            if m.usernameInput.hasFocus()
                openLoginKeyboard("username")
                return true
            else if m.passwordInput.hasFocus()
                openLoginKeyboard("password")
                return true
            else if m.loginButton.hasFocus()
                onLoginSelected()
                return true
            end if
        end if
    else if m.view = "catalog"
        if m.catalogGrid.hasFocus()
            localIndex = m.catalogGrid.itemFocused
            if key = "right" and (localIndex = 2 or localIndex = 5)
                changeLibraryPage(1)
                return true
            else if key = "left" and (localIndex = 0 or localIndex = 3)
                changeLibraryPage(-1)
                return true

            end if
        end if
        if key = "up" and m.catalogGrid.hasFocus()
            m.allTitlesButton.setFocus(true)
            return true
        else if key = "down" and (m.allTitlesButton.hasFocus() or m.continueButton.hasFocus() or m.browseButton.hasFocus())
            m.catalogGrid.setFocus(true)
            return true
        else if key = "right" and m.continueButton.hasFocus()
            m.browseButton.setFocus(true)
            return true
        else if key = "left" and m.browseButton.hasFocus()
            m.continueButton.setFocus(true)
            return true
        else if key = "left" and m.continueButton.hasFocus()
            m.allTitlesButton.setFocus(true)
            return true
        else if key = "right" and m.allTitlesButton.hasFocus()
            m.continueButton.setFocus(true)
            return true
        else if key = "OK"
            if m.allTitlesButton.hasFocus()
                onAllTitlesSelected()
                return true
            else if m.continueButton.hasFocus()
                onContinueSelected()
                return true
            end if
        end if
    end if

    if key = "back"
        if m.view = "video"
            returnToDetail()
            return true
        end if

        if m.view = "detail"
            if m.playbackBusy
                m.playbackTask.control = "STOP"
                m.playbackBusy = false
            end if
            m.detailView.visible = false
            m.catalogGrid.visible = true
    m.libraryInfo.visible = true
            m.status.visible = true
            m.view = "catalog"
            m.catalogGrid.setFocus(true)
            return true
        end if
    end if

    return false
end function

sub onLibraryVisibilityChanged()
    m.browseButton.visible = m.catalogGrid.visible
    m.allTitlesButton.visible = m.catalogGrid.visible
    m.continueButton.visible = m.catalogGrid.visible
    m.libraryInfo.visible = m.catalogGrid.visible
    m.top.findNode("libraryHeading").visible = m.catalogGrid.visible
end sub

sub refreshProgressPresentation()
    if not m.catalogLoaded then return
    buildContinueSelections()
    if m.view = "loading"
        maybeShowCatalog()
    else if m.view = "catalog"
        if m.gridMode = "continue"
            showContinueWatching()
        else
            m.status.text = m.catalogItems.Count().ToStr() + " titles"
        end if
    end if
end sub

sub onBrowseSelected()
    m.browseDialog = CreateObject("roSGNode", "Dialog")
    m.browseDialog.title = "Browse your library"
    m.browseDialog.buttons = ["Movies", "Shows", "New on SeedSpace", "Switch artwork view", "Search titles", "Switch profile"]
    m.browseDialog.observeField("buttonSelected", "onBrowseChoice")
    m.top.dialog = m.browseDialog
end sub

sub onBrowseChoice()
    if m.browseDialog = invalid then return
    choice = m.browseDialog.buttonSelected
    m.top.dialog = invalid
    m.browseDialog = invalid
    if choice = 5
        requestProfiles()
        return
    else if choice = 4
        m.searchDialog = CreateObject("roSGNode", "KeyboardDialog")
        m.searchDialog.title = "Search library titles"
        m.searchDialog.buttons = ["Search", "Cancel"]
        m.searchDialog.observeField("buttonSelected", "onSearchChoice")
        m.top.dialog = m.searchDialog
        return
    else if choice = 3
        m.posterMode = not m.posterMode
        if m.gridMode = "continue"
            setCatalogGridContent(m.activeItems, m.continueSelections)
        else
            setCatalogGridContent(m.activeItems, invalid)
        end if
        m.catalogGrid.setFocus(true)
        return
    end if
    m.gridMode = "filtered"
    m.activeItems = []
    if choice = 2
        recent = ParseJson(ReadAsciiFile("pkg:/images/new-media.json"))
        if recent <> invalid
            for each entry in recent
                for each item in m.catalogItems
                    if item.id = entry.id then m.activeItems.Push(item)
                end for
            end for
        end if
        m.status.text = "New on SeedSpace"
    else
        wantedType = "movie"
        if choice = 1 then wantedType = "show"
        for each item in m.catalogItems
            if item.type = wantedType then m.activeItems.Push(item)
        end for
        m.status.text = m.activeItems.Count().ToStr() + " " + wantedType + " titles"
    end if
    setCatalogGridContent(m.activeItems, invalid)
    m.catalogGrid.setFocus(true)
end sub

sub onSearchChoice()
    if m.searchDialog = invalid then return
    applySearch = m.searchDialog.buttonSelected = 0
    query = LCase(m.searchDialog.text.Trim())
    m.top.dialog = invalid
    m.searchDialog = invalid
    if applySearch
        m.gridMode = "filtered"
        m.activeItems = []
        for each item in m.catalogItems
            if query = "" or instr(1, LCase(item.title), query) > 0 then m.activeItems.Push(item)
        end for
        m.status.text = m.activeItems.Count().ToStr() + " search results"
        setCatalogGridContent(m.activeItems, invalid)
        m.catalogGrid.setFocus(true)
    else
        m.browseButton.setFocus(true)
    end if
end sub

function paddedNumber(value as Integer) as String
    if value < 10 then return "0" + value.ToStr()
    return value.ToStr()
end function

sub renderLibraryPage()
    content = CreateObject("roSGNode", "ContentNode")
    if m.gridContent = invalid then return
    stopIndex = m.pageStart + 5
    if stopIndex >= m.gridContent.getChildCount() then stopIndex = m.gridContent.getChildCount() - 1
    for i = m.pageStart to stopIndex
        content.appendChild(m.gridContent.getChild(i).clone(false))
    end for
    m.catalogGrid.content = content
    updatePageLabels()
end sub

sub updatePageLabels()
    page = Int(m.pageStart / 6) + 1
    pages = Int((m.activeItems.Count() + 5) / 6)
    text = ""
    for i = 1 to pages
        if i = page
            text = text + "[ Page " + i.ToStr() + " ]   "
        else if pages <= 10 or Abs(i - page) <= 2
            text = text + "Page " + i.ToStr() + "   "
        end if
    end for
    m.top.findNode("libraryPosition").text = text
end sub

sub changeLibraryPage(delta as Integer)
    nextStart = m.pageStart + delta * 6
    if nextStart < 0 or nextStart >= m.activeItems.Count() then return
    row = Int(m.catalogGrid.itemFocused / 3)
    target = row * 3
    if delta < 0 then target = target + 2
    m.pageStart = nextStart
    renderLibraryPage()
    count = m.catalogGrid.content.getChildCount()
    if target >= count then target = count - 1
    m.catalogGrid.jumpToItem = target
    startX = 1420
    if delta < 0 then startX = -800
    m.top.findNode("librarySlide").keyValue = [[startX,170],[310,170]]
    onCatalogFocusChanged()
    m.libraryEntrance.control = "stop"
    m.libraryEntrance.control = "start"
end sub

sub onDetailContinue()
    if m.selectedItem = invalid then return
    buildContinueSelections()
    for each selection in m.continueSelections
        if selection.item.id = m.selectedItem.id
            requestSelectedPlayback(selection.season, selection.episode)
            return
        end if
    end for
    onMoviePlaySelected()
end sub

sub onLibraryPageRequested()
    if m.view = "catalog" then changeLibraryPage(m.catalogGrid.pageRequested)
end sub

function orderedEpisodes() as Object
    episodes = []
    if m.selectedItem.type = "movie" then return episodes
    for each season in m.selectedItem.seasons
        for each ep in season.episodes
            episodes.Push(ep)
        end for
    end for
    return episodes
end function

function adjacentEpisode(delta as Integer) as Dynamic
    episodes = orderedEpisodes()
    for i = 0 to episodes.Count()-1
        ep = episodes[i]
        if ep.playbackRef.season = m.playbackRef.season and ep.number = m.playbackRef.episode
            target = i + delta
            if target >= 0 and target < episodes.Count() then return episodes[target]
            return invalid
        end if
    end for
    return invalid
end function

function playerInfo() as Object
    ep = adjacentEpisode(0)
    previous = adjacentEpisode(-1)
    following = adjacentEpisode(1)
    info = {mediaId:m.selectedItem.id, title:m.selectedItem.title, episodeLabel:"", introStart:invalid, introEnd:invalid, outroStart:invalid, hasPrevious:previous <> invalid, hasNext:following <> invalid, nextTitle:"", nextArtwork:"", subtitlesDefaultEnabled:m.selectedItem.subtitlesDefaultEnabled = true}
    if ep <> invalid
        info.episodeLabel = "S" + paddedNumber(ep.playbackRef.season) + "E" + paddedNumber(ep.number) + " · " + ep.title
        info.introStart = ep.skipIntroStart
        info.introEnd = ep.skipIntroEnd
        info.outroStart = ep.skipOutroStart
    end if
    if following <> invalid
        info.nextTitle = "S" + paddedNumber(following.playbackRef.season) + "E" + paddedNumber(following.number) + " · " + following.title
        info.nextArtwork = placeholderUrl(m.selectedItem,following.playbackRef.season,following.number)
    end if
    return info
end function

sub onPlayerAction()
    action = m.playerOverlay.action
    if action = "close"
        returnToDetail()
    else if action = "save"
        saveCurrentProgress()
    else if action = "previous" or action = "next"
        if m.playbackBusy then return
        delta = 1
        if action = "previous" then delta = -1
        ep = adjacentEpisode(delta)
        if ep = invalid then return
        saveCurrentProgress()
        m.playerOverlay.active = false
        m.video.control = "stop"
        m.forceStart = true
        for i = 0 to m.selectedItem.seasons.Count()-1
            if m.selectedItem.seasons[i].number = ep.playbackRef.season then m.seasonIndex = i
        end for
        populateEpisodes(m.selectedItem)
        for i = 0 to m.episodeItems.Count()-1
            if m.episodeItems[i].number = ep.number then m.episodeList.jumpToItem = i
        end for
        m.playerOverlay.active = true
        m.playerOverlay.failure = ""
        requestSelectedPlayback(ep.playbackRef.season,ep.number)
    else if action = "retry"
        if m.playbackBusy then return
        m.retryPosition = currentVideoPosition()
        m.playerOverlay.failure = ""
        m.video.control = "stop"
        requestSelectedPlayback(m.playbackRef.season,m.playbackRef.episode)
    end if
end sub
