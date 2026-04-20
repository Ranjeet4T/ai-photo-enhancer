export default async function handler(req, res) {
  try {
    const { image } = req.body;

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "42fed1c497e8c6d0d9eae2c8cceba5d4aebbcad77f5d5b5a1d5c93d3536bc3a9", // working Real-ESRGAN
        input: {
          image: image
        }
      })
    });

    const data = await response.json();

    if (!data.urls) {
      return res.status(500).json({ error: data });
    }

    // polling
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
