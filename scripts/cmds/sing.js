const axios = require("axios");
const fs = require("fs-extra");
const path = __dirname + "/cache/";

const baseApiUrl = async () => {
  const base = await axios.get(`https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json`);
  return base.data.api;
};

module.exports = {
  config: {
    name: "sing",
    version: "1.0",
    author: "Converted by Ullash",
    countDown: 5,
    role: 0,
    shortDescription: "Download mp3 from YouTube",
    longDescription: "Search or download audio from YouTube by link or song name",
    category: "media",
    guide: {
      en: "{pn} [song name or YouTube link]"
    }
  },

  onStart: async function ({ message, event, args }) {
    const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
    let videoID;
    const urlYtb = checkurl.test(args[0]);

    if (urlYtb) {
      const match = args[0].match(checkurl);
      videoID = match ? match[1] : null;

      try {
        const { data: { title, downloadLink } } = await axios.get(`${await baseApiUrl()}/ytDl3?link=${videoID}&format=mp3`);
        const fileName = path + `audio_${Date.now()}.mp3`;
        const res = await axios.get(downloadLink, { responseType: "arraybuffer" });
        fs.writeFileSync(fileName, Buffer.from(res.data));
        return message.reply({
          body: title,
          attachment: fs.createReadStream(fileName)
        }, () => fs.unlinkSync(fileName));
      } catch (err) {
        return message.reply("⭕ Failed to download. Audio may be too large or invalid.");
      }
    }

    // Song name search
    let keyWord = args.join(" ");
    keyWord = keyWord.includes("?feature=share") ? keyWord.replace("?feature=share", "") : keyWord;
    let result;
    try {
      result = (await axios.get(`${await baseApiUrl()}/ytFullSearch?songName=${keyWord}`)).data.slice(0, 6);
    } catch (err) {
      return message.reply("❌ An error occurred: " + err.message);
    }

    if (result.length == 0) return message.reply("⭕ No results found for: " + keyWord);

    let msg = "";
    let i = 1;
    const thumbnails = [];

    for (const info of result) {
      const imgRes = await axios.get(info.thumbnail, { responseType: "stream" });
      thumbnails.push(imgRes.data);
      msg += `${i++}. ${info.title}\nTime: ${info.time}\nChannel: ${info.channel.name}\n\n`;
    }

    message.reply({
      body: msg + "👉 Reply with a number (1-6) to download the song.",
      attachment: thumbnails
    }, (err, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName: "sing",
        messageID: info.messageID,
        author: event.senderID,
        result
      });
    });
  },

  onReply: async function ({ message, event, Reply }) {
    const { result, author, messageID } = Reply;
    if (event.senderID !== author) return;

    const choice = parseInt(event.body);
    if (!isNaN(choice) && choice >= 1 && choice <= result.length) {
      const infoChoice = result[choice - 1];
      const idvideo = infoChoice.id;
      try {
        const { data: { title, downloadLink, quality } } = await axios.get(`${await baseApiUrl()}/ytDl3?link=${idvideo}&format=mp3`);
        const fileName = path + `audio_${Date.now()}.mp3`;
        const res = await axios.get(downloadLink, { responseType: "arraybuffer" });
        fs.writeFileSync(fileName, Buffer.from(res.data));
        await message.unsend(messageID);
        message.reply({
          body: `🎵 Title: ${title}\n🎶 Quality: ${quality}`,
          attachment: fs.createReadStream(fileName)
        }, () => fs.unlinkSync(fileName));
      } catch (err) {
        message.reply("⭕ Error downloading audio. Probably too large.");
      }
    } else {
      message.reply("❌ Invalid number. Please enter 1 to 6.");
    }
  }
};
