// ==UserScript==
// @name         Letterboxd Custom Backdrops
// @description  Adds a custom backdrop to your profile, list and film pages that don’t have one
// @author       Tetrax-10
// @namespace    https://github.com/Tetrax-10/letterboxd-custom-backdrops
// @version      2.0
// @license      MIT
// @match        *://*.letterboxd.com/*
// @connect      themoviedb.org
// @homepageURL  https://github.com/Tetrax-10/letterboxd-custom-backdrops
// @supportURL   https://github.com/Tetrax-10/letterboxd-custom-backdrops/issues
// @updateURL    https://tetrax-10.github.io/letterboxd-custom-backdrops/lcb.user.js
// @downloadURL  https://tetrax-10.github.io/letterboxd-custom-backdrops/lcb.user.js
// @icon         https://tetrax-10.github.io/letterboxd-custom-backdrops/assets/icon.png
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

;(() => {
    GM_registerMenuCommand("Settings", showSettingsPopup)

    const defaultConfig = {
        TMDB_API_KEY: "",

        FILM_DISPLAY_MISSING_BACKDROP: true,
        FILM_SHORT_BACKDROP: false,

        LIST_AUTO_SCRAPE: false,
        LIST_SHORT_BACKDROP: false,

        USER_AUTO_SCRAPE: false,
        USER_SHORT_BACKDROP: false,
        CURRENT_USER_BACKDROP_ONLY: true,

        PERSON_AUTO_SCRAPE: false,
        PERSON_SHORT_BACKDROP: false,

        REVIEW_AUTO_SCRAPE: false,
        REVIEW_SHORT_BACKDROP: true,
    }

    if (GM_getValue("CONFIG", {})?.FILM_SHORT_BACKDROP === undefined) {
        GM_setValue("CONFIG", defaultConfig)
    }

    function getConfigData(configId) {
        const config = GM_getValue("CONFIG", {})

        return config[configId]
    }

    function setConfigData(configId, value) {
        const config = GM_getValue("CONFIG", {})

        config[configId] = value

        GM_setValue("CONFIG", config)
    }

    function getItemData(itemId, dataType) {
        const itemData = GM_getValue("ITEM_DATA", {})

        return itemData[itemId]?.[dataType] ?? ""
    }

    function setItemData(itemId, dataType, value) {
        const itemData = GM_getValue("ITEM_DATA", {})

        const data = itemData[itemId] ?? {}
        if (value === "") {
            delete data[dataType]
        } else {
            data[dataType] = value
        }
        itemData[itemId] = data

        GM_setValue("ITEM_DATA", itemData)
    }

    GM_addStyle(`
        #lcb-settings-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        #lcb-settings-popup {
            background-color: #20242c;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 10001;
            font-family: Source Sans Pro, Arial, sans-serif;
            font-feature-settings: normal;
            font-variation-settings: normal;
            font-size: 100%;
            font-weight: inherit;
            line-height: 1.5;
            letter-spacing: normal;
            width: 50%;
            max-height: 80vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }
        #lcb-settings-popup[type="burlpopup"] {
            width: 80%;
        }
        #lcb-settings-popup label {
            color: #cfcfcf;
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        #lcb-settings-popup input {
            background-color: #20242c;
            border: 1px solid #cfcfcf;
            color: #cfcfcf;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        #lcb-settings-popup button {
            background-color: #4caf50;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 10px;
        }
        #lcb-settings-popup .import-export-container {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        .lcb-checkbox-container {
            display: flex;
            align-items: center;
        }
        .lcb-checkbox-container input[type="checkbox"] {
            appearance: none;
            background-color: #20242c;
            border: 1px solid #cfcfcf;
            border-radius: 4px;
            width: 20px;
            height: 20px;
            cursor: pointer;
            position: relative;
            margin-right: 10px;
            outline: none;
        }
        .lcb-checkbox-container input[type="checkbox"]:checked {
            background-color: #4caf50;
            border: none;
        }
        .lcb-checkbox-container input[type="checkbox"]:checked::after {
            content: '\\2714'; /* Unicode checkmark */
            color: white;
            font-size: 1em;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        .lcb-checkbox-container label {
            color: #cfcfcf;
            font-weight: bold;
            font-size: 1.2em;
        }
        #lcb-image-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        .lcb-image-item {
            cursor: pointer;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid transparent;
            transition: border-color 0.3s;
            position: relative;
        }
        .lcb-image-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        .lcb-image-item:hover {
            border-color: #4caf50;
        }
        #lcb-load-more {
            background-color: #4caf50;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
            align-self: center;
        }
        #lcb-loading-spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid #4caf50;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        `)

    async function showImageUrlPopup({ itemId, targetedFilmId } = {}) {
        // Create overlay element
        const overlay = document.createElement("div")
        overlay.id = "lcb-settings-overlay"
        overlay.onclick = (e) => {
            if (e.target === overlay) closePopup(overlay)
        }

        // Popup element
        const popup = document.createElement("div")
        popup.id = "lcb-settings-popup"
        popup.setAttribute("type", "burlpopup")

        // Create label element
        const label = document.createElement("label")
        label.textContent = "Enter Backdrop Image URL:"
        popup.appendChild(label)

        // Create input element
        const input = document.createElement("input")
        input.type = "text"
        input.value = getItemData(itemId, "bUrl")
        input.placeholder = "Backdrop Image URL"
        input.autofocus = true
        input.oninput = (e) => {
            const value = e.target.value?.trim() ?? ""
            setItemData(itemId, "bUrl", value)
        }
        popup.appendChild(input)

        overlay.appendChild(popup)
        document.body.appendChild(overlay)

        setTimeout(() => {
            input.focus()
        }, 100)

        function closePopup(overlay) {
            document.body.removeChild(overlay)
        }

        if (!getConfigData("TMDB_API_KEY")) return

        // Add spinner element
        const spinner = document.createElement("div")
        spinner.id = "lcb-loading-spinner"
        popup.appendChild(spinner)

        let filmId, tmdbIdType, tmdbId

        // "Set as backdrop" contextmenu
        if (targetedFilmId && getItemData(targetedFilmId, "tmdbId")) {
            filmId = targetedFilmId
        } else if (targetedFilmId && !getItemData(targetedFilmId, "tmdbId")) {
            await commonUtils.scrapeFilmPage(targetedFilmId.split("/")?.[1])
            filmId = targetedFilmId
        }
        // "Set film backdrop" contextmenu (film and review pages)
        else if (itemId.startsWith("f/") && getItemData(itemId, "tmdbId")) {
            filmId = itemId
        } else if (itemId.startsWith("f/") && !getItemData(itemId, "tmdbId")) {
            await commonUtils.scrapeFilmPage(itemId.split("/")?.[1])
            filmId = itemId
        }

        tmdbIdType = getItemData(filmId, "type")
        tmdbId = getItemData(filmId, "tmdbId")

        if (!tmdbIdType || !tmdbId) return

        const imageGrid = document.createElement("div")
        imageGrid.id = "lcb-image-grid"
        popup.appendChild(imageGrid)

        const loadMoreButton = document.createElement("button")
        loadMoreButton.id = "lcb-load-more"
        loadMoreButton.textContent = "Load More"
        loadMoreButton.onclick = () => loadMoreImages()
        popup.appendChild(loadMoreButton)

        async function getAllTmdbBackdrops(tmdbIdType, tmdbId) {
            const tmdbRawRes = await fetch(`https://api.themoviedb.org/3/${tmdbIdType}/${tmdbId}/images?api_key=${getConfigData("TMDB_API_KEY")}`)
            const tmdbRes = await tmdbRawRes.json()

            const nonLocaleImages = []
            const localeImages = []

            tmdbRes.backdrops?.forEach((image) => {
                if (image.iso_639_1 === null) {
                    nonLocaleImages.push(image.file_path)
                } else {
                    localeImages.push(image.file_path)
                }
            })

            return [...nonLocaleImages, ...localeImages]
        }

        let allImageUrls = await getAllTmdbBackdrops(tmdbIdType, tmdbId)
        let currentRow = 0
        const rowsToLoad = 5

        // Remove spinner and load images
        await loadMoreImages()
        spinner.remove()

        async function loadMoreImages() {
            const nextImages = allImageUrls.slice(currentRow * 3, (currentRow + rowsToLoad) * 3)
            nextImages.forEach((file_path) => {
                const imageItem = document.createElement("div")
                imageItem.className = "lcb-image-item"

                const imageUrl = `https://image.tmdb.org/t/p/original${file_path}`

                const img = document.createElement("img")
                img.src = imageUrl
                imageItem.appendChild(img)

                imageItem.onclick = () => {
                    setItemData(itemId, "bUrl", imageUrl)
                    closePopup(overlay)
                }
                imageGrid.appendChild(imageItem)
            })

            currentRow += rowsToLoad
            if (currentRow * 3 >= allImageUrls.length) {
                loadMoreButton.style.display = "none"
            }
        }
    }

    function showSettingsPopup() {
        // Create overlay element
        const overlay = document.createElement("div")
        overlay.id = "lcb-settings-overlay"
        overlay.onclick = (e) => {
            if (e.target === overlay) closePopup(overlay)
        }

        // Popup element
        const popup = document.createElement("div")
        popup.id = "lcb-settings-popup"

        function createLabelElement(text) {
            const label = document.createElement("label")
            label.textContent = text
            popup.appendChild(label)
        }

        function createInputElement(name, id, placeholder) {
            createLabelElement(name)

            const input = document.createElement("input")
            input.type = "text"
            input.value = getConfigData(id)
            input.placeholder = placeholder
            input.oninput = (e) => {
                const value = e.target.value?.trim()
                setConfigData(id, value)
            }
            popup.appendChild(input)
        }

        function createCheckboxElement(labelText, id) {
            const container = document.createElement("div")
            container.className = "lcb-checkbox-container"

            const checkbox = document.createElement("input")
            checkbox.type = "checkbox"
            checkbox.checked = getConfigData(id)
            checkbox.onchange = (e) => setConfigData(id, e.target.checked)
            container.appendChild(checkbox)

            const label = document.createElement("label")
            label.textContent = labelText
            container.appendChild(label)

            popup.appendChild(container)
        }

        function createSpaceComponent() {
            const space = document.createElement("div")
            space.style.marginBottom = "10px"
            popup.appendChild(space)
        }

        // Export settings to a JSON file
        function exportSettings() {
            const settings = {
                CONFIG: GM_getValue("CONFIG", {}),
                ITEM_DATA: GM_getValue("ITEM_DATA", {}),
            }

            // Create a data URL for the JSON file
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2))
            const downloadAnchor = document.createElement("a")
            downloadAnchor.setAttribute("href", dataStr)
            downloadAnchor.setAttribute("download", "lcbSettings.json")
            document.body.appendChild(downloadAnchor)
            downloadAnchor.click()
            document.body.removeChild(downloadAnchor)
        }

        // Import settings from a JSON file
        function importSettings(event) {
            const file = event.target.files[0]
            if (!file) return

            const reader = new FileReader()
            reader.onload = (e) => {
                const content = e.target.result
                try {
                    const settings = JSON.parse(content)

                    GM_setValue("CONFIG", settings.CONFIG || {})
                    GM_setValue("ITEM_DATA", settings.ITEM_DATA || {})

                    // Refresh the popup to reflect imported settings
                    closePopup(overlay)
                    showSettingsPopup()
                } catch (err) {
                    alert("Failed to import settings: Invalid JSON file.")
                }
            }
            reader.readAsText(file)
        }

        // Add checkbox fields
        createInputElement(
            "Enter your TMDB API key to display missing film backdrops and get ability to select backdrops from UI:",
            "TMDB_API_KEY",
            "TMDB API Key"
        )
        createSpaceComponent()

        createLabelElement("Film Page:")
        createCheckboxElement("Display missing backdrop for less popular films", "FILM_DISPLAY_MISSING_BACKDROP")
        createCheckboxElement("Short backdrops", "FILM_SHORT_BACKDROP")
        createSpaceComponent()

        createLabelElement("List Page:")
        createCheckboxElement("Auto scrape backdrops", "LIST_AUTO_SCRAPE")
        createCheckboxElement("Short backdrops", "LIST_SHORT_BACKDROP")
        createSpaceComponent()

        createLabelElement("User Page:")
        createCheckboxElement("Auto scrape backdrops", "USER_AUTO_SCRAPE")
        createCheckboxElement("Short backdrops", "USER_SHORT_BACKDROP")
        createCheckboxElement("Don't scrape backdrops for other users", "CURRENT_USER_BACKDROP_ONLY")
        createSpaceComponent()

        createLabelElement("Person Page:")
        createCheckboxElement("Auto scrape backdrops", "PERSON_AUTO_SCRAPE")
        createCheckboxElement("Short backdrops", "PERSON_SHORT_BACKDROP")
        createSpaceComponent()

        createLabelElement("Review Page:")
        createCheckboxElement("Auto scrape backdrops", "REVIEW_AUTO_SCRAPE")
        createCheckboxElement("Short backdrops", "REVIEW_SHORT_BACKDROP")
        createSpaceComponent()

        // Import/Export Buttons
        const importExportContainer = document.createElement("div")
        importExportContainer.className = "import-export-container"

        const exportButton = document.createElement("button")
        exportButton.textContent = "Export Settings"
        exportButton.onclick = exportSettings

        const importButton = document.createElement("button")
        importButton.textContent = "Import Settings"
        importButton.onclick = () => {
            const fileInput = document.createElement("input")
            fileInput.type = "file"
            fileInput.accept = ".json"
            fileInput.onchange = importSettings
            fileInput.click()
        }

        importExportContainer.appendChild(exportButton)
        importExportContainer.appendChild(importButton)
        popup.appendChild(importExportContainer)

        overlay.appendChild(popup)
        document.body.appendChild(overlay)

        function closePopup(overlay) {
            document.body.removeChild(overlay)
        }
    }

    const commonUtils = (() => {
        async function waitForElement(selector, timeout = null, nthElement = 1) {
            // wait till document body loads
            while (!document.body) {
                await new Promise((resolve) => setTimeout(resolve, 10))
            }

            nthElement -= 1

            return new Promise((resolve) => {
                if (document.querySelectorAll(selector)?.[nthElement]) {
                    return resolve(document.querySelectorAll(selector)?.[nthElement])
                }

                const observer = new MutationObserver(async () => {
                    if (document.querySelectorAll(selector)?.[nthElement]) {
                        resolve(document.querySelectorAll(selector)?.[nthElement])
                        observer.disconnect()
                    } else {
                        if (timeout) {
                            async function timeOver() {
                                return new Promise((resolve) => {
                                    setTimeout(() => {
                                        observer.disconnect()
                                        resolve(false)
                                    }, timeout)
                                })
                            }
                            resolve(await timeOver())
                        }
                    }
                })

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                })
            })
        }

        async function getTmdbBackdrop(tmdbIdType, tmdbId) {
            if (!getConfigData("TMDB_API_KEY")) return null

            const tmdbRawRes = await fetch(`https://api.themoviedb.org/3/${tmdbIdType}/${tmdbId}/images?api_key=${getConfigData("TMDB_API_KEY")}`)
            const tmdbRes = await tmdbRawRes.json()

            const imageId = tmdbRes.backdrops?.[0]?.file_path

            return imageId ? `https://image.tmdb.org/t/p/original${imageId}` : null
        }

        async function isDefaultBackdropAvailable(dom) {
            let defaultBackdropElement
            if (dom) {
                defaultBackdropElement = dom.querySelector("#backdrop")
            } else {
                defaultBackdropElement = document.querySelector("#backdrop")
                if (!defaultBackdropElement) {
                    defaultBackdropElement = await waitForElement("#backdrop", 100)
                }
            }
            const defaultBackdropUrl =
                defaultBackdropElement?.dataset?.backdrop2x ||
                defaultBackdropElement?.dataset?.backdrop ||
                defaultBackdropElement?.dataset?.backdropMobile

            if (defaultBackdropUrl?.includes("https://a.ltrbxd.com/resized/sm/upload")) return defaultBackdropUrl
            return false
        }

        async function extractBackdropUrlFromLetterboxdFilmPage(filmId, dom) {
            const filmBackdropUrl = await isDefaultBackdropAvailable(dom)

            // get tmdb id
            let tmdbElement
            if (dom) {
                tmdbElement = dom.querySelector(`.micro-button.track-event[data-track-action="TMDb"]`)
            } else {
                tmdbElement = await waitForElement(`.micro-button.track-event[data-track-action="TMDb"]`, 5000)
            }
            const tmdbIdType = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[1] ?? null
            const tmdbId = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[2] ?? null

            if (tmdbIdType && tmdbId) {
                setItemData(filmId, "type", tmdbIdType)
                setItemData(filmId, "tmdbId", tmdbId)
            }

            if (!filmBackdropUrl && !document.querySelector(`#lcb-settings-popup[type="burlpopup"]`)) {
                // get tmdb backdrop
                return await getTmdbBackdrop(tmdbIdType, tmdbId)
            }

            return filmBackdropUrl
        }

        function scrapeFilmPage(filmName) {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `https://letterboxd.com/film/${filmName}/`,
                    onload: async function (response) {
                        const parser = new DOMParser()
                        const dom = parser.parseFromString(response.responseText, "text/html")

                        resolve([await extractBackdropUrlFromLetterboxdFilmPage(`f/${filmName}`, dom), false])
                    },
                    onerror: function (error) {
                        console.error(`Can't scrape Letterboxd page: ${firstPosterElement.href}`, error)
                        resolve([null, false])
                    },
                })
            })
        }

        async function scrapeFilmLinkElement(selector, shouldScrape, itemId) {
            const firstPosterElement = await waitForElement(selector, 2000)
            if (!firstPosterElement) return [null, false]

            const filmName = firstPosterElement.href?.match(/\/film\/([^\/]+)/)?.[1]
            const filmId = `f/${filmName}`

            if (!itemId.startsWith("f/")) setItemData(itemId, "fId", filmId)

            const cacheBackdrop = getItemData(filmId, "bUrl")

            if (cacheBackdrop) {
                return [cacheBackdrop, true]
            } else if (!shouldScrape) {
                return [null, false]
            } else {
                return await scrapeFilmPage(filmName)
            }
        }

        function injectBackdrop(header, backdropUrl, attributes = []) {
            // get or inject backdrop containers
            const backdropContainer =
                // for patron users who already have an backdrop
                document.querySelector(".backdrop-container") ||
                // for non-patron users
                Object.assign(document.createElement("div"), { className: "backdrop-container" })

            // inject necessary classes
            document.body.classList.add("backdropped", "backdrop-loaded", ...attributes)
            document.getElementById("content")?.classList.add("-backdrop")

            // inject backdrop child
            backdropContainer.innerHTML = `
                <div id="backdrop" class="backdrop-wrapper -loaded" data-backdrop="${backdropUrl}" data-backdrop2x="${backdropUrl}" data-backdrop-mobile="${backdropUrl}" data-offset="0">
                    <div class="backdropimage js-backdrop-image" style="background-image: url(${backdropUrl}); background-position: center 0px;"></div>
                    <div class="backdropmask js-backdrop-fade"></div>
                </div>`

            header.before(backdropContainer)
        }

        return {
            waitForElement: waitForElement,
            getTmdbBackdrop: getTmdbBackdrop,
            extractBackdropUrlFromLetterboxdFilmPage: extractBackdropUrlFromLetterboxdFilmPage,
            scrapeFilmPage: scrapeFilmPage,
            scrapeFilmLinkElement: scrapeFilmLinkElement,
            isDefaultBackdropAvailable: isDefaultBackdropAvailable,
            injectBackdrop: injectBackdrop,
        }
    })()

    function injectContextMenuToAllPosterItems({ itemId, name } = {}) {
        function addFilmOption({ menu, className, name, onClick = () => {}, itemId = undefined } = {}) {
            if (menu.querySelector(`.${className}`)) return

            const activityLink = menu.querySelector(".fm-show-activity a")
            const filmName = activityLink.href.match(/\/film\/([^\/]+)/)?.[1]

            const backdropItem = document.createElement("li")
            backdropItem.classList.add(className, "popmenu-textitem", "-centered")

            const backdropLink = document.createElement("a")
            backdropLink.style.cursor = "pointer"
            backdropLink.textContent = name

            backdropItem.onclick = () => {
                menu.setAttribute("hidden", "")
                onClick(filmName, itemId)
            }

            backdropItem.appendChild(backdropLink)

            const activityItem = menu.querySelector(".fm-show-activity")
            activityItem.parentNode.insertBefore(backdropItem, activityItem)
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches('.popmenu.film-poster-popmenu:has(>ul >li > a[href*="/film/"])')) {
                            if (itemId) {
                                addFilmOption({
                                    menu: node,
                                    className: "fm-set-as-backdrop",
                                    name: `Set as ${name} backdrop`,
                                    onClick: (filmName, itemId) => showImageUrlPopup({ itemId: itemId, targetedFilmId: `f/${filmName}` }),
                                    itemId: itemId,
                                })
                            }
                            addFilmOption({
                                menu: node,
                                className: "fm-set-film-backdrop",
                                name: "Set film backdrop",
                                onClick: (filmName) => showImageUrlPopup({ itemId: `f/${filmName}` }),
                            })
                        }
                    }
                })
            })
        })

        observer.observe(document.body, { childList: true, subtree: true })
    }

    async function filmPageInjector() {
        const filmId = `f/${location.pathname.split("/")?.[2]}`

        const header = await commonUtils.waitForElement("#header")
        injectContextMenuToAllPosterItems()

        const cacheBackdrop = getItemData(filmId, "bUrl")

        async function scrapeTmdbIdAndType() {
            // extracts tmdb id and type
            const tmdbElement = await commonUtils.waitForElement(`.micro-button.track-event[data-track-action="TMDb"]`, 5000)
            const tmdbIdType = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[1] ?? null
            const tmdbId = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[2] ?? null

            if (tmdbIdType && tmdbId) {
                setItemData(filmId, "type", tmdbIdType)
                setItemData(filmId, "tmdbId", tmdbId)
            }
        }

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("FILM_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            scrapeTmdbIdAndType()
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) {
            scrapeTmdbIdAndType()
            return
        }

        if (getConfigData("TMDB_API_KEY") && getConfigData("FILM_DISPLAY_MISSING_BACKDROP")) {
            const backdropUrl = await commonUtils.extractBackdropUrlFromLetterboxdFilmPage(filmId)

            // inject backdrop
            if (backdropUrl) {
                commonUtils.injectBackdrop(header, backdropUrl, getConfigData("FILM_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

                setItemData(filmId, "bUrl", backdropUrl)
            }
        }
    }

    async function userPageInjector() {
        const userId = `u/${location.pathname.split("/")?.[1]}`

        const filmElementSelector = "#favourites .poster-list > li:first-child a"

        const loggedInAs = document.cookie
            ?.split("; ")
            ?.find((row) => row.startsWith("letterboxd.signed.in.as="))
            ?.split("=")[1]

        if (getConfigData("CURRENT_USER_BACKDROP_ONLY") && location.pathname.split("/")?.[1] !== loggedInAs) return

        const cacheBackdrop = getItemData(userId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        injectContextMenuToAllPosterItems({ itemId: userId, name: "user" })

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("USER_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            commonUtils.scrapeFilmLinkElement(filmElementSelector, false, userId)
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) {
            commonUtils.scrapeFilmLinkElement(filmElementSelector, false, userId)
            return
        }

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(filmElementSelector, getConfigData("USER_AUTO_SCRAPE"), userId)

        // inject backdrop
        if (scrapedImage) {
            commonUtils.injectBackdrop(header, scrapedImage, getConfigData("USER_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

            if (isCached) return

            setItemData(userId, "bUrl", scrapedImage)
        }
    }

    async function listPageInjector() {
        const listId = `l/${location.pathname.split("/")?.[1]}/${location.pathname.split("/")?.[3]}`

        const filmElementSelector = ".poster-list > li:first-child a"

        const cacheBackdrop = getItemData(listId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        injectContextMenuToAllPosterItems({ itemId: listId, name: "list" })

        // remove short backdrop classnames for non custom backrop list pages
        if (!getConfigData("LIST_SHORT_BACKDROP")) document.body.classList.remove("shortbackdropped", "-crop")

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("LIST_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            commonUtils.scrapeFilmLinkElement(filmElementSelector, false, listId)
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) {
            commonUtils.scrapeFilmLinkElement(filmElementSelector, false, listId)
            return
        }

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(filmElementSelector, getConfigData("LIST_AUTO_SCRAPE"), listId)

        // inject backdrop
        if (scrapedImage) {
            commonUtils.injectBackdrop(header, scrapedImage, getConfigData("LIST_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

            if (isCached) return

            setItemData(listId, "bUrl", scrapedImage)
        }
    }

    async function personPageInjector() {
        const personId = `p/${location.pathname.split("/")?.[2]}`

        const filmElementSelector = ".grid > li:first-child a"

        const cacheBackdrop = getItemData(personId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        injectContextMenuToAllPosterItems({ itemId: personId, name: "person" })

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("PERSON_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            commonUtils.scrapeFilmLinkElement(filmElementSelector, false, personId)
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) {
            commonUtils.scrapeFilmLinkElement(filmElementSelector, false, personId)
            return
        }

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(filmElementSelector, getConfigData("PERSON_AUTO_SCRAPE"), personId)

        // inject backdrop
        if (scrapedImage) {
            commonUtils.injectBackdrop(header, scrapedImage, getConfigData("PERSON_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

            if (isCached) return

            setItemData(personId, "bUrl", scrapedImage)
        }
    }

    async function reviewPageInjector() {
        const filmName = location.pathname.match(/\/film\/([^\/]+)/)?.[1]
        const filmId = `f/${filmName}`

        const filmElementSelector = `.film-poster a[href^="/film/"]`

        const cacheBackdrop = getItemData(filmId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        injectContextMenuToAllPosterItems()

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("REVIEW_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) return

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(filmElementSelector, getConfigData("REVIEW_AUTO_SCRAPE"), filmId)

        // inject backdrop
        if (scrapedImage) {
            commonUtils.injectBackdrop(header, scrapedImage, ["shortbackdropped", "-crop"])

            if (isCached) return

            setItemData(filmId, "bUrl", scrapedImage)
        }
    }

    // MAIN

    const currentURL = location.protocol + "//" + location.hostname + location.pathname

    if (
        /^(https?:\/\/letterboxd\.com\/[^\/]+(?:\/\?.*)?\/?)$/.test(currentURL) &&
        !["/settings/", "/films/", "/lists/", "/members/", "/journal/", "/sign-in/", "/create-account/", "/pro/"].some((ending) =>
            currentURL.toLowerCase().endsWith(ending)
        )
    ) {
        userPageInjector()
    } else if (/^(https?:\/\/letterboxd\.com\/film\/[^\/]+\/?(crew|details|releases|genres)?\/)$/.test(currentURL)) {
        filmPageInjector()
    } else if (
        /^(https?:\/\/letterboxd\.com\/[A-Za-z0-9-_]+\/list\/[A-Za-z0-9-_]+(?:\/(by|language|country|decade|genre|on|detail|year)\/[A-Za-z0-9-_\/]+)?\/(?:detail\/?)?)$/.test(
            currentURL
        )
    ) {
        listPageInjector()
    } else if (
        /^(https?:\/\/letterboxd\.com\/(director|actor|producer|executive-producer|writer|cinematography|additional-photography|editor|sound|story|visual-effects)\/[A-Za-z0-9-_]+(?:\/(by|language|country|decade|genre|on|year)\/[A-Za-z0-9-_\/]+)?\/?)$/.test(
            currentURL
        )
    ) {
        personPageInjector()
    } else if (/^(https?:\/\/letterboxd\.com\/[A-Za-z0-9-_]+\/film\/[A-Za-z0-9-_]+\/(\d+\/)?(?:reviews\/?)?)$/.test(currentURL)) {
        reviewPageInjector()
    }
})()
