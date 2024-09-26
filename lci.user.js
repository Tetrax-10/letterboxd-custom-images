// ==UserScript==
// @name         Letterboxd Custom Images
// @description  Customize letterboxd posters and backdrops without letterboxd PATRON
// @author       Tetrax-10
// @namespace    https://github.com/Tetrax-10/letterboxd-custom-images
// @version      4.0
// @license      MIT
// @match        *://*.letterboxd.com/*
// @connect      themoviedb.org
// @homepageURL  https://github.com/Tetrax-10/letterboxd-custom-images
// @supportURL   https://github.com/Tetrax-10/letterboxd-custom-images/issues
// @updateURL    https://tetrax-10.github.io/letterboxd-custom-images/lci.user.js
// @downloadURL  https://tetrax-10.github.io/letterboxd-custom-images/lci.user.js
// @icon         https://tetrax-10.github.io/letterboxd-custom-images/assets/icon.png
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

;(() => {
    // Register menu command to open settings popup
    GM_registerMenuCommand("Settings", showSettingsPopup)

    let currentPage = null

    // Retrieve logged-in username from cookies
    const loggedInAs =
        document.cookie
            ?.split("; ")
            ?.find((row) => row.startsWith("letterboxd.signed.in.as="))
            ?.split("=")[1]
            ?.toLowerCase() || null // Add null check for safety

    // Retrieve useMobileSite setting from cookies
    const isMobile =
        document.cookie
            ?.split("; ")
            ?.find((row) => row.startsWith("useMobileSite"))
            ?.split("=")[1]
            ?.toLowerCase() === "yes" || false

    // Default configuration settings
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

    // Initialize configuration with defaults if not already set
    try {
        const currentConfig = GM_getValue("CONFIG", {})
        if (currentConfig.FILM_SHORT_BACKDROP === undefined) {
            GM_setValue("CONFIG", defaultConfig)
            console.debug("Configuration initialized with default values.")
        } else {
            Object.entries(defaultConfig).forEach(([key, value]) => {
                if (currentConfig[key] === undefined) {
                    currentConfig[key] = value
                    console.debug("Configuration updated with default value for", key)
                }
            })
            GM_setValue("CONFIG", currentConfig)
        }
    } catch (error) {
        console.error("Error initializing configuration:", error)
    }

    // Function to get a specific configuration value
    function getConfigData(configId) {
        try {
            const config = GM_getValue("CONFIG", {})
            return config[configId]
        } catch (error) {
            console.error(`Error getting config data for ${configId}:`, error)
            return null
        }
    }

    // Function to set a specific configuration value
    function setConfigData(configId, value) {
        try {
            const config = GM_getValue("CONFIG", {})
            config[configId] = value
            GM_setValue("CONFIG", config)
            console.debug(`Config data for ${configId} updated.`)
        } catch (error) {
            console.error(`Error setting config data for ${configId}:`, error)
        }
    }

    // IndexedDB database variables
    let db = null
    let upgradeNeeded = false

    // Function to open the IndexedDB database
    function openDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("ItemDataDB", 1)

            request.onupgradeneeded = (event) => {
                db = event.target.result
                if (!db.objectStoreNames.contains("itemData")) {
                    db.createObjectStore("itemData", { keyPath: "itemId" })
                    upgradeNeeded = true
                    console.debug("Database upgrade needed, object store created.")
                }
            }

            request.onsuccess = (event) => {
                db = event.target.result
                console.debug("Database connection established.")
                resolve(db)
            }

            request.onerror = (event) => {
                console.error("Error opening database:", event.target.errorCode)
                reject(event.target.errorCode)
            }
        })
    }

    // Function to get the database instance
    async function getDatabase() {
        if (!db)
            db = await openDb().catch((error) => {
                console.error("Failed to open database:", error)
                throw error
            })
        return db
    }

    // Initialize the database and migrate old data if needed
    getDatabase()
        .then(async () => {
            if (upgradeNeeded) {
                const ITEM_DATA = GM_getValue("ITEM_DATA", {})
                if (Object.keys(ITEM_DATA).length) {
                    await setItemData(ITEM_DATA).catch((error) => {
                        console.error("Failed to migrate old item data:", error)
                    })
                    console.debug("Old item data migrated.")
                }
            }

            // Clean up old stored values except for the configuration
            let allKeys = GM_listValues()
            for (let i = 0; i < allKeys.length; i++) {
                const key = allKeys[i]
                if (key !== "CONFIG") {
                    GM_deleteValue(key)
                    console.debug("Deleted old stored value:", key)
                }
            }
        })
        .catch((error) => {
            console.error("Failed to initialize database and migrate data:", error)
        })

    // Function to get item data from the database
    async function getItemData(itemId, dataType) {
        try {
            const db = await getDatabase()
            return new Promise((resolve, reject) => {
                const transaction = db.transaction("itemData", "readonly")
                const store = transaction.objectStore("itemData")

                if (!itemId) {
                    // Get all items if no itemId is provided
                    const request = store.getAll()
                    request.onsuccess = (event) => {
                        const items = event.target.result
                        const result = {}

                        items.forEach((item) => {
                            const id = item.itemId
                            delete item.itemId
                            result[id] = item
                        })
                        resolve(result)
                        console.debug("Retrieved all item data.")
                    }

                    request.onerror = (event) => {
                        console.error("Error retrieving all item data:", event.target.error)
                        reject(event.target.error)
                    }
                    return
                }

                const request = store.get(itemId)
                request.onsuccess = (event) => {
                    const itemData = event.target.result || {}
                    let value = itemData[dataType] ?? ""

                    // Handle specific data transformations based on dataType
                    switch (dataType) {
                        case "pu":
                        case "bu":
                            if (value.startsWith("t/")) {
                                value = `https://image.tmdb.org/t/p/original/${value.slice(2)}.jpg`
                            }
                            break
                        case "ty":
                            if (value === "m") {
                                value = "movie"
                            } else if (value === "t") {
                                value = "tv"
                            }
                            break
                    }

                    resolve(value)
                    console.debug(`Retrieved item data for ${itemId}, type: ${dataType}`)
                }

                request.onerror = (event) => {
                    console.error(`Error retrieving item data for ${itemId}:`, event.target.error)
                    reject(event.target.error)
                }
            })
        } catch (error) {
            console.error(`Error in getItemData for itemId ${itemId} and dataType ${dataType}:`, error)
            throw error
        }
    }

    // Function to set item data in the database
    async function setItemData(itemId, dataType, value) {
        try {
            const db = await getDatabase()
            return new Promise((resolve, reject) => {
                const transaction = db.transaction("itemData", "readwrite")
                const store = transaction.objectStore("itemData")

                store.get(typeof itemId === "object" ? "" : itemId).onsuccess = (event) => {
                    const itemData = event.target.result || {}

                    if (typeof itemId === "object") {
                        // If itemId is an object, assume it's a full data object to be inserted
                        Object.keys(itemId).forEach((id) => {
                            store.put({ itemId: id, ...itemId[id] })
                        })
                        console.debug("Bulk item data inserted.")
                        resolve()
                        return
                    }

                    const data = itemData || {}

                    // Handle specific data transformations based on dataType
                    if (!value) {
                        delete data[dataType]
                    } else {
                        switch (dataType) {
                            case "pu":
                            case "bu":
                                if (value.startsWith("https://image.tmdb.org/t/p/")) {
                                    const id = value.match(/\/([^\/]+)\.jpg$/)?.[1] ?? ""
                                    if (id) data[dataType] = `t/${id}`
                                } else {
                                    data[dataType] = value
                                }
                                break
                            case "ty":
                                if (value === "movie") {
                                    data[dataType] = "m"
                                } else {
                                    data[dataType] = "t"
                                }
                                break
                            default:
                                data[dataType] = value
                                break
                        }
                    }

                    store.put({ itemId, ...data })
                    console.debug(`Item data set for ${itemId}, type: ${dataType}`)
                    resolve()
                }

                transaction.onerror = (event) => {
                    console.error(`Error setting item data for ${itemId}:`, event.target.error)
                    reject(event.target.error)
                }
            })
        } catch (error) {
            console.error(`Error in setItemData for itemId ${itemId} and dataType ${dataType}:`, error)
            throw error
        }
    }

    GM_addStyle(`
        #lci-settings-overlay {
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
            overflow: hidden;
        }
        #lci-settings-popup {
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
            width: ${isMobile ? "80%" : "50%"};
            max-height: 80vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            -webkit-overflow-scrolling: touch;
        }
        #lci-settings-popup[type="imageurlpopup"] {
            width: 80%;
        }
        body.lci-no-scroll {
            overflow: hidden;
        }
        #lci-settings-popup label {
            color: #cfcfcf;
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 10px;
        }
        #lci-settings-popup input {
            background-color: #20242c;
            border: 1px solid #cfcfcf;
            color: #cfcfcf;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        #lci-settings-popup button {
            background-color: #4caf50;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 10px;
        }
        #lci-settings-popup .import-export-container {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
        }
        .lci-checkbox-container {
            display: flex;
            align-items: center;
        }
        .lci-checkbox-container input[type="checkbox"] {
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
        .lci-checkbox-container input[type="checkbox"]:checked {
            background-color: #4caf50;
            border: none;
        }
        .lci-checkbox-container input[type="checkbox"]:checked::after {
            content: '\\2714'; /* Unicode checkmark */
            color: white;
            font-size: 1em;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        .lci-checkbox-container label {
            color: #cfcfcf;
            font-weight: bold;
            font-size: 1.2em;
        }
        #lci-image-grid {
            display: grid;
            grid-template-columns: repeat(${isMobile ? "1" : "3"}, 1fr);
            gap: 15px;
            margin-top: 20px;
        }
        #lci-image-grid.lci-poster-grid {
            grid-template-columns: repeat(${isMobile ? "2" : "5"}, 1fr);
        }
        .lci-image-item {
            cursor: pointer;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid transparent;
            transition: border-color 0.3s;
            position: relative;
        }
        .lci-image-item img {
            width: 100%;
            height: auto;
            display: block;
        }
        .lci-image-item:hover {
            border-color: #4caf50;
        }
        #lci-loading-spinner {
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

    async function showImageUrlPopup({ itemId, targetedFilmId, filmElementSelector, mode = "backdrop" } = {}) {
        const modeName = mode === "poster" ? "Poster" : "Backdrop"
        const imageUrlKey = mode === "poster" ? "pu" : "bu"
        let hasInputValueChanged = false

        // Add the no-scroll class to the body
        document.body.classList.add("lci-no-scroll")

        // Create overlay for the popup
        const overlay = document.createElement("div")
        overlay.id = "lci-settings-overlay"
        overlay.onclick = (e) => {
            if (e.target === overlay) closePopup(overlay)
        }

        // Create popup container
        const popup = document.createElement("div")
        popup.id = "lci-settings-popup"
        popup.setAttribute("type", "imageurlpopup")

        // Add label for the input field
        const label = document.createElement("label")
        label.textContent = `Enter ${modeName} Image URL:`
        popup.appendChild(label)

        // Create input field for the URL
        const input = document.createElement("input")
        input.type = "text"
        try {
            input.value = await getItemData(itemId, imageUrlKey) // Retrieve existing image URL
        } catch (error) {
            console.error(`Failed to retrieve ${modeName} URL:`, error) // Log error if retrieval fails
            input.value = ""
        }
        input.placeholder = `${modeName} Image URL`
        if (!isMobile) input.autofocus = true
        input.oninput = () => {
            hasInputValueChanged = true
        }
        popup.appendChild(input)

        overlay.appendChild(popup)
        document.body.appendChild(overlay)

        // Focus on the input field after a short delay
        setTimeout(() => {
            if (!isMobile) input.focus()
        }, 100)

        async function updateImage(imageUrl, mode) {
            if (mode === "poster") {
                document.querySelectorAll(`.film-poster[data-film-link*="film/${itemId.slice(2)}"] .image`).forEach((posterImageElement) => {
                    injectPoster(posterImageElement, imageUrl)
                })
            } else if (mode === "backdrop" && currentPage !== "other") {
                const header = await waitForElement("#header")
                injectBackdrop(header, imageUrl, getConfigData(`${currentPage.toUpperCase()}_SHORT_BACKDROP`) ? ["shortbackdropped", "-crop"] : [])
            }
        }

        function closePopup(overlay) {
            if (hasInputValueChanged) {
                const imageUrl = document.querySelector(`input[placeholder="${modeName} Image URL"]`)?.value?.trim() || ""
                if (imageUrl) updateImage(imageUrl, mode)
                setItemData(itemId, imageUrlKey, imageUrl).catch((err) => {
                    console.error(`Failed to set ${modeName} URL:`, err)
                })
            }

            document.body.removeChild(overlay)
            // Remove the no-scroll class from the body
            document.body.classList.remove("lci-no-scroll")
        }

        // Exit if TMDB API key is not configured
        if (!getConfigData("TMDB_API_KEY")) return

        // Show loading spinner
        const spinner = document.createElement("div")
        spinner.id = "lci-loading-spinner"
        popup.appendChild(spinner)

        let filmId, tmdbIdType, tmdbId

        try {
            if (targetedFilmId) {
                // any item if but with targetedFilmId
                // "Set as item backdrop" context menu
                const targetedFilmTmdbId = await getItemData(targetedFilmId, "tId")
                if (targetedFilmTmdbId) {
                    filmId = targetedFilmId
                } else {
                    await scrapeFilmPage(targetedFilmId.slice(2))
                    filmId = targetedFilmId
                }
            } else if (itemId.startsWith("f/")) {
                // "Set film backdrop/poster" context menu
                const itemTmdbId = await getItemData(itemId, "tId")
                if (itemTmdbId) {
                    filmId = itemId
                } else {
                    await scrapeFilmPage(itemId.slice(2))
                    filmId = itemId
                }
            } else if (!itemId.startsWith("f/")) {
                // Set item backdrop menu
                const itemFilmId = await getItemData(itemId, "fId")
                const itemFilmTmdbId = await getItemData(itemFilmId, "tId")

                if (itemFilmTmdbId) {
                    filmId = itemFilmId
                } else {
                    await scrapeFilmLinkElement(filmElementSelector, true, itemId)
                    filmId = itemFilmId
                }
            }

            // Retrieve TMDB ID type and ID
            tmdbIdType = await getItemData(filmId, "ty")
            tmdbId = await getItemData(filmId, "tId")

            if (!tmdbIdType || !tmdbId) {
                console.error("TMDB ID or ID type is missing for filmId:", filmId) // Log missing ID error
                return
            }

            const imageGrid = document.createElement("div")
            imageGrid.id = "lci-image-grid"
            if (mode === "poster") imageGrid.className = "lci-poster-grid"
            popup.appendChild(imageGrid)

            async function getAllTmdbImages(tmdbIdType, tmdbId) {
                try {
                    const tmdbRawRes = await fetch(
                        `https://api.themoviedb.org/3/${tmdbIdType}/${tmdbId}/images?api_key=${getConfigData("TMDB_API_KEY")}`
                    )

                    if (!tmdbRawRes.ok) {
                        console.error(`Failed to fetch images from TMDB: ${tmdbRawRes.status} ${tmdbRawRes.statusText}`)
                        return []
                    }

                    const tmdbRes = await tmdbRawRes.json()

                    const images = tmdbRes[mode === "poster" ? "posters" : "backdrops"] || []

                    const localeImages = []
                    const nonLocaleImages = []

                    images.forEach((image) => {
                        if (image.iso_639_1 === null) {
                            nonLocaleImages.push(image.file_path)
                        } else {
                            localeImages.push(image)
                        }
                    })

                    const postersByLanguage = localeImages.reduce((acc, image) => {
                        const language = image.iso_639_1
                        if (!acc[language]) acc[language] = []
                        acc[language].push(image.file_path)
                        return acc
                    }, {})

                    const sortedLanguages = Object.keys(postersByLanguage).sort((a, b) => {
                        return postersByLanguage[b].length - postersByLanguage[a].length
                    })

                    const sortedLocaleImages = sortedLanguages.flatMap((language) => postersByLanguage[language])

                    return mode === "poster" ? [...sortedLocaleImages, ...nonLocaleImages] : [...nonLocaleImages, ...sortedLocaleImages]
                } catch (error) {
                    console.error("Error in getAllTmdbImages:", error)
                    return []
                }
            }

            let allImageUrls = await getAllTmdbImages(tmdbIdType, tmdbId)
            let currentRow = 0
            const columnsToLoad = isMobile ? 1 : mode === "poster" ? 5 : 3
            const rowsToLoad = 15 / columnsToLoad

            // Remove spinner and load initial images
            await loadImages()
            spinner.remove()

            async function loadImages() {
                const nextImages = allImageUrls.slice(currentRow * columnsToLoad, (currentRow + rowsToLoad) * columnsToLoad)
                nextImages.forEach((file_path) => {
                    const imageUrl = `https://image.tmdb.org/t/p/original${file_path}`

                    const imageItem = document.createElement("div")
                    imageItem.className = "lci-image-item"
                    if (imageUrl === input.value) imageItem.style.borderColor = "#40bcf4"

                    const img = document.createElement("img")
                    img.src = imageUrl.replace("original", mode === "poster" ? "w342" : "w780")
                    imageItem.appendChild(img)

                    imageItem.onclick = () => {
                        hasInputValueChanged = false
                        updateImage(imageUrl, mode)
                        setItemData(itemId, imageUrlKey, imageUrl).catch((err) => {
                            console.error(`Failed to set ${modeName} URL:`, err)
                        })
                        closePopup(overlay)
                    }
                    imageGrid.appendChild(imageItem)
                })

                currentRow += rowsToLoad
            }

            // Auto-load more images when scrolling to the bottom using IntersectionObserver
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    if (currentRow * columnsToLoad < allImageUrls.length) {
                        loadImages()
                    } else {
                        // Disconnect the observer when all images are loaded
                        observer.disconnect()
                    }
                }
            })

            // Create a sentinel element at the bottom of the image grid to trigger loading
            const sentinel = document.createElement("div")
            sentinel.id = "lci-sentinel"
            popup.appendChild(sentinel)

            observer.observe(sentinel)
        } catch (error) {
            console.error("An error occurred while setting up the image URL popup:", error)
        }
    }

    function showSettingsPopup() {
        // Add the no-scroll class to the body
        document.body.classList.add("lci-no-scroll")

        // Create overlay for the settings popup
        const overlay = document.createElement("div")
        overlay.id = "lci-settings-overlay"
        overlay.onclick = (e) => {
            if (e.target === overlay) closePopup(overlay)
        }

        const popup = document.createElement("div")
        popup.id = "lci-settings-popup"

        // Helper function to create label elements
        function createLabelElement(text) {
            const label = document.createElement("label")
            label.textContent = text
            popup.appendChild(label)
        }

        // Helper function to create input elements
        function createInputElement(name, id, placeholder) {
            createLabelElement(name)

            const input = document.createElement("input")
            input.type = "text"
            input.value = getConfigData(id)
            input.placeholder = placeholder
            input.oninput = (e) => {
                const value = e.target.value?.trim()
                setConfigData(id, value).catch((err) => {
                    console.error(`Failed to set config data for ${id}:`, err) // Log error if setting data fails
                })
            }
            popup.appendChild(input)
        }

        // Helper function to create checkbox elements
        function createCheckboxElement(labelText, id) {
            const container = document.createElement("div")
            container.className = "lci-checkbox-container"

            const checkbox = document.createElement("input")
            checkbox.type = "checkbox"
            checkbox.checked = getConfigData(id)
            checkbox.onchange = (e) => {
                setConfigData(id, e.target.checked).catch((err) => {
                    console.error(`Failed to set config data for ${id}:`, err) // Log error if setting data fails
                })
            }
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
        async function exportSettings() {
            try {
                const settings = {
                    CONFIG: GM_getValue("CONFIG", {}),
                    ITEM_DATA: await getItemData(),
                }

                // Create a data URL for the JSON file
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2))
                const downloadAnchor = document.createElement("a")
                downloadAnchor.setAttribute("href", dataStr)
                downloadAnchor.setAttribute("download", "lciSettings.json")
                document.body.appendChild(downloadAnchor)
                downloadAnchor.click()
                document.body.removeChild(downloadAnchor)
            } catch (error) {
                console.error("Failed to export settings:", error) // Log error if export fails
            }
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
                    setItemData(settings.ITEM_DATA || {}).catch((err) => {
                        console.error("Failed to import item data:", err) // Log error if importing data fails
                    })

                    // Refresh the popup to reflect imported settings
                    closePopup(overlay)
                    showSettingsPopup()
                } catch (err) {
                    console.error("Failed to import settings:", err) // Log error if JSON parsing fails
                    alert("Failed to import settings: Invalid JSON file.")
                }
            }
            reader.onerror = (err) => {
                console.error("Error reading import file:", err) // Log error if file reading fails
                alert("Failed to read import file.")
            }
            reader.readAsText(file)
        }

        // UI Elements
        createInputElement(
            "Enter your TMDB API key to display missing film backdrops and get the ability to select backdrops from UI:",
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
            // Remove the no-scroll class from the body
            document.body.classList.remove("lci-no-scroll")
        }
    }

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
        if (!getConfigData("TMDB_API_KEY")) {
            console.error("TMDB API key is not configured.") // Log missing API key
            return null
        }

        try {
            const tmdbRawRes = await fetch(`https://api.themoviedb.org/3/${tmdbIdType}/${tmdbId}/images?api_key=${getConfigData("TMDB_API_KEY")}`)
            if (!tmdbRawRes.ok) {
                console.error(`Failed to fetch TMDB backdrops: ${tmdbRawRes.statusText}`) // Log HTTP error
                return null
            }

            const tmdbRes = await tmdbRawRes.json()
            const imageId = tmdbRes.backdrops?.[0]?.file_path

            return imageId ? `https://image.tmdb.org/t/p/original${imageId}` : null
        } catch (error) {
            console.error("Error fetching TMDB backdrop:", error) // General error catch
            return null
        }
    }

    async function isDefaultBackdropAvailable(dom) {
        let defaultBackdropElement
        if (dom) {
            defaultBackdropElement = dom.querySelector("#backdrop")
        } else {
            defaultBackdropElement = document.querySelector("#backdrop")
            if (!defaultBackdropElement) {
                try {
                    defaultBackdropElement = await waitForElement("#backdrop", 100)
                } catch (error) {
                    console.error("Failed to find default backdrop element:", error) // Log element not found
                    return false
                }
            }
        }

        const defaultBackdropUrl =
            defaultBackdropElement?.dataset?.backdrop2x ||
            defaultBackdropElement?.dataset?.backdrop ||
            defaultBackdropElement?.dataset?.backdropMobile

        if (defaultBackdropUrl?.includes("https://a.ltrbxd.com/resized/sm/upload")) {
            return defaultBackdropUrl
        }
        return false
    }

    async function extractBackdropUrlFromLetterboxdFilmPage(filmId, dom, shouldScrape = true) {
        try {
            const filmBackdropUrl = await isDefaultBackdropAvailable(dom)

            // Get TMDB ID and type
            let tmdbElement
            if (dom) {
                tmdbElement = dom.querySelector(`.micro-button.track-event[data-track-action="TMDb"]`)
            } else {
                tmdbElement = await waitForElement(`.micro-button.track-event[data-track-action="TMDb"]`, 5000)
            }

            const tmdbIdType = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[1] ?? null
            const tmdbId = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[2] ?? null

            if (tmdbIdType && tmdbId) {
                await setItemData(filmId, "ty", tmdbIdType)
                await setItemData(filmId, "tId", tmdbId)
            }

            if (!filmBackdropUrl && !document.querySelector(`#lci-settings-popup[type="imageurlpopup"]`) && shouldScrape) {
                return await getTmdbBackdrop(tmdbIdType, tmdbId)
            }

            return filmBackdropUrl
        } catch (error) {
            console.error("Error extracting backdrop URL from Letterboxd film page:", error) // General error catch
            return null
        }
    }

    function scrapeFilmPage(filmName) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://letterboxd.com/film/${filmName}/`,
                onload: async function (response) {
                    try {
                        const parser = new DOMParser()
                        const dom = parser.parseFromString(response.responseText, "text/html")

                        // Resolve with URL and cache status
                        resolve([await extractBackdropUrlFromLetterboxdFilmPage(`f/${filmName}`, dom), false])
                    } catch (error) {
                        console.error("Error parsing or extracting backdrop from Letterboxd page:", error) // General error catch
                        resolve([null, false])
                    }
                },
                onerror: function (error) {
                    console.error(`Can't scrape Letterboxd page: ${filmName}`, error) // Log scraping error
                    resolve([null, false])
                },
            })
        })
    }

    async function scrapeFilmLinkElement(selector, shouldScrape, itemId) {
        try {
            const firstPosterElement = await waitForElement(selector, 2000)
            if (!firstPosterElement) return [null, false]

            const filmName = firstPosterElement.href?.match(/\/film\/([^\/]+)/)?.[1]
            const filmId = `f/${filmName}`

            if (!itemId.startsWith("f/")) await setItemData(itemId, "fId", filmId)

            const cacheBackdrop = await getItemData(filmId, "bu")

            if (cacheBackdrop) {
                return [cacheBackdrop, true]
            } else if (!shouldScrape) {
                return [null, false]
            } else {
                return await scrapeFilmPage(filmName)
            }
        } catch (error) {
            console.error("Error scraping film link element:", error) // General error catch
            return [null, false]
        }
    }

    function injectPoster(posterImageElement, imageUrl) {
        let posterSize = posterImageElement.src.includes("0-70-0-105-crop") ? "w154" : "original"
        posterSize = posterImageElement.src.includes("0-150-0-225-crop") ? "w342" : posterSize
        posterSize = posterImageElement.src.includes("0-230-0-345-crop") ? "w500" : posterSize

        imageUrl = imageUrl.replace("original", posterSize)
        posterImageElement.src = imageUrl
        posterImageElement.srcset = imageUrl
    }

    function injectBackdrop(header, backdropUrl, attributes = []) {
        try {
            // Get or inject backdrop containers
            const backdropContainer =
                // For patron users who already have a backdrop
                document.querySelector(".backdrop-container") ||
                // For non-patron users
                Object.assign(document.createElement("div"), { className: "backdrop-container" })

            // Inject necessary classes
            document.body.classList.add("backdropped", "backdrop-loaded", ...attributes)
            document.getElementById("content")?.classList.add("-backdrop")

            // Ensure .-backdrop is added to #content if missed before
            const intervalId = setInterval(() => document.getElementById("content")?.classList.add("-backdrop"), 100)
            setTimeout(() => clearInterval(intervalId), 5000)

            // Inject backdrop child
            backdropContainer.innerHTML = `
                <div id="backdrop" class="backdrop-wrapper -loaded" data-backdrop="${backdropUrl}" data-backdrop2x="${backdropUrl}" data-backdrop-mobile="${backdropUrl}" data-offset="0">
                    <div class="backdropimage js-backdrop-image" style="background-image: url(${backdropUrl}); background-position: center 0px;"></div>
                    <div class="backdropmask js-backdrop-fade"></div>
                </div>`

            header.before(backdropContainer)
        } catch (error) {
            console.error("Error injecting backdrop:", error) // General error catch
        }
    }

    async function injectContextMenuToAllFilmPosterItems({ itemId, name } = {}) {
        if (isMobile) return

        function addFilmOption({ contextmenu, className, name, onClick = () => {}, itemId = undefined } = {}) {
            try {
                const activityMenuElement = contextmenu.querySelector(".fm-show-activity")
                const filmName = activityMenuElement?.firstElementChild?.href?.match(/\/film\/([^\/]+)/)?.[1]

                const imageMenuElement = document.createElement("li")
                imageMenuElement.classList.add(className, "popmenu-textitem", "-centered")

                const imageMenuLinkElement = document.createElement("a")
                imageMenuLinkElement.style.cursor = "pointer"
                imageMenuLinkElement.textContent = name
                imageMenuElement.onclick = () => {
                    contextmenu.setAttribute("hidden", "")
                    onClick(filmName, itemId)
                }

                imageMenuElement.appendChild(imageMenuLinkElement)
                activityMenuElement.parentNode.insertBefore(imageMenuElement, activityMenuElement)
            } catch (error) {
                console.error("Error adding film option to context menu:", error) // General error catch
            }
        }

        try {
            const observer = new MutationObserver(() => {
                if (!document.querySelector("body > .popmenu.film-poster-popmenu:not([contextmenu-processed])")) return

                const allContextmenu = document.querySelectorAll(`body > .popmenu.film-poster-popmenu:not([contextmenu-processed])`)
                for (const contextmenu of allContextmenu) {
                    contextmenu.setAttribute("contextmenu-processed", "")
                    if (itemId) {
                        addFilmOption({
                            contextmenu,
                            className: "fm-set-as-item-backdrop",
                            name: `Set as ${name} backdrop`,
                            onClick: (filmName, itemId) => showImageUrlPopup({ itemId: itemId, targetedFilmId: `f/${filmName}` }),
                            itemId: itemId,
                        })
                    }
                    addFilmOption({
                        contextmenu,
                        className: "fm-set-film-backdrop",
                        name: "Set film backdrop",
                        onClick: (filmName) => showImageUrlPopup({ itemId: `f/${filmName}` }),
                    })
                    addFilmOption({
                        contextmenu,
                        className: "fm-set-film-poster",
                        name: "Set film poster",
                        onClick: (filmName) => showImageUrlPopup({ itemId: `f/${filmName}`, mode: "poster" }),
                    })
                }
            })

            await waitForElement("body")
            observer.observe(document.body, { childList: true })
        } catch (error) {
            console.error("Error injecting context menu to all film poster items:", error) // General error catch
        }
    }

    async function filmPageMenuInjector({ filmId, mode } = {}) {
        const yourActivityMenuItem = await waitForElement(`ul.js-actions-panel > li:has(a[href*="/activity/"])`, 5000)

        const setFilmImageMenuItem = document.createElement("li")

        const anchor = document.createElement("a")
        anchor.textContent = `Set film ${mode}`
        anchor.style.cursor = "pointer"
        anchor.onclick = () => showImageUrlPopup({ itemId: filmId, mode })

        setFilmImageMenuItem.appendChild(anchor)
        yourActivityMenuItem.parentNode.insertBefore(setFilmImageMenuItem, yourActivityMenuItem)
    }

    async function filmPageInjector() {
        try {
            const filmId = `f/${location.pathname.split("/")?.[2]}`

            const header = await waitForElement("#header")
            filmPageMenuInjector({ filmId, mode: "backdrop" })
            filmPageMenuInjector({ filmId, mode: "poster" })
            injectContextMenuToAllFilmPosterItems()

            const cacheBackdrop = await getItemData(filmId, "bu")

            async function scrapeTmdbIdAndType() {
                try {
                    // Extracts TMDB ID and type
                    const tmdbElement = await waitForElement(`.micro-button.track-event[data-track-action="TMDb"]`, 5000)
                    const tmdbIdType = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[1] ?? null
                    const tmdbId = tmdbElement.href?.match(/\/(movie|tv)\/(\d+)\//)?.[2] ?? null

                    if (tmdbIdType && tmdbId) {
                        await setItemData(filmId, "ty", tmdbIdType)
                        await setItemData(filmId, "tId", tmdbId)
                    }
                } catch (error) {
                    console.error("Error scraping TMDB ID and type:", error) // General error catch
                }
            }

            if (cacheBackdrop) {
                // Inject backdrop
                injectBackdrop(header, cacheBackdrop, getConfigData("FILM_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
                scrapeTmdbIdAndType()
                return
            }

            // If original backdrop is available then return
            if (await isDefaultBackdropAvailable()) {
                scrapeTmdbIdAndType()
                return
            }

            if (getConfigData("TMDB_API_KEY") && getConfigData("FILM_DISPLAY_MISSING_BACKDROP")) {
                const backdropUrl = await extractBackdropUrlFromLetterboxdFilmPage(filmId)

                // Inject backdrop
                if (backdropUrl) {
                    injectBackdrop(header, backdropUrl, getConfigData("FILM_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
                    await setItemData(filmId, "bu", backdropUrl)
                }
            } else {
                await extractBackdropUrlFromLetterboxdFilmPage(filmId, undefined, false)
            }
        } catch (error) {
            console.error("Error in film page injector:", error) // General error catch
        }
    }

    async function userPageMenuInjector(userId, filmElementSelector) {
        const copyLinkMenuItem = await waitForElement(`.menuitem:has(> button[data-menuitem-trigger="clipboard"])`, 5000)

        const setUserBackdropMenuItem = document.createElement("div")
        setUserBackdropMenuItem.classList.add("menuitem", "-trigger", "-has-icon", "js-menuitem")
        setUserBackdropMenuItem.role = "none"

        const setUserBackdropMenuButton = document.createElement("button")
        setUserBackdropMenuButton.type = "button"
        setUserBackdropMenuButton.role = "menuitem"
        setUserBackdropMenuButton.setAttribute("data-dismiss", "dropdown")
        setUserBackdropMenuButton.onclick = () => showImageUrlPopup({ itemId: userId, filmElementSelector: filmElementSelector })
        setUserBackdropMenuButton.innerHTML = `
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
            <span class="label">Set user backdrop</span>
            `

        setUserBackdropMenuItem.appendChild(setUserBackdropMenuButton)
        copyLinkMenuItem.parentNode.insertBefore(setUserBackdropMenuItem, copyLinkMenuItem.nextSibling)
    }

    async function userPageInjector() {
        try {
            const userName = location.pathname.split("/")?.[1]?.toLowerCase()
            const userId = `u/${userName}`
            const filmElementSelector = "#favourites .poster-list > li:first-child a"

            if (getConfigData("CURRENT_USER_BACKDROP_ONLY") && userName !== loggedInAs) return

            const cacheBackdrop = await getItemData(userId, "bu")
            const header = await waitForElement("#header")
            userPageMenuInjector(userId, filmElementSelector)
            injectContextMenuToAllFilmPosterItems({ itemId: userId, name: "user" })

            if (cacheBackdrop) {
                injectBackdrop(header, cacheBackdrop, getConfigData("USER_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
                await scrapeFilmLinkElement(filmElementSelector, false, userId)
                return
            }

            if (await isDefaultBackdropAvailable()) {
                await scrapeFilmLinkElement(filmElementSelector, false, userId)
                return
            }

            const [scrapedImage, isCached] = await scrapeFilmLinkElement(filmElementSelector, getConfigData("USER_AUTO_SCRAPE"), userId)

            if (scrapedImage) {
                injectBackdrop(header, scrapedImage, getConfigData("USER_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

                if (!isCached) {
                    await setItemData(userId, "bu", scrapedImage)
                }
            }
        } catch (error) {
            console.error("Error in userPageInjector:", error)
        }
    }

    async function listPageMenuInjector(listId, filmElementSelector) {
        const likeMenuItem = await waitForElement("li.like-link-target", 5000)

        const setListBackdropMenuItem = document.createElement("li")

        const setListBackdropLink = document.createElement("a")
        setListBackdropLink.textContent = "Set list backdrop"
        setListBackdropLink.style.cursor = "pointer"
        setListBackdropLink.onclick = () => showImageUrlPopup({ itemId: listId, filmElementSelector: filmElementSelector })

        setListBackdropMenuItem.appendChild(setListBackdropLink)
        likeMenuItem.parentNode.insertBefore(setListBackdropMenuItem, likeMenuItem.nextSibling)
    }

    async function listPageInjector() {
        try {
            const listId = `l/${location.pathname.split("/")?.[1]?.toLowerCase()}/${location.pathname.split("/")?.[3]}`
            const filmElementSelector = ".poster-list > li:first-child a"

            const cacheBackdrop = await getItemData(listId, "bu")
            const header = await waitForElement("#header")
            listPageMenuInjector(listId, filmElementSelector)
            injectContextMenuToAllFilmPosterItems({ itemId: listId, name: "list" })

            if (!getConfigData("LIST_SHORT_BACKDROP")) {
                document.body.classList.remove("shortbackdropped", "-crop")
            }

            if (cacheBackdrop) {
                injectBackdrop(header, cacheBackdrop, getConfigData("LIST_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
                await scrapeFilmLinkElement(filmElementSelector, false, listId)
                return
            }

            if (await isDefaultBackdropAvailable()) {
                await scrapeFilmLinkElement(filmElementSelector, false, listId)
                return
            }

            const [scrapedImage, isCached] = await scrapeFilmLinkElement(filmElementSelector, getConfigData("LIST_AUTO_SCRAPE"), listId)

            if (scrapedImage) {
                injectBackdrop(header, scrapedImage, getConfigData("LIST_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

                if (!isCached) {
                    await setItemData(listId, "bu", scrapedImage)
                }
            }
        } catch (error) {
            console.error("Error in listPageInjector:", error)
        }
    }

    async function personPageMenuInjector(personId, filmElementSelector) {
        const personImageElement = await waitForElement(".person-image", 5000)

        const setPersonBackdropButton = document.createElement("button")
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
        setPersonBackdropButton.onclick = () => showImageUrlPopup({ itemId: personId, filmElementSelector: filmElementSelector })

        personImageElement.parentNode.insertBefore(setPersonBackdropButton, personImageElement.nextSibling)
    }

    async function personPageInjector() {
        try {
            const personId = `p/${location.pathname.split("/")?.[2]}`
            const filmElementSelector = ".grid > li:first-child a"

            const cacheBackdrop = await getItemData(personId, "bu")
            const header = await waitForElement("#header")
            personPageMenuInjector(personId, filmElementSelector)
            injectContextMenuToAllFilmPosterItems({ itemId: personId, name: "person" })

            if (cacheBackdrop) {
                injectBackdrop(header, cacheBackdrop, getConfigData("PERSON_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
                await scrapeFilmLinkElement(filmElementSelector, false, personId)
                return
            }

            if (await isDefaultBackdropAvailable()) {
                await scrapeFilmLinkElement(filmElementSelector, false, personId)
                return
            }

            const [scrapedImage, isCached] = await scrapeFilmLinkElement(filmElementSelector, getConfigData("PERSON_AUTO_SCRAPE"), personId)

            if (scrapedImage) {
                injectBackdrop(header, scrapedImage, getConfigData("PERSON_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])

                if (!isCached) {
                    await setItemData(personId, "bu", scrapedImage)
                }
            }
        } catch (error) {
            console.error("Error in personPageInjector:", error)
        }
    }

    async function reviewPageInjector() {
        try {
            const filmName = location.pathname.match(/\/film\/([^\/]+)/)?.[1]
            const filmId = `f/${filmName}`
            const filmElementSelector = `.film-poster a[href^="/film/"]`

            const cacheBackdrop = await getItemData(filmId, "bu")
            const header = await waitForElement("#header")
            filmPageMenuInjector({ filmId, mode: "backdrop" })
            filmPageMenuInjector({ filmId, mode: "poster" })
            injectContextMenuToAllFilmPosterItems()

            if (cacheBackdrop) {
                injectBackdrop(header, cacheBackdrop, getConfigData("REVIEW_SHORT_BACKDROP") ? ["shortbackdropped", "-crop"] : [])
                return
            }

            if (await isDefaultBackdropAvailable()) return

            const [scrapedImage, isCached] = await scrapeFilmLinkElement(filmElementSelector, getConfigData("REVIEW_AUTO_SCRAPE"), filmId)

            if (scrapedImage) {
                injectBackdrop(header, scrapedImage, ["shortbackdropped", "-crop"])

                if (!isCached) {
                    await setItemData(filmId, "bu", scrapedImage)
                }
            }
        } catch (error) {
            console.error("Error in reviewPageInjector:", error)
        }
    }

    async function injectPosters() {
        await waitForElement("body")

        const observer = new MutationObserver(async () => {
            if (!document.querySelector(".film-poster:not([poster-processed])")) return

            const allPosterImageElements = document.querySelectorAll(`.film-poster:not([poster-processed]) .image`)
            for (const posterImageElement of allPosterImageElements) {
                // Get the film name
                const posterElement = posterImageElement.parentElement?.parentElement
                const filmPath = posterImageElement.nextElementSibling?.href || posterElement?.getAttribute("data-film-link")
                const filmName = filmPath?.match(/\/film\/([^\/]+)/)?.[1] || ""
                if (!filmName) continue

                // Mark the element as processed to avoid reprocessing
                posterElement?.setAttribute("poster-processed", "")

                const filmId = `f/${filmName}`
                const cachePoster = await getItemData(filmId, "pu")

                if (cachePoster) injectPoster(posterImageElement, cachePoster)
            }
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        })
    }

    // MAIN

    try {
        const currentURL = location.protocol + "//" + location.hostname + location.pathname

        const filmPageRegex = /^(https?:\/\/letterboxd\.com\/film\/[^\/]+\/?(crew|details|releases|genres)?\/)$/
        const userPageRegex = /^(https?:\/\/letterboxd\.com\/[^\/]+(?:\/\?.*)?\/?)$/
        const listPageRegex =
            /^(https?:\/\/letterboxd\.com\/[A-Za-z0-9-_]+\/list\/[A-Za-z0-9-_]+(?:\/(by|language|country|decade|genre|on|detail|year)\/[A-Za-z0-9-_\/]+)?\/(?:(detail|page\/\d+)\/?)?)$/
        const personPageRegex =
            /^(https?:\/\/letterboxd\.com\/(director|actor|producer|executive-producer|writer|cinematography|additional-photography|editor|sound|story|visual-effects)\/[A-Za-z0-9-_]+(?:\/(by|language|country|decade|genre|on|year)\/[A-Za-z0-9-_\/]+)?\/(?:page\/\d+\/?)?)$/
        const reviewPageRegex = /^(https?:\/\/letterboxd\.com\/[A-Za-z0-9-_]+\/film\/[A-Za-z0-9-_]+\/(\d+\/)?(?:reviews\/?)?(?:page\/\d+\/?)?)$/

        injectPosters()

        if (filmPageRegex.test(currentURL)) {
            currentPage = "film"
            filmPageInjector()
        } else if (
            userPageRegex.test(currentURL) &&
            ![
                "/settings/",
                "/films/",
                "/lists/",
                "/members/",
                "/journal/",
                "/sign-in/",
                "/create-account/",
                "/pro/",
                "/search/",
                "/activity/",
                "/countries/",
            ].some((ending) => currentURL.toLowerCase().endsWith(ending))
        ) {
            currentPage = "user"
            userPageInjector()
        } else if (listPageRegex.test(currentURL)) {
            currentPage = "list"
            listPageInjector()
        } else if (personPageRegex.test(currentURL)) {
            currentPage = "person"
            personPageInjector()
        } else if (reviewPageRegex.test(currentURL)) {
            currentPage = "review"
            reviewPageInjector()
        } else {
            currentPage = "other"
            injectContextMenuToAllFilmPosterItems({ itemId: `u/${loggedInAs}`, name: "user" })
        }
    } catch (error) {
        console.error("Error in main function:", error)
    }
})()
