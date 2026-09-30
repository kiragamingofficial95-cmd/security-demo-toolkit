/**
 * API ABUSE EDUCATIONAL DEMO - MANAGER CLI v1.0
 * Usage: node api-manager.js
 */

const http = require('http');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const C = { reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m' };

const CONFIG_FILE = path.join(__dirname, 'api-config.json');
const DEFAULT_CONFIG = {
    targetUrl: 'http://localhost:3000',
    targetName: 'Target API',
    maliciousPort: 3013,
    tunnel: 'cloudflared',
    scenarios: [
        { id: 'api-rate-limit', name: 'Rate Limit Bypass', description: 'Bypass API rate limiting', enabled: true },
        { id: 'api-auth-bypass', name: 'Auth Bypass', description: 'Bypass API authentication', enabled: true },
        { id: 'api-data-exposure', name: 'Data Exposure', description: 'Access unauthorized data', enabled: true },
        { id: 'api-injection', name: 'API Injection', description: 'Inject malicious payloads into API', enabled: false },
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
    const p = { info: `${C.blue}[INFO]${C.reset}`, ok: `${C.green}[ OK ]${C.reset}`, warn: `${C.yellow}[WARN]${C.reset}`, error: `${C.red}[FAIL]${C.reset}`, attack: `${C.magenta}[API]${C.reset}`, system: `${C.white}[SYS ]${C.reset}` }[type] || `[${type}]`;
    console.log(`  ${C.cyan}[${t}]${C.reset} ${p} ${msg}`);
}
function printBanner() {
    console.log('');
    console.log(`${C.green}${C.bright}
 █████╗ ██████╗ ██╗
 ██╔══██╗██╔══██╗██║
 ███████║██████╔╝██║
 ██╔══██║██╔═══╝ ██║
 ██║  ██║██║     ███████╗
 ╚═╝  ╚═╝╚═╝     ╚══════╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.green}${C.bright}  API${C.reset}${C.dim} // API Abuse Demo Manager v1.0${C.reset}`);
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
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}API ABUSE SCENARIOS${C.reset}                                        ${C.cyan}│${C.reset}`);
    config.scenarios.forEach((s, i) => {
        const st = s.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
        console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${i + 1}]${C.reset} ${s.name.padEnd(20)} ${st}`);
    });
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${config.scenarios.length + 1}]${C.reset} ${C.bright}+ Add Custom${C.reset}                                    ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}
function printMenu() {
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}MAIN MENU${C.reset}                                                 ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} 🚀 One-Click Deploy (Server + Tunnel)              ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} 🎯 Configure Target URL                            ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} ⚙️  Manage Scenarios                              ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} 🌐 Domain / Tunnel Setup                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} 📋 View Current Config                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[6]${C.reset} 💾 Save Config                                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[7]${C.reset} 📖 API Abuse Theory                               ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[8]${C.reset} 🛡️  Prevention Guide                               ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.red}[9]${C.reset} ❌ Terminate Session                               ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}

function generateHTML() {
    const targetUrl = config.targetUrl.replace(/\/$/, '');
    let cards = '';
    config.scenarios.forEach((s, i) => {
        if (!s.enabled) return;
        cards += `<div class="card"><h4>${s.name}</h4><p>${s.description}</p></div>`;
    });
    return `<!DOCTYPE html><html><head><title>API Abuse Demo</title><style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
        .card { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .card h4 { color: #4eff88; margin: 0 0 10px 0; }
    </style></head><body>
        <h1>API Abuse Scenarios</h1>
        <p>Target: ${targetUrl}</p>
        ${cards}
    </body></html>`;
}

function startServer() {
    const s = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(generateHTML()); });
    s.on('error', (err) => { if (err.code === 'EADDRINUSE') { log('error', `Port ${config.maliciousPort} in use!`); process.exit(1); } });
    s.listen(config.maliciousPort, () => { log('attack', 'API demo server deployed!'); log('info', `Local: http://localhost:${config.maliciousPort}`); });
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
        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}API${C.reset}${C.green}]─[${C.reset}${C.bright}manager${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);
        switch (choice.trim()) {
            case '1': await oneClickDeploy(); break;
            case '2': await configureTarget(); break;
            case '3': await manageScenarios(); break;
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
async function manageScenarios() {
    while (true) {
        clearScreen(); printBanner();
        console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
        config.scenarios.forEach((s, i) => { const st = s.enabled ? `${C.green}●${C.reset}` : `${C.red}○${C.reset}`; console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${i + 1}]${C.reset} ${s.name.padEnd(20)} ${st} ${C.cyan}│${C.reset}`); });
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.scenarios.length + 1}]${C.reset} + Add Custom ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.scenarios.length + 2}]${C.reset} ← Back ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
        const c = await ask(`  ${C.green}└─▶${C.reset} `);
        const num = parseInt(c.trim());
        if (num >= 1 && num <= config.scenarios.length) { const s = config.scenarios[num - 1]; const e = await ask(`  Enable? (y/n) [${s.enabled ? 'y' : 'n'}]: `); if (e.trim().toLowerCase() === 'y') s.enabled = true; if (e.trim().toLowerCase() === 'n') s.enabled = false; }
        else if (num === config.scenarios.length + 1) { const n = await ask(`  Name: `); const d = await ask(`  Description: `); config.scenarios.push({ id: 'api-' + Date.now(), name: n.trim() || 'Custom', description: d.trim(), enabled: true }); log('ok', 'Added!'); }
        else if (num === config.scenarios.length + 2) return;
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
  ${C.cyan}│${C.reset} ${C.bright}${C.white}📖 API ABUSE THEORY${C.reset}                                      ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}  API abuse exploits APIs for unauthorized access or data.  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} Rate Limit Bypass - Bypass API rate limiting     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} Auth Bypass - Bypass API authentication           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Data Exposure - Access unauthorized data          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} API Injection - Inject malicious payloads         ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.red}IMPACT:${C.reset} Data theft, service abuse, unauthorized access   ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}
function showPrevention() {
    clearScreen(); printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}🛡️  API ABUSE PREVENTION${C.reset}                                ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} Rate Limiting ⭐ (Best)                          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} Authentication & Authorization (OAuth2, JWT)     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Input Validation                                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} API Gateway                                    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} Monitoring & Logging                             ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}

(async () => { await mainMenu(); })();
