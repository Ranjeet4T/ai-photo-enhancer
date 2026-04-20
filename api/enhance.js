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
        version: "db21e45c-5d3f-4f9f-9b77-9d5d3e7d6c91", // Real-ESRGAN model
        input: {
          image: image
        }
      })
    });

    const data = await response.json();

    // Wait for result (simple polling)
    let result = data;
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise(r => setTimeout(r, 2000));

      const check = await fetch(result.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });

      result = await check.json();
    }

    if (result.status === "succeeded") {
      res.status(200).json({ output: result.output[0] });
    } else {
      res.status(500).json({ error: "Enhancement failed" });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
