(async () => {
    // Set this to change delay and total anime/manga to add
    const DELAY_MS = 1000; // Delay between requests to avoid rate limiting
    const MAX_ATTEMPTS = 100; // Number of random IDs to process

    const getCsrfToken = () => {
        const metaTag = document.querySelector('meta[name="csrf_token"]');
        if (!metaTag) {
            console.error('CSRF token not found on page');
            return null;
        }
        return metaTag.getAttribute('content');
    };

    const getRandomId = () => Math.floor(Math.random() * 99999) + 1;

    const getAnimePayload = (animeId, csrfToken) => ({
        anime_id: animeId,
        status: 2,
        score: 7,
        num_watched_episodes: 12,
        storage_value: 0,
        storage_type: 0,
        start_date: { year: 0, month: 0, day: 0 },
        finish_date: { year: 0, month: 0, day: 0 },
        num_watched_times: 0,
        rewatch_value: 0,
        csrf_token: csrfToken
    });

    const getMangaPayload = (mangaId, csrfToken) => ({
        manga_id: mangaId,
        status: 2,
        score: 7,
        num_read_volumes: 1,
        num_read_chapters: 12,
        storage_value: 0,
        storage_type: 0,
        start_date: { year: 0, month: 0, day: 0 },
        finish_date: { year: 0, month: 0, day: 0 },
        num_read_times: 0,
        reread_value: 0,
        csrf_token: csrfToken
    });

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const processRequest = async (type, id, payload) => {
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        try {
            const response = await fetch(`https://myanimelist.net/ownlist/${type}/add.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Referrer-Policy': 'no-referrer-when-downgrade'
                },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (response.ok) {
                console.log(`${typeName} ID ${id}: Success`);
                return true;
            } else if (response.status === 400) {
                console.log(`${typeName} ID ${id}: Not found`);
                return false;
            } else {
                console.log(`${typeName} ID ${id}: Failed (${response.status})`);
                return false;
            }
        } catch (error) {
            console.log(`${typeName} ID ${id}: Failed (Error: ${error.message})`);
            return false;
        }
    };

    let processed = 0;
    let attemptedAnime = 0;
    let attemptedManga = 0;
    let successfulAnime = 0;
    let successfulManga = 0;
    const csrfToken = getCsrfToken();

    if (!csrfToken) {
        console.error('Aborting: No CSRF token available');
        return;
    }

    while (processed < MAX_ATTEMPTS) {
        const isAnime = Math.random() < 0.5;
        const type = isAnime ? 'anime' : 'manga';
        const id = getRandomId();
        const payload = isAnime ? getAnimePayload(id, csrfToken) : getMangaPayload(id, csrfToken);

        if (isAnime) {
            attemptedAnime++;
        } else {
            attemptedManga++;
        }

        const success = await processRequest(type, id, payload);
        if (success) {
            if (isAnime) successfulAnime++;
            else successfulManga++;
        }

        processed++;
        if (processed < MAX_ATTEMPTS) await delay(DELAY_MS);
    }

    console.log(`Total processed: ${processed}`);
    console.log(`Anime - Successful: ${successfulAnime}, Failed: ${attemptedAnime - successfulAnime}`);
    console.log(`Manga - Successful: ${successfulManga}, Failed: ${attemptedManga - successfulManga}`);
})();
