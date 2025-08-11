 (async () => {
        const DELAY_MS = 1000; // Delay between requests
        const MAX_ATTEMPTS = 100; // Number of random anime IDs to process

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

        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        const processAnimeRequest = async (id, payload) => {
            try {
                const response = await fetch(`https://myanimelist.net/ownlist/anime/add.json`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });

                if (response.ok) {
                    console.log(`Anime ID ${id}: Success`);
                    return true;
                } else if (response.status === 400) {
                    console.log(`Anime ID ${id}: Not found`);
                    return false;
                } else {
                    console.log(`Anime ID ${id}: Failed (HTTP ${response.status})`);
                    return false;
                }
            } catch (error) {
                console.log(`Anime ID ${id}: Error (${error.message})`);
                return false;
            }
        };

        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            console.error('Aborting: CSRF token missing');
            return;
        }

        let processed = 0;
        let successful = 0;

        while (processed < MAX_ATTEMPTS) {
            const animeId = getRandomId();
            const payload = getAnimePayload(animeId, csrfToken);

            const success = await processAnimeRequest(animeId, payload);
            if (success) successful++;

            processed++;

            if (processed < MAX_ATTEMPTS) await delay(DELAY_MS);
        }

        console.log(`\nFinal Results:`);
        console.log(`Total Attempts: ${processed}`);
        console.log(`Successful Adds: ${successful}`);
        console.log(`Failed Attempts: ${processed - successful}`);
    })();
