"use strict";

const axios = require("axios");

const BASE_URL = "https://www.yomama-jokes.com";
const VALID_CATEGORIES = [
    "fat", "ugly", "stupid", "poor", "old",
    "skinny", "hairy", "short", "nasty", "bald", "tall"
];
const NICK_PREFIX = "--";
const red = "04";

const headers = { Accept: "application/json" };

async function getRandomJoke() {
    const res = await axios.get(`${BASE_URL}/api/random`, { headers });
    return extractJoke(res);
}

async function getCategoryJoke(category) {
    const url = `${BASE_URL}/api/random/${encodeURIComponent(category)}`;
    const res = await axios.post(url, null, { headers });
    return extractJoke(res);
}

function extractJoke(response) {
    if (response && response.data && typeof response.data.joke === "string") {
        const joke = response.data.joke.trim();
        if (joke.length > 0) return joke;
    }
    throw new Error("Unexpected response from Yo Mama API");
}

function makePossessive(nick) {
    const n = (nick || "").trim();
    if (!n) return n;
    return /s$/i.test(n) ? `${n}'` : `${n}'s`;
}

function personalizeJoke(joke, nick) {
    const p = makePossessive(nick);
    if (!p) return joke;

    // Replace leading "Yo mama" or "Yo momma" (case-insensitive)
    return joke.replace(/^\s*yo\s+(mama|momma)\b/i, `${p} $1`);
}

function printHelp(client, target) {
    client.sendMessage("Yo Mama plugin usage:", target.chan);
    client.sendMessage("/yomama help → Show this help message", target.chan);
    client.sendMessage("/yomama categories → List available categories", target.chan);
    client.sendMessage("/yomama random → Get a random joke", target.chan);
    client.sendMessage("/yomama <category> → Get a random joke from a category", target.chan);
    client.sendMessage("/yomama --<nick> → Random joke personalized for <nick>", target.chan);
    client.sendMessage("/yomama random --<nick> → Random joke personalized for <nick>", target.chan);
    client.sendMessage("/yomama <category> --<nick> → Category joke personalized for <nick>", target.chan);
    client.sendMessage(`Available categories: ${VALID_CATEGORIES.join(", ")}`, target.chan);
}

function parseNickAndArgs(args) {
    const cleanArgs = (args || []).map((a) => String(a || "").trim()).filter(Boolean);

    let nick = null;
    let removalIndexes = new Set();

    for (let i = 0; i < cleanArgs.length; i++) {
        const tok = cleanArgs[i];

        // Case 1: --nick (single token)
        if (tok.startsWith(NICK_PREFIX) && tok.length > NICK_PREFIX.length) {
            nick = tok.slice(NICK_PREFIX.length).trim();
            removalIndexes.add(i);
            break;
        }

        // Case 2: "--" followed by "nick" (two tokens)
        if (tok === NICK_PREFIX && i + 1 < cleanArgs.length) {
            const next = cleanArgs[i + 1].trim();
            if (next) {
                nick = next;
                removalIndexes.add(i);
                removalIndexes.add(i + 1);
                break;
            }
        }
    }

    const baseArgs = removalIndexes.size
        ? cleanArgs.filter((_, idx) => !removalIndexes.has(idx))
        : cleanArgs;

    return { baseArgs, nick };
}

const yomamaCommand = {
    input: async function (client, target, command, args) {
        try {
            const { baseArgs, nick } = parseNickAndArgs(args);
            const firstArg = (baseArgs[0] || "").toLowerCase().trim();

            // If user only provided a --nick, treat as random-for-nick (must precede help)
            if (baseArgs.length === 0 && nick) {
                const joke = await getRandomJoke();
                const out = personalizeJoke(joke, nick);
                client.runAsUser(out, target.chan.id);
                return;
            }

            // Help
            if (firstArg === "help" || baseArgs.length === 0) {
                printHelp(client, target);
                return;
            }

            if (firstArg === "categories") {
                client.sendMessage(`Available categories: ${VALID_CATEGORIES.join(", ")}`, target.chan);
                return;
            }

            if (firstArg === "random") {
                const joke = await getRandomJoke();
                const out = nick ? personalizeJoke(joke, nick) : joke;
                client.runAsUser(out, target.chan.id);
                return;
            }

            // Category mode (single, valid category)
            if (baseArgs.length === 1 && VALID_CATEGORIES.includes(firstArg)) {
                const joke = await getCategoryJoke(firstArg);
                const out = nick ? personalizeJoke(joke, nick) : joke;
                client.runAsUser(out, target.chan.id);
                return;
            }

            // Unsupported arguments:
            // - If no nick: just tip (no random fallback)
            // - If nick present: tip + random personalized fallback
            const shownArg = baseArgs.join(" ").trim();
            client.sendMessage(
                `${red}Unsupported argument "${shownArg}". Try /yomama help or /yomama categories.`,
                target.chan
            );

            if (nick) {
                const fallback = await getRandomJoke();
                const out = personalizeJoke(fallback, nick);
                client.runAsUser(out, target.chan.id);
            }
        } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            client.sendMessage(`${red}Error getting joke: ${msg}`, target.chan);
        }
    },
    allowDisconnected: true,
};

module.exports = {
    onServerStart: (api) => {
        api.Commands.add("yomama", yomamaCommand);
    },
};