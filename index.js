"use strict";

const axios = require("axios");

const BASE_URL = "https://www.yomama-jokes.com";
const VALID_CATEGORIES = [
    "fat", "ugly", "stupid", "poor", "old",
    "skinny", "hairy", "short", "nasty", "bald", "tall"
];
const CONNECTOR_WORDS = new Set(["for", "as"]);
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
    const replaced = joke.replace(/^\s*yo\s+(mama|momma)\b/i, `${p} $1`);
    return replaced;
}

function printHelp(client, target) {
    client.sendMessage("Yo Mama plugin usage:", target.chan);
    client.sendMessage("/yomama help - Show this help", target.chan);
    client.sendMessage("/yomama categories - List available categories", target.chan);
    client.sendMessage("/yomama random - Get a random joke", target.chan);
    client.sendMessage("/yomama <category> - Get a random joke from a category", target.chan);
    client.sendMessage("/yomama for <nick> - Random joke personalized with <nick>", target.chan);
    client.sendMessage("/yomama random for <nick> - Random joke personalized with <nick>", target.chan);
    client.sendMessage("/yomama <category> for <nick> - Category joke personalized with <nick>", target.chan);
    client.sendMessage(`Available categories: ${VALID_CATEGORIES.join(", ")}`, target.chan);
}

const yomamaCommand = {
    input: async function (client, target, command, args) {
        try {
            // Normalize and trim args to handle trailing spaces
            const cleanArgs = (args || []).map((a) => String(a || "").trim()).filter(Boolean);
            const lowerArgs = cleanArgs.map((a) => a.toLowerCase());

            // Split on "for" or "as" to capture optional nick without colliding with commands/categories
            let nick = null;
            let baseArgs = cleanArgs;

            const connectorIndex = lowerArgs.findIndex((a) => CONNECTOR_WORDS.has(a));
            if (connectorIndex !== -1) {
                // Nick is the token immediately after connector
                if (cleanArgs.length > connectorIndex + 1) {
                    nick = cleanArgs[connectorIndex + 1].trim();
                }
                // Only parse the part before the connector
                baseArgs = cleanArgs.slice(0, connectorIndex);
            }

            const firstArg = (baseArgs[0] || "").toLowerCase().trim();

            // If user only provided a nick via connector, treat as random-for-nick (must come before help branch)
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

            // Unsupported argument(s): suggest help/categories, then send a random joke as fallback (personalized if nick given)
            const shownArg = (args.join(" ") || "").trim();
            client.sendMessage(
                `${red}Unsupported argument "${shownArg}". Try /yomama help or /yomama categories. Sending a random joke instead…`,
                target.chan
            );
            const fallback = await getRandomJoke();
            const out = nick ? personalizeJoke(fallback, nick) : fallback;
            client.runAsUser(out, target.chan.id);
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