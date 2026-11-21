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
      <div className="pf-portrait-stage pf-character-stage">
        <span className="pf-character-aura pf-character-aura--one" />
        <span className="pf-character-aura pf-character-aura--two" />
        <span className="pf-character-orbit pf-character-orbit--one" />
        <span className="pf-character-orbit pf-character-orbit--two" />
        <img className="pf-character-image" src={characterAsset} alt="" />
      </div>
    </div>
  );
}
