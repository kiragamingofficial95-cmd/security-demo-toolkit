/**
 * ============================================================================
 * SECURITY DEMO LAUNCHER v2.0
 * ============================================================================
 * Combined launcher for all security educational demos.
 *
 * Usage: node index.js
 * ============================================================================
 */

const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function clearScreen() {
    process.stdout.write('\x1Bc');
}

function printBanner() {
    console.log('');
    console.log(`${C.cyan}${C.bright}
 ███████╗███████╗ ██████╗██╗   ██╗██████╗ ██╗████████╗██╗   ██╗
 ██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝
 ███████╗█████╗  ██║     ██║   ██║██████╔╝██║   ██║    ╚████╔╝
 ╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██║   ██║     ╚██╔╝
 ███████║███████╗╚██████╗╚██████╔╝██║  ██║██║   ██║      ██║
 ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝   ╚═╝      ╚═╝${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.cyan}${C.bright}  SECURITY${C.reset}${C.dim} // Educational Demo Launcher v2.0${C.reset}`);
    console.log(`${C.dim}  ════════════════════════════════════════════════════════════${C.reset}`);
    console.log('');
}

function printMenu() {
    console.log(`  ${C.cyan}┌─────────────────────────────────────────────────────────┐${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset} ${C.bright}${C.white}SELECT DEMO${C.reset}                                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}├─────────────────────────────────────────────────────────┤${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}                                                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[1]${C.reset} 🛡️  CSRF Demo (Cross-Site Request Forgery)          ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[2]${C.reset} 💉 XSS Demo (Cross-Site Scripting)                  ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} 🔐 Session Hijacking Demo                          ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[4]${C.reset} 🗄️  SQL Injection Demo                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[5]${C.reset} 🖱️  Clickjacking Demo                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[6]${C.reset} 🌐 SSRF Demo (Server-Side Request Forgery)        ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[7]${C.reset} 🔍 MITM Demo (Man-in-the-Middle)                   ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[8]${C.reset} 📁 Directory Traversal Demo                      ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[9]${C.reset} 📄 XXE Demo (XML External Entity)                ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[10]${C.reset} 🔓 Insecure Deserialization Demo                  ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[11]${C.reset} 🔑 Broken Authentication Demo                     ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[12]${C.reset} ⚙️  Security Misconfiguration Demo                 ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[13]${C.reset} 🔌 API Abuse Demo                                 ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[14]${C.reset} 📖 Learn About Web Security                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.red}[15]${C.reset} ❌ Exit                                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}                                                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}

function runDemo(scriptName) {
    clearScreen();
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn(process.execPath, [scriptPath], {
        stdio: 'inherit',
        cwd: __dirname
    });
    
    child.on('close', () => {
        console.log('');
        console.log(`  ${C.dim}Press Enter to return to menu...${C.reset}`);
        rl.question('', () => {
            mainMenu();
        });
    });
}

function showSecurityInfo() {
    clearScreen();
    printBanner();
    console.log(`
  ${C.cyan}┌─────────────────────────────────────────────────────────────┐${C.reset}
  ${C.cyan}│${C.reset} ${C.bright}${C.white}📖 WEB SECURITY BASICS${C.reset}                                  ${C.cyan}│${C.reset}
  ${C.cyan}├─────────────────────────────────────────────────────────────┤${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.yellow}CSRF${C.reset} (Cross-Site Request Forgery)                     ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Tricks user's browser into making unwanted requests      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Uses session cookies to authenticate requests            ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Prevention: CSRF tokens, SameSite cookies                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.yellow}XSS${C.reset} (Cross-Site Scripting)                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Injects malicious scripts into web pages                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Can steal cookies, session tokens, keystrokes            ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Prevention: Input validation, output encoding, CSP        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.yellow}SQLi${C.reset} (SQL Injection)                                 ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Injects malicious SQL into input fields                  ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Can read/modify/delete database data                      ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - Prevention: Parameterized queries, ORM                   ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  ${C.bright}KEY DIFFERENCE:${C.reset}                                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - CSRF: Makes requests on behalf of the user                ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - XSS: Executes scripts in the user's browser               ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - SQLi: Manipulates database queries                       ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}                                                             ${C.cyan}│${C.reset}
  ${C.cyan}└─────────────────────────────────────────────────────────────┘${C.reset}
`);
    console.log(`  ${C.dim}Press Enter to return to menu...${C.reset}`);
    rl.question('', () => {
        mainMenu();
    });
}

async function mainMenu() {
    while (true) {
        clearScreen();
        printBanner();
        printMenu();

        const choice = await new Promise(resolve => {
            rl.question(`  ${C.green}┌─[${C.reset}${C.bright}SECURITY${C.reset}${C.green}]─[${C.reset}${C.bright}launcher${C.reset}${C.green}]${C.reset}\n  ${C.green}└─▶${C.reset} `, resolve);
        });

        switch (choice.trim()) {
            case '1': runDemo('manager.js'); return;
            case '2': runDemo('xss-manager.js'); return;
            case '3': runDemo('session-manager.js'); return;
            case '4': runDemo('sqli-manager.js'); return;
            case '5': runDemo('clickjacking-manager.js'); return;
            case '6': runDemo('ssrf-manager.js'); return;
            case '7': runDemo('mitm-manager.js'); return;
            case '8': runDemo('traversal-manager.js'); return;
            case '9': runDemo('xxe-manager.js'); return;
            case '10': runDemo('deserialization-manager.js'); return;
            case '11': runDemo('auth-manager.js'); return;
            case '12': runDemo('misconfig-manager.js'); return;
            case '13': runDemo('api-manager.js'); return;
            case '14': showSecurityInfo(); return;
            case '15': console.log(`\n  ${C.red}  ⚠️  Stay ethical, stay legal!${C.reset}\n`); rl.close(); process.exit(0);
            default:
                console.log(`\n  ${C.red}  Invalid option. Press Enter to try again...${C.reset}`);
                await new Promise(resolve => rl.question('', resolve));
        }
    }
}

mainMenu();
