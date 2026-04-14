// test/yomama.test.js
"use strict";

const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const nock = require("nock");

const plugin = require(".."); // assumes index.js is main
const yomamaCommand = plugin._command;

// Fake client/target so we can capture output
function makeFakeClient() {
    const messages = [];
    const asUser = [];

    return {
        messages,
        asUser,
        sendMessage(text, chan) {
            messages.push({ text, chan });
        },
        runAsUser(text, chanId) {
            asUser.push({ text, chanId });
        },
    };
}

function makeFakeTarget() {
    return {
        chan: { id: 1, name: "#test" },
    };
}

beforeEach(() => {
    nock.cleanAll();
});

afterEach(() => {
    assert.equal(
        nock.isDone(),
        true,
        "Not all HTTP mocks were used (expected all mocked endpoints to be hit)"
    );
});

// Helper to run the command
async function runCmd(args) {
    const client = makeFakeClient();
    const target = makeFakeTarget();

    await yomamaCommand.input(client, target, "yomama", args);

    return { client, target };
}

/**
 * Helpers to assert possessive prefix
 */

function expectPossessivePrefix(output, nick) {
    const base = nick.trim();
    const expected =
        /s$/i.test(base) ? `${base}' mama` : `${base}'s mama`;

    assert(
        output.toLowerCase().startsWith(expected.toLowerCase()),
        `Expected "${output}" to start with "${expected}"`
    );
}

// ---- Tests ----

// /yomama or /yomama help → prints help (check both)

test("/yomama (no args) prints help", async () => {
    const { client } = await runCmd([]);

    assert(client.messages.length > 0);
    assert(
        client.messages[0].text.includes("Yo Mama plugin usage:"),
        "First line should be help header"
    );
});

test("/yomama help prints help", async () => {
    const { client } = await runCmd(["help"]);

    assert(client.messages.length > 0);
    assert(
        client.messages[0].text.includes("Yo Mama plugin usage:"),
        "First line should be help header"
    );
});

// /yomama random → random joke

test("/yomama random calls GET /api/random and sends joke", async () => {
    const jokeText = "Yo mama is so fat she has her own zipcode.";

    nock("https://www.yomama-jokes.com")
        .get("/api/random")
        .reply(200, { id: 1, joke: jokeText, category: "fat" });

    const { client } = await runCmd(["random"]);

    assert.equal(client.asUser.length, 1);
    assert.equal(client.asUser[0].text, jokeText);
});

// /yomama categories → prints categories

test("/yomama categories prints categories", async () => {
    const { client } = await runCmd(["categories"]);

    assert(client.messages.length >= 1);
    const line = client.messages[0].text.toLowerCase();
    assert(
        line.includes("available categories"),
        `Expected first message to mention "available categories", got: ${line}`
    );
});

// /yomama {category} → joke from the selected category

test("/yomama fat calls POST /api/random/fat and sends joke", async () => {
    const jokeText = "Yo mama is so fat, she sat on a rainbow.";

    nock("https://www.yomama-jokes.com")
        .post("/api/random/fat")
        .reply(200, { id: 2, joke: jokeText, category: "fat" });

    const { client } = await runCmd(["fat"]);

    assert.equal(client.asUser.length, 1);
    assert.equal(client.asUser[0].text, jokeText);
});

// /yomama --<nick> AND /yomama -- <nick> → personalized random joke

test("/yomama --bobby sends personalized random joke", async () => {
    const jokeText = "Yo mama is so ugly, she scares onions.";

    nock("https://www.yomama-jokes.com")
        .get("/api/random")
        .reply(200, { id: 3, joke: jokeText, category: "ugly" });

    const { client } = await runCmd(["--bobby"]);

    assert.equal(client.asUser.length, 1);
    const out = client.asUser[0].text;
    expectPossessivePrefix(out, "bobby");
});

test('/yomama -- bobby (space) sends personalized random joke', async () => {
    const jokeText = "Yo mama is so ugly, she scares onions.";

    nock("https://www.yomama-jokes.com")
        .get("/api/random")
        .reply(200, { id: 30, joke: jokeText, category: "ugly" });

    const { client } = await runCmd(["--", "bobby"]);

    assert.equal(client.asUser.length, 1);
    const out = client.asUser[0].text;
    expectPossessivePrefix(out, "bobby");
});

// /yomama random --<nick> AND /yomama random -- <nick> → personalized random joke

test("/yomama random --alice sends personalized random joke", async () => {
    const jokeText = "Yo mama is so old, her birth certificate is on a rock.";

    nock("https://www.yomama-jokes.com")
        .get("/api/random")
        .reply(200, { id: 4, joke: jokeText, category: "old" });

    const { client } = await runCmd(["random", "--alice"]);

    assert.equal(client.asUser.length, 1);
    const out = client.asUser[0].text;
    expectPossessivePrefix(out, "alice");
});

test('/yomama random -- alice (space) sends personalized random joke', async () => {
    const jokeText = "Yo mama is so old, her birth certificate is on a rock.";

    nock("https://www.yomama-jokes.com")
        .get("/api/random")
        .reply(200, { id: 40, joke: jokeText, category: "old" });

    const { client } = await runCmd(["random", "--", "alice"]);

    assert.equal(client.asUser.length, 1);
    const out = client.asUser[0].text;
    expectPossessivePrefix(out, "alice");
});

// /yomama {category} --<nick> AND /yomama {category} -- <nick> → personalized category joke

test("/yomama fat --chris sends personalized fat joke (name ends with s)", async () => {
    const jokeText =
        "Yo mama is so fat, she doesn't need the internet; she's already worldwide.";

    nock("https://www.yomama-jokes.com")
        .post("/api/random/fat")
        .reply(200, { id: 5, joke: jokeText, category: "fat" });

    const { client } = await runCmd(["fat", "--chris"]);

    assert.equal(client.asUser.length, 1);
    const out = client.asUser[0].text;
    // chris → chris' mama
    expectPossessivePrefix(out, "chris");
});

test('/yomama fat -- chris (space) sends personalized fat joke', async () => {
    const jokeText =
        "Yo mama is so fat, she doesn't need the internet; she's already worldwide.";

    nock("https://www.yomama-jokes.com")
        .post("/api/random/fat")
        .reply(200, { id: 50, joke: jokeText, category: "fat" });

    const { client } = await runCmd(["fat", "--", "chris"]);

    assert.equal(client.asUser.length, 1);
    const out = client.asUser[0].text;
    expectPossessivePrefix(out, "chris");
});

// /yomama potato → invalid argument tip message

test("/yomama potato shows tip only (no joke)", async () => {
    const { client } = await runCmd(["potato"]);

    assert.equal(client.asUser.length, 0, "Should not send a joke");
    assert.equal(client.messages.length, 1, "Should show one tip message");
    assert(
        client.messages[0].text.includes("Unsupported argument"),
        "Should mention unsupported argument"
    );
});

// /yomama potato --<nick> OR /yomama potato -- <nick> → tip + personalized random joke

test("/yomama potato --dana shows tip + personalized random joke", async () => {
    const jokeText =
        "Yo mama is so short, you can see her feet on her ID card.";

    nock("https://www.yomama-jokes.com")
        .get("/api/random")
        .reply(200, { id: 6, joke: jokeText, category: "short" });

    const { client } = await runCmd(["potato", "--dana"]);

    assert.equal(client.messages.length, 1, "Should show one tip message");
    assert(
        client.messages[0].text.includes("Unsupported argument"),
        "Should mention unsupported argument"
    );
    assert(
        client.messages[0].text.includes(
            "Sending a random personalized joke instead…"
        ),
        "Should mention personalized fallback"
    );

    assert.equal(client.asUser.length, 1, "Should send one joke");
    const out = client.asUser[0].text;
    expectPossessivePrefix(out, "dana");
});

test('/yomama potato -- dana (space) shows tip + personalized random joke', async () => {
    const jokeText =
        "Yo mama is so short, you can see her feet on her ID card.";

    nock("https://www.yomama-jokes.com")
        .get("/api/random")
        .reply(200, { id: 60, joke: jokeText, category: "short" });

    const { client } = await runCmd(["potato", "--", "dana"]);

    assert.equal(client.messages.length, 1, "Should show one tip message");
    assert(
        client.messages[0].text.includes("Unsupported argument"),
        "Should mention unsupported argument"
    );
    assert(
        client.messages[0].text.includes(
            "Sending a random personalized joke instead…"
        ),
        "Should mention personalized fallback"
    );

    assert.equal(client.asUser.length, 1, "Should send one joke");
    const out = client.asUser[0].text;
    expectPossessivePrefix(out, "dana");
});