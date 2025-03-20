const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require("fs");
const xlsx = require("xlsx");
const readline = require("readline");
const path = require("path");

require('dotenv').config();
puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logToFile = (() => {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const logsDir = path.join(__dirname, "logs");

    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }

    let fileName = `${date}.txt`;
    let counter = 1;

    while (fs.existsSync(path.join(logsDir, fileName))) {
        fileName = `${date}_${counter}.txt`;
        counter++;
    }

    const filePath = path.join(logsDir, fileName);
    fs.writeFileSync(filePath, "", "utf8");

    return (message) => {
        const now = new Date();
        const time = now.toTimeString().split(" ")[0];
        const logMessage = `[${date} ${time}] ${message}\n`;
        fs.appendFileSync(filePath, logMessage, "utf8");
    };
})();

const overrideConsoleLog = () => {
    const originalConsoleLog = console.log;
    console.log = (...args) => {
        const message = args.join(" ");
        originalConsoleLog(message);
        logToFile(message);
    };
};

const getSearchQuery = () => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question("Please enter the search term: ", (searchQuery) => {
            if (!searchQuery) {
                console.error("Search term cannot be null. Terminating.");
                rl.close();
                process.exit(1);
            }
            rl.close();
            resolve(searchQuery);
        });
    });
};

const navigateToGoogleMaps = async (browser, searchQuery) => {
    console.log("Starting Puppeteer...");
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log(`Navigating to Google Maps with search query: ${searchQuery}...`);
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}/`;
    await page.goto(searchUrl, { waitUntil: "networkidle2" });

    console.log("Waiting for the page to load...");
    await sleep(5000);

    return page;
};

const scrollToEndOfList = async (page) => {
    console.log("Scrolling to the end of the list...");
    let previousHeight = 0;

    while (true) {
        const currentHeight = await page.evaluate(() => {
            const scrollableElement = document.querySelector('[role="feed"]');
            if (scrollableElement) {
                scrollableElement.scrollBy(0, 2000);
                return scrollableElement.scrollHeight;
            }
            return 0;
        });
        await sleep(1500);

        const isEndOfList = await page.evaluate(() => {
            const endElement = document.querySelector('span.HlvSq');
            return endElement !== null;
        });
        await sleep(1500);

        if (isEndOfList || currentHeight === previousHeight) break;
        previousHeight = currentHeight;
    }
};

const collectCompanyLinks = async (page) => {
    console.log("Collecting company links...");
    const links = await page.$$eval("a.hfpxzc", elements => elements.map(el => el.href));
    console.log(`A total of ${links.length} company links were found.`);
    return links;
};

const createPageWithRetry = async (browser, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await browser.newPage();
        } catch (error) {
            console.error(`Retry ${i + 1} failed:`, error.message);
            if (i === retries - 1) throw error;
        }
    }
};

const collectCompanyDetails = async (browser, links) => {
    let data = [];
    const maxConcurrentTabs = parseInt(process.env.CONCURRENT_TABS, 10) || 5;

    const processBatch = async (batch) => {
        return Promise.all(batch.map(async (link) => {
            const detailPage = await createPageWithRetry(browser);
            try {
                console.log(`Navigating to company detail page: ${link}`);
                await detailPage.goto(link, { waitUntil: "networkidle2", timeout: 90000 });

                const elements = await detailPage.$$eval("button[data-tooltip], a[data-tooltip]", elements => {
                    const seenTooltips = new Set();
                    return elements
                        .map(element => {
                            const textElement = element.querySelector(".Io6YTe.fontBodyMedium.kR99db.fdkmkc");
                            const tooltip = element.getAttribute("data-tooltip");
                            if (seenTooltips.has(tooltip)) return null;
                            seenTooltips.add(tooltip);
                            return {
                                text: textElement ? textElement.innerText.trim() : "N/A",
                                tooltip,
                                ariaLabel: element.getAttribute("aria-label"),
                                outerHTML: element.outerHTML
                            };
                        })
                        .filter(el => el !== null);
                });

                let phone = "N/A";
                let address = "N/A";
                let website = "N/A";
                let workingHours = "N/A";
                elements.forEach(el => {
                    if (el.tooltip === "Telefon numarasını kopyala") phone = el.text;
                    else if (el.tooltip === "Adresi kopyala") address = el.text;
                    else if (el.tooltip === "Web sitesini aç") website = el.text;
                });

                const name = await detailPage.$eval("h1", el => el.innerText).catch(() => "N/A");

                const url = detailPage.url();
                const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                const latitude = coordsMatch ? coordsMatch[1] : "N/A";
                const longitude = coordsMatch ? coordsMatch[2] : "N/A";

                workingHours = await detailPage.$$eval("table.eK4R0e tbody tr", rows => {
                    return rows.map(row => {
                        const day = row.querySelector("td.ylH6lf div")?.innerText || "N/A";
                        const hours = row.querySelector("td.mxowUb ul li")?.innerText || "N/A";
                        return `${day}: ${hours}`;
                    }).join("; ");
                }).catch(() => "N/A");
                console.log("----------DATA----------")
                console.log("Name:", name)
                console.log("Phone:", phone);
                console.log("Address:", address);
                console.log("Website:", website);
                console.log("coordsMatch value:", coordsMatch);
                console.log("Coordinats:", latitude, longitude);
                console.log("Working hours:", workingHours);
                console.log("----------DATA----------")
                if (!data.some(item => item.name === name && item.address === address)) {
                    data.push({ name, address, website, phone, latitude, longitude, workingHours });
                    console.log(`Company information added: ${name}`);
                }
            } catch (error) {
                console.error(`Error processing link ${link}:`, error.message);
            } finally {
                if (!detailPage.isClosed()) await detailPage.close();
            }
        }));
    };

    for (let i = 0; i < links.length; i += maxConcurrentTabs) {
        const batch = links.slice(i, i + maxConcurrentTabs);
        console.log(`Processing batch: ${i + 1} to ${i + batch.length}`);
        await processBatch(batch);
    }

    return data;
};

const saveDataToExcel = (data, searchQuery) => {
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, "Companies");

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const fileName = `${searchQuery.replaceAll(" ", "_")}_${date}.xlsx`;

    const exportDir = path.join(__dirname, "export");
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
    }

    const filePath = path.join(exportDir, fileName);
    xlsx.writeFile(wb, filePath);
    console.log(`Data saved to ${filePath}`);
};

(async () => {
    overrideConsoleLog();

    const searchQuery = await getSearchQuery();
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await navigateToGoogleMaps(browser, searchQuery);
    await scrollToEndOfList(page);

    const links = await collectCompanyLinks(page);
    const data = await collectCompanyDetails(browser, links);

    saveDataToExcel(data, searchQuery);

    await browser.close();
})();