/**
 * ============================================================================
 * SECURITY DEMO LAUNCHER v1.0
 * ============================================================================
 * Combined launcher for CSRF and XSS educational demos.
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
    console.log(`${C.cyan}${C.bright}  SECURITY${C.reset}${C.dim} // Educational Demo Launcher v1.0${C.reset}`);
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
    console.log(`  ${C.cyan}│${C.reset}  ${C.green}[3]${C.reset} 📖 Learn About Web Security                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}  ${C.red}[4]${C.reset} ❌ Exit                                             ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}│${C.reset}                                                         ${C.cyan}│${C.reset}`);
    console.log(`  ${C.cyan}└─────────────────────────────────────────────────────────┘${C.reset}`);
    console.log('');
}

function runDemo(scriptName) {
    clearScreen();
    const child = spawn('node', [path.join(__dirname, scriptName)], {
        stdio: 'inherit',
        shell: true
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
  ${C.cyan}│${C.reset}  ${C.bright}KEY DIFFERENCE:${C.reset}                                        ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - CSRF: Makes requests on behalf of the user                ${C.cyan}│${C.reset}
  ${C.cyan}│${C.reset}  - XSS: Executes scripts in the user's browser               ${C.cyan}│${C.reset}
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
            case '1':
                runDemo('manager.js');
                return;
            case '2':
                runDemo('xss-manager.js');
                return;
            case '3':
                showSecurityInfo();
                return;
            case '4':
                console.log(`\n  ${C.red}  ⚠️  Stay ethical, stay legal!${C.reset}\n`);
                rl.close();
                process.exit(0);
            default:
                console.log(`\n  ${C.red}  Invalid option. Press Enter to try again...${C.reset}`);
                await new Promise(resolve => rl.question('', resolve));
        }
    }
}

// Start
mainMenu();
