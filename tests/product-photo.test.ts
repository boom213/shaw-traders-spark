import { describe, expect, it } from "vitest";
import { originalPathFromThumbnail, productPhotoStoragePath, productThumbnailStoragePath, productThumbnailUrl } from "@/lib/product-photo";

describe("product photo thumbnails", () => {
  it("maps private product photos to a deterministic compact variant", () => {
    const source = "/api/public/photo/product-id/photo.webp";
    expect(productPhotoStoragePath(source)).toBe("product-id/photo.webp");
    expect(productThumbnailStoragePath("product-id/photo.webp")).toBe("__thumbs__/product-id/photo.webp");
    expect(productThumbnailUrl(source)).toBe("/api/public/photo/__thumbs__/product-id/photo.webp");
    expect(originalPathFromThumbnail("__thumbs__/product-id/photo.webp")).toBe("product-id/photo.webp");
  });

  it("leaves bundled and external sources unchanged", () => {
    expect(productThumbnailUrl("/demo/parts/motor.jpg")).toBe("/demo/parts/motor.jpg");
    expect(productThumbnailUrl("https://images.example.com/motor.jpg")).toBe("https://images.example.com/motor.jpg");
  });

  it("rejects review and traversal paths", () => {
    expect(productPhotoStoragePath("/api/public/photo/review-photos/user/photo.webp")).toBeNull();
    expect(productPhotoStoragePath("/api/public/photo/../secret.webp")).toBeNull();
  });
});