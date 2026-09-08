sub init()
    m.catalogGrid = m.top.findNode("catalogGrid")
    m.catalogTask = m.top.findNode("catalogTask")
    m.playbackTask = m.top.findNode("playbackTask")
    m.detailView = m.top.findNode("detailView")
    m.detailPoster = m.top.findNode("detailPoster")
    m.detailTitle = m.top.findNode("detailTitle")
    m.detailMeta = m.top.findNode("detailMeta")
    m.detailDescription = m.top.findNode("detailDescription")
    m.detailStatus = m.top.findNode("detailStatus")
    m.episodeList = m.top.findNode("episodeList")
    m.moviePlayButton = m.top.findNode("moviePlayButton")
    m.video = m.top.findNode("video")
    m.status = m.top.findNode("status")
    m.view = "catalog"
    m.catalogItems = []
    m.episodeItems = []
    m.selectedItem = invalid

    m.catalogTask.observeField("resultJson", "onCatalogLoaded")
    m.catalogTask.observeField("errorMessage", "onCatalogError")
    m.playbackTask.observeField("resultJson", "onPlaybackReady")
    m.playbackTask.observeField("errorMessage", "onPlaybackError")
    m.catalogGrid.observeField("itemSelected", "onCatalogItemSelected")
    m.episodeList.observeField("itemSelected", "onEpisodeSelected")
    m.moviePlayButton.observeField("buttonSelected", "onMoviePlaySelected")
    m.video.observeField("state", "onVideoStateChanged")
end sub

sub onConfigChanged()
    config = m.top.config
    if config = invalid
        return
    end if

    m.apiBase = config.apiBase
    m.authToken = config.authToken
    m.catalogTask.apiBase = m.apiBase
    m.catalogTask.authToken = m.authToken
    m.status.text = "Loading catalog..."
    m.catalogTask.control = "RUN"
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
    content = CreateObject("roSGNode", "ContentNode")
    for each item in m.catalogItems
        tile = content.CreateChild("ContentNode")
        tile.id = item.id
        tile.title = item.title
        if item.artwork <> invalid
            tile.HDPosterUrl = item.artwork.poster
        end if
    end for

    m.catalogGrid.content = content
    m.status.text = m.catalogItems.Count().ToStr() + " titles"
    m.catalogGrid.setFocus(true)
end sub

sub onCatalogError()
    if m.catalogTask.errorMessage <> ""
        m.status.text = m.catalogTask.errorMessage
    end if
end sub

sub onCatalogItemSelected()
    if m.view = "catalog"
        openSelectedTitle()
    end if
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
    m.detailStatus.text = "Preparing playback..."
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
    m.video.content = mediaContent
    m.detailView.visible = false
    m.video.visible = true
    m.view = "video"
    m.video.setFocus(true)
    m.video.control = "play"
end sub

sub onPlaybackError()
    if m.playbackTask.errorMessage <> ""
        m.detailStatus.text = m.playbackTask.errorMessage
    end if
end sub

sub onVideoStateChanged()
    if m.video.state = "finished" or m.video.state = "error"
        m.video.control = "stop"
        m.video.visible = false
        m.detailView.visible = true
        m.view = "detail"
        if m.selectedItem.type = "movie"
            m.moviePlayButton.setFocus(true)
        else
            m.episodeList.setFocus(true)
        end if
    end if
end sub

function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press
        return false
    end if

    if key = "back"
        if m.view = "video"
            m.video.control = "stop"
            m.video.visible = false
            m.detailView.visible = true
            m.view = "detail"
            if m.selectedItem.type = "movie"
                m.moviePlayButton.setFocus(true)
            else
                m.episodeList.setFocus(true)
            end if
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
