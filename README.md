# Security Demo Toolkit

Educational web security demonstration tools for learning about common vulnerabilities and their defenses.

## Tools Included

| Tool | Command | Description |
|------|---------|-------------|
| **Launcher** | `npm start` | Combined launcher for all demos |
| **CSRF Demo** | `npm run crf` | Cross-Site Request Forgery demonstration |
| **XSS Demo** | `npm run xss` | Cross-Site Scripting demonstration |
| **Session Hijacking Demo** | `npm run session` | Session hijacking demonstration |

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/security-demo-toolkit.git
cd security-demo-toolkit

# Install dependencies
npm install

# Run the launcher
npm start
```

## What Each Tool Does

### CSRF Demo (Cross-Site Request Forgery)
Demonstrates how attackers can trick your browser into making unwanted requests to a target site where you're logged in.

**Features:**
- Custom target URL configuration
- Multiple attack types (Form-based, JavaScript-based)
- Cloudflare Tunnel integration
- Real-time attack logging

### XSS Demo (Cross-Site Scripting)
Shows how malicious scripts can be injected into web pages.

**Features:**
- Pre-built payloads (Alert, Cookie Stealer, Keylogger)
- Custom payload creation
- Payload type classification (Reflected, Stored, DOM-based)
- Copy-to-clipboard functionality

### Session Hijacking Demo
Demonstrates how session tokens can be stolen and used to impersonate users.

**Features:**
- Cookie security analysis
- Session token extraction simulation
- HttpOnly/Secure/SameSite flag testing
- Educational explanations

## Disclaimer

These tools are for **educational purposes only**. Only test systems you own or have explicit permission to test. Unauthorized access to computer systems is illegal.

## Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

## License

MIT
