# Security Demo Toolkit

Educational web security demonstration tools for learning about common vulnerabilities and their defenses.

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/kiragamingofficial95-cmd/security-demo-toolkit.git
cd security-demo-toolkit

# Install dependencies
npm install

# Run the launcher (shows all tools)
npm start
```

## 📋 All Tools

| # | Tool | Command | Description |
|---|------|---------|-------------|
| 1 | **CSRF Demo** | `npm run crf` | Cross-Site Request Forgery |
| 2 | **XSS Demo** | `npm run xss` | Cross-Site Scripting |
| 3 | **Session Hijacking** | `npm run session` | Session Hijacking |
| 4 | **SQL Injection** | `npm run sqli` | SQL Injection (SQLi) |
| 5 | **Clickjacking** | `npm run clickjacking` | UI Redressing |
| 6 | **SSRF Demo** | `npm run ssrf` | Server-Side Request Forgery |
| 7 | **MITM Demo** | `npm run mitm` | Man-in-the-Middle |
| 8 | **Directory Traversal** | `npm run traversal` | Path Traversal |
| 9 | **XXE Demo** | `npm run xxe` | XML External Entity |
| 10 | **Deserialization** | `npm run deserialization` | Insecure Deserialization |
| 11 | **Broken Auth** | `npm run auth` | Broken Authentication |
| 12 | **Misconfiguration** | `npm run misconfig` | Security Misconfiguration |
| 13 | **API Abuse** | `npm run api` | API Abuse |

## 🎯 Features

- 🛡️ **13 Attack Types** — Comprehensive coverage of web vulnerabilities
- 🎨 **Sci-Fi Terminal UI** — Hacker-style interface with ASCII art
- 🌐 **Cloudflare Tunnel** — One-click public URL generation
- 📖 **Educational Content** — Theory + prevention for each attack
- ⚙️ **Custom Payloads** — Add your own attack payloads
- 💾 **Config Persistence** — Save and load configurations

## 📖 What Each Tool Covers

### CSRF (Cross-Site Request Forgery)
- Form-based attacks
- JavaScript-based attacks (React/Next.js)
- Custom attack builder

### XSS (Cross-Site Scripting)
- Reflected XSS
- Stored XSS
- DOM-based XSS
- Pre-built payloads (Alert, Cookie Stealer, Keylogger)

### Session Hijacking
- XSS cookie theft
- MITM sniffing
- Session fixation
- Network sniffing

### SQL Injection
- Auth bypass
- UNION-based extraction
- Blind SQLi
- Time-based SQLi

### Clickjacking
- Like jacking
- Cursor jacking
- Cookie jacking
- Drag & drop jacking

### SSRF (Server-Side Request Forgery)
- Internal network access
- Localhost exploitation
- File protocol abuse
- Gopher protocol

### MITM (Man-in-the-Middle)
- HTTP sniffing
- SSL stripping
- DNS spoofing
- ARP spoofing

### Directory Traversal
- /etc/passwd reading
- /etc/shadow reading
- Log file access
- Windows file access

### XXE (XML External Entity)
- File reading
- SSRF via XXE
- Billion laughs DoS

### Insecure Deserialization
- Java deserialization
- PHP object injection
- Python pickle
- .NET deserialization

### Broken Authentication
- Brute force
- Credential stuffing
- Session fixation
- Password reset abuse

### Security Misconfiguration
- Default credentials
- Verbose errors
- Directory listing
- Missing security headers

### API Abuse
- Rate limit bypass
- Auth bypass
- Data exposure
- API injection

## 🛡️ Prevention Guides

Each tool includes a prevention guide:
- Best practices
- Code examples
- Security headers
- Configuration tips

## ⚠️ Disclaimer

These tools are for **educational purposes only**. Only test systems you own or have explicit permission to test. Unauthorized access to computer systems is illegal.

## 📚 Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [HackerOne Hacktivity](https://hackerone.com/hacktivity)

## 📄 License

MIT
