(async () => {
    // ========================== MAIN CONFIGURATION ==========================
    const DELAY_MS = 400; // Delay between MAL requests
    const JIKAN_DELAY_MS = 350; // Delay for Jikan API
    
    // Jikan and process configuration
    const START_PAGE = 1; // Starting page
    const TOTAL_PAGES_TO_FETCH = 0; // 0 = unlimited, number = page limit
    const EXCLUDED_PAGES = ""; // Format: "3-5,8-10,12" (pages 3-5, 8-10, and 12 excluded)
    
    // Safety check
    const ENABLE_SAFETY_CHECK = true; // true = enabled, false = disabled
    const SAFETY_CHECK_LIMIT = 100; // Stop after this many pages in unlimited mode
    
    const getCsrfToken = () => {
        const metaTag = document.querySelector('meta[name="csrf_token"]');
        if (!metaTag) {
            console.error('CSRF token not found');
            return null;
        }
        return metaTag.getAttribute('content');
    };

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const parseExcludedPages = (excludedStr) => {
        const excludedRanges = [];
        if (!excludedStr || excludedStr.trim() === "") {
            return excludedRanges;
        }
        
        const parts = excludedStr.split(',');
        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(num => parseInt(num.trim()));
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    excludedRanges.push({ start, end });
                }
            } else {
                const pageNum = parseInt(trimmed);
                if (!isNaN(pageNum)) {
                    excludedRanges.push({ start: pageNum, end: pageNum });
                }
            }
        }
        return excludedRanges;
    };

    const isPageExcluded = (pageNum, excludedRanges) => {
        for (const range of excludedRanges) {
            if (pageNum >= range.start && pageNum <= range.end) {
                return true;
            }
        }
        return false;
    };

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

    const processRequest = async (type, id, payload) => {
        const typeName = type === 'anime' ? 'Anime' : 'Manga';
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
                console.log(`  ${typeName} ID ${id}: Successfully added`);
                return 'success';
            } else {
                let errorMessage = `Failed (${response.status})`;
                try {
                    const errorData = await response.json();
                    if (errorData.errors && errorData.errors.length > 0) {
                        errorMessage = errorData.errors[0].message;
                    }
                } catch (e) {
                }
                
                if (response.status === 409 || errorMessage.includes('already in your list')) {
                    console.log(`  ${typeName} ID ${id}: Already in your list`);
                    return 'already_exists';
                } else if (response.status === 400) {
                    console.log(`  ${typeName} ID ${id}: ${errorMessage}`);
                    return 'failed';
                } else {
                    console.log(`  ${typeName} ID ${id}: ${errorMessage}`);
                    return 'failed';
                }
            }
        } catch (error) {
            console.log(`  ${typeName} ID ${id}: Failed (Error: ${error.message})`);
            return 'failed';
        }
    };

    const csrfToken = getCsrfToken();
    if (!csrfToken) {
        console.error('Aborted: No CSRF token available');
        return;
    }

    console.log('='.repeat(60));
    console.log('MYANIMELIST BATCH PROCESSOR - REAL-TIME PER PAGE');
    console.log('='.repeat(60));
    console.log('Configuration:');
    console.log(`- Starting page: ${START_PAGE}`);
    console.log(`- Total pages: ${TOTAL_PAGES_TO_FETCH === 0 ? 'Unlimited (all)' : TOTAL_PAGES_TO_FETCH}`);
    console.log(`- Excluded pages: ${EXCLUDED_PAGES || '(none)'}`);
    console.log(`- Safety check: ${ENABLE_SAFETY_CHECK ? `Enabled (limit: ${SAFETY_CHECK_LIMIT} pages)` : 'Disabled'}`);
    console.log(`- Jikan API delay: ${JIKAN_DELAY_MS}ms`);
    console.log(`- MAL API delay: ${DELAY_MS}ms`);
    console.log('='.repeat(60) + '\n');
    
    const excludedRanges = parseExcludedPages(EXCLUDED_PAGES);
    let currentPage = START_PAGE;
    let maxPages = TOTAL_PAGES_TO_FETCH === 0 ? Infinity : TOTAL_PAGES_TO_FETCH;
    let pagesProcessed = 0;
    let hasMoreAnimePages = true;
    let hasMoreMangaPages = true;
    
    const stats = {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        alreadyExists: 0,
        animePerPage: {},
        mangaPerPage: {},
        animeTotal: 0,
        mangaTotal: 0
    };

    while ((hasMoreAnimePages || hasMoreMangaPages) && pagesProcessed < maxPages) {
        
        if (isPageExcluded(currentPage, excludedRanges)) {
            console.log(`⏩ SKIPPING PAGE ${currentPage} (excluded)`);
            currentPage++;
            continue;
        }
        
        console.log('\n' + '═'.repeat(50));
        console.log(`📄 PROCESSING PAGE ${currentPage}`);
        console.log('═'.repeat(50));
        
        let animeItems = [];
        let mangaItems = [];
        
        if (hasMoreAnimePages) {
            console.log(`\n🔍 Fetching anime page ${currentPage}...`);
            try {
                const animeUrl = `https://api.jikan.moe/v4/top/anime?page=${currentPage}`;
                await delay(JIKAN_DELAY_MS);
                
                const response = await fetch(animeUrl);
                console.log(`   Status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.data && Array.isArray(data.data)) {
                        animeItems = data.data.map(item => ({
                            id: item.mal_id,
                            title: item.title || 'No Title',
                            type: 'anime',
                            page: currentPage
                        }));
                        
                        console.log(`   ✓ Found ${animeItems.length} anime`);
                        stats.animePerPage[currentPage] = animeItems.length;
                        stats.animeTotal += animeItems.length;
                        
                        if (data.pagination && data.pagination.has_next_page === false) {
                            hasMoreAnimePages = false;
                            console.log('   ⚠️ No more anime pages available');
                        }
                    } else {
                        console.log('   ❌ Invalid anime data format');
                    }
                } else {
                    console.log(`   ❌ Failed to fetch anime data`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        } else {
            console.log('   ⏭️ Anime: no more pages available');
        }
        
        await delay(200);
        
        if (hasMoreMangaPages) {
            console.log(`\n🔍 Fetching manga page ${currentPage}...`);
            try {
                const mangaUrl = `https://api.jikan.moe/v4/top/manga?page=${currentPage}`;
                await delay(JIKAN_DELAY_MS);
                
                const response = await fetch(mangaUrl);
                console.log(`   Status: ${response.status}`);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.data && Array.isArray(data.data)) {
                        mangaItems = data.data.map(item => ({
                            id: item.mal_id,
                            title: item.title || 'No Title',
                            type: 'manga',
                            page: currentPage
                        }));
                        
                        console.log(`   ✓ Found ${mangaItems.length} manga`);
                        stats.mangaPerPage[currentPage] = mangaItems.length;
                        stats.mangaTotal += mangaItems.length;
                        
                        if (data.pagination && data.pagination.has_next_page === false) {
                            hasMoreMangaPages = false;
                            console.log('   ⚠️ No more manga pages available');
                        }
                    } else {
                        console.log('   ❌ Invalid manga data format');
                    }
                } else {
                    console.log(`   ❌ Failed to fetch manga data`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        } else {
            console.log('   ⏭️ Manga: no more pages available');
        }
        
        if (animeItems.length > 0) {
            console.log(`\n🎬 Processing ${animeItems.length} anime to MAL...`);
            for (const item of animeItems) {
                const payload = getAnimePayload(item.id, csrfToken);
                const result = await processRequest('anime', item.id, payload);
                
                if (result === 'success') stats.successful++;
                else if (result === 'already_exists') stats.alreadyExists++;
                else if (result === 'failed') stats.failed++;
                
                stats.totalProcessed++;
                
                await delay(DELAY_MS);
            }
            console.log(`   ✅ Finished processing anime page ${currentPage}`);
        }
        
        if (mangaItems.length > 0) {
            console.log(`\n📚 Processing ${mangaItems.length} manga to MAL...`);
            for (const item of mangaItems) {
                const payload = getMangaPayload(item.id, csrfToken);
                const result = await processRequest('manga', item.id, payload);
                
                if (result === 'success') stats.successful++;
                else if (result === 'already_exists') stats.alreadyExists++;
                else if (result === 'failed') stats.failed++;
                
                stats.totalProcessed++;
                
                await delay(DELAY_MS);
            }
            console.log(`   ✅ Finished processing manga page ${currentPage}`);
        }
        
        if (!hasMoreAnimePages && !hasMoreMangaPages) {
            console.log(`\n📭 No more anime/manga pages available`);
            break;
        }
        
        console.log(`\n📊 Progress: Page ${currentPage} completed`);
        console.log(`   Total processed: ${stats.totalProcessed} items`);
        console.log(`   Successful: ${stats.successful} | Failed: ${stats.failed} | Already exists: ${stats.alreadyExists}`);
        
        currentPage++;
        pagesProcessed++;
        
        if (ENABLE_SAFETY_CHECK && TOTAL_PAGES_TO_FETCH === 0 && pagesProcessed >= SAFETY_CHECK_LIMIT) {
            console.log(`\n⚠️ SAFETY CHECK: Processed ${pagesProcessed} pages (limit: ${SAFETY_CHECK_LIMIT})`);
            console.log('   Script will stop to prevent overload');
            console.log('   To continue, set ENABLE_SAFETY_CHECK = false or increase SAFETY_CHECK_LIMIT');
            break;
        }
        
        console.log(`\n⏳ Waiting 2 seconds before next page...`);
        await delay(2000);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('PROCESS COMPLETED - FINAL RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n📈 GENERAL STATISTICS:`);
    console.log(`Total pages processed: ${pagesProcessed}`);
    console.log(`Total items found: ${stats.animeTotal + stats.mangaTotal}`);
    console.log(`   • Anime: ${stats.animeTotal} items`);
    console.log(`   • Manga: ${stats.mangaTotal} items`);
    
    console.log(`\n📤 MAL PROCESSING STATISTICS:`);
    console.log(`Total items processed: ${stats.totalProcessed}`);
    console.log(`✅ Successfully added: ${stats.successful}`);
    console.log(`❌ Failed to add: ${stats.failed}`);
    console.log(`📌 Already in list: ${stats.alreadyExists}`);
    
    console.log(`\n📋 DISTRIBUTION PER PAGE:`);
    
    const allPages = new Set([
        ...Object.keys(stats.animePerPage).map(Number),
        ...Object.keys(stats.mangaPerPage).map(Number)
    ]);
    
    const sortedPages = Array.from(allPages).sort((a, b) => a - b);
    
    for (const page of sortedPages) {
        const animeCount = stats.animePerPage[page] || 0;
        const mangaCount = stats.mangaPerPage[page] || 0;
        
        if (animeCount > 0 || mangaCount > 0) {
            console.log(`   Page ${page}: ${animeCount} anime, ${mangaCount} manga`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('PROCESS COMPLETE!');
    console.log('='.repeat(60));
    
    try {
        const summary = {
            timestamp: new Date().toISOString(),
            pagesProcessed: pagesProcessed,
            totalItems: stats.totalProcessed,
            successful: stats.successful,
            failed: stats.failed,
            alreadyExists: stats.alreadyExists,
            animeTotal: stats.animeTotal,
            mangaTotal: stats.mangaTotal
        };
        localStorage.setItem('malBatchProcessor_summary', JSON.stringify(summary));
        console.log('\n📝 Statistics saved to localStorage');
    } catch (e) {
    }
})();
