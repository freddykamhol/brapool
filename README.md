## BRApool

### Local development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Run production server

```bash
npm run start
```

### Netcup/Plesk deployment (Node 20.20.0)

1. Ensure local Node version in project directory:

```bash
nodenv local 20.20.0
```

2. Install dependencies and build:

```bash
npm ci
npx prisma migrate deploy
npm run build
```

3. Start app:

```bash
npm run start
```

Repository deployment aids:
- `.node-version` pinned to `20.20.0`
- `.npmrc` with `scripts-prepend-node-path=true` for PATH issues on panel-driven installs
- `.env.example` as template for required environment variables
