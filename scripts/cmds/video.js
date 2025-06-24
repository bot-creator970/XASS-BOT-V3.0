const axios = require("axios");
const fs = require('fs');

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/Blankid018/D1PT0/main/baseApiUrl.json");
  return base.data.api;
};

module.exports = {
  config: {
    name: "video",
    version: "1.1.4",
    author: "dipto (converted for GoatBot)",
    countDown: 5,
    role: 0,
    description: "Download video, audio or info from YouTube",
    category: "media",
    usages: "{pn} -v/-a/-i <keywords or YouTube link>",
    usePrefix: true
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID, senderID } = event;

    let action = args[0] ? args[0].toLowerCase() : '-v';
    if (!['-v', 'video', 'mp4', '-a', 'audio', 'mp3', '-i', 'info'].includes(action)) {
      args.unshift('-v');
      action = '-v';
    }

    const checkurl = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((\w|-){11})(?:\S+)?$/;
    const urlYtb = args[1] ? checkurl.test(args[1]) : false;

    if (urlYtb) {
      const format = ['-v', 'video', 'mp4'].includes(action) ? 'mp4'
        : ['-a', 'audio', 'mp3'].includes(action) ? 'mp3' : null;

      if (!format) return message.reply('❌ Invalid format. Use -v or -a.');

      try {
        const match = args[1].match(checkurl);
        const videoID = match ? match[1] : null;
        if (!videoID) return message.reply('❌ Invalid YouTube link.');

        const path = `ytb_${format}_${videoID}.${format}`;
        const { data: { title, downloadLink, quality } } = await axios.get(`${await baseApiUrl()}/ytDl3?link=${videoID}&format=${format}&quality=3`);

        await message.reply({
          body: `• Title: ${title}\n• Quality: ${quality}`,
          attachment: await downloadFile(downloadLink, path)
        });

        fs.unlinkSync(path);
        return;

      } catch (e) {
        console.error(e);
        return message.reply('❌ Failed to download. Try again later.');
      }
    }

    args.shift();
    const keyWord = args.join(" ");
    if (!keyWord) return message.reply('❌ Please provide a search keyword.');

    try {
      const searchResult = (await axios.get(`${await baseApiUrl()}/ytFullSearch?songName=${encodeURIComponent(keyWord)}`)).data.slice(0, 6);
      if (!searchResult.length) return message.reply(`⭕ No results for keyword: ${keyWord}`);

      let msg = "";
      const thumbnails = [];
      let i = 1;

      for (const info of searchResult) {
        thumbnails.push(streamImage(info.thumbnail, `thumb_${i}.jpg`));
        msg += `${i++}. ${info.title}\nTime: ${info.time}\nChannel: ${info.channel.name}\n\n`;
      }

      const sent = await message.reply({
        body: msg + "👉 Reply with a number to select.",
        attachment: await Promise.all(thumbnails)
      });

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "video",
        author: senderID,
        messageID: sent.messageID,
        result: searchResult,
        action
      });

    } catch (err) {
      console.error(err);
      return message.reply("❌ Error while searching: " + err.message);
    }
  },

  onReply: async function ({ event, message, Reply }) {
    const { author, result, action } = Reply;
    const { senderID, body, messageID, threadID } = event;

    if (senderID !== author) return;

    const choice = parseInt(body);
    if (isNaN(choice) || choice <= 0 || choice > result.length)
      return message.reply("❌ Invalid number.");

    const selectedVideo = result[choice - 1];
    const videoID = selectedVideo.id;

    if (['-v', 'video', 'mp4', '-a', 'audio', 'mp3'].includes(action)) {
      const format = ['-v', 'video', 'mp4'].includes(action) ? 'mp4' : 'mp3';
      try {
        const path = `ytb_${format}_${videoID}.${format}`;
        const { data: { title, downloadLink, quality } } = await axios.get(`${await baseApiUrl()}/ytDl3?link=${videoID}&format=${format}&quality=3`);

        await message.reply({
          body: `• Title: ${title}\n• Quality: ${quality}`,
          attachment: await downloadFile(downloadLink, path)
        });

        fs.unlinkSync(path);
      } catch (e) {
        console.error(e);
        return message.reply('❌ Download failed.');
      }
    }

    if (action === '-i' || action === 'info') {
      try {
        const { data } = await axios.get(`${await baseApiUrl()}/ytfullinfo?videoID=${videoID}`);
        await message.reply({
          body: `✨ Title: ${data.title}\n⏳ Duration: ${(data.duration / 60).toFixed(2)} mins\n📺 Resolution: ${data.resolution}\n👀 Views: ${data.view_count}\n👍 Likes: ${data.like_count}\n💬 Comments: ${data.comment_count}\n📂 Category: ${data.categories[0]}\n📢 Channel: ${data.channel}\n🧍 Uploader ID: ${data.uploader_id}\n👥 Subscribers: ${data.channel_follower_count}\n🔗 Channel URL: ${data.channel_url}\n🔗 Video URL: ${data.webpage_url}`,
          attachment: await streamImage(data.thumbnail, 'info_thumb.jpg')
        });
      } catch (e) {
        console.error(e);
        return message.reply('❌ Info fetch failed.');
      }
    }
  }
};

async function downloadFile(url, pathName) {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(pathName, Buffer.from(res.data));
  return fs.createReadStream(pathName);
}

async function streamImage(url, pathName) {
  const response = await axios.get(url, { responseType: "stream" });
  response.data.path = pathName;
  return response.data;
}
