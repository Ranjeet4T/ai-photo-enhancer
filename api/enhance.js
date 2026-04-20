export default async function handler(req, res) {
  try {
    const { image } = req.body;

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

    // 2. Send to Replicate (FIXED VERSION)
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "928360d7b3a0b5a0e64d5c7e7a87e0b0b8f58bd2d96ff475c933c7781b78b810",
        input: {
          image: imageUrl
        }
      })
    });

    const data = await response.json();

    // 🔴 IMPORTANT FIX (tumhara error yahi tha)
    if (!data.urls || !data.urls.get) {
      return res.status(500).json({
        error: "Replicate API failed",
        details: data
      });
    }

    // 3. Polling
    let result;
    while (true) {
      await new Promise(r => setTimeout(r, 2000));

      const check = await fetch(data.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      result = await check.json();

      if (result.status === "succeeded") break;

      if (result.status === "failed") {
        return res.status(500).json({ error: result });
      }
    }

    res.status(200).json({ output: result.output[0] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
