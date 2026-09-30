/**
 * ============================================================================
 * CSRF EDUCATIONAL DEMO - TARGET SERVER (Vulnerable)
 * ============================================================================
 * This simulates a real web application that is VULNERABLE to CSRF attacks.
 * 
 * WHAT IS CSRF?
 * Cross-Site Request Forgery tricks a logged-in user's browser into making
 * unwanted requests to a target site. The browser automatically attaches
 * session cookies, so the server thinks the request is legitimate.
 *
 * THIS SERVER IS INTENTIONALLY VULNERABLE - DO NOT USE IN PRODUCTION
 * ============================================================================
 */

const http = require('http');
const url = require('url');

// Simulate a "logged in" user session
// In a real app, this would be a session cookie/token
const userSession = {
    loggedIn: true,
    username: 'victim_user',
    email: 'victim@example.com',
    balance: 1000,
};

// Parse cookies from request header
function parseCookies(cookieHeader) {
    const cookies = {};
    if (cookieHeader) {
        cookieHeader.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            cookies[name] = value;
        });
    }
    return cookies;
}

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:3000`);
    const path = parsedUrl.pathname;
    const cookies = parseCookies(req.headers.cookie);

    // --- Simulate session check ---
    const isLoggedIn = cookies.session === 'valid_session_token';

    // ============================================
    // PAGE: Home (shows current user state)
    // ============================================
    if (path === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MyBank - Home</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 10px 0; }
                    .balance { font-size: 2em; color: #2ecc71; }
                    .email { color: #555; }
                    .nav { margin: 20px 0; }
                    .nav a { margin-right: 15px; color: #3498db; }
                    .protected { color: #e74c3c; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>🏦 MyBank (Vulnerable Demo)</h1>
                <div class="nav">
                    <a href="/">Home</a>
                    <a href="/transfer">Transfer Money</a>
                    <a href="/change-email">Change Email</a>
                </div>
                
                <div class="card">
                    <h2>Account Overview</h2>
                    <p>User: <strong>${userSession.username}</strong></p>
                    <p class="balance">$${userSession.balance}</p>
                    <p class="email">Email: ${userSession.email}</p>
                    <p class="protected">⚠️ Session: ${isLoggedIn ? 'LOGGED IN' : 'NOT LOGGED IN'}</p>
                </div>

                <div class="card" style="background: #fff3cd; border-color: #ffc107;">
                    <h3>🔒 Security Notice</h3>
                    <p>This app is <strong>intentionally vulnerable</strong> to CSRF for educational purposes.</p>
                    <p>Notice: There are <strong>no CSRF tokens</strong> protecting the forms below.</p>
                </div>
            </body>
            </html>
        `);
        return;
    }

    // ============================================
    // PAGE: Transfer Money Form (VULNERABLE - no CSRF token!)
    // ============================================
    if (path === '/transfer' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MyBank - Transfer</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 10px 0; }
                    input, button { padding: 10px; margin: 5px 0; width: 100%; box-sizing: border-box; }
                    button { background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    button:hover { background: #2980b9; }
                    .nav a { margin-right: 15px; color: #3498db; }
                </style>
            </head>
            <body>
                <h1>💸 Transfer Money</h1>
                <div class="nav"><a href="/">← Back to Home</a></div>
                
                <div class="card">
                    <form action="/transfer" method="POST">
                        <label>Recipient:</label>
                        <input type="text" name="to" value="attacker_account" required>
                        
                        <label>Amount ($):</label>
                        <input type="number" name="amount" value="500" required>
                        
                        <button type="submit">Send Money</button>
                    </form>
                </div>

                <div class="card" style="background: #f8d7da; border-color: #dc3545;">
                    <h3>⚠️ Vulnerability</h3>
                    <p>This form has <strong>NO CSRF token</strong>. Any website can submit
                    hidden forms to this endpoint using your session cookie!</p>
                </div>
            </body>
            </html>
        `);
        return;
    }

    // ============================================
    // ACTION: Process Transfer (VULNERABLE - no CSRF protection!)
    // ============================================
    if (path === '/transfer' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const to = params.get('to');
            const amount = parseInt(params.get('amount'));

            // VULNERABILITY: Only checks if user is logged in via cookie
            // Does NOT verify the request actually came from our site!
            if (!isLoggedIn) {
                res.writeHead(403, { 'Content-Type': 'text/html' });
                res.end('<h1>403 - Please log in first</h1>');
                return;
            }

            // Process the "transfer"
            userSession.balance -= amount;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Transfer Complete</title>
                <style>body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }</style>
                </head>
                <body>
                    <h1>✅ Transfer "Successful"</h1>
                    <p>Sent <strong>$${amount}</strong> to <strong>${to}</strong></p>
                    <p>New balance: <strong>$${userSession.balance}</strong></p>
                    <p><a href="/">← Back to Home</a></p>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                        <strong>🎓 Education:</strong> This transfer was processed because your browser
                        sent your session cookie automatically. A malicious site could trigger this
                        without you ever visiting this page!
                    </div>
                </body>
                </html>
            `);
        });
        return;
    }

    // ============================================
    // PAGE: Change Email Form (VULNERABLE)
    // ============================================
    if (path === '/change-email' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>MyBank - Change Email</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 10px 0; }
                    input, button { padding: 10px; margin: 5px 0; width: 100%; box-sizing: border-box; }
                    button { background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    .nav a { margin-right: 15px; color: #3498db; }
                </style>
            </head>
            <body>
                <h1>📧 Change Email</h1>
                <div class="nav"><a href="/">← Back to Home</a></div>
                
                <div class="card">
                    <form action="/change-email" method="POST">
                        <label>New Email:</label>
                        <input type="email" name="email" placeholder="newemail@example.com" required>
                        <button type="submit">Update Email</button>
                    </form>
                </div>
            </body>
            </html>
        `);
        return;
    }

    // ============================================
    // ACTION: Process Email Change (VULNERABLE)
    // ============================================
    if (path === '/change-email' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const newEmail = params.get('email');

            if (!isLoggedIn) {
                res.writeHead(403, { 'Content-Type': 'text/html' });
                res.end('<h1>403 - Please log in first</h1>');
                return;
            }

            userSession.email = newEmail;

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Email Updated</title>
                <style>body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }</style>
                </head>
                <body>
                    <h1>✅ Email Updated</h1>
                    <p>New email: <strong>${newEmail}</strong></p>
                    <p><a href="/">← Back to Home</a></p>
                </body>
                </html>
            `);
        });
        return;
    }

    // ============================================
    // LOGIN: Simulate setting a session cookie
    // ============================================
    if (path === '/login' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Set-Cookie': 'session=valid_session_token; Path=/; HttpOnly'
        });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Logged In</title>
            <style>body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }</style>
            </head>
            <body>
                <h1>🔓 Logged In!</h1>
                <p>Session cookie has been set.</p>
                <p><a href="/">← Go to MyBank</a></p>
                <p><a href="http://localhost:3001">⚠️ Now visit the malicious site (port 3001)</a></p>
            </body>
            </html>
        `);
        return;
    }

    // ============================================
    // LOGOUT: Clear session
    // ============================================
    if (path === '/logout' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Set-Cookie': 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
        });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Logged Out</title>
            <style>body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }</style>
            </head>
            <body>
                <h1>🔒 Logged Out</h1>
                <p><a href="/">← Go to MyBank</a></p>
            </body>
            </html>
        `);
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Not Found</h1>');
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log('========================================');
    console.log('  CSRF DEMO - Target Server (Vulnerable)');
    console.log('========================================');
    console.log('');
    console.log(`  🏦 MyBank running at: http://localhost:${PORT}`);
    console.log('');
    console.log('  Steps to demo CSRF:');
    console.log(`  1. Visit http://localhost:${PORT}/login to "log in"`);
    console.log(`  2. Visit http://localhost:${PORT}/ to see your account`);
    console.log(`  3. Open the malicious site at http://localhost:3001`);
    console.log(`  4. Watch the attack happen automatically!`);
    console.log('');
    console.log('========================================');
});
