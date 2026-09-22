/* IMAGE DATA */

const imageBase =
  "https://raw.githubusercontent.com/TheAtlanExpedition/Learning_HTML/refs/heads/main/images/";

const imageSets = [
  {
    parentOne: {
      file: "Image_1.2_parent.jpg",
      alt: "A pink circle over a valley"
    },
    parentTwo: {
      file: "Image_1.1_parent.jpg",
      alt: "A very green forest staircase"
    },
    results: [
      {
        name: "Nano Banana",
        source: "Google A.I. Chat",
        file: "Nano_Banana_1.jpg",
        alt: "A combination of the two images done by Nano Banana A.I."
      },
      {
        name: "Grok 4.5",
        source: "Grok A.I. Chat",
        file: "Grok4.5_1.jpg",
        alt: "A combination of the two images done by Grok 4.5 A.I."
      },
      {
        name: "ChatGPT-5.6 Luna",
        source: "DuckDuckGo A.I. Chat",
        file: "Duck-A.i-ChatGPT-5.6Luna_1.jpg",
        alt: "A combination of the two images done by ChatGPT-5.6 Luna"
      }
    ]
  },
  {
    parentOne: {
      file: "Image_2.1_parent.jpg",
      alt: "A woman in foliage"
    },
    parentTwo: {
      file: "Image_2.2_parent.jpg",
      alt: "A ginger cat"
    },
    results: [
      {
        name: "Nano Banana",
        source: "Google A.I. Chat",
        file: "Nano_Banana_2.jpg",
        alt: "A combination of the two images done by Nano Banana A.I."
      },
      {
        name: "Grok 4.5",
        source: "Grok A.I. Chat",
        file: "Grok4.5_2.jpg",
        alt: "A combination of the two images done by Grok 4.5 A.I."
      },
      {
        name: "ChatGPT-5.6 Luna",
        source: "DuckDuckGo A.I. Chat",
        file: "Duck-A.i-ChatGPT-5.6Luna_2.jpg",
        alt: "A combination of the two images done by ChatGPT-5.6 Luna"
      }
    ]
  },
  {
    parentOne: {
      file: "Image_3.2_parent.jpg",
      alt: "A field of crops"
    },
    parentTwo: {
      file: "Image_3.1_parent.jpg",
      alt: "A city street"
    },
    results: [
      {
        name: "Nano Banana",
        source: "Google A.I. Chat",
        file: "Nano_Banana_3.jpg",
        alt: "A combination of the two images done by Nano Banana A.I."
      },
      {
        name: "Grok 4.5",
        source: "Grok A.I. Chat",
        file: "Grok4.5_3.jpg",
        alt: "A combination of the two images done by Grok 4.5 A.I."
      },
      {
        name: "ChatGPT-5.6 Luna",
        source: "DuckDuckGo A.I. Chat",
        file: "Duck-A.i-ChatGPT-5.6Luna_3.jpg",
        alt: "A combination of the two images done by ChatGPT-5.6 Luna"
      }
    ]
  }
];


/* BUILD THE CAROUSEL */

const carouselTrack = document.querySelector("#carousel-track");

function createImage(file, alt) {
  const image = document.createElement("img");

  image.className = "gallery-image";
  image.src = imageBase + file;
  image.alt = alt;
  image.loading = "lazy";

  return image;
}

function createFigure(file, alt, caption) {
  const figure = document.createElement("figure");
  const image = createImage(file, alt);
  const figcaption = document.createElement("figcaption");

  figcaption.textContent = caption;
  figure.append(image, figcaption);

  return figure;
}

function createOperator(symbol) {
  const operator = document.createElement("span");

  operator.className = "gallery-operator";
  operator.textContent = symbol;

  return operator;
}

imageSets.forEach((set) => {
  const slide = document.createElement("div");
  slide.className = "carousel-slide";

  const parents = document.createElement("div");
  parents.className = "gallery-container";

  parents.append(
    createFigure(
      set.parentOne.file,
      set.parentOne.alt,
      set.parentOne.alt
    ),
    createOperator("+"),
    createFigure(
      set.parentTwo.file,
      set.parentTwo.alt,
      set.parentTwo.alt
    )
  );

  const results = document.createElement("div");
  results.className = "gallery-container bottom-results";

  set.results.forEach((result) => {
    const column = document.createElement("div");
    column.className = "result-column";

    const heading = document.createElement("div");
    heading.className = "intro-text";

    const title = document.createElement("h2");
    title.textContent = result.name;

    const source = document.createElement("p");
    source.textContent = result.source;

    heading.append(title, source);

    const figure = createFigure(
      result.file,
      result.alt,
      ""
    );

    column.append(heading, figure);
    results.append(column);
  });

  slide.append(
    parents,
    createOperator("="),
    results
  );

  carouselTrack.append(slide);
});


/* PAGE NAVIGATION */

function showPage() {
  const pageName = window.location.hash.substring(1) || "home";

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  const selectedPage = document.getElementById(pageName);
  const homePage = document.getElementById("home");

  if (selectedPage) {
    selectedPage.classList.add("active");
  } else {
    homePage.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

window.addEventListener("hashchange", showPage);
showPage();


/* IMAGE PREVIEW */

const imageModal = document.querySelector("#image-modal");
const modalImage = document.querySelector("#modal-image");
const modalClose = document.querySelector("#modal-close");

document.querySelectorAll(".gallery-image").forEach((image) => {
  let startX = 0;
  let startY = 0;
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
    imageModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    moved = false;
  });
});

function closeModal() {
  imageModal.classList.remove("active");
  imageModal.setAttribute("aria-hidden", "true");
  modalImage.src = "";
  modalImage.alt = "";
  document.body.style.overflow = "";
}

modalClose.addEventListener("click", closeModal);

imageModal.addEventListener("click", (event) => {
  if (
    event.target === imageModal ||
    event.target === modalImage
  ) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});


/* CAROUSEL CONTROLS */

const carouselSlides = document.querySelectorAll(".carousel-slide");
const previousButton = document.querySelector(".carousel-arrow.previous");
const nextButton = document.querySelector(".carousel-arrow.next");
const carouselWindow = document.querySelector(".carousel-window");

let currentSlide = 0;
let startX = 0;
let isDragging = false;

function updateCarousel() {
  carouselTrack.style.transform =
    `translateX(-${currentSlide * 100}%)`;
}

function goToSlide(index) {
  currentSlide = index;

  if (currentSlide < 0) {
    currentSlide = carouselSlides.length - 1;
  }

  if (currentSlide >= carouselSlides.length) {
    currentSlide = 0;
  }

  updateCarousel();
}

nextButton.addEventListener("click", () => {
  goToSlide(currentSlide + 1);
});

previousButton.addEventListener("click", () => {
  goToSlide(currentSlide - 1);
});


/* TOUCH SWIPING */

carouselWindow.addEventListener(
  "touchstart",
  (event) => {
    startX = event.touches[0].clientX;
    isDragging = true;
  },
  { passive: true }
);

carouselWindow.addEventListener(
  "touchend",
  (event) => {
    if (!isDragging) {
      return;
    }

    isDragging = false;

    const endX = event.changedTouches[0].clientX;
    const difference = startX - endX;
    const threshold = 70;

    if (Math.abs(difference) > threshold) {
      if (difference > 0) {
        goToSlide(currentSlide + 1);
      } else {
        goToSlide(currentSlide - 1);
      }
    }
  },
  { passive: true }
);


/* MOUSE DRAGGING */

carouselWindow.addEventListener("mousedown", (event) => {
  startX = event.clientX;
  isDragging = true;
  event.preventDefault();
});

carouselWindow.addEventListener("mouseup", (event) => {
  if (!isDragging) {
    return;
  }

  isDragging = false;

  const endX = event.clientX;
  const difference = startX - endX;
  const threshold = 70;

  if (Math.abs(difference) > threshold) {
    if (difference > 0) {
      goToSlide(currentSlide + 1);
    } else {
      goToSlide(currentSlide - 1);
    }
  }
});

carouselWindow.addEventListener("mouseleave", () => {
  isDragging = false;
});

carouselWindow.addEventListener("dragstart", (event) => {
  event.preventDefault();
});
