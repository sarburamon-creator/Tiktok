// ================================
// IMPORTURI
// ================================
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
const fs = require("fs-extra");
const fetch = require("node-fetch");
const crypto = require("crypto");

// ================================
// ENV VARS (Render)
// ================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ================================
// STORAGE SESSION ID
// ================================
const DATA_FILE = "./data.json";
if (!fs.existsSync(DATA_FILE)) fs.writeJsonSync(DATA_FILE, { session_id: "" });

function getData() { return fs.readJsonSync(DATA_FILE); }
function saveData(obj) { fs.writeJsonSync(DATA_FILE, obj); }

// ================================
// DISCORD CLIENT
// ================================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================================
// SLASH COMMANDS
// ================================
const commands = [
    new SlashCommandBuilder()
        .setName("set_session_id")
        .setDescription("Salvează session ID-ul TikTok")
        .addStringOption(opt =>
            opt.setName("session")
                .setDescription("Session ID TikTok")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("new_username")
        .setDescription("Schimbă username-ul TikTok")
        .addStringOption(opt =>
            opt.setName("username")
                .setDescription("Noul username")
                .setRequired(true)
        )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
    console.log("✔ Comenzi înregistrate în Discord");
})();

// ======================================================
// =============== X GORGON FULL JS PORT =================
// ======================================================

function hexString(num) {
    let s = num.toString(16);
    return s.length < 2 ? "0" + s : s;
}

function rbit(num) {
    let b = num.toString(2).padStart(8, "0");
    return parseInt([...b].reverse().join(""), 2);
}

function reverseHex(num) {
    let s = num.toString(16).padStart(2, "0");
    return parseInt(s[1] + s[0], 16);
}

class XG {
    constructor(debug) {
        this.length = 0x14;
        this.debug = debug;
        this.hex_CE0 = [
            0x05, 0x00, 0x50,
            Math.floor(Math.random() * 255),
            0x47, 0x1e, 0x00,
            Math.floor(Math.random() * 255) & 0xf0
        ];
    }

    addr_BA8() {
        let tmp = "";
        let arr = [...Array(256).keys()];
        for (let i = 0; i < 256; i++) {
            let A = i === 0 ? 0 : tmp ? tmp : arr[i - 1];
            let B = this.hex_CE0[i % 8];
            if (A === 0x05 && i !== 1 && tmp !== 0x05) A = 0;
            let C = (A + i + B) % 256;
            tmp = C < i ? C : "";
            let D = arr[C];
            arr[i] = D;
        }
        return arr;
    }

    initial(debug, arr) {
        let tmp = [];
        let temp = [...arr];

        for (let i = 0; i < this.length; i++) {
            let A = debug[i];
            let B = tmp.length ? tmp[tmp.length - 1] : 0;
            let C = (arr[i + 1] + B) % 256;

            tmp.push(C);

            let D = temp[C];
            temp[i + 1] = D;

            let E = (D * 2) % 256;
            let F = temp[E];
            debug[i] = A ^ F;
        }

        return debug;
    }

    calculate(debug) {
        for (let i = 0; i < this.length; i++) {
            let A = debug[i];
            let B = reverseHex(A);
            let C = debug[(i + 1) % this.length];
            let D = B ^ C;
            let E = rbit(D);
            let F = E ^ this.length;
            let G = (~F) >>> 0;
            debug[i] = parseInt(G.toString(16).slice(-2), 16);
        }
        return debug;
    }

    main() {
        let result = "";
        let final = this.calculate(this.initial(this.debug, this.addr_BA8()));
        final.forEach(i => result += hexString(i));

        return (
            "8404" +
            hexString(this.hex_CE0[7]) +
            hexString(this.hex_CE0[3]) +
            hexString(this.hex_CE0[1]) +
            hexString(this.hex_CE0[6]) +
            result
        );
    }
}

function generateGorgon(param, data, cookie) {
    let now = Math.floor(Date.now() / 1000);
    let Khronos = now.toString(16);
    let debug = [];

    let urlMD5 = crypto.createHash("md5").update(param).digest("hex");
    for (let i = 0; i < 8; i += 2)
        debug.push(parseInt(urlMD5.slice(i, i + 2), 16));

    if (data) {
        let dataMD5 = crypto.createHash("md5").update(data).digest("hex");
        for (let i = 0; i < 8; i += 2)
            debug.push(parseInt(dataMD5.slice(i, i + 2), 16));
    } else debug.push(0, 0, 0, 0);

    if (cookie) {
        let cookieMD5 = crypto.createHash("md5").update(cookie).digest("hex");
        for (let i = 0; i < 8; i += 2)
            debug.push(parseInt(cookieMD5.slice(i, i + 2), 16));
    } else debug.push(0, 0, 0, 0);

    debug.push(1, 1, 2, 4);

    for (let i = 0; i < 8; i += 2) {
        let x = parseInt(Khronos.slice(i, i + 2), 16);
        debug.push(x);
    }

    return {
        "X-Gorgon": new XG(debug).main(),
        "X-Khronos": now.toString()
    };
}

// ======================================================
// ========== TikTok GET PROFILE (unique_id) ============
// ======================================================

async function getProfile(session_id, device_id, iid) {
    try {
        let param = `device_id=${device_id}&iid=${iid}&id=kaa&version_code=34.0.0&language=en&app_name=lite&app_version=34.0.0&carrier_region=SA&tz_offset=10800&locale=en&sys_region=SA&aid=473824`;
        let url = `https://api16.tiktokv.com/aweme/v1/user/profile/self/?${param}`;

        let res = await fetch(url, {
            headers: {
                "Cookie": `sessionid=${session_id}`,
                "user-agent": "com.zhiliaoapp.musically/432424234"
            }
        });

        let data = await res.json();
        return data.user?.unique_id || "None";

    } catch (e) {
        return "None";
    }
}

// ======================================================
// ========== TikTok CHANGE USERNAME ====================
// ======================================================

async function changeUsername(session_id, new_username) {
    let device_id = Math.floor(Math.random() * 9999999999).toString();
    let iid = Math.floor(Math.random() * 9999999999).toString();

    let lastUsername = await getProfile(session_id, device_id, iid);

    let data = `aid=364225&unique_id=${encodeURIComponent(new_username)}`;

    let param = `aid=364225&device_id=${device_id}&iid=${iid}`;
    let sig = generateGorgon(param, data, "");

    let res = await fetch(
        `https://api16.tiktokv.com/aweme/v1/commit/user/?${param}`,
        {
            method: "POST",
            headers: {
                "Cookie": `sessionid=${session_id}`,
                "User-Agent": "Whee 1.1.0 rv:11005",
                ...sig
            },
            body: data
        }
    );

    let text = await res.text();

    let changed = await getProfile(session_id, device_id, iid);

    if (changed !== lastUsername) return "✔ Username schimbat cu succes!";
    return "❌ Eroare TikTok:\n" + text;
}

// ======================================================
// ========== DISCORD BOT HANDLER =======================
// ======================================================

client.on("ready", () => {
    console.log("🤖 Bot online!");
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const data = getData();

    if (interaction.commandName === "set_session_id") {
        data.session_id = interaction.options.getString("session");
        saveData(data);
        return interaction.reply("✔ Session ID salvat!");
    }

    if (interaction.commandName === "new_username") {
        if (!data.session_id)
            return interaction.reply("❌ Folosește întâi /set_session_id");

        const username = interaction.options.getString("username");

        await interaction.reply("⏳ Schimb username-ul...");

        let res = await changeUsername(data.session_id, username);
        return interaction.editReply(res);
    }
});

client.login(TOKEN);
