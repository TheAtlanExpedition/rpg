
  const galleryImages = document.querySelectorAll(".gallery-image");
  const imageModal = document.querySelector("#image-modal");
  const modalImage = document.querySelector("#modal-image");
  const modalClose = document.querySelector("#modal-close");
  
galleryImages.forEach((image) => {
  let startX;
  let startY;
  let moved = false;

  image.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
  });

  image.addEventListener("pointermove", (event) => {
    if (
    Math.abs(event.clientX - startX) > 10 ||
    Math.abs(event.clientY - startY) > 10
  ) {
    moved = true;
  }
  });
  
  image.addEventListener("click", () => {
    if (moved) {
      moved = false;
      return;
    }

    modalImage.src = image.src;
    modalImage.alt = image.alt;
    
    imageModal.classList.add("active");
    document.body.style.overflow = "hidden"; 
    moved = false;                   
  });
});
  
  function closeModal() {
    imageModal.classList.remove("active");
    modalImage.src = "";
    document.body.style.overflow = "";
  }
  
  modalClose.addEventListener("click", closeModal);
  imageModal.addEventListener("click", (event) => {
    if (event.target === imageModal ||
       event.target === modalImage
       ) {
    closeModal();
    }
  });

// CAROUSEL

/* SLIDE ACTION */
const carouselTrack = document.querySelector(".carousel-track");
const carouselSlides = document.querySelectorAll(".carousel-slide");
const previousButton = document.querySelector(".carousel-arrow.previous");
const nextButton = document.querySelector(".carousel-arrow.next");

let currentSlide = 0;
let startX = 0;
let isDragging = false;

function updateCarousel() {
  carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
}
function goToSlide(index) {
  currentSlide = index;
  if (currentSlide < 0) currentSlide = carouselSlides.length - 1;
  if (currentSlide >= carouselSlides.length) currentSlide = 0;
  updateCarousel();
  window.scrollTo({
    top: 240,
    behavior: "smooth"
  });
}
// Arrow buttons
nextButton.addEventListener("click", () => goToSlide(currentSlide + 1));
previousButton.addEventListener("click", () => goToSlide(currentSlide - 1));

// Swipe / Drag support
const carouselWindow = document.querySelector(".carousel-window");

// Touch events  (mobile)
carouselWindow.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
  isDragging = true;
}, { passive: true });

carouselWindow.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
})

carouselWindow.addEventListener("touchend", (e) => {
  if (!isDragging) return;
  isDragging = false;

  const endX = e.changedTouches[0].clientX;
  const diffX = startX - endX;
  const threshold = 100;

  if (Math.abs(diffX) > threshold) {
    if (diffX > 0) {
      //Swipe Left → Next Slide
      goToSlide(currentSlide + 1);
    } else {
      //Swipe Right → Previous Slide
      goToSlide(currentSlide - 1);
    }
    }
  }, {passive: true});

// Mouse Drag Support
carouselWindow.addEventListener("mousedown", (e) => {
  startX = e.clientX;
  isDragging = true;
  e.preventDefault();
});

carouselWindow.addEventListener("mouseup", (e) => {
  if (!isDragging) return;
  isDragging = false;

  const endX = e.clientX;
  const diffX = startX - endX;
  const threshold = 100;

  if (Math.abs(diffX) > threshold) {
    if (diffX > 0) {
      goToSlide(currentSlide + 1);
    } else {
      goToSlide(currentSlide - 1);
    }
    }
  });
//Prevent Text Selection While Dragging
carouselWindow.addEventListener("dragstart", (e) => e.preventDefault());

