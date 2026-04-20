async function enhance() {
  const file = document.getElementById("upload").files[0];

  const formData = new FormData();
  formData.append("image", file);

  document.getElementById("before").src = URL.createObjectURL(file);

  const res = await fetch("/api/enhance", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  document.getElementById("after").src = data.output;
}