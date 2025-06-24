const fs = require("fs-extra");
const axios = require("axios");

module.exports = {
  config: {
    name: "prefix",
    version: "1.1.1",
    author: "Rahad + GPT",
    countDown: 2,
    role: 0,
    description: "Show bot prefix and send video directly",
  },

  onStart: async function ({ message, event }) {
    const prefixText = "🤖 আপনার বটের prefix হলো: !";

    const videoUrl = "https://drive.google.com/uc?export=download&id=1-8VSzbLm7c2eBesp8YwwvJxdhs0dcFSL";
    const filePath = __dirname + `/cache/prefix_video.mp4`;

    try {
      const response = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream",
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        message.reply(
          {
            body: prefixText,
            attachment: fs.createReadStream(filePath),
          },
          () => fs.unlinkSync(filePath) // Send done, delete file
        );
      });

      writer.on("error", (err) => {
        console.error("Write Error:", err);
        message.reply("❌ ভিডিও ফাইল লেখার সময় সমস্যা হয়েছে।");
      });
    } catch (err) {
      console.error("Download Error:", err);
      message.reply("❌ ভিডিও ডাউনলোড করতে সমস্যা হয়েছে।");
    }
  },
};
