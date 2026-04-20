async function enhance() {
  const fileInput = document.getElementById("upload");
  const beforeImg = document.getElementById("before");
  const afterImg = document.getElementById("after");

  const file = fileInput.files[0];
  if (!file) {
    alert("Upload image first");
    return;
  }

  beforeImg.src = URL.createObjectURL(file);

  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = async () => {
    const base64 = reader.result;

    const res = await fetch("/api/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: base64 })
    });

    const data = await res.json();

    if (data.output) {
      afterImg.src = data.output;
    } else {
      alert("Error");
      console.log(data);
    }
  };
}
