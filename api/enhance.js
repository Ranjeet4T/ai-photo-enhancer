export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from "formidable";
import fs from "fs";

export default async function handler(req, res) {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    const file = files.image[0];

    // Step 1: Convert file to base64
    const data = fs.readFileSync(file.filepath);
    const base64 = `data:image/png;base64,${data.toString("base64")}`;

    // Step 2: Send to Replicate
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "PUT_YOUR_GFPGAN_VERSION_HERE",
        input: {
          img: base64,
        },
      }),
    });

    const result = await response.json();

    // Step 3: Wait for result
    let output = result;

    while (output.status !== "succeeded") {
      await new Promise(r => setTimeout(r, 2000));

      const check = await fetch(output.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });

      output = await check.json();
    }

    res.json({
      output: output.output[0],
    });
  });
}
