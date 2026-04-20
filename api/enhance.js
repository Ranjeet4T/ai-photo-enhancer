export default async function handler(req, res) {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image received" });
    }

    // 1. Upload to ImgBB
    const base64Data = image.split(",")[1];

    const uploadRes = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      {
        method: "POST",
        body: new URLSearchParams({
          image: base64Data
        })
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadData.success) {
      return res.status(500).json({ error: uploadData });
    }

    const imageUrl = uploadData.data.url;
    console.log("IMAGE URL:", imageUrl);

    // 2. Send to Replicate (GFPGAN)
    const start = await fetch(
      "https://api.replicate.com/v1/models/tencentarc/gfpgan/predictions",
      {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          input: {
            img: imageUrl,
            scale: 2,
            version: "v1.4"
          }
        })
      }
    );

    const startData = await start.json();

    console.log("REPLICATE START:", startData);

    if (!startData.urls || !startData.urls.get) {
      return res.status(500).json({ error: startData });
    }

    // 3. Polling
    let result;

    while (true) {
      await new Promise(r => setTimeout(r, 2000));

      const check = await fetch(startData.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      result = await check.json();

      console.log("STATUS:", result.status);

      if (result.status === "succeeded") break;

      if (result.status === "failed") {
        return res.status(500).json({ error: result });
      }
    }

    res.status(200).json({ output: result.output });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
