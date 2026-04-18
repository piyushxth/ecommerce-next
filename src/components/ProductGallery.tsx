"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";

type EmblaApi = NonNullable<UseEmblaCarouselType[1]>;

import type { ProductDetailImage } from "@/lib/products.types";

type Props = {
  productName: string;
  images: ProductDetailImage[];
  activeColorSlug: string | null;
};

export function ProductGallery({ productName, images, activeColorSlug }: Props) {
  // Filter images by the currently selected color. Images with no variant
  // (general product shots) are always kept so the gallery never goes blank
  // for a sparsely-photographed color. If filtering produces nothing, fall
  // back to all images.
  const visibleImages = useMemo(() => {
    if (!activeColorSlug) return images;
    const filtered = images.filter(
      (img) => img.colorSlug === activeColorSlug || img.colorSlug === null,
    );
    return filtered.length > 0 ? filtered : images;
  }, [images, activeColorSlug]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    containScroll: "trimSnaps",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Subscribe to embla's "select" + "reInit" events. Using queueMicrotask
  // to seed initial state keeps the setState out of the synchronous effect
  // body (which React 19's set-state-in-effect lint rule forbids).
  useEffect(() => {
    if (!emblaApi) return;
    const sync = (api: EmblaApi) => {
      setSelectedIndex(api.selectedScrollSnap());
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    const handler = () => sync(emblaApi);
    emblaApi.on("select", handler);
    emblaApi.on("reInit", handler);
    queueMicrotask(handler);
    return () => {
      emblaApi.off("select", handler);
      emblaApi.off("reInit", handler);
    };
  }, [emblaApi]);

  // Reset the carousel to the first image whenever the visible set changes
  // (e.g. user picked a new color). reInit() + scrollTo(0) fire embla events
  // which the subscription above translates back into React state.
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
    emblaApi.scrollTo(0, true);
  }, [emblaApi, visibleImages]);

  // Keyboard left/right arrows to navigate.
  useEffect(() => {
    if (!emblaApi) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (e.key === "ArrowLeft") emblaApi.scrollPrev();
      else if (e.key === "ArrowRight") emblaApi.scrollNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  if (visibleImages.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-900">
        No images for this product yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:gap-6">
      {/* Main viewport */}
      <div className="relative flex-1">
        <div
          ref={emblaRef}
          className="overflow-hidden"
          aria-roledescription="carousel"
          aria-label={`${productName} images`}
        >
          <div className="flex">
            {visibleImages.map((img, idx) => (
              <div
                key={img.id}
                className="relative min-w-0 flex-[0_0_100%]"
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${visibleImages.length}`}
              >
                <div className="relative aspect-[4/5] w-full bg-neutral-100 dark:bg-neutral-900">
                  <Image
                    src={img.url}
                    alt={productName}
                    fill
                    priority={idx === 0}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prev / next overlay buttons */}
        {visibleImages.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-0 md:flex"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-0 md:flex"
            >
              <ChevronRight />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white md:hidden">
              {selectedIndex + 1} / {visibleImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {visibleImages.length > 1 && (
        <ul
          className="flex gap-2 overflow-x-auto lg:max-h-[540px] lg:w-20 lg:flex-col lg:overflow-y-auto"
          aria-label="Image thumbnails"
        >
          {visibleImages.map((img, idx) => {
            const active = idx === selectedIndex;
            return (
              <li key={img.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => scrollTo(idx)}
                  aria-label={`Show image ${idx + 1}`}
                  aria-current={active}
                  className={`relative block aspect-square w-16 overflow-hidden border transition lg:w-20 ${
                    active
                      ? "border-neutral-900 dark:border-white"
                      : "border-transparent hover:border-neutral-400"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
