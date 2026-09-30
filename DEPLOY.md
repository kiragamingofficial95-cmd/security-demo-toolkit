# CSRF Demo - Deployment Guide

## Overview

To test CSRF against your own hosted website, you need:

1. **Target Site** — Your own hosted website (e.g., `https://mybank.com`)
2. **Malicious Server** — Publicly accessible URL that hosts the attack page
3. **HTTPS** — Required for cookies to work properly

---

## Option 1: Quick Tunnel (Easiest for Testing)

### Using ngrok (Recommended)

```bash
# 1. Install ngrok
# Windows: choco install ngrok
# Mac: brew install ngrok

# 2. Start your malicious server locally
npm run malicious

# 3. In a new terminal, expose it
ngrok http 3001
```

You'll get a URL like:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

**Use `https://abc123.ngrok.io` as your malicious URL!**

### Using Cloudflare Tunnel

```bash
# 1. Install cloudflared
# Windows: choco install cloudflared
# Mac: brew install cloudflare/cloudflare/cloudflared

# 2. Start tunnel
cloudflared tunnel --url http://localhost:3001
```

You'll get a URL like:
```
https://random-name.trycloudflare.com
```

---

## Option 2: Custom Domain (Your Own Domain)

### Step 1: Get a Domain

Register from: Namecheap, GoDaddy, Cloudflare, Porkbun, etc.

### Step 2: Deploy Malicious Server to a VPS

```bash
# On your local machine, upload files to VPS
scp -r csrf-demo/ user@your-vps-ip:/opt/

# SSH into your VPS
ssh user@your-vps-ip

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -
sudo apt install nodejs

# Install dependencies and run
cd /opt/csrf-demo
npm install
npm run malicious
```

### Step 3: Set Up Reverse Proxy with HTTPS

**Using Caddy (easiest - auto HTTPS):**

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Create `/etc/caddy/Caddyfile`:
```
malicious.yourdomain.com {
    reverse_proxy localhost:3001
}
```

```bash
# Start Caddy
sudo systemctl reload caddy
```

**Using nginx:**

```nginx
server {
    listen 443 ssl;
    server_name malicious.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/malicious.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/malicious.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Step 4: Configure DNS

In your domain registrar's DNS settings:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | 300 |
| A | www | YOUR_VPS_IP | 300 |
| A | malicious | YOUR_VPS_IP | 300 |

### Step 5: Update CSRF Manager

1. Run `npm run crf`
2. Go to **Option 2: Configure Target**
3. Set:
   - Target URL: `https://your-own-website.com`
   - Target Name: `MySite`
4. Go to **Option 4: Domain Setup**
5. Set custom domain: `malicious.yourdomain.com`
6. Start the server!

---

## Option 3: Same Machine Testing (Localhost)

If both sites are on the same machine:

```bash
# Terminal 1: Start your target site
npm run target

# Terminal 2: Start malicious server
npm run malicious

# Browser:
# 1. Go to http://localhost:3000/login
# 2. Go to http://localhost:3001
# 3. Click "CLAIM PRIZE"
```

---

## Important Notes

### Why HTTPS is Required

```
HTTP (no SSL)  → Cookies may not be sent cross-site
HTTPS (SSL)    → Cookies work properly, SameSite=None requires it
```

### Cookie Settings for Testing

Your target site should set cookies like:
```
Set-Cookie: session=xxx; Path=/; HttpOnly; SameSite=Lax
```

- `SameSite=Lax` — Allows top-level navigation (GET requests)
- `SameSite=Strict` — Blocks all cross-site requests (harder to CSRF)
- `SameSite=None; Secure` — Allows all cross-site requests (most vulnerable)

### Testing Checklist

- [ ] Target site is accessible
- [ ] Malicious server is accessible
- [ ] Both use HTTPS (or both HTTP for localhost)
- [ ] You can log into target site
- [ ] Session cookie is set
- [ ] Malicious page loads in same browser
- [ ] Attack executes successfully

---

## Troubleshooting

### "Cookies not being sent"
- Make sure both sites use HTTPS
- Check `SameSite` cookie attribute
- Verify you're using the same browser

### "DNS not propagating"
- Wait 5-30 minutes for DNS changes
- Try `dig malicious.yourdomain.com` to verify
- Clear browser DNS cache

### "Port already in use"
```bash
# Find what's using the port
netstat -ano | findstr :3001

# Kill it (Windows)
taskkill /PID <PID> /F

# Or use a different port in the manager
```
