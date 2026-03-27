const axios = require('axios');
const dns = require('dns').promises;

// ─── PENYIMPANAN TARGET TERAKHIR PER USER ───────────────
const lastTarget = new Map(); // <userId, url>

// ─── RATE LIMIT ───────────────
const lastScan = new Map();
function isRateLimited(userId) {
  if (!userId) return false;
  const now = Date.now();
  const last = lastScan.get(userId);
  if (last && now - last < 10000) return true;
  lastScan.set(userId, now);
  return false;
}

// ─── UTILS ───────────────
async function getIpFromDomain(domain) {
  try {
    const clean = domain.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
    const ips = await dns.resolve4(clean);
    return ips[0] || null;
  } catch {
    return null;
  }
}

async function fetchGeolocation(ip) {
  try {
    const res = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 8000 });
    return res.data.status === 'success' ? res.data : {};
  } catch {
    return {};
  }
}

async function fetchFullResponse(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
  };
  try {
    const res = await axios.get(url, { timeout: 15000, headers, maxRedirects: 5 });
    return {
      finalUrl: res.request.res.responseUrl || url,
      status: res.status,
      headers: res.headers,
      body: res.data
    };
  } catch (e) {
    return {
      finalUrl: e.response?.request?.res?.responseUrl || url,
      status: e.response?.status || 0,
      headers: e.response?.headers || {},
      body: e.response?.data || ''
    };
  }
}

// ─── DETEKSI ───────────────
function detectTech(headers, body) {
  const tech = [];
  const lowerBody = body.toLowerCase();
  const server = (headers['server'] || '').toLowerCase();
  const xPowered = (headers['x-powered-by'] || '').toLowerCase();

  if (server.includes('nginx')) tech.push('nginx');
  if (server.includes('apache')) tech.push('Apache');
  if (server.includes('iis')) tech.push('IIS');
  if (xPowered.includes('php')) tech.push('PHP');
  if (xPowered.includes('asp.net')) tech.push('ASP.NET');
  if (/wordpress/i.test(body)) tech.push('WordPress');
  if (/joomla/i.test(body)) tech.push('Joomla');
  if (/drupal/i.test(body)) tech.push('Drupal');
  if (lowerBody.includes('react') && lowerBody.includes('root')) tech.push('React');
  if (lowerBody.includes('vue')) tech.push('Vue.js');
  if (lowerBody.includes('nextjs') || lowerBody.includes('_next')) tech.push('Next.js');

  return [...new Set(tech)];
}

function detectProtection(status, headers, body, finalUrl) {
  const lowerBody = body.toLowerCase();
  return {
    cloudflare: headers['server'] === 'cloudflare' || lowerBody.includes('cf-ray') || finalUrl.includes('/cdn-cgi/'),
    sucuri: !!headers['x-sucuri-id'] || lowerBody.includes('sucuri'),
    imperva: !!headers['x-iinfo'] || /incapsula/i.test(headers['x-cdn'] || '') || lowerBody.includes('imperva'),
    akamai: headers['server'] === 'AkamaiGHost' || lowerBody.includes('akamai'),
    awsWaf: headers['x-amz-cf-id'] || (finalUrl.includes('.amazonaws.com') && [403, 406].includes(status)),
    fastly: headers['server'] === 'Fastly' || !!headers['x-fastly-request-id'],
    ddosGuard: headers['server'] === 'ddos-guard' || lowerBody.includes('ddos-guard'),
    bunnyCDN: headers['server'] === 'BunnyCDN' || lowerBody.includes('bunny.net'),
    wordfence: lowerBody.includes('wordfence'),
    recaptcha: /google\.com\/recaptcha/.test(body),
    hcaptcha: /hcaptcha\.com/.test(body),
    jsChallenge: /setTimeout.*?cf_chl_|\/challenge-platform\//.test(body),
    rateLimit: status === 429,
    firewallBlock: [403, 406, 429].includes(status),
    captchaChallenge: /interstitial|verify.*?human|captcha/i.test(lowerBody)
  };
}

// ─── REPORT ───────────────
function buildReport(domain, ip, geo, status, protections, tech) {
  const p = protections;
  const detected = [];
  if (p.cloudflare) detected.push('☁️ Cloudflare WAF');
  if (p.sucuri) detected.push('🛡️ Sucuri WAF');
  if (p.imperva) detected.push('🛡️ Imperva / Incapsula');
  if (p.akamai) detected.push('🌐 Akamai');
  if (p.awsWaf) detected.push('🛡️ AWS WAF');
  if (p.fastly) detected.push('⚡ Fastly');
  if (p.ddosGuard) detected.push('🔥 DDoS-Guard');
  if (p.bunnyCDN) detected.push('🐇 BunnyCDN');
  if (p.wordfence) detected.push('🔒 Wordfence');
  if (p.recaptcha) detected.push('🤖 Google reCAPTCHA');
  if (p.hcaptcha) detected.push('🤖 hCaptcha');
  if (p.jsChallenge) detected.push('🧩 JS Challenge');
  if (p.rateLimit) detected.push('⏱️ Rate Limit (429)');
  if (p.firewallBlock) detected.push('🚫 Firewall Block');
  if (p.captchaChallenge) detected.push('🧾 Captcha Challenge');

  const total = detected.length;
  const severity = total === 0 ? '🟢 NONE' :
                   total <= 2 ? '🟡 LOW' :
                   total <= 5 ? '🟠 MODERATE' :
                   total <= 8 ? '🔴 HIGH' : '⛔ CRITICAL';

  const W = 52;
  const top = `╔${"═".repeat(W)}╗`;
  const mid = `╠${"═".repeat(W)}╣`;
  const bot = `╚${"═".repeat(W)}╝`;
  const pad = (text) => {
    const clean = text.replace(/<[^>]*>/g, '');
    return `║ ${text}${" ".repeat(Math.max(0, W - clean.length - 2))} ║`;
  };

  let out = `${top}\n`;
  out += pad("🛡️   ROBZBOT — WEB PROTECTION SCANNER   🛡️") + '\n';
  out += `${mid}\n`;
  out += pad(`🔗 TARGET: ${domain}`) + '\n';
  out += `${bot}\n\n`;

  out += `${top}\n`;
  out += pad("🌍 NETWORK & GEOLOCATION") + '\n';
  out += `${mid}\n`;
  out += pad(`🖥️ IP        : ${ip || 'N/A'}`) + '\n';
  out += pad(`🌎 COUNTRY   : ${geo.country || 'Unknown'}`) + '\n';
  out += pad(`🏙️ CITY      : ${geo.city || 'Unknown'}`) + '\n';
  out += `${bot}\n\n`;

  out += `${top}\n`;
  out += pad("🌐 TECHNOLOGY STACK") + '\n';
  out += `${mid}\n`;
  out += pad(`⚡ Tech      : ${tech.length ? tech.join(', ') : 'None'}`) + '\n';
  out += pad(`📊 Status    : ${status}`) + '\n';
  out += `${bot}\n\n`;

  out += `${top}\n`;
  out += pad("✅ DETECTED PROTECTIONS") + '\n';
  out += `${mid}\n`;
  if (detected.length > 0) {
    detected.forEach(item => out += pad(`• ${item}`) + '\n');
  } else {
    out += pad("🟢 No WAF/Proteksi detected.") + '\n';
  }
  out += `${bot}\n\n`;

  out += `${top}\n`;
  out += pad("⚠️  RISK ASSESSMENT") + '\n';
  out += `${mid}\n`;
  out += pad(`🛡️ Protections : ${total}`) + '\n';
  out += pad(`🔴 Severity    : ${severity}`) + '\n';
  out += `${bot}\n\n`;

  out += "✨ Scan by ROBZBOT • Web Intelligence Mode\n";
  return out;
}

// ─── KIRIM DENGAN TOMBOL ───────────────
async function sendWithButtons(client, peerId, report, targetUrl, userId, replyTo) {
  // Simpan target untuk fitur re-scan
  if (userId) lastTarget.set(userId, targetUrl);

  const chunks = report.match(/.{1,4000}/gs) || [report];
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    if (isLast) {
      await client.sendMessage(peerId, {
        message: `<pre>${chunks[i].trim()}</pre>`,
        parseMode: 'html',
        replyTo,
        buttons: [
          [
            { text: "🔄 Re-scan", callback_data: `rescan_${userId}` },
            { text: "ℹ️ Info", callback_data: "scan_info" }
          ]
        ]
      });
    } else {
      await client.sendMessage(peerId, {
        message: `<pre>${chunks[i].trim()}</pre>`,
        parseMode: 'html',
        replyTo
      });
    }
  }
}

// ─── HANDLE CALLBACK ───────────────
module.exports.handleCallback = async ({ client, callbackQuery }) => {
  const userId = callbackQuery.senderId?.userId || callbackQuery.senderId;
  const chatId = callbackQuery.chatId || callbackQuery.peerId;
  const data = callbackQuery.data;

  if (data === "scan_info") {
    await client.sendMessage(chatId, {
      message: "ℹ️ <b>ROBZBOT Web Scanner</b>\n\n" +
               "• Deteksi WAF, CDN, proteksi\n" +
               "• Identifikasi teknologi (WordPress, React, dll)\n" +
               "• Geolokasi IP & info jaringan\n" +
               "• Non-intrusif & aman\n\n" +
               "Gunakan: <code>scan https://target.com</code>",
      parseMode: "html",
      replyTo: callbackQuery.msg.id
    });
    return;
  }

  if (data.startsWith("rescan_")) {
    const target = lastTarget.get(userId);
    if (!target) {
      await client.sendMessage(chatId, {
        message: "❌ Tidak ada target sebelumnya.",
        replyTo: callbackQuery.msg.id
      });
      return;
    }

    // Cek rate limit
    if (isRateLimited(userId)) {
      await client.sendMessage(chatId, {
        message: "⏳ Tunggu 10 detik sebelum scan lagi.",
        replyTo: callbackQuery.msg.id
      });
      return;
    }

    await client.sendMessage(chatId, {
      message: `🔄 Re-scanning ${target}...`,
      replyTo: callbackQuery.msg.id
    });

    try {
      const domain = new URL(target).hostname;
      const ip = await getIpFromDomain(domain);
      const geo = ip ? await fetchGeolocation(ip) : {};
      const fullRes = await fetchFullResponse(target);
      const tech = detectTech(fullRes.headers, fullRes.body);
      const protections = detectProtection(fullRes.status, fullRes.headers, fullRes.body, fullRes.finalUrl);

      const report = buildReport(domain, ip, geo, fullRes.status, protections, tech);
      await sendWithButtons(client, chatId, report, target, userId, callbackQuery.msg.id);
    } catch (err) {
      await client.sendMessage(chatId, {
        message: `💥 Gagal re-scan:\n<code>${err.message || 'Unknown'}</code>`,
        parseMode: "html",
        replyTo: callbackQuery.msg.id
      });
    }
  }
};

// ─── MAIN COMMAND ───────────────
module.exports.command = ["scan"];
module.exports.run = async ({ client, message }) => {
  const senderId = message.sender?.userId ||
                   (message.senderId?.userId ? message.senderId.userId : message.senderId);
  const chatId = message.chatId || message.peerId;

  if (isRateLimited(senderId)) {
    return client.sendMessage(chatId, {
      message: "⏳ Harap tunggu 10 detik sebelum scan lagi.",
      replyTo: message.id
    });
  }

  const raw = message.message?.trim();
  const input = raw?.split(/\s+/);
  if (!input || input.length < 2) {
    return client.sendMessage(chatId, {
      message: "🔍 Gunakan: <code>scan https://target.com</code>",
      parseMode: "html",
      replyTo: message.id
    });
  }

  let url;
  try {
    url = new URL(input[1]).href;
  } catch {
    return client.sendMessage(chatId, {
      message: "❌ URL tidak valid!",
      parseMode: "html",
      replyTo: message.id
    });
  }

  await client.sendMessage(chatId, {
    message: "🔍 Memindai proteksi & teknologi web...\n⏱️ Tunggu 5–10 detik.",
    replyTo: message.id
  });

  try {
    const domain = new URL(url).hostname;
    const ip = await getIpFromDomain(domain);
    const geo = ip ? await fetchGeolocation(ip) : {};
    const fullRes = await fetchFullResponse(url);
    const tech = detectTech(fullRes.headers, fullRes.body);
    const protections = detectProtection(fullRes.status, fullRes.headers, fullRes.body, fullRes.finalUrl);

    const report = buildReport(domain, ip, geo, fullRes.status, protections, tech);
    await sendWithButtons(client, chatId, report, url, senderId, message.id);
  } catch (err) {
    console.error("[SCAN ERROR]", err.message);
    await client.sendMessage(chatId, {
      message: `💥 Gagal scan:\n<code>${err.message || 'Unknown error'}</code>`,
      parseMode: "html",
      replyTo: message.id
    });
  }
};