export default async function handler(req, res) {
  res.status(200).json({
    output: "https://picsum.photos/500"
  });
}
