const fs = require("fs-extra");
const axios = require("axios");
const { utils } = global;

// ✅ ভিডিও আইডি ও ডাউনলোড লিংক
const VIDEO_ID = "1-8VSzbLm7c2eBesp8YwwvJxdhs0dcFSL";
const VIDEO_URL = `https://drive.google.com/uc?export=download&id=${VIDEO_ID}`;

module.exports = {
  config: {
    name: "prefix",
    version: "1.6",
    author: "BaYjid + ChatGPT",
    countDown: 5,
    role: 0,
    description: "Show prefix and send direct video",
    category: "⚙️ Configuration",
    guide: {
      en:
        "📌 prefix         : show current prefix + send video\n" +
        "📌 prefix <new>   : change prefix for this thread\n" +
        "📌 prefix <new> -g: change global prefix (admin)\n" +
        "📌 prefix reset   : reset thread prefix"
    }
  },

  langs: {
    en: {
      reset: "✅ Prefix reset to default: %1",
      onlyAdmin: "⚠️ Only bot admin can change global prefix!",
      confirmGlobal: "🔄 React to confirm global prefix change.",
      confirmThisThread: "🔄 React to confirm thread prefix change.",
      successGlobal: "✅ Global prefix is now: %1",
      successThisThread: "✅ This thread prefix is now: %1",
      myPrefix:
        "🌍 System: %1\n💬 Thread: %2\n⏰ Time: %3\n➡️ Type %2help for commands!"
    }
  },

  onStart: async function ({ message, role, args, event, threadsData, getLang }) {
    if (!args[0]) return message.SyntaxError();
    if (args[0] === "reset") {
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply(getLang("reset", global.GoatBot.config.prefix));
    }
    const newPrefix = args[0], setGlobal = args[1] === "-g";
    if (setGlobal && role < 2) return message.reply(getLang("onlyAdmin"));
    const confirmMsg = setGlobal ? getLang("confirmGlobal") : getLang("confirmThisThread");
    return message.reply(confirmMsg, (err, info) => {
      global.GoatBot.onReaction.set(info.messageID, {
        author: event.senderID, newPrefix, setGlobal
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

    // ✅ Step 1: Reply prefix info
    await message.reply(getLang("myPrefix", systemPrefix, threadPrefix, time));

    // ✅ Step 2: Send direct video (not link)
    try {
      const stream = await global.utils.getStreamFromURL(VIDEO_URL);
      await message.reply({
        body: "🎬 নিচে আপনার ভিডিও:",
        attachment: stream
      });
    } catch (err) {
      console.error("❌ ভিডিও পাঠাতে সমস্যা:", err.message);
      await message.reply("⚠️ ভিডিও পাঠানো যায়নি। সম্ভবত ভিডিও ফাইলটি বড় বা অ্যাক্সেস নেই।");
    }
  }
};
