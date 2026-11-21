import { describe, expect, it } from "vitest";
import { pendingUploads, uniqueSlug } from "@/lib/admin-library";
import type { FeedVideo } from "@/lib/youtube";

const v = (id: string, isShort = false): FeedVideo => ({ id, title: id, published: "", views: 0, isShort });

describe("admin library rules", () => {
  it("new-uploads list leaves out Shorts", () => {
    expect(pendingUploads([v("aaaaaaaaaaa"), v("bbbbbbbbbbb", true)], () => false).map((x) => x.id)).toEqual(["aaaaaaaaaaa"]);
  });

  it("new-uploads list leaves out videos already in the library", () => {
    expect(pendingUploads([v("aaaaaaaaaaa"), v("ccccccccccc")], (id) => id === "aaaaaaaaaaa").map((x) => x.id)).toEqual(["ccccccccccc"]);
  });

  it("a new novel never takes an existing novel's address", () => {
    expect(uniqueSlug("Man Yaram", (s) => s === "man-yaram")).toBe("man-yaram-2");
    expect(uniqueSlug("Man Yaram", () => false)).toBe("man-yaram");
  });
});
