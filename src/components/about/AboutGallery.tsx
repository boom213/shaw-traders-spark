import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export type GalleryPhoto = { id: string; imageUrl: string | null; caption: string | null };

function Photo({ photo, eager }: { photo: GalleryPhoto; eager?: boolean }) {
  return (
    <figure className="mx-auto w-full">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-surface sm:aspect-[16/9]">
        <img
          src={photo.imageUrl ?? ""}
          alt={photo.caption ?? "Shaw Traders EV shop photo"}
          width={1280}
          height={720}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      {photo.caption && (
        <figcaption className="mt-3 text-center text-base font-medium leading-relaxed text-foreground">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}

export function AboutGallery({ photos }: { photos: GalleryPhoto[] }) {
  if (photos.length === 0) return null;

  return (
    <section className="mt-16" aria-label="Photos from our shop">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-2xl font-bold">Inside our shop</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our counter, our team and the moments we are proud of.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-4xl">
        {photos.length === 1 ? (
          <Photo photo={photos[0]!} eager />
        ) : (
          <Carousel opts={{ loop: true, align: "start" }} className="w-full" aria-label="Shop photos">
            <CarouselContent className="ml-0">
              {photos.map((p, i) => (
                <CarouselItem key={p.id} className="pl-0">
                  <Photo photo={p} eager={i === 0} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-2 size-10 md:-left-5" aria-label="Previous photo" />
            <CarouselNext className="-right-2 size-10 md:-right-5" aria-label="Next photo" />
          </Carousel>
        )}
      </div>
    </section>
  );
}
