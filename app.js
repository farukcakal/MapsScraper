const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require("fs");
const xlsx = require("xlsx");
const readline = require("readline");

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Kullanıcıdan terminalde arama metni almak için readline arayüzü
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Please enter the search term: ", async (searchQuery) => {
    if (!searchQuery) {
        console.error("Search term cannot be null. Terminating.");
        rl.close();
        process.exit(1);
    }

    (async () => {
        console.log("Starting Puppeteer...");
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Navigating to Google Maps with search query: ${searchQuery}...`);
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}/`;
        await page.goto(searchUrl, { waitUntil: "networkidle2" });

        console.log("Waiting for the page to load...");
        await sleep(5000);

        console.log("Scrolling to the end of the list...");
        let previousHeight = 0;
        while (true) {
            const currentHeight = await page.evaluate(() => {
                const scrollableElement = document.querySelector('[role="feed"]'); // Daha genel bir seçici
                if (scrollableElement) {
                    scrollableElement.scrollBy(0, 2000);
                    return scrollableElement.scrollHeight;
                }
                return 0;
            });
            await sleep(1500);

            // "Listenin sonuna ulaştınız." elementi kontrolü
            const isEndOfList = await page.evaluate(() => {
                const endElement = document.querySelector('span.HlvSq'); // "Listenin sonuna ulaştınız." elementi
                return endElement !== null; // Eğer element bulunursa true döner
            });
            await sleep(1500);
            
            if (isEndOfList) {
                console.log("Reached the end of the list: 'Listenin sonuna ulaştınız.' element found.");
                break;
            }
            await sleep(1500);
            
            if (currentHeight === previousHeight) {
                console.log("No more content to scroll.");
                break;
            }
            previousHeight = currentHeight;
            console.log("Scrolled. Waiting for 1 second...");
            await sleep(1500);
        }

        console.log("Collecting company links...");
        const links = await page.$$eval("a.hfpxzc", elements => elements.map(el => el.href));
        console.log(`A total of ${links.length} company links were found.`);

        let data = [];
        for (const link of links) {
            try {
                console.log(`Navigating to company detail page: ${link}`);
                const detailPage = await browser.newPage();
                await detailPage.goto(link, { waitUntil: "networkidle2" });

                console.log("Retrieving company information...");
                const name = await detailPage.$eval("h1", el => el.innerText).catch(() => "N/A");
                const address = await detailPage.$eval(".RcCsl.fVHpi.w4vB1d.NOE9ve.M0S7ae.AG25L", el => el.innerText).catch(() => "N/A");
                const hours = await detailPage.$eval(".OqCZI.fontBodyMedium.WVXvdc", el => el.innerText).catch(() => "N/A");
                const phone = await detailPage.$eval(".RcCsl.fVHpi.w4vB1d.NOE9ve.M0S7ae.AG25L", el => el.innerText).catch(() => "N/A");
                const website = await detailPage.$eval(".RcCsl.fVHpi.w4vB1d.NOE9ve.M0S7ae.AG25L a", el => el.href).catch(() => "N/A");

                // Tekrar eden kayıtları kontrol et
                const isDuplicate = data.some(item => item.name === name && item.address === address);

                if (!isDuplicate) {
                    data.push({ name, address, hours, phone, website });
                    console.log(`Company information added: ${name}`);
                } else {
                    console.log(`Duplicate entry skipped: ${name}`);
                }

                await detailPage.close();
            } catch (error) {
                console.log("An error occurred on the company detail page:", error.message);
            }
        }

        console.log("Saving data to Excel file...");
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(wb, ws, "Google Maps Data");
        const fileName = searchQuery.replace(/ /g, "_").toLowerCase();
        xlsx.writeFile(wb, `${fileName}.xlsx`);
        console.log(`Data saved to ${fileName}.xlsx`);
        await browser.close();
        rl.close();
    })();
});