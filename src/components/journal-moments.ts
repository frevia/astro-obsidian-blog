export function initJournalMoments(): () => void {
  const cleanups: Array<() => void> = [];
  document
    .querySelectorAll<HTMLElement>(".journal-page .journal-spread")
    .forEach(spread => {
      const photos = spread.querySelector<HTMLElement>(".journal-photos");
      const note = spread.querySelector<HTMLElement>(
        ":scope > .journal-moment"
      );
      const figures = photos?.querySelectorAll<HTMLElement>(":scope > figure");
      if (!photos || !note || figures?.length !== 2) return;
      let frame = 0;
      let disposed = false;
      const reset = () => {
        note.classList.remove("journal-moment--placed");
        note.style.removeProperty("width");
        note.style.removeProperty("left");
        note.style.removeProperty("top");
      };
      const layout = () => {
        reset();
        if (window.innerWidth < 768) return;
        const images = [...photos.querySelectorAll("img")];
        if (images.some(image => !image.complete || !image.naturalWidth))
          return;
        const bounds = [...figures].map(figure =>
          figure.getBoundingClientRect()
        );
        const shorter =
          bounds[0].bottom < bounds[1].bottom ? bounds[0] : bounds[1];
        const bottom = Math.max(...bounds.map(rect => rect.bottom));
        note.style.width = `${shorter.width}px`;
        // Include room for the tape and keep long notes in normal reading flow.
        if (
          shorter.bottom + 28 + note.offsetHeight > bottom ||
          shorter.width < 240
        ) {
          reset();
          return;
        }
        const origin = spread.getBoundingClientRect();
        note.style.left = `${shorter.left - origin.left}px`;
        note.style.top = `${shorter.bottom - origin.top + 28}px`;
        note.classList.add("journal-moment--placed");
      };
      const schedule = () => {
        if (disposed) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(layout);
      };
      const observer = new ResizeObserver(schedule);
      figures.forEach(figure => observer.observe(figure));
      window.addEventListener("resize", schedule);
      spread.addEventListener("load", schedule, true);
      spread.addEventListener("toggle", schedule, true);
      document.fonts.ready.then(schedule);
      schedule();
      cleanups.push(() => {
        disposed = true;
        observer.disconnect();
        window.removeEventListener("resize", schedule);
        spread.removeEventListener("load", schedule, true);
        spread.removeEventListener("toggle", schedule, true);
        cancelAnimationFrame(frame);
        reset();
      });
    });
  return () => cleanups.forEach(cleanup => cleanup());
}
