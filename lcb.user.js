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

        FILM_SHORT_BACKDROP: false,

        LIST_AUTO_SCRAPE: true,
        LIST_SHORT_BACKDROP: true,

        USER_AUTO_SCRAPE: true,
        USER_SHORT_BACKDROP: false,
        CURRENT_USER_BACKDROP_ONLY: true,

        PERSON_AUTO_SCRAPE: true,
        PERSON_SHORT_BACKDROP: true,

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
        `)

    async function showImageUrlPopup(itemId) {
        // Create overlay element
        const overlay = document.createElement("div")
        overlay.id = "lcb-settings-overlay"
        overlay.onclick = (e) => {
            if (e.target === overlay) closePopup(overlay)
        }

        // Popup element
        const popup = document.createElement("div")
        popup.id = "lcb-settings-popup"

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
        createLabelElement("Film Page:")
        createCheckboxElement("Short backdrops", "FILM_SHORT_BACKDROP")
        createInputElement("Enter your TMDB API key to display missing film backdrops (optional):", "TMDB_API_KEY", "TMDB API Key")
        createSpaceComponent()

        createLabelElement("List Page:")
        createCheckboxElement("Auto scrape backdrops", "LIST_AUTO_SCRAPE")
        createCheckboxElement("Short backdrops", "LIST_SHORT_BACKDROP")
        createSpaceComponent()

        createLabelElement("User Page:")
        createCheckboxElement("Auto scrape backdrops", "USER_AUTO_SCRAPE")
        createCheckboxElement("Short backdrops", "USER_SHORT_BACKDROP")
        createCheckboxElement("Don't scrape backdrops for other free tier users", "CURRENT_USER_BACKDROP_ONLY")
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

        async function extractBackdropUrlFromLetterboxdFilmPage(dom) {
            const filmBackdropUrl = await isDefaultBackdropAvailable(dom)

            if (!filmBackdropUrl) {
                // get tmdb id
                let tmdbElement
                if (dom) {
                    tmdbElement = dom.querySelector(`.micro-button.track-event[data-track-action="TMDb"]`)
                } else {
                    tmdbElement = await waitForElement(`.micro-button.track-event[data-track-action="TMDb"]`, 5000)
                }
                const tmdbIdType = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[1] ?? null
                const tmdbId = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[2] ?? null

                // get tmdb backdrop
                return await getTmdbBackdrop(tmdbIdType, tmdbId)
            }

            return filmBackdropUrl
        }

        async function scrapeFilmLinkElement(selector, shouldScrape) {
            const firstPosterElement = await waitForElement(selector, 2000)
            const filmName = firstPosterElement.href?.match(/\/film\/([^\/]+)/)?.[1]

            const cacheBackdrop = getItemData(`f/${filmName}`, "bUrl")

            if (cacheBackdrop) {
                return [cacheBackdrop, true]
            } else if (!shouldScrape) {
                return null
            }

            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `https://letterboxd.com/film/${filmName}/`,
                    onload: async function (response) {
                        const parser = new DOMParser()
                        const dom = parser.parseFromString(response.responseText, "text/html")

                        resolve([await extractBackdropUrlFromLetterboxdFilmPage(dom), false])
                    },
                    onerror: function (error) {
                        console.error(`Can't scrape Letterboxd page: ${firstPosterElement.href}`, error)
                        resolve(null)
                    },
                })
            })
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
            scrapeFilmLinkElement: scrapeFilmLinkElement,
            isDefaultBackdropAvailable: isDefaultBackdropAvailable,
            injectBackdrop: injectBackdrop,
        }
    })()

    async function filmPageContextMenuInjector(filmId) {
        const panelRateElement = await commonUtils.waitForElement("li.panel-rate", 2000)

        const setFilmBackdropMenu = document.createElement("li")

        const anchor = document.createElement("a")
        anchor.textContent = "Set film backdrop"
        anchor.style.cursor = "pointer"
        anchor.onclick = () => showImageUrlPopup(filmId)
        setFilmBackdropMenu.appendChild(anchor)

        panelRateElement.parentNode.insertBefore(setFilmBackdropMenu, panelRateElement.nextSibling)
    }

    async function filmPageInjector() {
        const filmId = `f/${location.pathname.split("/")?.[2]}`

        const header = await commonUtils.waitForElement("#header")
        filmPageContextMenuInjector(filmId)

        const cacheBackdrop = getItemData(filmId, "bUrl")

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("FILM_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) return

        if (getConfigData("TMDB_API_KEY")) {
            const backdropUrl = await commonUtils.extractBackdropUrlFromLetterboxdFilmPage()

            // inject backdrop
            if (backdropUrl) {
                commonUtils.injectBackdrop(header, backdropUrl, getConfigData("FILM_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

                setItemData(filmId, "bUrl", backdropUrl)
            }
        }
    }

    async function profilePageContextMenuInjector(userId) {
        const copyLinkMenu = await commonUtils.waitForElement(`.menuitem:has(> button[data-menuitem-trigger="clipboard"])`, 2000)

        const setProfileBackdropMenu = document.createElement("div")
        setProfileBackdropMenu.classList.add("menuitem", "-trigger", "-has-icon", "js-menuitem")
        setProfileBackdropMenu.role = "none"

        const setProfileBackdropMenuButton = document.createElement("button")
        setProfileBackdropMenuButton.type = "button"
        setProfileBackdropMenuButton.role = "menuitem"
        setProfileBackdropMenuButton.setAttribute("data-dismiss", "dropdown")
        setProfileBackdropMenuButton.onclick = () => showImageUrlPopup(userId)

        setProfileBackdropMenuButton.innerHTML = `
            <svg class="glyph" role="presentation" width="8" height="8" viewBox="0 0 16 16" style="margin-bottom: 6px">
                <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" sketch:type="MSPage">
                    <g id="Icon-Set" sketch:type="MSLayerGroup" transform="translate(-360.000000, -99.000000)" fill="currentColor">
                        <path
                            d="M368,109 C366.896,109 366,108.104 366,107 C366,105.896 366.896,105 368,105 C369.104,105 370,105.896 370,107 C370,108.104 369.104,109 368,109 L368,109 Z M368,103 C365.791,103 364,104.791 364,107 C364,109.209 365.791,111 368,111 C370.209,111 372,109.209 372,107 C372,104.791 370.209,103 368,103 L368,103 Z M390,116.128 L384,110 L374.059,120.111 L370,116 L362,123.337 L362,103 C362,101.896 362.896,101 364,101 L388,101 C389.104,101 390,101.896 390,103 L390,116.128 L390,116.128 Z M390,127 C390,128.104 389.104,129 388,129 L382.832,129 L375.464,121.535 L384,112.999 L390,118.999 L390,127 L390,127 Z M364,129 C362.896,129 362,128.104 362,127 L362,126.061 L369.945,118.945 L380.001,129 L364,129 L364,129 Z M388,99 L364,99 C361.791,99 360,100.791 360,103 L360,127 C360,129.209 361.791,131 364,131 L388,131 C390.209,131 392,129.209 392,127 L392,103 C392,100.791 390.209,99 388,99 L388,99 Z"
                            id="image-picture"
                            sketch:type="MSShapeGroup"
                        ></path>
                    </g>
                </g>
            </svg>
            <span class="label">Set profile backdrop</span>
            `

        setProfileBackdropMenu.appendChild(setProfileBackdropMenuButton)
        copyLinkMenu.parentNode.insertBefore(setProfileBackdropMenu, copyLinkMenu.nextSibling)
    }

    async function profilePageInjector() {
        const userId = `u/${location.pathname.split("/")?.[1]}`

        const loggedInAs = document.cookie
            ?.split("; ")
            ?.find((row) => row.startsWith("letterboxd.signed.in.as="))
            ?.split("=")[1]

        if (getConfigData("CURRENT_USER_BACKDROP_ONLY") && location.pathname.split("/")?.[1] !== loggedInAs) return

        const cacheBackdrop = getItemData(userId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        profilePageContextMenuInjector(userId)

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("USER_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) return

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(
            "#favourites .poster-list > li:first-child a",
            getConfigData("USER_AUTO_SCRAPE")
        )

        // inject backdrop
        if (scrapedImage) {
            commonUtils.injectBackdrop(header, scrapedImage, getConfigData("USER_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

            if (isCached) return

            setItemData(userId, "bUrl", scrapedImage)
        }
    }

    async function listPageContextMenuInjector(listId) {
        const panelRateElement = await commonUtils.waitForElement("li.like-link-target", 2000)

        const setListBackdropMenu = document.createElement("li")

        const anchor = document.createElement("a")
        anchor.textContent = "Set list backdrop"
        anchor.style.cursor = "pointer"
        anchor.onclick = () => showImageUrlPopup(listId)
        setListBackdropMenu.appendChild(anchor)

        panelRateElement.parentNode.insertBefore(setListBackdropMenu, panelRateElement.nextSibling)
    }

    async function listPageInjector() {
        const listId = `l/${location.pathname.split("/")?.[1]}/${location.pathname.split("/")?.[3]}`

        const cacheBackdrop = getItemData(listId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        listPageContextMenuInjector(listId)

        // remove short backdrop classnames for non custom backrop list pages
        if (!getConfigData("LIST_SHORT_BACKDROP")) document.body.classList.remove("shortbackdropped", "-crop")

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("LIST_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) return

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(".poster-list > li:first-child a", getConfigData("LIST_AUTO_SCRAPE"))

        // inject backdrop
        if (scrapedImage) {
            commonUtils.injectBackdrop(header, scrapedImage, getConfigData("LIST_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

            if (isCached) return

            setItemData(listId, "bUrl", scrapedImage)
        }
    }

    async function personPageContextMenuInjector(personId) {
        const personImageElement = await commonUtils.waitForElement(".person-image", 2000)

        // Create the button element
        const setPersonBackdropButton = document.createElement("button")

        // Set the attributes and styles
        setPersonBackdropButton.style.borderRadius = "4px"
        setPersonBackdropButton.style.width = "100%"
        setPersonBackdropButton.style.border = "1px solid hsla(0,0%,100%,0.25)"
        setPersonBackdropButton.style.backgroundColor = "transparent"
        setPersonBackdropButton.style.color = "#9ab"
        setPersonBackdropButton.style.height = "40px"
        setPersonBackdropButton.style.cursor = "pointer"
        setPersonBackdropButton.style.fontFamily = "Graphik-Regular-Web, sans-serif"
        setPersonBackdropButton.textContent = "Set person backdrop"

        setPersonBackdropButton.addEventListener("mouseenter", () => {
            setPersonBackdropButton.style.color = "#def"
        })
        setPersonBackdropButton.addEventListener("mouseleave", () => {
            setPersonBackdropButton.style.color = "#9ab"
        })

        setPersonBackdropButton.onclick = () => showImageUrlPopup(personId)

        personImageElement.parentNode.insertBefore(setPersonBackdropButton, personImageElement.nextSibling)
    }

    async function personPageInjector() {
        const personId = `p/${location.pathname.split("/")?.[2]}`

        const cacheBackdrop = getItemData(personId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        personPageContextMenuInjector(personId)

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("PERSON_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) return

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(".grid > li:first-child a", getConfigData("PERSON_AUTO_SCRAPE"))

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

        const cacheBackdrop = getItemData(filmId, "bUrl")

        const header = await commonUtils.waitForElement("#header")
        filmPageContextMenuInjector(filmId)

        if (cacheBackdrop) {
            // inject backdrop
            commonUtils.injectBackdrop(header, cacheBackdrop, getConfigData("REVIEW_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
            return
        }

        // if original backdrop is available then return
        if (await commonUtils.isDefaultBackdropAvailable()) return

        const [scrapedImage, isCached] = await commonUtils.scrapeFilmLinkElement(
            `.film-poster a[href^="/film/"]`,
            getConfigData("REVIEW_AUTO_SCRAPE")
        )

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
        profilePageInjector()
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
