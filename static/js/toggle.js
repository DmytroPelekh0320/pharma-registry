function toggleDetails(id) {
  const pre = document.getElementById(id);
  if (pre.style.display === "none") {
      pre.style.display = "block";
  } else {
      pre.style.display = "none";
  }
}
