sub init()
    m.catalogGrid = m.top.findNode("catalogGrid")
    m.catalogTask = m.top.findNode("catalogTask")
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
    m.moviePlayButton = m.top.findNode("moviePlayButton")
    m.allTitlesButton = m.top.findNode("allTitlesButton")
    m.continueButton = m.top.findNode("continueButton")
    m.video = m.top.findNode("video")
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
    m.playbackSubtitleUrls = []
    m.playbackRef = { mediaId: "", season: 0, episode: 0 }

    m.catalogTask.observeField("resultJson", "onCatalogLoaded")
    m.catalogTask.observeField("errorMessage", "onCatalogError")
    m.playbackTask.observeField("resultJson", "onPlaybackReady")
    m.playbackTask.observeField("errorMessage", "onPlaybackError")
    m.loginTask.observeField("resultJson", "onLoginReady")
    m.loginTask.observeField("errorMessage", "onLoginError")
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
    m.loginButton.observeField("buttonSelected", "onLoginSelected")
    m.profileList.observeField("itemSelected", "onProfileSelected")
    m.video.observeField("position", "onVideoPositionChanged")
    m.video.observeField("state", "onVideoStateChanged")
end sub

sub onConfigChanged()
    config = m.top.config
    if config = invalid
        return
    end if

    m.apiBase = config.apiBase
    m.authToken = config.authToken
    if m.authToken = ""
        showLogin("Sign in with your CWorld account to continue.")
    else
        requestProfiles()
    end if
end sub

sub showLogin(message as String)
    m.view = "login"
    m.catalogGrid.visible = false
    m.status.visible = false
    m.detailView.visible = false
    m.profileView.visible = false
    m.video.visible = false
    m.loginView.visible = true
    m.loginStatus.text = message
    m.usernameInput.setFocus(true)
end sub

sub onLoginSelected()
    if m.view <> "login"
        return
    end if

    if m.usernameInput.text = "" or m.passwordInput.text = ""
        m.loginStatus.text = "Enter a username and password."
        return
    end if

    m.loginStatus.text = "Signing in..."
    m.loginTask.apiBase = m.apiBase
    m.loginTask.username = m.usernameInput.text
    m.loginTask.password = m.passwordInput.text
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
    m.passwordInput.text = ""
    requestProfiles()
end sub

sub onLoginError()
    if m.loginTask.errorMessage <> ""
        m.loginStatus.text = m.loginTask.errorMessage
    end if
end sub

sub requestProfiles()
    m.view = "profiles"
    m.loginView.visible = false
    m.profileView.visible = true
    m.catalogGrid.visible = false
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
    loadCatalogAndProgress()
end sub

sub loadCatalogAndProgress()
    m.view = "loading"
    m.profileView.visible = false
    m.catalogGrid.visible = false
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
    payload = ParseJson(m.catalogTask.resultJson)
    if payload = invalid
        m.status.text = "Catalog response was not valid."
        return
    end if
    if payload.items = invalid
        m.status.text = "Catalog response was not valid."
        return
    end if

    m.catalogItems = payload.items
    showAllTitles()
    m.catalogLoaded = true
    maybeShowCatalog()
end sub

sub onCatalogError()
    if m.catalogTask.errorMessage <> ""
        m.status.text = m.catalogTask.errorMessage
        m.catalogLoaded = true
        maybeShowCatalog()
    end if
end sub

sub onProgressResult()
    m.progressSyncBusy = false
    if m.progressOperation = "GET"
        payload = ParseJson(m.progressTask.resultJson)
        if payload <> invalid
            for each item in payload
                key = progressKey(item.show_id, item.season, item.episode)
                m.progressByKey[key] = item
            end for
        end if
        m.progressLoaded = true
        maybeShowCatalog()
        return
    end if

    key = progressKey(m.playbackRef.mediaId, m.playbackRef.season, m.playbackRef.episode)
    m.progressByKey[key] = {
        current_time: currentVideoPosition(),
        duration: currentVideoDuration()
    }
    if m.pendingFinalProgress
        m.pendingFinalProgress = false
        requestProgressPost()
    end if
end sub

sub onProgressError()
    m.progressSyncBusy = false
    if m.progressOperation = "GET"
        m.progressLoaded = true
        maybeShowCatalog()
        return
    end if

    if m.pendingFinalProgress
        m.pendingFinalProgress = false
    end if
end sub

sub onHistoryError()
    if m.historyTask.errorMessage <> "" and m.view = "detail"
        m.detailStatus.text = "Playback started, but watch history could not sync."
    end if
end sub

sub maybeShowCatalog()
    if not m.catalogLoaded or not m.progressLoaded
        return
    end if

    m.view = "catalog"
    m.status.visible = true
    m.loginView.visible = false
    m.profileView.visible = false
    m.catalogGrid.visible = true
    buildContinueSelections()
    showAllTitles()
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
    setCatalogGridContent(m.catalogItems, invalid)
end sub

sub showContinueWatching()
    m.gridMode = "continue"
    if m.continueSelections.Count() = 0
        m.activeItems = []
        m.status.text = "No saved progress for this profile"
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
        if selections <> invalid
            tile.title = selections[index].label
        else
            tile.title = item.title
        end if
        if item.artwork <> invalid
            tile.HDPosterUrl = item.artwork.poster
        end if
    end for
    m.catalogGrid.content = content
end sub

sub buildContinueSelections()
    m.continueSelections = []
    for each item in m.catalogItems
        if item.type = "movie"
            key = progressKey(item.id, 0, 0)
            if m.progressByKey.DoesExist(key)
                progress = m.progressByKey[key]
                if hasResumableProgress(progress)
                    m.continueSelections.Push({
                        item: item,
                        season: 0,
                        episode: 0,
                        label: item.title
                    })
                end if
            end if
        else
            for each season in item.seasons
                for each episode in season.episodes
                    key = progressKey(item.id, season.number, episode.number)
                    if m.progressByKey.DoesExist(key)
                        progress = m.progressByKey[key]
                        if hasResumableProgress(progress)
                            m.continueSelections.Push({
                                item: item,
                                season: season.number,
                                episode: episode.number,
                                label: item.title + "  S" + season.number.ToStr() + "E" + episode.number.ToStr() + "  " + episode.title
                            })
                        end if
                    end if
                end for
            end for
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
    index = m.catalogGrid.itemSelected
    if index < 0 or index >= m.continueSelections.Count()
        return
    end if

    selection = m.continueSelections[index]
    m.selectedItem = selection.item
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
        requestSelectedPlayback(0, 0)
    end if
end sub

sub openSelectedTitle()
    index = m.catalogGrid.itemSelected
    if index < 0 or index >= m.catalogItems.Count()
        return
    end if

    m.selectedItem = m.catalogItems[index]
    m.view = "detail"
    m.catalogGrid.visible = false
    m.status.visible = false
    m.detailView.visible = true
    m.detailStatus.text = ""
    m.detailPoster.uri = m.selectedItem.artwork.poster
    m.detailTitle.text = m.selectedItem.title
    m.detailDescription.text = m.selectedItem.description
    m.detailMeta.text = buildMetaText(m.selectedItem)

    if m.selectedItem.type = "movie"
        m.episodeList.visible = false
        m.moviePlayButton.visible = true
        m.moviePlayButton.setFocus(true)
    else
        m.moviePlayButton.visible = false
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
    seasonPart = "m"
    episodePart = "m"
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
    for each season in item.seasons
        for each episode in season.episodes
            m.episodeItems.Push(episode)
            row = content.CreateChild("ContentNode")
            row.title = "S" + season.number.ToStr() + "E" + episode.number.ToStr() + "  " + episode.title
        end for
    end for
    m.episodeList.content = content
end sub

sub requestSelectedPlayback(season as Integer, episode as Integer)
    if m.authToken = ""
        m.detailStatus.text = "Sign in before starting playback."
        return
    end if

    m.detailStatus.text = "Preparing playback..."
    m.playbackRef = {
        mediaId: m.selectedItem.id,
        season: season,
        episode: episode
    }
    m.resumePosition = resumePositionFor(m.selectedItem.id, season, episode)
    m.playbackSubtitleUrls = []
    if m.selectedItem.type = "movie"
        if m.selectedItem.subtitleTracks <> invalid
            m.playbackSubtitleUrls = m.selectedItem.subtitleTracks
        end if
    else
        for each showSeason in m.selectedItem.seasons
            if showSeason.number = season
                for each showEpisode in showSeason.episodes
                    if showEpisode.number = episode
                        m.playbackSubtitleUrls = showEpisode.subtitles
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
    m.playbackTask.control = "RUN"
end sub

sub onPlaybackReady()
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
    mediaContent.title = m.selectedItem.title
    mediaContent.VideoDisableUI = false
    if m.playbackSubtitleUrls.Count() > 0
        subtitleTracks = []
        for each subtitleUrl in m.playbackSubtitleUrls
            subtitleTracks.Push({
                Language: "eng",
                Description: "English",
                TrackName: subtitleUrl
            })
        end for
        mediaContent.SubtitleTracks = subtitleTracks
    end if
    m.video.content = mediaContent
    m.lastProgressPosition = m.resumePosition
    m.detailView.visible = false
    m.video.visible = true
    m.view = "video"
    m.video.setFocus(true)
    m.video.control = "play"
    if m.resumePosition > 0
        m.video.position = m.resumePosition
        m.video.seek = true
    end if
    requestHistoryUpdate()
end sub

sub onPlaybackError()
    if m.playbackTask.errorMessage <> ""
        if m.gridMode = "continue" and m.view = "catalog"
            m.status.text = m.playbackTask.errorMessage
        else
            m.detailStatus.text = m.playbackTask.errorMessage
        end if
    end if
end sub

sub onVideoPositionChanged()
    if m.view <> "video" or m.progressSyncBusy
        return
    end if

    if currentVideoPosition() < m.lastProgressPosition + 30
        return
    end if

    requestProgressPost()
end sub

sub requestProgressPost()
    if m.profileId = "" or m.playbackRef.mediaId = ""
        return
    end if

    m.progressSyncBusy = true
    m.progressOperation = "POST"
    m.progressTask.apiBase = m.apiBase
    m.progressTask.authToken = m.authToken
    m.progressTask.profileId = m.profileId
    m.progressTask.method = "POST"
    m.progressTask.bodyJson = FormatJson({
        show_id: m.playbackRef.mediaId,
        season: m.playbackRef.season,
        episode: m.playbackRef.episode,
        current_time: currentVideoPosition(),
        duration: currentVideoDuration()
    })
    m.lastProgressPosition = currentVideoPosition()
    m.progressTask.errorMessage = ""
    m.progressTask.resultJson = ""
    m.progressTask.control = "RUN"
end sub

sub saveCurrentProgress()
    if m.view = "video" and m.profileId <> ""
        m.pendingFinalProgress = true
        if not m.progressSyncBusy
            m.pendingFinalProgress = false
            requestProgressPost()
        end if
    end if
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
    if m.video.state = "finished" or m.video.state = "error"
        if m.video.state = "error"
            m.detailStatus.text = "CWorld could not play this media."
        end if
        returnToDetail()
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press
        return false
    end if

    if key = "back"
        if m.view = "video"
            returnToDetail()
            return true
        end if

        if m.view = "detail"
            m.detailView.visible = false
            m.catalogGrid.visible = true
            m.status.visible = true
            m.view = "catalog"
            m.catalogGrid.setFocus(true)
            return true
        end if
    end if

    return false
end function
