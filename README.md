# thelounge-plugin-yomama

A TheLounge plugin that accepts `/yomama` commands and sends random "Yo Mama" jokes from https://www.yomama-jokes.com/.

## Features
- `/yomama` or `/yomama help` → prints help
- `/yomama categories` → shows available categories
- `/yomama random` → random joke (GET /api/random)
- `/yomama <category>` → random joke from category (POST /api/random/{category})

Valid categories: `fat`, `ugly`, `stupid`, `poor`, `old`, `skinny`, `hairy`, `short`, `nasty`, `bald`, `tall`.

## Install (via TheLounge)
From your TheLounge server:
```
thelounge install thelounge-plugin-yomama
```
and restart your TheLounge server!

Then in any channel:
- `/yomama`
- `/yomama categories`
- `/yomama random`
- `/yomama fat` (or any valid category)

## Requirements
- TheLounge v4+
- Node.js 16+ (match your TheLounge environment)

## Development

Currently TheLounge doesn't offer a way to install packages from source without npm, so you'll have to do it manually.

1. Clone the repo:

```sh
git clone https://github.com/azstrait/thelounge-plugin-yomama.git
cd thelounge-plugin-yomama
```

2. Edit `<THELOUNGE_CONFIG>/packages/package.json` to include `thelounge-plugin-yomama` like so:

```json
{
  "private": true,
  "description": "Packages for The Lounge. All packages in node_modules directory will be automatically loaded.",
  "dependencies": {
    "thelounge-theme-mininapse": "2.0.15",
    "thelounge-plugin-yomama": "1.0.0"
  }
}
```

3. Create a folder named `thelounge-plugin-yomama` in the `node_modules` subdirectory:

```sh
mkdir -p <THELOUNGE_CONFIG>/packages/node_modules/thelounge-plugin-yomama
```

4. Symlink the files from the project into the packages folder, kinda like this:

```
ln package.json <THELOUNGE_CONFIG>/packages/node_modules/thelounge-plugin-yomama/package.json
ln index.js <THELOUNGE_CONFIG>/packages/node_modules/thelounge-plugin-yomama/index.js
```

## Notes
- This plugin makes network calls to `https://www.yomama-jokes.com/api/` using the `Accept: application/json` header.
- Random joke uses GET `/api/random`; category jokes use POST `/api/random/{category}`.
- [yomama-jokes.com](https://www.yomama-jokes.com) is open-source, please go support the [original author](https://github.com/laffchem) or star the [GitHub repo](https://github.com/laffchem/yomama)!

## License
MIT