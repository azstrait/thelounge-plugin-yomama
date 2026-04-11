"use strict";

const axios = require("axios");

const BASE_URL = "https://www.yomama-jokes.com";
const VALID_CATEGORIES = [
    "fat", "ugly", "stupid", "poor", "old",
    "skinny", "hairy", "short", "nasty", "bald", "tall"
];
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

function printHelp(client, target) {
    client.sendMessage("Yo Mama plugin usage:", target.chan);
    client.sendMessage("/yomama help - Show this help", target.chan);
    client.sendMessage("/yomama categories - List available categories", target.chan);
    client.sendMessage("/yomama random - Get a random joke", target.chan);
    client.sendMessage("/yomama <category> - Get a random joke from a category", target.chan);
    client.sendMessage(`Available categories: ${VALID_CATEGORIES.join(", ")}`, target.chan);
}

const yomamaCommand = {
    input: async function (client, target, command, args) {
        try {
            // Normalize first argument: lowercase + trim to handle trailing spaces
            const firstArg = (args[0] || "").toLowerCase().trim();

            // No args or explicit help -> help message
            if (args.length === 0 || firstArg === "" || firstArg === "help") {
                printHelp(client, target);
                return;
            }

            if (firstArg === "categories") {
                client.sendMessage(`Available categories: ${VALID_CATEGORIES.join(", ")}`, target.chan);
                return;
            }

            if (firstArg === "random") {
                const joke = await getRandomJoke();
                client.runAsUser(joke, target.chan.id);
                return;
            }

            // Category mode (single, valid category)
            if (args.length === 1 && VALID_CATEGORIES.includes(firstArg)) {
                const joke = await getCategoryJoke(firstArg);
                client.runAsUser(joke, target.chan.id);
                return;
            }

            // Unsupported argument(s): suggest help/categories, then send a random joke as fallback
            const shownArg = (args.join(" ") || "").trim();
            client.sendMessage(
                `${red}Unsupported argument "${shownArg}". Try /yomama help or /yomama categories. Sending a random joke instead…`,
                target.chan
            );
            const fallback = await getRandomJoke();
            client.runAsUser(fallback, target.chan.id);
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