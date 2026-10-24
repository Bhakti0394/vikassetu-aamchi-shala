import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  AreaIcon,
  ActivityIcon,
  RatingIcon,
  DOMAIN_ICONS,
  RATING_ICONS,
  Sprout,
  Leaf,
  TreeDeciduous,
} from "@/lib/icons";
import { DOMAINS, ACTIVITIES } from "@/lib/data";

describe("Activities Redesign & Emoji Replacement Verification", () => {
  it("maps all 5 domains plus 'all' to valid Lucide icons", () => {
    expect(DOMAIN_ICONS.alphabet).toBeDefined();
    expect(DOMAIN_ICONS.numbers).toBeDefined();
    expect(DOMAIN_ICONS.colours).toBeDefined();
    expect(DOMAIN_ICONS.art).toBeDefined();
    expect(DOMAIN_ICONS.stories).toBeDefined();
    expect(DOMAIN_ICONS.all).toBeDefined();
  });

  it("maps scores 1, 2, and 3 to Sprout, Leaf, and TreeDeciduous", () => {
    expect(RATING_ICONS[1]).toBe(Sprout);
    expect(RATING_ICONS[2]).toBe(Leaf);
    expect(RATING_ICONS[3]).toBe(TreeDeciduous);
  });

  it("renders AreaIcon and ActivityIcon as aria-hidden SVG icons on soft tinted tiles", () => {
    const { container: areaContainer } = render(
      <AreaIcon domain="alphabet" tile tint="sage" size={24} />
    );
    const svgArea = areaContainer.querySelector("svg");
    expect(svgArea).toBeInTheDocument();
    expect(svgArea?.closest("span")).toHaveAttribute("aria-hidden", "true");
    expect(svgArea?.closest("span")).toHaveClass("bg-[#DCE9DD]");

    const { container: actContainer } = render(
      <ActivityIcon activity="alphabet-match" tile tint="cream" size={24} />
    );
    const svgAct = actContainer.querySelector("svg");
    expect(svgAct).toBeInTheDocument();
    expect(svgAct?.closest("span")).toHaveAttribute("aria-hidden", "true");
    expect(svgAct?.closest("span")).toHaveClass("bg-[#F4EFE3]");
  });

  it("renders RatingIcon with correct Lucide icons and aria-hidden", () => {
    const { container: rating1 } = render(<RatingIcon score={1} size={28} />);
    expect(rating1.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    const { container: rating2 } = render(<RatingIcon score={2} size={28} />);
    expect(rating2.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    const { container: rating3 } = render(<RatingIcon score={3} size={28} />);
    expect(rating3.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("verifies that neither 🌱, 🌿, nor 🌳 exist in the RatingIcon component output", () => {
    const { container } = render(
      <div>
        <RatingIcon score={1} />
        <RatingIcon score={2} />
        <RatingIcon score={3} />
      </div>
    );
    expect(container.textContent).not.toContain("🌱");
    expect(container.textContent).not.toContain("🌿");
    expect(container.textContent).not.toContain("🌳");
  });

  it("ensures all 21 activities have assigned icons in icons module without fallback failure", () => {
    ACTIVITIES.forEach((activity) => {
      const { container } = render(<ActivityIcon activity={activity} size={20} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  it("ensures all 5 domains have assigned icons in icons module without fallback failure", () => {
    DOMAINS.forEach((domain) => {
      const { container } = render(<AreaIcon domain={domain.id} size={20} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });
});
