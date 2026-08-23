document.addEventListener("DOMContentLoaded", () => {
  // Automatically display the current year in the footer
  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Mobile navigation
  const menuButton = document.querySelector(".menu-button");
  const navigation = document.querySelector("nav");

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      navigation.classList.toggle("open");
    });
  }
});
