type ProgressDirection = 'horizontal' | 'vertical';

enum selectors {
  COMPONENT = '[wb-autotabs="component"]',
  PANE = '.w-tab-pane',
  LINK = '.w-tab-link',
  CURRENT_CLASS = 'w--current',
  PROGRESS_BAR = '[wb-autotabs="progress"]',
  PROGRESS_DIRECTION = 'wb-autotabs-progress-direction',
}

window.Webflow ||= [];
window.Webflow.push(() => {
  const components = document.querySelectorAll<HTMLDivElement>(selectors.COMPONENT);

  if (components.length === 0) {
    console.error('no autotabs components found');
  }

  components.forEach((component, index) => {
    const links = Array.from(component.querySelectorAll<HTMLAnchorElement>(selectors.LINK));
    const videos = component.querySelectorAll<HTMLVideoElement>('video');
    const progressBars = Array.from(
      component.querySelectorAll<HTMLDivElement>(selectors.PROGRESS_BAR)
    );
    // Get current index
    let currentIndex = links.findIndex((link) => link.classList.contains(selectors.CURRENT_CLASS));
    let requestId: number;

    // Setup progress bars
    resetProgressBars(progressBars);

    // Setup videos
    videos.forEach((video) => {
      // remove loop attribute to allow onended event to fire
      video.removeAttribute('loop');
      video.removeAttribute('autoplay');
    });

    async function playNextVideo(index: number = currentIndex) {
      // pause all videos and set playhead back to zero
      videos.forEach((video) => {
        video.currentTime = 0;
        video.pause();
      });

      // wait a bit to ensure all videos are paused before playing the next one
      // Race condition: https://stackoverflow.com/questions/36803176/how-to-prevent-the-play-request-was-interrupted-by-a-call-to-pause-error/37172024#37172024
      await new Promise((resolve) => setTimeout(resolve, 100));

      currentIndex = index;
      let currentVideo: HTMLVideoElement = videos[currentIndex % videos.length] as HTMLVideoElement;
      await currentVideo.play();
      updateProgressBar(currentVideo, progressBars[currentIndex]);

      currentVideo.onended = () => {
        currentIndex = (currentIndex + 1) % videos.length;
        simulateClick(links[currentIndex]);
        playNextVideo(currentIndex);
      };
    }

    function updateProgressBar(video: HTMLVideoElement, progressBar: HTMLDivElement) {
      let progressDirection: string =
        progressBar.getAttribute(selectors.PROGRESS_DIRECTION) || 'horizontal';

      if (progressDirection !== 'horizontal' && progressDirection !== 'vertical') {
        console.error('invalid progress direction');
        return;
      }

      if (requestId) {
        cancelAnimationFrame(requestId);
        resetProgressBars(progressBars);
      }

      let start: number;
      function step(timestamp: number) {
        if (!start) start = timestamp;

        let progress = (timestamp - start) / (video.duration * 1000); // duration is in seconds, timestamp in milliseconds
        progress = Math.min(progress, 1); // Cap progress at 1 (100%)

        if (progressDirection === 'horizontal') {
          progressBar.style.transform = `scaleX(${progress})`;
        } else {
          progressBar.style.transform = `scaleY(${progress})`;
        }

        if (progress < 1) {
          requestId = requestAnimationFrame(step); // Save the request ID
        }
      }

      requestId = requestAnimationFrame(step); // Save the request ID
    }

    function resetProgressBars(progressBars: HTMLDivElement[]) {
      progressBars.forEach((progressBar) => {
        let progressDirection: string =
          progressBar.getAttribute(selectors.PROGRESS_DIRECTION) || 'horizontal';

        if (progressDirection !== 'horizontal' && progressDirection !== 'vertical') {
          console.error('invalid progress direction');
          return;
        }
        if (progressDirection === 'horizontal') {
          progressBar.style.transform = 'scaleX(0)';
        } else {
          progressBar.style.transform = 'scaleY(0)';
        }
      });
    }

    // detect click on tab link and play next video
    links.forEach((link, index) => {
      link.addEventListener('click', () => playNextVideo(index));
    });

    // Start playing the first video
    playNextVideo();
  });
});

// need to simulate click to trigger tab change
// using click() causes scroll issues in Safari
function simulateClick(element: HTMLAnchorElement) {
  let clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: false,
  });
  element.dispatchEvent(clickEvent);
}
