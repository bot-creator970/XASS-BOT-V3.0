const fs = require("fs-extra");
const axios = require("axios");
const { utils } = global;

const VIDEO_ID = "1-8VSzbLm7c2eBesp8YwwvJxdhs0dcFSL";
const VIDEO_URL = `https://drive.google.com/uc?export=download&id=${VIDEO_ID}`;

module.exports = {
  config: {
    name: "prefix",
    version: "1.5",
    author: "BaYjid + Modified by ChatGPT",
    countDown: 5,
    role: 0,
    description: "Change bot prefix & send video",
    category: "⚙️ Configuration",
    guide: {
      en:
        "📌 prefix         : show current prefix & send video\n" +
        "📌 prefix <new>   : change prefix for this thread\n" +
        "📌 prefix <new> -g: change global prefix (admin only)\n" +
        "📌 prefix reset   : reset to default"
    }
  },

  langs: {
    en: {
      reset: "✅ Your prefix has been reset to default: %1",
      onlyAdmin: "⚠️ Only bot admin can change global prefix!",
      confirmGlobal: "🔄 React to confirm changing the system prefix.",
      confirmThisThread: "🔄 React to confirm changing this thread's prefix.",
      successGlobal: "✅ System prefix changed to: %1",
      successThisThread: "✅ Thread prefix changed to: %1",
      myPrefix:
        "🌍 System Prefix: %1\n💬 Thread Prefix: %2\n⏰ Time: %3\n➡️ Type %2help for commands!"
    }
  },

  onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
    if (!args[0]) return message.SyntaxError();

    if (args[0] === "reset") {
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply(getLang("reset", global.GoatBot.config.prefix));
    }

    const newPrefix = args[0];
    const setGlobal = args[1] === "-g";

    if (setGlobal && role < 2) {
      return message.reply(getLang("onlyAdmin"));
    }

    const confirmMsg = setGlobal ? getLang("confirmGlobal") : getLang("confirmThisThread");
    return message.reply(confirmMsg, (err, info) => {
      global.GoatBot.onReaction.set(info.messageID, {
        author: event.senderID,
        newPrefix,
        setGlobal,
        commandName
      });
    });
  },

  onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
    if (event.userID !== Reaction.author) return;

    if (Reaction.setGlobal) {
      global.GoatBot.config.prefix = Reaction.newPrefix;
      fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
      return message.reply(getLang("successGlobal", Reaction.newPrefix));
    } else {
      await threadsData.set(event.threadID, Reaction.newPrefix, "data.prefix");
      return message.reply(getLang("successThisThread", Reaction.newPrefix));
    }
  },

  onChat: async function ({ event, message, getLang }) {
    const body = event.body?.trim();
    if (!body || body.toLowerCase() !== "prefix") return;

    const systemPrefix = global.GoatBot.config.prefix;
    const threadPrefix = utils.getPrefix(event.threadID);
    const time = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });

    // Step 1: Reply with prefix info
    await message.reply(getLang("myPrefix", systemPrefix, threadPrefix, time));

    // Step 2: Send direct video using Facebook Send API
    const token = process.env.PAGE_ACCESS_TOKEN;
    const senderID = event.senderID;

    const requestBody = {
      recipient: { id: senderID },
      message: {
        attachment: {
          type: "video",
          payload: {
            url: VIDEO_URL,
            is_reusable: true
          }
        }
      }
    };

    try {
      await axios.post(`https://graph.facebook.com/v16.0/me/messages?access_token=${token}`, requestBody);
    } catch (err) {
      console.error("❌ Failed to send video:", err.response?.data || err.message);
      await message.reply("⚠️ ভিডিও পাঠাতে সমস্যা হয়েছে। ভিডিও ফাইলটি 30MB এর কম কিনা চেক করুন।");
    }
  }
};
