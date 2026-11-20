import type { PortfolioProject } from "../../types.portfolio";
import { assetUrl } from "../../lib/portfolio";

const characterAsset = assetUrl("assets/hero-character.png");

export function HeroPortrait({
  projects: _projects,
}: {
  projects: PortfolioProject[];
}) {
  return (
    <div className="pf-portrait pf-portrait--cosmic" aria-hidden="true">
      <div
        className="pf-portrait-stage pf-character-stage"
        style={{ backgroundImage: `url("${characterAsset}")` }}
      />
    </div>
  );
}
