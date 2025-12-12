# MAL List Randomizer
A JavaScript script that automatically adds popular anime and manga to your MyAnimeList account.

## Tutorial

1. Log in to your [MyAnimeList](https://https://myanimelist.net) account in your web browser.
2. Open the browser console: Press `F12` or `right-click` on the page and select `Inspect > Console`.
4. Paste the [script/code](https://github.com/recitativonika/MAL-List-Randomizer/blob/88a94e58c6796a5e32de8be602c321b519b62db9/mal-add-random) into the console and press Enter to run it.



 - The script will start adding anime or manga to your list and log the results in the console.
 - To stop, close the browser tab or refresh the page.
 - Uncheck `Error` in `costume levels` to make it cleaner
    ![image](https://github.com/user-attachments/assets/e7d7a250-ef73-4c48-9fc2-806f98e71331)

## Optional customization
Edit the configuration section at the top of the script:

``// Main Configuration
const DELAY_MS = 400; // Delay between MAL requests
const JIKAN_DELAY_MS = 350; // Delay for Jikan API (respect rate limit)

// Jikan Pagination Config
const START_PAGE = 1; // Starting page
const TOTAL_PAGES_TO_FETCH = 0; // 0 = unlimited, number = page limit
const EXCLUDED_PAGES = ""; // Format: "3-5,8-10,12" (pages 3-5, 8-10, and 12 excluded)

// Safety Check Config
const ENABLE_SAFETY_CHECK = true; // true = enabled, false = disabled
const SAFETY_CHECK_LIMIT = 100; // Stop after this many pages in unlimited mode``
    

## Note: Use responsibly, as this modifies your MAL list and makes requests to their servers. Many random IDs may fail if they don’t exist.

## Disclaimer
This script is intended for testing purposes only. Using this script may violate applicable Terms of Service (ToS) and could result in your account being permanently banned or other consequences. I am not responsible for any damage, loss, or issues that may arise from the use of this code.

