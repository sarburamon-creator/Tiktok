// ================================
// IMPORTURI
// ================================
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
const fs = require("fs-extra");
const fetch = require("node-fetch");
const crypto = require("crypto");
const express = require("express");

// ================================
// ENV VARS (Render sau local)
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
        .setDescription("Salvează session ID-ul TikTok și verifică username")
        .addStringOption(opt =>
            opt.setName("session")
                .setDescription("Session ID TikTok raw (din Proxyman)")
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName("check_session")
        .setDescription("Verifică dacă session ID-ul este valid și arată username-ul"),
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
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✔ Comenzi înregistrate în Discord");
    } catch (error) {
        console.error("❌ Eroare la înregistrarea comenzilor:", error);
    }
})();

// ================================
// X-GORGON FUNCTION
// ================================
function hexString(num){let s=num.toString(16);return s.length<2?"0"+s:s;}
function rbit(num){let b=num.toString(2).padStart(8,"0");return parseInt([...b].reverse().join(""),2);}
function reverseHex(num){let s=num.toString(16).padStart(2,"0");return parseInt(s[1]+s[0],16);}
class XG {
    constructor(debug){this.length=0x14;this.debug=debug;this.hex_CE0=[0x05,0x00,0x50,Math.floor(Math.random()*256),0x47,0x1e,0x00,Math.floor(Math.random()*256)&0xf0];}
    addr_BA8(){let arr=Array.from({length:256},(_,i)=>i);let tmp="";for(let i=0;i<256;i++){let A=i===0?0:tmp?tmp:arr[i-1];let B=this.hex_CE0[i%8];if(A===0x05&&i!==1&&tmp!==0x05)A=0;let C=(A+i+B)%256;tmp=C<i?C:"";let D=arr[C];arr[i]=D;arr[C]=i;}return arr;}
    initial(debug,arr){let tmp=[],temp=[...arr];for(let i=0;i<this.length;i++){let A=debug[i],B=tmp.length?tmp[tmp.length-1]:0,C=(arr[i+1]+B)%256;tmp.push(C);let D=temp[C];temp[i+1]=D;let E=(D*2)%256,F=temp[E];debug[i]=A^F;}return debug;}
    calculate(debug){for(let i=0;i<this.length;i++){let A=debug[i],B=reverseHex(A),C=debug[(i+1)%this.length],D=B^C,E=rbit(D),F=E^this.length,G=(~F)&0xFF;debug[i]=G;}return debug;}
    main(){let result="";let final=this.calculate(this.initial(this.debug,this.addr_BA8()));final.forEach(i=>result+=hexString(i));return"8404"+hexString(this.hex_CE0[7])+hexString(this.hex_CE0[3])+hexString(this.hex_CE0[1])+hexString(this.hex_CE0[6])+result;}
}
function generateGorgon(param,data,cookie){
    let now=Math.floor(Date.now()/1000),Khronos=now.toString(16),debug=[];
    let urlMD5=crypto.createHash("md5").update(param).digest("hex");
    for(let i=0;i<8;i+=2) debug.push(parseInt(urlMD5.slice(i,i+2),16));
    if(data){let dataMD5=crypto.createHash("md5").update(data).digest("hex");for(let i=0;i<8;i+=2) debug.push(parseInt(dataMD5.slice(i,i+2),16));}else debug.push(0,0,0,0);
    if(cookie){let cookieMD5=crypto.createHash("md5").update(cookie).digest("hex");for(let i=0;i<8;i+=2) debug.push(parseInt(cookieMD5.slice(i,i+2),16));}else debug.push(0,0,0,0);
    debug.push(1,1,2,4);
    for(let i=0;i<8;i+=2){let x=parseInt(Khronos.slice(i,i+2),16);debug.push(x);}
    while(debug.length<0x14) debug.push(0);
    return {"X-Gorgon":new XG(debug).main(),"X-Khronos":now.toString()};
}

// ================================
// GET PROFILE
// ================================
async function getProfile(session_id, device_id, iid){
    try{
        let param=`device_id=${device_id}&iid=${iid}&id=kaa&version_code=34.0.0&language=en&app_name=lite&app_version=34.0.0&carrier_region=SA&tz_offset=10800&locale=en&sys_region=SA&aid=473824`;
        let url=`https://api16.tiktokv.com/aweme/v1/user/profile/self/?${param}`;
        let res=await fetch(url,{headers:{"Cookie":`sessionid=${session_id}; sid_tt=${session_id}`,"User-Agent":"com.zhiliaoapp.musically/2022701030 (Linux; U; Android 9; en_US; RMX3551; Build/PQ3A.190705.003; Cronet/TTNetVersion:5c5a6994 2022-07-13)","Accept-Encoding":"gzip, deflate","Accept":"application/json"}});
        if(!res.ok){let txt=await res.text();console.error("❌ TikTok API:",res.status,txt);return"None";}
        let text=await res.text(); let data; try{data=JSON.parse(text);}catch(e){console.error("❌ JSON invalid:",text.substring(0,200));return"None";}
        if(data.user&&data.user.unique_id)return data.user.unique_id;
        return"None";
    }catch(e){console.error("🔥 Eroare getProfile:",e.message);return"None";}
}

// ================================
// CHANGE USERNAME
// ================================
async function changeUsername(session_id,new_username){
    let device_id=Math.floor(Math.random()*9999999999).toString();
    let iid=Math.floor(Math.random()*9999999999).toString();
    try{
        let lastUsername=await getProfile(session_id,device_id,iid);
        if(lastUsername==="None") return "❌ Session ID invalid sau expirat!";
        let data=`aid=364225&unique_id=${encodeURIComponent(new_username)}`;
        let param=`aid=364225&device_id=${device_id}&iid=${iid}`;
        let sig=generateGorgon(param,data,"");
        let res=await fetch(`https://api16.tiktokv.com/aweme/v1/commit/user/?${param}`,{
            method:"POST",
            headers:{
                "Cookie":`sessionid=${session_id}; sid_tt=${session_id}`,
                "User-Agent":"com.zhiliaoapp.musically/2022701030 (Linux; U; Android 9; en_US; RMX3551; Build/PQ3A.190705.003; Cronet/TTNetVersion:5c5a6994 2022-07-13)",
                "Content-Type":"application/x-www-form-urlencoded",
                "Accept-Encoding":"gzip, deflate",
                "Accept":"application/json",
                ...sig
            },
            body:data
        });
        await new Promise(r=>setTimeout(r,5000));
        let changed=await getProfile(session_id,device_id,iid);
        if(changed===new_username) return `✅ Username schimbat cu succes!\nDe la: ${lastUsername}\nLa: ${changed}`;
        else if(changed!==lastUsername) return `⚠️ Username schimbat, dar diferit de cel cerut.\nVeche: ${lastUsername}\nNou: ${changed}`;
        else return `❌ Username nu s-a schimbat.`;
    }catch(e){console.error("🔥 Eroare changeUsername:",e);return`❌ Eroare internă: ${e.message}`;}
}

// ================================
// DISCORD HANDLER
// ================================
client.on("ready",()=>{console.log(`🤖 Bot online ca ${client.user.tag}`);});

client.on("interactionCreate",async(interaction)=>{
    if(!interaction.isChatInputCommand()) return;
    const data=getData();

    // -------------------- SET SESSION --------------------
    if(interaction.commandName==="set_session_id"){
        let session=interaction.options.getString("session").trim();
        if(session.includes("sessionid=")){
            let match=session.match(/sessionid=([a-f0-9]{32})/i);
            if(!match) return interaction.reply({content:"❌ Session ID invalid! Elimină spații sau caractere în plus.",flags:64});
            session=match[1];
        }
        if(session.length!==32) return interaction.reply({content:"❌ Session ID invalid! Trebuie 32 caractere hex.",flags:64});
        await interaction.deferReply({flags:64});
        let device_id=Math.floor(Math.random()*9999999999).toString();
        let iid=Math.floor(Math.random()*9999999999).toString();
        let username=await getProfile(session,device_id,iid);
        if(username==="None"){
            await interaction.editReply("❌ Session ID invalid sau expirat!"); return;
        }
        data.session_id=session; saveData(data);
        await interaction.editReply(`✅ Session ID valid și salvat!\n👤 Username: \`${username}\`\n🔑 Session ID: \`${session.substring(0,10)}...\``);
        return;
    }

    // -------------------- CHECK SESSION --------------------
    if(interaction.commandName==="check_session"){
        if(!data.session_id||data.session_id.trim()==="") return interaction.reply({content:"❌ Niciun session ID salvat.",flags:64});
        await interaction.deferReply({flags:64});
        let device_id=Math.floor(Math.random()*9999999999).toString();
        let iid=Math.floor(Math.random()*9999999999).toString();
        let username=await getProfile(data.session_id,device_id,iid);
        if(username==="None"){
            await interaction.editReply("❌ Session ID invalid sau expirat!"); return;
        }
        await interaction.editReply(`✅ Session ID valid!\n👤 Username curent: \`${username}\`\n🔑 Session ID: \`${data.session_id.substring(0,10)}...\``);
        return;
    }

    // -------------------- NEW USERNAME --------------------
    if(interaction.commandName==="new_username"){
        if(!data.session_id||data.session_id.trim()==="") return interaction.reply({content:"❌ Folosește întâi `/set_session_id`!",flags:64});
        const username=interaction.options.getString("username").trim();
        if(!username||username.length<2||username.length>24||username.includes(" ")){
            return interaction.reply({content:"❌ Username invalid! 2-24 caractere, fără spații.",flags:64});
        }
        await interaction.deferReply();
        let result=await changeUsername(data.session_id,username);
        await interaction.editReply(result);
        return;
    }
});

// ================================
// ERROR HANDLING
// ================================
process.on("unhandledRejection",(error)=>{console.error("🔥 Unhandled promise rejection:",error);});
process.on("uncaughtException",(error)=>{console.error("🔥 Uncaught exception:",error);});

// ================================
// WEB SERVER
// ================================
const app=express();
const PORT=process.env.PORT||3000;
app.get("/",(req,res)=>{
    res.send(`<h1>🤖 TikTok Username Bot</h1>
        <p>Status: <strong>Online</strong></p>
        <p>Session ID salvat: ${getData().session_id?"✅ Da":"❌ Nu"}</p>
        <p>Uptime: ${process.uptime().toFixed(0)} secunde</p>
    `);
});
app.listen(PORT,()=>{console.log(`🌐 Server web rulează pe port ${PORT}`);});
client.login(TOKEN).catch(error=>{console.error("❌ Eroare login Discord:",error);process.exit(1);});
