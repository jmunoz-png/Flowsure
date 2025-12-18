// ================================CONFIGURACIÓN PRINCIPAL================================
const frameCount = 192;
const currentFrame = index => `./max/frame_${index.toString().padStart(4, '0')}.webp`;
// const currentFrame = index => `./frames_1/frame_${index.toString().padStart(4, '0')}.webp`;
// const currentFrame = index => `./frames/frame_${index.toString().padStart(4, '0')}.jpg`;

// ================================CANVAS SETUP================================
const canvas = document.getElementById('scrollCanvas');
const context = canvas.getContext('2d');
const imageCache = new Map(); // Cache para imágenes ya cargadas

const CRITICAL_FRAMES = 65;
const frameCache = imageCache;

// Cargar segun conexion
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

function getNetworkProfile() {
  if (!connection) {
    return "unknown";
  }
  if (connection.effectiveType) {
    if (connection.effectiveType.includes("2g")) return "slow";
    if (connection.effectiveType === "3g") return "medium";
    if (connection.effectiveType === "4g") return "fast";
  }
  if (typeof connection.downlink === "number") {
    if (connection.downlink < 1.5) return "slow";
    if (connection.downlink < 4) return "medium";
    return "fast";
  }
  return "unknown";
}
let CRITICAL_CONCURRENCY = 6;
let SECONDARY_CONCURRENCY = 3;
const networkProfile = getNetworkProfile();

if (networkProfile === "slow") {
  CRITICAL_CONCURRENCY = 3;
  SECONDARY_CONCURRENCY = 1;
}
if (networkProfile === "medium") {
  CRITICAL_CONCURRENCY = 4;
  SECONDARY_CONCURRENCY = 2;
}
console.log("📡 Network profile:", networkProfile);
console.log("⚙️ Concurrency:", {
  critical: CRITICAL_CONCURRENCY,
  secondary: SECONDARY_CONCURRENCY
});

let currentDisplayFrame = -1;

// Resize a mobile var
let isMobile = window.innerWidth < 767;
let offsetX = isMobile ? -180 : 0;

// Cargar imagen bajo demanda
// function loadImageOnDemand(frameIndex) {
//   return new Promise((resolve, reject) => {
//     // Si ya está en cache, retornar inmediatamente
//     if (imageCache.has(frameIndex)) {
//       resolve(imageCache.get(frameIndex));
//       return;
//     }
//     const img = new Image();
//     img.onload = () => {
//       imageCache.set(frameIndex, img);
//       console.log(`✅ Frame ${frameIndex} cargado`);
//       resolve(img);
//     };
//     img.onerror = () => {
//       console.error(`❌ Error cargando frame ${frameIndex}`);
//       reject(new Error(`No se pudo cargar frame ${frameIndex}`));
//     };
//     img.src = currentFrame(frameIndex);
//   });
// }

async function loadImageOnDemand(frameIndex) {
  if (typeof frameIndex !== "number" || !Number.isInteger(frameIndex)) {
    console.warn("⚠️ Frame inválido ignorado:", frameIndex);
    return null;
  }
  if (frameIndex < 0 || frameIndex >= frameCount) {
    return null;
  }
  if (frameCache.has(frameIndex)) {
    return frameCache.get(frameIndex);
  }
  const img = new Image();
  img.src = currentFrame(frameIndex);

  try {
    await img.decode();
    frameCache.set(frameIndex, img);
    return img;
  } catch (e) {
    console.error(`❌ Error decodificando frame ${frameIndex}`);
    return null;
  }
}

const loader = document.getElementById("loader");
const loaderText = loader?.querySelector("p");
document.body.style.overflow = "hidden";

// Preload frames 
// async function preloadFrames(start, end, delay = 0) {
//   for (let i = start; i <= end; i++) {
//     await loadImageOnDemand(i);
//     if (delay > 0) {
//       await new Promise(res => setTimeout(res, delay));
//     }
//   }  
// }
async function preloadFramesParallel(frames, concurrency, onProgress) {
  let index = 0;
  async function worker() {
    while (index < frames.length) {
      const i = frames[index++];
      await loadImageOnDemand(i);
      onProgress?.(i);
    }
  }
  await Promise.all(
    Array.from({ length: concurrency }, worker)
  );
}
// Precargar frames 1-65 inmediatamente
async function preloadCriticalFrames() {
  const critical = Array.from(
    { length: CRITICAL_FRAMES + 1 },
    (_, i) => i
  )
  // const concurrency = 6; 
  let loaded = 0;

  // const frames = Array.from(
  //   {length: CRITICAL_FRAMES + 1},
  //   (_, i) => i
  // );
  await preloadFramesParallel(critical, CRITICAL_CONCURRENCY, () => {
    loaded++;
    if (loaderText) {
      loaderText.textContent = `Cargando ${loaded} / ${CRITICAL_FRAMES}`;
    }
  });

  // Safety timeout: si por alguna razón falla, quitar loader despues de 5s
  setTimeout(() => {
    if (loader && !loader.classList.contains("hide")) {
      console.warn("⚠️ Loader timeout forced removal");
      loader.classList.add("hide");
      setTimeout(() => loader.remove(), 500);
      document.body.style.overflow = "";
    }
  }, 5000);

  // async function worker() {
  //   while (frames.length) {
  //     const frame = frames.shift();
  //     await loadImageOnDemand(frame);
  //     loaded++

  //     if (loaderText) {
  //       loaderText.textContent = `Cargando ${loaded} / ${CRITICAL_FRAMES}`;
  //     }
  //   }
  // }

  // await Promise.all(
  //   Array.from({length: concurrency}, worker)
  // );

  // for (let i = 0; i <= CRITICAL_FRAMES; i++) {
  //   await loadImageOnDemand(i);
  //   if (loaderText) {
  //     loaderText.textContent = `Cargando ${i + 1} / ${CRITICAL_FRAMES}`;
  //   }
  // }
  // Hide loader
  loader?.classList.add("hide");
  setTimeout(() => loader?.remove(), 500);
  document.body.style.overflow = "";

  // background preload sin bloquear
  // requestIdleCallback(() => preloadFrames(50, frameCount - 1));
  preloadSecondaryFrames();
}
function preloadSecondaryFrames() {
  const secondary = Array.from(
    { length: frameCount - CRITICAL_FRAMES - 1 },
    (_, i) => i + CRITICAL_FRAMES + 1
  );
  const run = () => preloadFramesParallel(secondary, SECONDARY_CONCURRENCY);
  if ("requestIdleCallback" in window) {
    requestIdleCallback(run);
  } else {
    setTimeout(run, 500);
  }
}
preloadCriticalFrames();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Detectar seccion
const updateOffsets = () => {
  if (!isMobile) {
    offsetX = 0;
    return;
  }
  const secc1 = document.querySelector(".section-1").getBoundingClientRect().top;
  const secc2 = document.querySelector(".section-2").getBoundingClientRect().top;
  // Detectar si esta en esa parte
  const inView = (pos) => pos <= window.innerHeight * 0.5 && pos >= -window.innerHeight * 0.5;

  if (inView(secc1)) {
    offsetX = -180;
  } else if (inView(secc2)) {
    offsetX = 180;
  } else {
    offsetX = 0;
  }
}

// Dibuja el frame actual en el canvas
async function render(frameIndex) {
  const frameNum = Math.floor(frameIndex);
  if (frameNum < 0 || frameNum >= frameCount) {
    return;
  }
  // Si es el mismo frame, no redibujar
  if (frameNum === currentDisplayFrame) {
    return;
  }
  try {
    const img = await loadImageOnDemand(frameNum);
    // if (!img.complete) return;
    currentDisplayFrame = frameNum;
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const x = (canvas.width / 2) - (img.naturalWidth / 2) * scale + offsetX;
    const y = (canvas.height / 2) - (img.naturalHeight / 2) * scale;
    context.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
  } catch (error) {
    console.error('Error renderizando:', error);
  }
}
// Check si es mobile
if (isMobile) {
  window.addEventListener("scroll", updateOffsets);
}
// ================================GSAP + SCROLLTRIGGER================================
gsap.registerPlugin(ScrollTrigger);
const imageSeq = { frame: 0 };

gsap.to(imageSeq, {
  frame: frameCount - 1,
  snap: 'frame',
  ease: 'none',
  scrollTrigger: {
    trigger: ".canvas-zone",
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
  },
  onUpdate: () => {
    render(imageSeq.frame);
  }
});

gsap.to("#scrollCanvas", {
  opacity: 0,
  duration: 0.5,
  scrollTrigger: {
    // sección para fondo blanco
    trigger: ".no-bg",
    start: "top center",
    end: "bottom center",
    toggleActions: "play none none reverse"
  }
});

// Inicializar mostrando el primer frame
document.addEventListener('DOMContentLoaded', () => {
  console.log('Página cargada. Haz scroll para ver los fotogramas...');
  render(0);
});

// Imagenes backgroung lazy loading
const lazyBG = document.querySelectorAll(".lazy-bg");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const el = entry.target;
    const webp = el.dataset.bg;
    const fallback = el.dataset.bgFallback;

    const img = new Image();
    img.src = webp;
    img.onload = () => {
      el.style.backgroundImage = `url(${webp})`;
    }
    img.onerror = () => {
      el.style.backgroundImage = `url(${fallback})`;
    }
    observer.unobserve(el);
  });
}, { rootMargin: "200px" });
lazyBG.forEach(el => observer.observe(el));

/* ------------- SCROLL ANIMATIONS ------------- */
// Trigger CSS Animations when elements are scrolled into view

document.addEventListener("DOMContentLoaded", () => {
  // Use Intersection Observer to determine if objects are within the viewport
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        return;
      }
      entry.target.classList.remove('in-view');
    });
  });

  // Get all the elements with the .animate class applied
  const allAnimatedElements = document.querySelectorAll('.animate');

  // Add the observer to each of those elements
  allAnimatedElements.forEach((element) => observer.observe(element));
});

gsap.registerPlugin(SplitText, ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
  // Lenis + scrolltrigger
  const lenis = new Lenis();
  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // CSS var
  const rootStyles = getComputedStyle(document.documentElement);
  const radius = parseFloat(rootStyles.getPropertyValue("--radius")) || 320;

  // Text animation splittext 
  const animText1 = document.querySelectorAll(".word-anim");

  animText1.forEach((el) => {
    const split = new SplitText(el, { type: "words" });

    gsap.set(split.words, { opacity: 0, y: 0 });

    gsap.to(split.words, {
      opacity: 1,
      y: 10,
      stagger: 0.2,
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none none",
        once: true,
      }
    });
  });

  //! Animacion Imagenes
  const imagesWrapper = document.querySelectorAll(".image-wrapper");
  const imagesText = document.querySelector(".images-text");

  ScrollTrigger.create({
    id: "images-trigger",
    trigger: ".images",
    start: "top top",
    end: `+${window.innerHeight * 4}px`,
    pin: true,
    pinSpacing: true,
    scrub: 1,
    onUpdate: (self) => {
      const progress = self.progress;
      const start = 0.05;
      const end = 0.55;

      imagesWrapper.forEach((img) => {
        const fx = parseFloat(getComputedStyle(img).getPropertyValue("--fx")) || 0;
        const fy = parseFloat(getComputedStyle(img).getPropertyValue("--fy")) || 0;

        const finalX = radius * fx;
        const finalY = radius * fy;
        let x = 0;
        let y = 0;

        if (progress > start && progress < end) {
          const t = (progress - start) / (end - start);
          const eased = 1 - Math.pow(1 - t, 3);
          x = finalX * eased;
          y = finalY * eased;
        } else if (progress >= end) {
          x = finalX;
          y = finalY;
        }
        gsap.set(img, {
          "--x": `${x}px`,
          "--y": `${y}px`
        });
      });

      // Text fade in-out
      if (progress >= 0.5) {
        imagesText.style.opacity = "1";
        imagesText.style.transform = "translateY(0)";
        imagesText.classList.add("visible");
      } else {
        imagesText.style.opacity = "0";
        imagesText.style.transform = "translateY(40px)";
        imagesText.classList.remove("visible");
      }
    },
  });

  // Title animation before images
  const preAnimTitle = document.querySelector(".pre-anim h1");

  ScrollTrigger.create({
    trigger: ".images",
    start: "top 8%",
    end: `+${window.innerHeight * 4}px`,
    toggleActions: "play none none reverse",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      if (p < 0.15) {
        gsap.to(preAnimTitle, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power1.out"
        });
      }

      if (p >= 0.15 && p <= 0.35) {
        gsap.to(preAnimTitle, {
          opacity: 0,
          y: -30,
          duration: 0.4,
          ease: "power1.out"
        });
      }
      // refresh fix
      if (p >= 1) {
        gsap.to(preAnimTitle, {
          opacity: 0,
          y: 0,
          duration: 0.4,
          ease: "power1.out"
        });
      }
    }
  });

  //! ANIMACION CARDS
  const cards = document.querySelectorAll(".card-animate");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        gsap.from(entry.target, {
          opacity: 0,
          x: 50,
          duration: 2,
          ease: "power2.out"
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  cards.forEach(card => observer.observe(card));

  gsap.from(".card-floating-anim", {
    opacity: 0,
    scale: 0.8,
    duration: 1.2,
    ease: "power3.out",
    scrollTrigger: {
      trigger: ".card-floating-anim",
      start: "top 80%",
      once: true
    }
  });

  // ? Click para pasar animacion
  const lastImage = document.querySelector(".image-wrapper:nth-child(8)");

  lastImage.addEventListener("click", () => {
    const trig = ScrollTrigger.getById("images-trigger");
    const endPos = trig.end;

    window.scrollTo({
      top: endPos,
      behavior: "smooth"
    });

    setTimeout(() => {
      gsap.to(trig, {
        progress: 1,
        duration: 2.5,
        ease: "power2.inOut",
        onUpdate: () => trig.update()
      });
    }, 50);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Text animation splittext 
  const animText2 = document.querySelectorAll(".word-anim-2");

  animText2.forEach((el) => {
    const split = new SplitText(el, { type: "words" });

    gsap.set(split.words, { opacity: 0, y: 0 });

    gsap.to(split.words, {
      opacity: 1,
      y: 10,
      stagger: 0.2,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 70%",
        end: "bottom 20%",
        toggleActions: "play none none none",
        once: true,
      }
    });
  });
});