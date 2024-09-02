// ==UserScript==
// @name         Letterboxd Custom Backdrops
// @description  Adds a custom backdrop to your profile, list and film pages that don’t have one
// @author       Tetrax-10
// @namespace    https://github.com/Tetrax-10/letterboxd-custom-backdrops
// @version      1.0
// @license      MIT
// @match        *://*.letterboxd.com/*
// @connect      themoviedb.org
// @homepageURL  https://github.com/Tetrax-10/letterboxd-custom-backdrops
// @supportURL   https://github.com/Tetrax-10/letterboxd-custom-backdrops/issues
// @updateURL    https://tetrax-10.github.io/letterboxd-custom-backdrops/lcb.user.js
// @downloadURL  https://tetrax-10.github.io/letterboxd-custom-backdrops/lcb.user.js
// @icon         https://tetrax-10.github.io/letterboxd-custom-backdrops/assets/icon.png
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

;(() => {
    GM_registerMenuCommand("Settings", showPopup)

    function showPopup() {
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
            z-index: 1000;
        }
        #lcb-settings-popup {
            background-color: #20242c;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 1001;
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
        #lcb-settings-popup .input-row {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        #lcb-settings-popup .input-row input[type="text"]:first-child {
            width: 20%;
            max-width: 100px;
        }
        #lcb-settings-popup .input-row input[type="text"]:nth-child(2) {
            flex-grow: 1;
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
        #lcb-settings-popup .custom-backdrop-container {
            display: flex;
            flex-direction: column;
        }`)

        // Create overlay
        const overlay = document.createElement("div")
        overlay.id = "lcb-settings-overlay"
        overlay.onclick = (e) => {
            if (e.target === overlay) closePopup(overlay)
        }

        // Popup element
        const popup = document.createElement("div")
        popup.id = "lcb-settings-popup"

        function createInputElement(name, id) {
            // Create label
            const label = document.createElement("label")
            label.textContent = name

            // Create input element
            const input = document.createElement("input")
            input.type = "text"
            input.value = GM_getValue(id, "")
            input.oninput = (e) => GM_setValue(id, e.target.value)

            // Inject to popup
            popup.appendChild(label)
            popup.appendChild(input)
        }

        function createCustomBackdropInput(filmId = "", url = "") {
            const row = document.createElement("div")
            row.className = "input-row"

            // film id input
            const filmIdInput = document.createElement("input")
            filmIdInput.type = "text"
            filmIdInput.placeholder = "Film ID"
            filmIdInput.value = filmId
            filmIdInput.maxLength = 10 // Limit the length of Film ID input
            filmIdInput.oninput = () => updateCustomBackdrops()

            // backdrop url input
            const urlInput = document.createElement("input")
            urlInput.type = "text"
            urlInput.placeholder = "Backdrop URL"
            urlInput.value = url
            urlInput.oninput = () => updateCustomBackdrops()

            // Add the new row to the container
            row.appendChild(filmIdInput)
            row.appendChild(urlInput)

            // Prepend the new row at the top of the container
            customBackdropContainer.insertBefore(row, customBackdropContainer.children[2])
        }

        function updateCustomBackdrops() {
            const rows = customBackdropContainer.querySelectorAll(".input-row")
            const customBackdrops = {}

            rows.forEach((row) => {
                const filmId = row.children[0].value.trim()
                const url = row.children[1].value.trim()
                if (filmId && url && !customBackdrops[filmId]) {
                    customBackdrops[filmId] = url
                }
            })

            GM_setValue("CUSTOM_BACKDROPS", customBackdrops)
        }

        // Export settings to a JSON file
        function exportSettings() {
            const settings = {
                LETTERBOXD_USERNAME: GM_getValue("LETTERBOXD_USERNAME", ""),
                PROFILE_BACKDROP_URL: GM_getValue("PROFILE_BACKDROP_URL", ""),
                TMDB_API_KEY: GM_getValue("TMDB_API_KEY", ""),
                CUSTOM_BACKDROPS: GM_getValue("CUSTOM_BACKDROPS", {}),
            }
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
                    GM_setValue("LETTERBOXD_USERNAME", settings.LETTERBOXD_USERNAME || "")
                    GM_setValue("PROFILE_BACKDROP_URL", settings.PROFILE_BACKDROP_URL || "")
                    GM_setValue("TMDB_API_KEY", settings.TMDB_API_KEY || "")
                    GM_setValue("CUSTOM_BACKDROPS", settings.CUSTOM_BACKDROPS || {})

                    // Refresh the popup to reflect imported settings
                    closePopup(overlay, false)
                    showPopup()
                } catch (err) {
                    alert("Failed to import settings: Invalid JSON file.")
                }
            }
            reader.readAsText(file)
        }

        // Add input fields for static values
        createInputElement("Enter your Letterboxd Username:", "LETTERBOXD_USERNAME")
        createInputElement("Enter your Profile Backdrop URL:", "PROFILE_BACKDROP_URL")
        createInputElement("Enter your TMDB API key:", "TMDB_API_KEY")

        // Create a container for custom backdrop input sets
        const customBackdropContainer = document.createElement("div")
        customBackdropContainer.className = "custom-backdrop-container"

        // Create label
        const cblabel = document.createElement("label")
        cblabel.textContent = "Custom Backdrops"
        cblabel.style.marginTop = "20px"
        customBackdropContainer.appendChild(cblabel)

        // Add "New" button at the top of the custom backdrop container
        const newButton = document.createElement("button")
        newButton.textContent = "New Custom Backdrop"
        newButton.onclick = () => createCustomBackdropInput()
        customBackdropContainer.appendChild(newButton)

        popup.appendChild(customBackdropContainer)

        // Add existing custom backdrops in reversed order (latest on top)
        const customBackdrops = GM_getValue("CUSTOM_BACKDROPS", {})
        Object.keys(customBackdrops)
            .reverse() // Reverse to ensure latest entries are on top
            .forEach((filmId) => {
                createCustomBackdropInput(filmId, customBackdrops[filmId])
            })

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

        // Inject the popup and overlay into the document
        overlay.appendChild(popup)
        document.body.appendChild(overlay)

        function closePopup(overlay, isSave = true) {
            // Save the latest custom backdrop object before closing
            if (isSave) updateCustomBackdrops()
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
            const tmdbRawRes = await fetch(`https://api.themoviedb.org/3/${tmdbIdType}/${tmdbId}/images?api_key=${GM_getValue("TMDB_API_KEY", "")}`)
            const tmdbRes = await tmdbRawRes.json()

            const imageId = tmdbRes.backdrops?.[0]?.file_path

            return imageId ? `https://image.tmdb.org/t/p/original${imageId}` : null
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
            injectBackdrop: injectBackdrop,
        }
    })()

    async function filmPageInjector() {
        while (!document.body?.classList) {
            await new Promise((resolve) => setTimeout(resolve, 10))
        }

        const header = await commonUtils.waitForElement("#header")

        const filmIdElement = await commonUtils.waitForElement(`.urlgroup >input[value^="https://boxd.it/"]`)
        const filmId = filmIdElement.value?.match(/https:\/\/boxd\.it\/([a-zA-Z0-9]+)/)?.[1] ?? null

        const customBackdrops = GM_getValue("CUSTOM_BACKDROPS", {})

        if (customBackdrops[filmId]) {
            // inject backdrop
            commonUtils.injectBackdrop(header, customBackdrops[filmId])
            return
        }

        // if original backdrop is available then return
        if (document.querySelector(".backdrop-container")?.innerHTML.includes("https://a.ltrbxd.com/resized/sm/upload")) return

        // get tmdb id
        const tmdbElement = await commonUtils.waitForElement(`.micro-button.track-event[data-track-action="TMDb"]`)
        const tmdbIdType = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[1] ?? null
        const tmdbId = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[2] ?? null

        // get backdrop
        const backdropUrl = await commonUtils.getTmdbBackdrop(tmdbIdType, tmdbId)
        if (!backdropUrl) return

        // inject backdrop
        commonUtils.injectBackdrop(header, backdropUrl)
    }

    async function profilePageInjector() {
        if (!GM_getValue("LETTERBOXD_USERNAME", "") || !GM_getValue("PROFILE_BACKDROP_URL", "")) return

        while (!document.body?.classList) {
            await new Promise((resolve) => setTimeout(resolve, 10))
        }

        const header = await commonUtils.waitForElement("#header")

        // inject backdrop
        commonUtils.injectBackdrop(header, GM_getValue("PROFILE_BACKDROP_URL", ""))
    }

    // async function getFirstItemTmdbId() {
    //     const firstElement = await commonUtils.waitForElement("ul.poster-list > li.poster-container a")

    //     return new Promise((resolve) => {
    //         GM_xmlhttpRequest({
    //             method: "GET",
    //             url: firstElement.href,
    //             onload: function (response) {
    //                 const parser = new DOMParser()
    //                 const dom = parser.parseFromString(response.responseText, "text/html")

    //                 // get tmdb id
    //                 const tmdbElement = dom.querySelector(`.micro-button.track-event[data-track-action="TMDb"]`)
    //                 const tmdbIdType = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[1] ?? null
    //                 const tmdbId = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[2] ?? null

    //                 resolve([tmdbIdType, tmdbId])
    //             },
    //             onerror: function (error) {
    //                 console.error(`Can't scrape Letterboxd page: ${firstElement.href}`, error)
    //             },
    //         })
    //     })
    // }

    async function listPageInjector() {
        while (!document.body?.classList) {
            await new Promise((resolve) => setTimeout(resolve, 10))
        }

        const header = await commonUtils.waitForElement("#header")

        const filmIdElement = await commonUtils.waitForElement(`.urlgroup >input[value^="https://boxd.it/"]`)
        const filmId = filmIdElement.value?.match(/https:\/\/boxd\.it\/([a-zA-Z0-9]+)/)?.[1] ?? null

        const customBackdrops = GM_getValue("CUSTOM_BACKDROPS", {})

        if (customBackdrops[filmId]) {
            // inject backdrop
            commonUtils.injectBackdrop(header, customBackdrops[filmId], ["shortbackdropped", "-crop"])
            return
        }
    }

    const currentURL = location.protocol + "//" + location.hostname + location.pathname

    if (
        /^(https?:\/\/letterboxd\.com\/[^\/]+(?:\/\?.*)?\/?)$/.test(currentURL) &&
        currentURL.toLowerCase().endsWith(`${GM_getValue("LETTERBOXD_USERNAME", "")}/`.toLowerCase())
    ) {
        // letterboxd your profile page
        profilePageInjector()
    } else if (
        /^(https?:\/\/letterboxd\.com\/film\/[^\/]+\/?(crew|details|releases|genres)?\/)$/.test(currentURL) &&
        GM_getValue("TMDB_API_KEY", "")
    ) {
        // Letterboxd film page
        filmPageInjector()
    } else if (/^(https?:\/\/letterboxd\.com\/[A-Za-z0-9-_]+\/list\/[A-Za-z0-9-_]+\/?)$/.test(currentURL)) {
        // Letterboxd list page
        listPageInjector()
    }
})()
