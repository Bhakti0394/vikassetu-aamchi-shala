import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChildAvatar } from "./ChildAvatar";
import { SEED_CHILDREN } from "@/lib/data";

describe("ChildAvatar Component (src/components/ChildAvatar.tsx)", () => {
  it("renders child's exact avatar and tone background matching Children page", () => {
    const aarav = SEED_CHILDREN.find((c) => c.id === "aarav")!;
    const { container } = render(<ChildAvatar child={aarav} size="card" />);

    // Shows Aarav's exact emoji
    expect(screen.getByText("👦🏽")).toBeInTheDocument();

    // Has teal pastel tone class
    const avatarEl = container.firstElementChild as HTMLElement;
    expect(avatarEl.className).toContain("bg-teal-soft");
    expect(avatarEl.className).toContain("h-10");
    expect(avatarEl.className).toContain("w-10");
  });

  it("renders different sizes correctly for selector (32px) and cards (40px)", () => {
    const anaya = SEED_CHILDREN.find((c) => c.id === "anaya")!;
    const { container: selectorContainer } = render(<ChildAvatar child={anaya} size="selector" />);
    const selectorEl = selectorContainer.firstElementChild as HTMLElement;
    expect(selectorEl.className).toContain("h-8");
    expect(selectorEl.className).toContain("w-8");
    expect(selectorEl.className).toContain("bg-coral-soft");

    const { container: cardContainer } = render(<ChildAvatar child={anaya} size="card" />);
    const cardEl = cardContainer.firstElementChild as HTMLElement;
    expect(cardEl.className).toContain("h-10");
    expect(cardEl.className).toContain("w-10");
  });

  it("falls back to initial in sage (#DCE9DD) circle with forest-green (#193F32) text when child has no avatar", () => {
    const childWithoutAvatar = { id: "tanvi", name: "Tanvi", avatar: "" };
    const { container } = render(<ChildAvatar child={childWithoutAvatar} size="card" />);

    expect(screen.getByText("T")).toBeInTheDocument();
    const avatarEl = container.firstElementChild as HTMLElement;
    expect(avatarEl.style.backgroundColor).toBe("rgb(220, 233, 221)"); // #DCE9DD in rgb
    expect(avatarEl.style.color).toBe("rgb(25, 63, 50)"); // #193F32 in rgb
  });

  it("resolves avatar and tone when child is passed as string ID", () => {
    const { container } = render(<ChildAvatar child="vihaan" size="selector" />);

    expect(screen.getByText("🧒🏽")).toBeInTheDocument();
    const avatarEl = container.firstElementChild as HTMLElement;
    expect(avatarEl.className).toContain("bg-sun-soft");
  });

  it("renders image avatar with width, height, alt='' and loading='lazy' when avatar is an image URL", () => {
    const childWithImg = {
      id: "photo-child",
      name: "Photo Child",
      avatar: "https://example.com/avatar.webp",
      tone: "sky" as const,
    };
    const { container } = render(<ChildAvatar child={childWithImg} size="card" loading="lazy" />);

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.webp");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("width", "40");
    expect(img).toHaveAttribute("height", "40");
    expect(img).toHaveAttribute("loading", "lazy");
  });
});
